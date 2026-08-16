-- Track which pre-session reminder emails have already gone out for a booking,
-- so the cron (/api/cron/reminders) never double-sends. NULL = not sent yet.
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS reminder_1d_sent_at  timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_30m_sent_at timestamptz;
