-- ============================================================================
-- Booking system unification migration
-- ----------------------------------------------------------------------------
-- Makes `availability_slots` + `slot_assignments` the single source of truth for
-- what is bookable, and makes "slot taken" an atomic, race-safe operation that
-- fires the moment a client uploads a receipt (before admin approval).
--
-- Safe to re-run (idempotent) — but ALWAYS run slot_commitment_migration.sql
-- after it, since that file supersedes the two functions defined here.
-- ============================================================================

-- ── 1. slot_assignments: which OFFERING a slot is open for ──────────────────
-- offering_type: 'career' | 'individual' | 'group'
--   career     → workshop_id IS NULL  (the Career Deciding Session)
--   individual → workshop_id = <workshop>  (1-on-1 on that workshop)
--   group      → workshop_id = <workshop>  (group cohort on that workshop)
alter table public.slot_assignments
  add column if not exists offering_type text;

-- Backfill legacy rows: workshop rows were all created as 1-on-1; rows with no
-- workshop and no session were the (never-persisted) career option.
update public.slot_assignments
   set offering_type = 'individual'
 where offering_type is null and workshop_id is not null;

update public.slot_assignments
   set offering_type = 'career'
 where offering_type is null and workshop_id is null;

alter table public.slot_assignments
  drop constraint if exists slot_assignments_offering_type_check;
alter table public.slot_assignments
  add constraint slot_assignments_offering_type_check
  check (offering_type in ('career', 'individual', 'group'));

alter table public.slot_assignments
  alter column offering_type set not null;

-- The old model identified an assignment by session_id or workshop_id, so it
-- required one of them. The Career Deciding Session belongs to neither — it is
-- identified by offering_type alone — which is why career slots could never be
-- created. Replace the rule with one that matches the model.
alter table public.slot_assignments
  drop constraint if exists slot_assignments_check;
alter table public.slot_assignments
  drop constraint if exists slot_assignments_offering_shape_check;
alter table public.slot_assignments
  add constraint slot_assignments_offering_shape_check
  check (
    (offering_type = 'career' and workshop_id is null)
    or (offering_type in ('individual', 'group') and workshop_id is not null)
  );

-- Legacy rows could describe the same offering twice on one slot (one row keyed
-- by session_id, another by workshop_id). Collapse them before adding the index.
delete from public.slot_assignments a
 using public.slot_assignments b
 where a.ctid > b.ctid
   and a.slot_id = b.slot_id
   and a.offering_type = b.offering_type
   and coalesce(a.workshop_id, '00000000-0000-0000-0000-000000000000'::uuid)
     = coalesce(b.workshop_id, '00000000-0000-0000-0000-000000000000'::uuid);

-- One assignment per (slot, offering, workshop). Nulls don't collide in a plain
-- unique index, so key on a coalesced workshop id.
create unique index if not exists slot_assignments_unique_offering
  on public.slot_assignments (
    slot_id,
    offering_type,
    coalesce(workshop_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

-- ── 2. availability_slots: explicit whole-day block ─────────────────────────
alter table public.availability_slots
  add column if not exists is_day_block boolean not null default false;

-- Legacy day blocks were encoded as a 00:00–23:59 'unavailable' row.
update public.availability_slots
   set is_day_block = true
 where is_day_block = false
   and start_time = '00:00:00'
   and end_time   = '23:59:00';

-- A day block is never bookable.
update public.availability_slots
   set admin_marked_status = 'unavailable'
 where is_day_block = true
   and admin_marked_status is distinct from 'unavailable';

create index if not exists idx_availability_slots_date
  on public.availability_slots (date);
create index if not exists idx_availability_slots_lookup
  on public.availability_slots (status, date, admin_marked_status);

-- ── 3. bookings: which offering was bought + reservation bookkeeping ────────
alter table public.bookings
  add column if not exists workshop_id uuid references public.workshops(id) on delete set null;
alter table public.bookings
  add column if not exists offering_type text;
alter table public.bookings
  add column if not exists seats integer not null default 1;
alter table public.bookings
  add column if not exists slot_reserved_at timestamptz;

alter table public.bookings
  drop constraint if exists bookings_offering_type_check;
alter table public.bookings
  add constraint bookings_offering_type_check
  check (offering_type is null or offering_type in ('career', 'individual', 'group'));

create index if not exists idx_bookings_slot_id on public.bookings (slot_id);
create index if not exists idx_bookings_user_id on public.bookings (user_id);
create index if not exists idx_payments_booking_id on public.payments (booking_id);

-- ── 4. Atomic reserve / release ─────────────────────────────────────────────
-- A slot becomes TAKEN the moment the client's receipt is accepted. This must be
-- atomic: two clients uploading receipts for the same 1-seat slot at the same
-- moment must not both succeed.
--
-- Returns:
--   'reserved'   → seats were just taken for this booking
--   'already'    → this booking already holds its seats (idempotent re-call)
--   'full'       → not enough seats left
--   'unavailable'→ slot was blocked/archived by the admin
--   'no_slot'    → booking has no slot
--   'no_booking' → unknown booking id
create or replace function public.reserve_slot_for_booking(p_booking uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot   uuid;
  v_seats  integer;
  v_held   timestamptz;
  v_row    public.availability_slots%rowtype;
begin
  select slot_id, coalesce(seats, 1), slot_reserved_at
    into v_slot, v_seats, v_held
    from public.bookings
   where id = p_booking
   for update;

  if not found then
    return 'no_booking';
  end if;

  if v_held is not null then
    return 'already';
  end if;

  if v_slot is null then
    return 'no_slot';
  end if;

  -- Serialise every reservation attempt on this slot.
  select * into v_row
    from public.availability_slots
   where id = v_slot
   for update;

  if not found then
    return 'no_slot';
  end if;

  if v_row.status <> 'published'
     or v_row.is_day_block
     or coalesce(v_row.admin_marked_status, 'available') <> 'available' then
    return 'unavailable';
  end if;

  if v_row.booked_count + v_seats > v_row.capacity then
    return 'full';
  end if;

  update public.availability_slots
     set booked_count = booked_count + v_seats,
         admin_marked_status = case
           when booked_count + v_seats >= capacity then 'full'
           else admin_marked_status
         end,
         updated_at = now()
   where id = v_slot;

  update public.bookings
     set slot_reserved_at = now()
   where id = p_booking;

  return 'reserved';
end;
$$;

-- Give the seats back (admin rejected / cancelled / client abandoned).
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
begin
  select slot_id, coalesce(seats, 1), slot_reserved_at
    into v_slot, v_seats, v_held
    from public.bookings
   where id = p_booking
   for update;

  if not found then
    return 'no_booking';
  end if;

  if v_held is null or v_slot is null then
    return 'not_held';
  end if;

  update public.availability_slots
     set booked_count = greatest(0, booked_count - v_seats),
         admin_marked_status = case
           when greatest(0, booked_count - v_seats) < capacity
                and admin_marked_status = 'full' then 'available'
           else admin_marked_status
         end,
         updated_at = now()
   where id = v_slot;

  update public.bookings
     set slot_reserved_at = null
   where id = p_booking;

  return 'released';
end;
$$;

revoke all on function public.reserve_slot_for_booking(uuid) from public;
revoke all on function public.release_slot_for_booking(uuid) from public;
grant execute on function public.reserve_slot_for_booking(uuid) to service_role;
grant execute on function public.release_slot_for_booking(uuid) to service_role;

-- ── 5. Reconcile booked_count with reality ─────────────────────────────────
-- Pre-migration code incremented booked_count at booking-creation time and then
-- again on receipt upload (double count). Recompute from held bookings.
-- Legacy bookings never recorded slot_reserved_at; treat any non-cancelled
-- booking whose payment has a receipt (or is already paid) as holding its seat.
update public.bookings b
   set slot_reserved_at = coalesce(b.slot_reserved_at, b.created_at)
 where b.slot_id is not null
   and b.status <> 'cancelled'
   and exists (
     select 1 from public.payments p
      where p.booking_id = b.id
        and (p.proof_url is not null or p.status in ('paid', 'pending_verification'))
   );

update public.availability_slots s
   set booked_count = coalesce((
         select sum(coalesce(b.seats, 1))
           from public.bookings b
          where b.slot_id = s.id
            and b.slot_reserved_at is not null
            and b.status <> 'cancelled'
       ), 0);

-- Only correct the derived 'full' flag; never clobber a deliberate admin block.
update public.availability_slots
   set admin_marked_status = 'full'
 where not is_day_block
   and admin_marked_status <> 'unavailable'
   and booked_count >= capacity;

update public.availability_slots
   set admin_marked_status = 'available'
 where not is_day_block
   and admin_marked_status = 'full'
   and booked_count < capacity;

-- ── 6. Repair damage from the old booking API ──────────────────────────────
-- /api/bookings/create used to `upsert` the profile on every booking with a
-- placeholder email and role='user'. That overwrote real addresses and silently
-- demoted the admin the first time she booked anything herself.
update public.profiles p
   set email = u.email
  from auth.users u
 where u.id = p.id
   and p.email = 'user-' || p.id::text || '@albosla.local'
   and u.email is not null;

update public.profiles
   set role = 'admin'
 where email = 'thecompass555@gmail.com'
   and role <> 'admin';

-- ── 7. Storage: both proof buckets must accept client uploads ──────────────
-- The legacy public `proofs` bucket had no INSERT policy, so client-side
-- receipt uploads to it failed with an RLS violation. The server falls back to
-- it, so give it the same policies as `payment-proofs`.
do $$
begin
  drop policy if exists "Authenticated can upload to proofs bucket" on storage.objects;
  create policy "Authenticated can upload to proofs bucket"
    on storage.objects for insert to authenticated
    with check (bucket_id in ('proofs', 'payment-proofs'));

  drop policy if exists "Public can read proofs bucket" on storage.objects;
  create policy "Public can read proofs bucket"
    on storage.objects for select
    using (bucket_id in ('proofs', 'payment-proofs'));
exception when insufficient_privilege then
  null;
end $$;

insert into storage.buckets (id, name, public)
     values ('payment-proofs', 'payment-proofs', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
     values ('proofs', 'proofs', true)
on conflict (id) do update set public = true;

-- ── 8. Realtime: clients subscribe to slot changes for live sync ───────────
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'availability_slots'
  ) then
    alter publication supabase_realtime add table public.availability_slots;
  end if;
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'bookings'
  ) then
    alter publication supabase_realtime add table public.bookings;
  end if;
exception when others then
  -- publication may not exist on self-hosted stacks; ignore
  null;
end $$;
