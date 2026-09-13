-- Test data: Create sessions and availability slots for workshops

-- First, let's get the workshop IDs (adjust these based on actual data)
-- and create test sessions for them

-- Create test sessions for workshop 1
INSERT INTO public.sessions (
  workshop_id,
  type,
  price,
  capacity,
  starts_at,
  ends_at,
  location_or_link,
  status
) VALUES
(
  (SELECT id FROM public.workshops LIMIT 1),
  'group',
  500,
  8,
  '2026-09-15 14:00:00',
  '2026-09-15 16:00:00',
  'Online',
  'published'
),
(
  (SELECT id FROM public.workshops LIMIT 1),
  'individual',
  300,
  1,
  '2026-09-18 15:00:00',
  '2026-09-18 16:00:00',
  'Online',
  'published'
);

-- Create test sessions for workshop 2
INSERT INTO public.sessions (
  workshop_id,
  type,
  price,
  capacity,
  starts_at,
  ends_at,
  location_or_link,
  status
) VALUES
(
  (SELECT id FROM public.workshops OFFSET 1 LIMIT 1),
  'group',
  600,
  10,
  '2026-09-22 16:00:00',
  '2026-09-22 18:00:00',
  'Online',
  'published'
),
(
  (SELECT id FROM public.workshops OFFSET 1 LIMIT 1),
  'individual',
  350,
  1,
  '2026-09-25 14:00:00',
  '2026-09-25 15:00:00',
  'Online',
  'published'
);

-- Create test sessions for workshop 3
INSERT INTO public.sessions (
  workshop_id,
  type,
  price,
  capacity,
  starts_at,
  ends_at,
  location_or_link,
  status
) VALUES
(
  (SELECT id FROM public.workshops OFFSET 2 LIMIT 1),
  'group',
  550,
  8,
  '2026-09-20 17:00:00',
  '2026-09-20 19:00:00',
  'Online',
  'published'
),
(
  (SELECT id FROM public.workshops OFFSET 2 LIMIT 1),
  'individual',
  320,
  1,
  '2026-09-28 13:00:00',
  '2026-09-28 14:00:00',
  'Online',
  'published'
);

-- Create availability slots for September 2026 (matching user's screenshot)
-- Available slots (green)
INSERT INTO public.availability_slots (
  date,
  start_time,
  end_time,
  capacity,
  booked_count,
  admin_marked_status,
  status,
  created_by
) VALUES
('2026-09-06', '17:00:00', '18:00:00', 8, 0, 'available', 'published', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
('2026-09-08', '14:00:00', '15:00:00', 1, 0, 'available', 'published', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
('2026-09-09', '15:00:00', '16:00:00', 8, 2, 'available', 'published', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
('2026-09-12', '16:00:00', '17:00:00', 1, 0, 'available', 'published', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
('2026-09-14', '17:00:00', '18:00:00', 8, 1, 'available', 'published', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
('2026-09-15', '14:00:00', '15:00:00', 8, 3, 'available', 'published', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
('2026-09-16', '15:00:00', '16:00:00', 1, 0, 'available', 'published', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
('2026-09-18', '16:00:00', '17:00:00', 10, 2, 'available', 'published', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
('2026-09-20', '17:00:00', '18:00:00', 8, 0, 'available', 'published', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1));

-- Full slots (red)
INSERT INTO public.availability_slots (
  date,
  start_time,
  end_time,
  capacity,
  booked_count,
  admin_marked_status,
  status,
  created_by
) VALUES
('2026-09-07', '17:00:00', '18:00:00', 8, 8, 'full', 'published', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
('2026-09-10', '15:00:00', '16:00:00', 1, 1, 'full', 'published', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
('2026-09-13', '14:00:00', '15:00:00', 8, 8, 'full', 'published', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
('2026-09-17', '16:00:00', '17:00:00', 1, 1, 'full', 'published', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
('2026-09-21', '15:00:00', '16:00:00', 10, 10, 'full', 'published', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
('2026-09-22', '16:00:00', '17:00:00', 8, 8, 'full', 'published', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1));

-- Unavailable slots
INSERT INTO public.availability_slots (
  date,
  start_time,
  end_time,
  capacity,
  booked_count,
  admin_marked_status,
  status,
  created_by
) VALUES
('2026-09-11', '14:00:00', '15:00:00', 8, 0, 'unavailable', 'published', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
('2026-09-19', '17:00:00', '18:00:00', 1, 0, 'unavailable', 'published', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)),
('2026-09-23', '15:00:00', '16:00:00', 8, 0, 'unavailable', 'published', (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1));

-- Link slots to the first 3 sessions created above
-- Get the sessions we just created and link them to availability slots
INSERT INTO public.slot_assignments (slot_id, session_id)
SELECT
  (SELECT id FROM public.availability_slots WHERE date = '2026-09-15' AND start_time = '14:00:00' LIMIT 1),
  (SELECT id FROM public.sessions WHERE type = 'group' ORDER BY created_at DESC LIMIT 1);

INSERT INTO public.slot_assignments (slot_id, session_id)
SELECT
  (SELECT id FROM public.availability_slots WHERE date = '2026-09-18' AND start_time = '16:00:00' LIMIT 1),
  (SELECT id FROM public.sessions WHERE type = 'individual' ORDER BY created_at DESC LIMIT 1);

INSERT INTO public.slot_assignments (slot_id, session_id)
SELECT
  (SELECT id FROM public.availability_slots WHERE date = '2026-09-22' AND start_time = '16:00:00' LIMIT 1),
  (SELECT id FROM public.sessions WHERE workshop_id = (SELECT id FROM public.workshops OFFSET 1 LIMIT 1) LIMIT 1);

INSERT INTO public.slot_assignments (slot_id, session_id)
SELECT
  (SELECT id FROM public.availability_slots WHERE date = '2026-09-20' AND start_time = '17:00:00' LIMIT 1),
  (SELECT id FROM public.sessions WHERE workshop_id = (SELECT id FROM public.workshops OFFSET 2 LIMIT 1) LIMIT 1);
