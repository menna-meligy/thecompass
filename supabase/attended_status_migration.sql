-- ============================================================
-- Allow 'attended' as a booking status (2026-09-15)
--
-- /api/admin/bookings/action writes status='attended' when the coach marks a
-- client as having shown up, but bookings_status_check only permitted
-- pending|confirmed|cancelled|completed — so the "حضر / Attended" button failed
-- outright with a check-constraint violation and no booking could ever leave
-- 'confirmed'.
--
-- That also kept the per-session notes channel invisible: both the admin's
-- mentor-notes form and the client's reflections/notes only render for a
-- finished booking.
--
-- Idempotent.
-- ============================================================

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('pending', 'confirmed', 'attended', 'cancelled', 'completed'));
