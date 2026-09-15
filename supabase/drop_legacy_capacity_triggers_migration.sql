-- ============================================================================
-- Remove the legacy triggers that count seats a second time
-- ----------------------------------------------------------------------------
-- Two triggers predate the reserve/release model and now fight it:
--
--   update_slot_booked_count  (AFTER UPDATE ON bookings)
--     adds 1 to booked_count when a booking becomes 'confirmed' — but the seat
--     was already taken by reserve_slot_for_booking the moment the client's
--     receipt was accepted. Every confirmation therefore consumed TWO seats.
--     On a 1-seat window that was invisible (it was already hidden); on an
--     8-seat group cohort it meant the workshop sold out after 4 confirmations.
--     It also decremented again on cancel, double-releasing against
--     release_slot_for_booking.
--
--   check_slot_capacity  (BEFORE INSERT ON bookings)
--     refuses a booking when the window looks full. Under this model a booking
--     is created BEFORE the seat is taken, so it guards the wrong moment, and
--     when it does fire it raises a raw English exception that surfaces to the
--     client as a generic 500. Capacity is now enforced atomically inside
--     reserve_slot_for_booking, with a friendly pre-check in
--     /api/bookings/create.
--
-- Deliberately KEPT:
--   enforce_receipt_before_confirm — refuses to confirm a booking with no paid
--     receipt. The admin action satisfies it, and it's a genuine backstop.
--   handle_booking_completed — roadmap XP, unrelated to seats.
--
-- Safe to re-run (idempotent).
-- ============================================================================

drop trigger if exists update_slot_booked_count_trigger on public.bookings;
drop function if exists public.update_slot_booked_count();

drop trigger if exists check_slot_capacity_trigger on public.bookings;
drop function if exists public.check_slot_capacity();

-- ── Repair the counts the triggers inflated ────────────────────────────────
-- booked_count is, by definition, the seats held by live bookings.
update public.availability_slots s
   set booked_count = coalesce((
         select sum(coalesce(b.seats, 1))
           from public.bookings b
          where b.slot_id = s.id
            and b.slot_reserved_at is not null
            and b.status <> 'cancelled'
       ), 0);

-- A window nobody holds goes back to whatever the admin originally offered.
update public.availability_slots
   set committed_offering_type = null,
       committed_workshop_id = null,
       capacity = greatest(coalesce(base_capacity, capacity, 1), 1),
       admin_marked_status = case
         when is_day_block then 'unavailable'
         when admin_marked_status = 'full' then 'available'
         else admin_marked_status
       end
 where booked_count = 0;

-- And one that is held but was wrongly marked full can be booked into again
-- (matters for group cohorts with seats left).
update public.availability_slots
   set admin_marked_status = 'available'
 where not is_day_block
   and admin_marked_status = 'full'
   and booked_count < capacity;
