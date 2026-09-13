-- Delete dummy workshops with past availability
-- Workshop IDs to delete:
-- 'a1b2c3d4-0001-0001-0001-000000000001' = "Play it Right. Get Accepted" / "العب صح. اتقبل"
-- 'a1b2c3d4-0003-0003-0003-000000000003' = "Break the Loop" / "اكسر الدايرة"

-- First, delete all dependent records (cascade will handle some, but be explicit)
DELETE FROM public.bookings
WHERE session_id IN (
  SELECT id FROM public.sessions
  WHERE workshop_id IN (
    'a1b2c3d4-0001-0001-0001-000000000001',
    'a1b2c3d4-0003-0003-0003-000000000003'
  )
);

DELETE FROM public.time_slots
WHERE session_id IN (
  SELECT id FROM public.sessions
  WHERE workshop_id IN (
    'a1b2c3d4-0001-0001-0001-000000000001',
    'a1b2c3d4-0003-0003-0003-000000000003'
  )
);

DELETE FROM public.sessions
WHERE workshop_id IN (
  'a1b2c3d4-0001-0001-0001-000000000001',
  'a1b2c3d4-0003-0003-0003-000000000003'
);

-- Finally, delete the workshops themselves
DELETE FROM public.workshops
WHERE id IN (
  'a1b2c3d4-0001-0001-0001-000000000001',
  'a1b2c3d4-0003-0003-0003-000000000003'
);

-- Verify deletion
SELECT COUNT(*) as remaining_workshops FROM public.workshops
WHERE id IN (
  'a1b2c3d4-0001-0001-0001-000000000001',
  'a1b2c3d4-0003-0003-0003-000000000003'
);
