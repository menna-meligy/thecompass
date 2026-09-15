-- ============================================================================
-- Picking a slot holds it, briefly.
-- ----------------------------------------------------------------------------
-- Until now a window was only taken when the receipt arrived. So while one
-- client sat on the payment screen, the same window was still being offered to
-- everyone else — on the other workshops, on the 1-on-1, on the career session.
-- Two people could reach the transfer screen for the same appointment.
--
-- Choosing a slot now holds it for HOLD_MINUTES. Upload a receipt inside that
-- window and the hold becomes permanent (it then waits on the coach). Walk away
-- and it expires by itself and the window goes back on sale — no cron needed,
-- expiry is settled lazily whenever availability is read.
--
-- Safe to re-run (idempotent).
-- ============================================================================

alter table public.bookings
  add column if not exists hold_expires_at timestamptz;

create index if not exists idx_bookings_hold_expiry
  on public.bookings (hold_expires_at)
  where hold_expires_at is not null;

-- ── Release holds nobody completed ─────────────────────────────────────────
-- Called before availability is read and before any new reservation, so an
-- abandoned checkout can never keep a window off the market.
create or replace function public.expire_stale_holds()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_count integer := 0;
begin
  for v_row in
    select b.id, b.slot_id, coalesce(b.seats, 1) as seats
      from public.bookings b
     where b.hold_expires_at is not null
       and b.hold_expires_at < now()
       and b.slot_reserved_at is not null
       and b.status = 'pending'
     for update skip locked
  loop
    update public.availability_slots
       set booked_count = greatest(0, booked_count - v_row.seats),
           updated_at = now()
     where id = v_row.slot_id;

    update public.bookings
       set slot_reserved_at = null,
           hold_expires_at = null
     where id = v_row.id;

    -- An empty window forgets what it was going to be.
    update public.availability_slots
       set committed_offering_type = null,
           committed_workshop_id = null,
           capacity = greatest(coalesce(base_capacity, capacity, 1), 1),
           admin_marked_status = case
             when is_day_block then 'unavailable'
             when admin_marked_status = 'full' then 'available'
             else admin_marked_status
           end
     where id = v_row.slot_id
       and booked_count = 0;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- ── reserve, now with an optional expiry ───────────────────────────────────
-- p_hold_minutes NULL  → a permanent hold (a receipt has been accepted)
-- p_hold_minutes > 0   → a provisional hold that lapses on its own
--
-- Returns: reserved | already | full | unavailable | committed_elsewhere
--          | no_slot | no_booking
create or replace function public.reserve_slot_for_booking(
  p_booking uuid,
  p_hold_minutes integer default null
)
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
  v_expiry    timestamptz;
  v_nil constant uuid := '00000000-0000-0000-0000-000000000000';
begin
  -- Never let a lapsed hold block a real one.
  perform public.expire_stale_holds();

  v_expiry := case
    when p_hold_minutes is null then null
    else now() + make_interval(mins => p_hold_minutes)
  end;

  select slot_id, coalesce(seats, 1), slot_reserved_at, offering_type,
         workshop_id, greatest(coalesce(offering_capacity, 1), 1)
    into v_slot, v_seats, v_held, v_type, v_workshop, v_offer_cap
    from public.bookings
   where id = p_booking
   for update;

  if not found then return 'no_booking'; end if;

  if v_held is not null then
    -- Already holding it. A receipt turns a provisional hold permanent;
    -- re-entering checkout pushes the expiry out again.
    update public.bookings set hold_expires_at = v_expiry where id = p_booking;
    return 'already';
  end if;

  if v_slot is null then return 'no_slot'; end if;

  select * into v_row from public.availability_slots where id = v_slot for update;
  if not found then return 'no_slot'; end if;

  if v_row.status <> 'published'
     or v_row.is_day_block
     or coalesce(v_row.admin_marked_status, 'available') <> 'available' then
    return 'unavailable';
  end if;

  if v_row.booked_count = 0 then
    v_capacity := v_offer_cap;
    update public.availability_slots
       set capacity = v_offer_cap,
           committed_offering_type = v_type,
           committed_workshop_id = v_workshop
     where id = v_slot;
  else
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

  update public.bookings
     set slot_reserved_at = now(),
         hold_expires_at = v_expiry
   where id = p_booking;

  return 'reserved';
end;
$$;

-- release must also clear the expiry
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

  update public.bookings
     set slot_reserved_at = null,
         hold_expires_at = null
   where id = p_booking;

  return 'released';
end;
$$;

revoke all on function public.expire_stale_holds() from public;
revoke all on function public.reserve_slot_for_booking(uuid, integer) from public;
revoke all on function public.release_slot_for_booking(uuid) from public;
grant execute on function public.expire_stale_holds() to service_role;
grant execute on function public.reserve_slot_for_booking(uuid, integer) to service_role;
grant execute on function public.release_slot_for_booking(uuid) to service_role;

-- The one-argument form is gone; drop it so no caller silently gets a
-- permanent hold when it meant to ask for a provisional one.
drop function if exists public.reserve_slot_for_booking(uuid);
