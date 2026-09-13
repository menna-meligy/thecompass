-- Create individual sessions (جلسة فردية) for each workshop
-- Individual sessions are for 1-on-1 coaching at 500 EGP
-- These serve as options in the availability assignment dropdown

BEGIN;

-- First, create individual sessions for each workshop if they don't exist
INSERT INTO public.sessions (
  workshop_id,
  type,
  price,
  capacity,
  status,
  starts_at,
  ends_at,
  location_or_link,
  created_at
)
SELECT
  w.id,
  'individual'::TEXT,
  500::NUMERIC,
  1,
  'published'::TEXT,
  NOW(),
  NOW() + INTERVAL '1 hour',
  'جلسة فردية' || ' - ' || w.title_ar,
  NOW()
FROM public.workshops w
WHERE NOT EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.workshop_id = w.id
      AND s.type = 'individual'
      AND s.status = 'published'
  )
ON CONFLICT DO NOTHING;

-- Verify the sessions were created
SELECT
  'Individual sessions created:' as status,
  COUNT(*) as count
FROM public.sessions
WHERE type = 'individual'
  AND status = 'published';

-- Also ensure old August slots are removed/unpublished (before September 1)
UPDATE public.availability_slots
SET status = 'archived'
WHERE date < '2026-09-01'
  AND status = 'published';

SELECT 'Old slots archived' as status;

COMMIT;
