-- ============================================================================
-- A time window is ONE appointment.
-- ----------------------------------------------------------------------------
-- The coach can offer the same window for several things ("Tuesday 2–3pm could
-- be a career session, a 1-on-1, or the group cohort"). Whoever books first
-- decides which of those it actually becomes:
--
--   • first booking is 1-on-1 / career → the window is gone
--   • first booking is the group       → only that same group can still join,
--                                        up to the group's seat count
--
-- Without this, a window offered for both group and 1-on-1 kept 7 "free seats"
-- after someone booked a 1-on-1, and the coach would be double-booked.
--
-- Safe to re-run (idempotent).
-- ============================================================================

-- What the admin originally allowed (restored when the window empties again).
alter table public.availability_slots
  add column if not exists base_capacity integer;

update public.availability_slots
   set base_capacity = capacity
 where base_capacity is null;

alter table public.availability_slots
  alter column base_capacity set default 1;
alter table public.availability_slots
  alter column base_capacity set not null;

-- What this window has actually become, once someone took it.
alter table public.availability_slots
  add column if not exists committed_offering_type text;
alter table public.availability_slots
  add column if not exists committed_workshop_id uuid;

alter table public.availability_slots
  drop constraint if exists availability_slots_committed_offering_check;
alter table public.availability_slots
  add constraint availability_slots_committed_offering_check
  check (committed_offering_type is null
         or committed_offering_type in ('career', 'individual', 'group'));

-- How many people this booking's offering seats (resolved from the one
-- catalogue in src/lib/offerings.ts at booking time, so the seat counts never
-- drift between the app and the database).
alter table public.bookings
  add column if not exists offering_capacity integer not null default 1;

-- Backfill: bookings that already hold a window commit it to their offering.
update public.availability_slots s
   set committed_offering_type = b.offering_type,
       committed_workshop_id = b.workshop_id
  from public.bookings b
 where b.slot_id = s.id
   and b.slot_reserved_at is not null
   and b.status <> 'cancelled'
   and b.offering_type is not null
   and s.committed_offering_type is null;

-- ── reserve: the first taker defines the window ────────────────────────────
-- Returns: reserved | already | full | unavailable | committed_elsewhere
--          | no_slot | no_booking
create or replace function public.reserve_slot_for_booking(p_booking uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot      uuid;
  v_seats     integer;
  v_held      timestamptz;
  v_type      text;
  v_workshop  uuid;
  v_offer_cap integer;
  v_row       public.availability_slots%rowtype;
  v_capacity  integer;
  v_nil constant uuid := '00000000-0000-0000-0000-000000000000';
begin
  select slot_id, coalesce(seats, 1), slot_reserved_at, offering_type,
         workshop_id, greatest(coalesce(offering_capacity, 1), 1)
    into v_slot, v_seats, v_held, v_type, v_workshop, v_offer_cap
    from public.bookings
   where id = p_booking
   for update;

  if not found then return 'no_booking'; end if;
  if v_held is not null then return 'already'; end if;
  if v_slot is null then return 'no_slot'; end if;

  -- Serialise every reservation attempt on this window.
  select * into v_row from public.availability_slots where id = v_slot for update;
  if not found then return 'no_slot'; end if;

  if v_row.status <> 'published'
     or v_row.is_day_block
     or coalesce(v_row.admin_marked_status, 'available') <> 'available' then
    return 'unavailable';
  end if;

  if v_row.booked_count = 0 then
    -- Nobody has taken it yet: this booking decides what it is.
    v_capacity := v_offer_cap;
    update public.availability_slots
       set capacity = v_offer_cap,
           committed_offering_type = v_type,
           committed_workshop_id = v_workshop
     where id = v_slot;
  else
    -- Already committed: only the same offering may join it.
    if coalesce(v_row.committed_offering_type, '') is distinct from coalesce(v_type, '')
       or coalesce(v_row.committed_workshop_id, v_nil) is distinct from coalesce(v_workshop, v_nil) then
      return 'committed_elsewhere';
    end if;
    v_capacity := v_row.capacity;
  end if;

  if v_row.booked_count + v_seats > v_capacity then
    return 'full';
  end if;

  update public.availability_slots
     set booked_count = booked_count + v_seats,
         admin_marked_status = case
           when booked_count + v_seats >= v_capacity then 'full'
           else admin_marked_status
         end,
         updated_at = now()
   where id = v_slot;

  update public.bookings set slot_reserved_at = now() where id = p_booking;

  return 'reserved';
end;
$$;

-- ── release: hand the window back, and un-commit it once it empties ────────
create or replace function public.release_slot_for_booking(p_booking uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot  uuid;
  v_seats integer;
  v_held  timestamptz;
  v_left  integer;
begin
  select slot_id, coalesce(seats, 1), slot_reserved_at
    into v_slot, v_seats, v_held
    from public.bookings
   where id = p_booking
   for update;

  if not found then return 'no_booking'; end if;
  if v_held is null or v_slot is null then return 'not_held'; end if;

  update public.availability_slots
     set booked_count = greatest(0, booked_count - v_seats),
         updated_at = now()
   where id = v_slot
  returning booked_count into v_left;

  if v_left = 0 then
    -- Empty again: back to whatever the admin originally offered.
    update public.availability_slots
       set committed_offering_type = null,
           committed_workshop_id = null,
           capacity = greatest(coalesce(base_capacity, 1), 1),
           admin_marked_status = case
             when admin_marked_status = 'full' then 'available'
             else admin_marked_status
           end
     where id = v_slot;
  else
    update public.availability_slots
       set admin_marked_status = case
             when booked_count < capacity and admin_marked_status = 'full' then 'available'
             else admin_marked_status
           end
     where id = v_slot;
  end if;

  update public.bookings set slot_reserved_at = null where id = p_booking;

  return 'released';
end;
$$;

revoke all on function public.reserve_slot_for_booking(uuid) from public;
revoke all on function public.release_slot_for_booking(uuid) from public;
grant execute on function public.reserve_slot_for_booking(uuid) to service_role;
grant execute on function public.release_slot_for_booking(uuid) to service_role;
