-- Track payment deadline and reminder state for pending bookings
-- Enables 24-hour payment window with 12-hour reminders before cancellation
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS payment_reminder_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_cancelled_at timestamptz;

-- Index to efficiently find bookings needing payment reminders
CREATE INDEX IF NOT EXISTS idx_bookings_payment_deadline
  ON public.bookings(payment_deadline)
  WHERE status = 'pending' AND payment_cancelled_at IS NULL;
