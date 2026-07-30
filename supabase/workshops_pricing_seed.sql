-- ============================================================
-- Workshop pricing — aligns session prices with the official
-- PDF pricing (EGP). Safe to run on an already-seeded database
-- (idempotent: matches by workshop_id + session type).
--
-- Model: each workshop has two bookable sessions —
--   type 'group'      = "الورشة الكاملة" (full multi-session workshop)
--   type 'individual' = "جلسة فردية" (single session)
-- ============================================================

-- ── Break the Loop / اكسر الحلقة ─────────────────────────────
-- Full workshop (6 sessions): 1500 EGP  |  Single session: 300 EGP
UPDATE public.sessions
   SET price = 1500
 WHERE workshop_id = 'a1b2c3d4-0003-0003-0003-000000000003'
   AND type = 'group';

UPDATE public.sessions
   SET price = 300
 WHERE workshop_id = 'a1b2c3d4-0003-0003-0003-000000000003'
   AND type = 'individual';

-- ── Play it Right. Get Accepted / العب صح. اتقبل ─────────────
-- Full workshop (5 sessions): 1150 EGP  |  Single session: 250 EGP
-- Limited to 5 seats (العدد محدود.. متاح 5 أماكن فقط)
UPDATE public.sessions
   SET price = 1150, capacity = 5
 WHERE workshop_id = 'a1b2c3d4-0001-0001-0001-000000000001'
   AND type = 'group';

UPDATE public.sessions
   SET price = 250
 WHERE workshop_id = 'a1b2c3d4-0001-0001-0001-000000000001'
   AND type = 'individual';

UPDATE public.workshops
   SET spots_available = 5
 WHERE id = 'a1b2c3d4-0001-0001-0001-000000000001';
