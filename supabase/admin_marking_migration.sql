-- Add admin_marked_status to availability_slots for color-coding calendar
-- 'available' = green (available for booking)
-- 'full' = red (fully booked/unavailable)
-- 'unavailable' = red (admin marked as unavailable)

ALTER TABLE public.availability_slots
ADD COLUMN admin_marked_status TEXT
CHECK (admin_marked_status IN ('available', 'full', 'unavailable'))
DEFAULT 'available';

-- Create index for efficient filtering by status
CREATE INDEX IF NOT EXISTS idx_availability_slots_admin_status
ON public.availability_slots(admin_marked_status);

-- Ensure Career Deciding Session exists (one-time recurring session)
-- Create as individual session type with special handling
INSERT INTO public.sessions (
  id,
  workshop_id,
  type,
  price,
  capacity,
  status
)
SELECT
  'career-deciding-session'::uuid,
  workshops.id,
  'individual',
  500,
  1,
  'published'
FROM public.workshops
WHERE workshops.title_en LIKE '%Career%' OR workshops.title_ar LIKE '%قرار%'
LIMIT 1
ON CONFLICT DO NOTHING;

-- If no Career workshop exists, create Career Deciding as standalone
INSERT INTO public.sessions (
  id,
  type,
  price,
  capacity,
  status
)
SELECT
  'career-deciding-session'::uuid,
  'individual',
  500,
  1,
  'published'
WHERE NOT EXISTS (
  SELECT 1 FROM public.sessions WHERE id = 'career-deciding-session'::uuid
);
