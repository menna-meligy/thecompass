-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Workshops
CREATE TABLE IF NOT EXISTS public.workshops (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  description_ar TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  topic TEXT NOT NULL,
  image_url TEXT,
  outline_en JSONB DEFAULT '[]'::jsonb,
  outline_ar JSONB DEFAULT '[]'::jsonb,
  end_goals_en JSONB DEFAULT '[]'::jsonb,
  end_goals_ar JSONB DEFAULT '[]'::jsonb,
  target_audience_en TEXT,
  target_audience_ar TEXT,
  spots_available INTEGER,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sessions
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workshop_id UUID NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('group', 'individual')),
  price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  capacity INTEGER NOT NULL DEFAULT 10,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  location_or_link TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Time Slots
CREATE TABLE IF NOT EXISTS public.time_slots (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  booked_count INTEGER NOT NULL DEFAULT 0,
  capacity INTEGER NOT NULL DEFAULT 1
);

-- Bookings
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  time_slot_id UUID REFERENCES public.time_slots(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payments
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EGP',
  method TEXT NOT NULL CHECK (method IN ('paymob', 'instapay', 'vodafone_cash')),
  gateway_txn_id TEXT,
  proof_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'pending_verification', 'refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Discount Codes
CREATE TABLE IF NOT EXISTS public.discount_codes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('percent', 'fixed')),
  value NUMERIC(10, 2) NOT NULL,
  max_uses INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Announcements
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  body_ar TEXT NOT NULL,
  body_en TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vlogs
CREATE TABLE IF NOT EXISTS public.vlogs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  description_ar TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Session Materials
CREATE TABLE IF NOT EXISTS public.session_materials (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  content_ar TEXT,
  content_en TEXT,
  file_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Roadmap Progress
CREATE TABLE IF NOT EXISTS public.roadmap_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  completed_count INTEGER NOT NULL DEFAULT 0,
  badges JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vlogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_progress ENABLE ROW LEVEL SECURITY;

-- Admin check helper — SECURITY DEFINER so it bypasses RLS and avoids the
-- "infinite recursion detected in policy for relation profiles" error that
-- occurs when a profiles policy queries profiles inline.
CREATE OR REPLACE FUNCTION public.is_admin()
  RETURNS boolean
  LANGUAGE sql
  SECURITY DEFINER
  STABLE
  SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Allow profile creation on signup" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Workshops policies
CREATE POLICY "Anyone can view published workshops" ON public.workshops
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage workshops" ON public.workshops
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Sessions policies
CREATE POLICY "Anyone can view published sessions" ON public.sessions
  FOR SELECT USING (status = 'published' OR status = 'completed');

CREATE POLICY "Admins can view all sessions" ON public.sessions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage sessions" ON public.sessions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Time slots policies
CREATE POLICY "Anyone can view time slots" ON public.time_slots
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage time slots" ON public.time_slots
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Bookings policies
CREATE POLICY "Users can view their own bookings" ON public.bookings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all bookings" ON public.bookings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Authenticated users can create bookings" ON public.bookings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update bookings" ON public.bookings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Payments policies
CREATE POLICY "Users can view their own payments" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all payments" ON public.payments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Authenticated users can create payments" ON public.payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update payments" ON public.payments
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Discount codes policies
CREATE POLICY "Active codes are visible to authenticated users" ON public.discount_codes
  FOR SELECT USING (auth.uid() IS NOT NULL AND is_active = true);

CREATE POLICY "Admins can manage discount codes" ON public.discount_codes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Announcements policies
CREATE POLICY "Anyone can view active announcements" ON public.announcements
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage announcements" ON public.announcements
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Vlogs policies
CREATE POLICY "Anyone can view vlogs" ON public.vlogs
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage vlogs" ON public.vlogs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Session materials policies
CREATE POLICY "Users can view materials for their bookings" ON public.session_materials
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.bookings WHERE id = booking_id AND user_id = auth.uid())
  );

CREATE POLICY "Admins can manage session materials" ON public.session_materials
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Roadmap progress policies
CREATE POLICY "Users can view their own roadmap" ON public.roadmap_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own roadmap" ON public.roadmap_progress
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Allow roadmap creation" ON public.roadmap_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all roadmaps" ON public.roadmap_progress
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );

  INSERT INTO public.roadmap_progress (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update roadmap progress when booking is completed
CREATE OR REPLACE FUNCTION public.handle_booking_completed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE public.roadmap_progress
    SET
      completed_count = completed_count + 1,
      xp = xp + 100,
      level = GREATEST(1, FLOOR((xp + 100) / 500) + 1)
    WHERE user_id = NEW.user_id;

    -- Add badge if milestones reached
    UPDATE public.roadmap_progress
    SET badges = badges || jsonb_build_object(
      'id', uuid_generate_v4(),
      'name', 'First Session',
      'icon', '🎯',
      'earned_at', NOW()
    )::jsonb
    WHERE user_id = NEW.user_id AND completed_count = 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_booking_completed ON public.bookings;
CREATE TRIGGER on_booking_completed
  AFTER UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.handle_booking_completed();

-- ============================================================
-- GRANTS — hosted Supabase auto-grants these to anon/authenticated,
-- but a self-managed / local stack needs them explicitly. RLS above
-- still restricts which rows each role can actually see.
-- ============================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

-- ============================================================
-- SEED DATA
-- ============================================================

-- Note: Run this after creating your admin user in Supabase Auth
-- Replace the UUIDs below with actual auth user IDs

-- Real workshops (only "Start Ahead. Stay Ahead" - dummy workshops removed)
INSERT INTO public.workshops (id, title_ar, title_en, description_ar, description_en, topic, image_url, target_audience_en, target_audience_ar, spots_available, outline_en, outline_ar, end_goals_en, end_goals_ar, created_by)
VALUES
  (
    'a1b2c3d4-0002-0002-0002-000000000002',
    'ابدأ قبل. استمر أمام',
    'Start Ahead. Stay Ahead',
    'إنت مش محتاج تختار كلية... إنت محتاج تفهم مستقبلك قبل ما تختاره. معظم الناس بتدخل كلية وبعدين تكتشف إنها مش ليها. إنت هنا بتعمل العكس: تشوف المجالات الأول… وبعدين تختار بينهم.',
    'You don''t need to choose a college. You need to understand your future before you choose it. Most people enter a field then discover it''s not for them. Here you do the opposite: explore the fields first, then choose between them.',
    'career-discovery',
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800',
    '1st/2nd year high school · Gap Year students · 1st/2nd year university',
    'أولى / تانية ثانوي · Gap Year · أولى / تانية جامعة',
    5,
    '[
      {"session": "Session 1", "title": "Self-Discovery", "bullets": ["Understanding your personality", "Mapping your interests", "Identifying your strengths"]},
      {"session": "Session 2", "title": "Future Simulation: Explore Paths", "bullets": ["Different fields and what life looks like in each", "Work and travel opportunities per field", "A real mentor from each field answers all your questions"]},
      {"session": "Session 3", "title": "Build Strong Activities (Not Random Ones)", "bullets": ["Not just any activities, meaningful ones", "Projects that matter", "Volunteering with purpose", "Real experiences that build your story"]},
      {"session": "Session 4", "title": "Academic Guidance", "bullets": ["Choosing the right major for you", "Choosing a university and country", "Understanding application requirements"]},
      {"session": "Session 5", "title": "Thinking & Analysis Skills", "bullets": ["Critical thinking", "Decision making", "Problem solving"]},
      {"session": "Ongoing", "title": "Continuous Follow-Up", "bullets": ["Progress review sessions", "Course correction when needed", "Continuous support throughout"]}
    ]'::jsonb,
    '[
      {"session": "الجلسة 1", "title": "اكتشاف الذات", "bullets": ["بنبدأ نفهم شخصيتك", "اهتماماتك", "نقاط قوتك"]},
      {"session": "الجلسة 2", "title": "استكشاف المسارات (Future Simulation)", "bullets": ["مجالات مختلفة وشكل الحياة في كل مجال", "فرص الشغل والسفر", "Mentor من المجال نفسه جاهز لكل أسئلتك"]},
      {"session": "الجلسة 3", "title": "بناء Activities قوية، مش عشوائية", "bullets": ["مش Activities عشوائية", "Projects حقيقية", "Volunteering بهدف", "Experiences تبني قصتك"]},
      {"session": "الجلسة 4", "title": "توجيه أكاديمي", "bullets": ["اختيار تخصص مناسب", "اختيار جامعة/دولة", "فهم متطلبات التقديم"]},
      {"session": "الجلسة 5", "title": "مهارات التفكير والتحليل", "bullets": ["تفكير نقدي", "اتخاذ القرار", "حل المشاكل"]},
      {"session": "مستمر", "title": "متابعة مستمرة", "bullets": ["مراجعة تقدمك", "تعديل المسار", "دعم مستمر"]}
    ]'::jsonb,
    '["Know yourself and your interests with full clarity", "A determined major and suitable path chosen for you", "Real activities that strengthen your CV", "A deep early understanding of the job market"]'::jsonb,
    '["عارف نفسك واهتماماتك بوضوح", "محدد تخصص ومسار مناسب ليك", "عندك Activities حقيقية تقوي الـ CV", "فاهم سوق العمل بدري جداً"]'::jsonb,
    NULL
  )
ON CONFLICT (id) DO NOTHING;

-- Demo sessions removed - sessions will be created via admin availability management

-- Demo vlogs

-- Demo discount codes
INSERT INTO public.discount_codes (id, code, type, value, max_uses, expires_at, is_active)
VALUES
  (
    'd1b2c3d4-0001-0001-0001-000000000001',
    'WELCOME20',
    'percent',
    20,
    100,
    NOW() + INTERVAL '90 days',
    true
  ),
  (
    'd1b2c3d4-0002-0002-0002-000000000002',
    'SAVE200',
    'fixed',
    200,
    50,
    NOW() + INTERVAL '30 days',
    true
  )
ON CONFLICT (id) DO NOTHING;

-- Demo announcements
INSERT INTO public.announcements (id, title_ar, title_en, body_ar, body_en, is_active)
VALUES
  (
    'e1b2c3d4-0001-0001-0001-000000000001',
    'مرحباً بك في البوصلة!',
    'Welcome to The Compass!',
    'نحن سعداء بانضمامك إلى مجتمع البوصلة. استخدم كود WELCOME20 للحصول على خصم 20% على أول جلسة.',
    'Welcome to The Compass community. Use code WELCOME20 for 20% off your first session.',
    true
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STORAGE: Create 'proofs' bucket in Supabase dashboard:
--   Storage tab → New bucket → name: proofs → Public: ON
-- ============================================================

-- ============================================================
-- MAKE YOURSELF ADMIN (run after signing up):
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'your-email@example.com';
-- ============================================================

-- Enforce one compass assessment per client per 30 days at the DB level.
-- Backstop for the UI/eligibility gate — prevents bypass via direct insert/API.

CREATE OR REPLACE FUNCTION public.enforce_assessment_cooldown()
RETURNS TRIGGER AS $$
DECLARE
  last_at timestamptz;
BEGIN
  SELECT max(coalesce(completed_at, created_at)) INTO last_at
  FROM public.assessments
  WHERE client_id = NEW.client_id;

  IF last_at IS NOT NULL
     AND (coalesce(NEW.completed_at, now()) - last_at) < interval '30 days' THEN
    RAISE EXCEPTION 'assessment_cooldown: one reading allowed every 30 days (last was %)', last_at
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_assessment_cooldown ON public.assessments;
CREATE TRIGGER trg_assessment_cooldown
  BEFORE INSERT ON public.assessments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_assessment_cooldown();

-- Availability tables for Al-Bosla admin scheduling
-- Run this in Supabase Dashboard > SQL Editor

-- Weekly availability rules (e.g., "Every Monday 10:00-12:00")
CREATE TABLE IF NOT EXISTS availability_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
  start_time time NOT NULL,
  end_time time NOT NULL,
  session_duration_minutes integer NOT NULL DEFAULT 60,
  buffer_minutes integer NOT NULL DEFAULT 15,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Date-specific exceptions (block a day, or add a one-off slot)
CREATE TABLE IF NOT EXISTS availability_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exception_date date NOT NULL,
  exception_type text NOT NULL CHECK (exception_type IN ('blocked', 'extra')),
  start_time time,  -- only for 'extra' type
  end_time time,    -- only for 'extra' type
  reason text,
  created_at timestamptz DEFAULT now()
);

-- Booking settings (single row)
CREATE TABLE IF NOT EXISTS availability_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- enforce single row
  max_advance_days integer NOT NULL DEFAULT 60,      -- how far ahead clients can book
  min_advance_hours integer NOT NULL DEFAULT 24,     -- minimum notice required
  max_bookings_per_day integer NOT NULL DEFAULT 5,
  auto_confirm boolean NOT NULL DEFAULT false,       -- auto-confirm on proof submit
  updated_at timestamptz DEFAULT now()
);

INSERT INTO availability_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- RLS: only admin can manage these tables
ALTER TABLE availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_availability_rules" ON availability_rules
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_all_availability_exceptions" ON availability_exceptions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_all_availability_settings" ON availability_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Allow clients to read availability_rules (for booking UI)
CREATE POLICY "public_read_availability_rules" ON availability_rules
  FOR SELECT USING (is_active = true);

CREATE POLICY "public_read_availability_exceptions" ON availability_exceptions
  FOR SELECT USING (true);

-- Update trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER availability_rules_updated_at
  BEFORE UPDATE ON availability_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER availability_settings_updated_at
  BEFORE UPDATE ON availability_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- BOOKING WORKFLOW MIGRATION
-- Enhances bookings for centralized availability slots with
-- receipt upload, admin approval, and Google Meet integration
-- ============================================================

-- 1. Add slot_id to bookings table (alongside session_id for backwards compatibility)
ALTER TABLE IF EXISTS public.bookings ADD COLUMN slot_id UUID REFERENCES public.availability_slots(id) ON DELETE CASCADE;

-- 2. Add Google Meet link and approval tracking to bookings
ALTER TABLE IF EXISTS public.bookings ADD COLUMN google_meet_link TEXT;
ALTER TABLE IF EXISTS public.bookings ADD COLUMN scheduled_at TIMESTAMPTZ;

-- 3. Add admin approval fields to payments table
ALTER TABLE IF EXISTS public.payments
  ADD COLUMN IF NOT EXISTS admin_notes_ar TEXT,
  ADD COLUMN IF NOT EXISTS admin_notes_en TEXT,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS receipt_image_url TEXT;

-- 4. Update payments status to include manual approval workflow
-- The check constraint already includes 'pending_verification', which covers manual review

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_slot_id ON public.bookings(slot_id);
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled_at ON public.bookings(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_payments_approved_by ON public.payments(approved_by);
CREATE INDEX IF NOT EXISTS idx_payments_approved_at ON public.payments(approved_at);

-- 6. Create function to increment booked_count on availability_slots when a booking is created
CREATE OR REPLACE FUNCTION update_slot_booked_count()
RETURNS TRIGGER AS $$
BEGIN
  -- When a booking is created and confirmed, increment booked_count
  IF NEW.status = 'confirmed' AND OLD.status IS DISTINCT FROM 'confirmed' THEN
    UPDATE public.availability_slots
    SET booked_count = booked_count + 1
    WHERE id = NEW.slot_id;
  END IF;

  -- When a booking is cancelled/removed, decrement booked_count
  IF NEW.status IN ('cancelled', 'completed') AND OLD.status NOT IN ('cancelled', 'completed') THEN
    UPDATE public.availability_slots
    SET booked_count = GREATEST(booked_count - 1, 0)
    WHERE id = NEW.slot_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop old trigger if exists and create new one
DROP TRIGGER IF EXISTS update_slot_booked_count_trigger ON public.bookings;
CREATE TRIGGER update_slot_booked_count_trigger
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_slot_booked_count();

-- 7. Create function to prevent overbooking (slot at capacity)
CREATE OR REPLACE FUNCTION check_slot_capacity()
RETURNS TRIGGER AS $$
DECLARE
  v_capacity INTEGER;
  v_booked_count INTEGER;
BEGIN
  IF NEW.slot_id IS NOT NULL THEN
    SELECT capacity, booked_count INTO v_capacity, v_booked_count
    FROM public.availability_slots
    WHERE id = NEW.slot_id;

    IF v_booked_count >= v_capacity THEN
      RAISE EXCEPTION 'This time slot is at full capacity';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop old trigger if exists and create new one
DROP TRIGGER IF EXISTS check_slot_capacity_trigger ON public.bookings;
CREATE TRIGGER check_slot_capacity_trigger
  BEFORE INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION check_slot_capacity();

-- 8. Update RLS policies for bookings to support new workflow
ALTER TABLE IF EXISTS public.bookings ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can view all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can manage all bookings" ON public.bookings;

-- Create new policies
CREATE POLICY "Users can view their own bookings" ON public.bookings
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all bookings" ON public.bookings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can create bookings" ON public.bookings
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all bookings" ON public.bookings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 9. Update RLS for payments table for admin approval
DROP POLICY IF EXISTS "Users can view their payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can view and approve payments" ON public.payments;

CREATE POLICY "Users can view their own payments" ON public.payments
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view and approve all payments" ON public.payments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can update their own payments" ON public.payments
  FOR UPDATE USING (user_id = auth.uid());

-- ============================================================
-- CENTRALIZED AVAILABILITY CALENDAR MIGRATION
-- Creates a master calendar system where admins create slots once
-- and assign them to multiple workshops/sessions
-- ============================================================

-- 1. Create master availability slots table
CREATE TABLE IF NOT EXISTS public.availability_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 1,
  booked_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(date, start_time, end_time)
);

-- 2. Create slot assignments table (links slots to sessions/workshops)
CREATE TABLE IF NOT EXISTS public.slot_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slot_id UUID NOT NULL REFERENCES public.availability_slots(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  workshop_id UUID REFERENCES public.workshops(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (session_id IS NOT NULL OR workshop_id IS NOT NULL)
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_availability_slots_date ON public.availability_slots(date);
CREATE INDEX IF NOT EXISTS idx_availability_slots_created_by ON public.availability_slots(created_by);
CREATE INDEX IF NOT EXISTS idx_slot_assignments_slot ON public.slot_assignments(slot_id);
CREATE INDEX IF NOT EXISTS idx_slot_assignments_session ON public.slot_assignments(session_id);
CREATE INDEX IF NOT EXISTS idx_slot_assignments_workshop ON public.slot_assignments(workshop_id);

-- 4. Enable RLS
ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slot_assignments ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for availability_slots
CREATE POLICY "Anyone can view availability slots" ON public.availability_slots
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage availability slots" ON public.availability_slots
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 6. RLS Policies for slot_assignments
CREATE POLICY "Anyone can view slot assignments" ON public.slot_assignments
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage slot assignments" ON public.slot_assignments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 7. Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_availability_slots_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_availability_slots_timestamp_trigger ON public.availability_slots;
CREATE TRIGGER update_availability_slots_timestamp_trigger
  BEFORE UPDATE ON public.availability_slots
  FOR EACH ROW
  EXECUTE FUNCTION update_availability_slots_timestamp();

-- ============================================================
-- COMPASS SELF-ASSESSMENT TABLES
-- ============================================================

-- assessments: one row per completed assessment per user
CREATE TABLE IF NOT EXISTS public.assessments (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id      UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  locale         TEXT NOT NULL DEFAULT 'ar',
  completed_at   TIMESTAMPTZ,
  dimension_scores JSONB,          -- {HAP, DIR, PRD, CNF, COM, NRG} each 1.0–4.0
  happiness_score  NUMERIC(4,2),   -- avg of HAP + NRG
  recommended_type TEXT,           -- 'workshop' | 'session'
  recommended_workshop_id UUID REFERENCES public.workshops(id) ON DELETE SET NULL,
  result_snapshot JSONB,           -- immutable snapshot of the full reading
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own assessments" ON public.assessments
  FOR ALL USING (auth.uid() = client_id);

CREATE POLICY "Admins can read all assessments" ON public.assessments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Index for fast "latest assessment" lookups
CREATE INDEX IF NOT EXISTS idx_assessments_client_completed
  ON public.assessments (client_id, completed_at DESC);

-- Run this in Supabase Dashboard > SQL Editor
-- Allows general coaching bookings (no specific session/workshop)

ALTER TABLE public.bookings ALTER COLUMN session_id DROP NOT NULL;

-- Create payment-proofs storage bucket (public read for receipt display)
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload proofs
CREATE POLICY "Authenticated can upload proofs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'payment-proofs');

-- Allow public read of proofs
CREATE POLICY "Public can read proofs"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'payment-proofs');

-- ============================================================
-- MANUAL PAYMENT APPROVAL MIGRATION
-- Adds admin manual approval capability for session payments
-- ============================================================

-- Add admin_approved and admin_approval_notes columns to payments table
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS admin_approved BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS admin_approval_notes_ar TEXT,
ADD COLUMN IF NOT EXISTS admin_approval_notes_en TEXT,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Create index for admin approval queries
CREATE INDEX IF NOT EXISTS idx_payments_admin_approved ON public.payments (admin_approved);
CREATE INDEX IF NOT EXISTS idx_payments_approved_by ON public.payments (approved_by);
CREATE INDEX IF NOT EXISTS idx_payments_approved_at ON public.payments (approved_at DESC);

-- Update RLS policies to allow admins to update admin_approved field
DROP POLICY IF EXISTS "Admins can update any payment" ON public.payments;

CREATE POLICY "Admins can update any payment" ON public.payments
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- BIDIRECTIONAL NOTES SYSTEM MIGRATION
-- Phase 1: Database Schema Enhancement
-- ============================================================

-- ── 1. Enhance session_reflections table ────────────────────────────────────
-- Add new columns to track publication, mentor notes, and timestamps
ALTER TABLE public.session_reflections
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS mentor_notes_ar TEXT,
ADD COLUMN IF NOT EXISTS mentor_notes_en TEXT,
ADD COLUMN IF NOT EXISTS status VARCHAR NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived'));

-- ── 2. Create client_notes table ────────────────────────────────────────────
-- Bidirectional notes from clients about their sessions
CREATE TABLE IF NOT EXISTS public.client_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_ar TEXT,
  content_en TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(booking_id, is_public)
);

-- ── 3. Create notes_audit_log table ─────────────────────────────────────────
-- Complete audit trail for all note changes
CREATE TABLE IF NOT EXISTS public.notes_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name VARCHAR NOT NULL,
  record_id UUID NOT NULL,
  action VARCHAR NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  old_data JSONB,
  new_data JSONB
);

-- ── 4. Enable RLS ───────────────────────────────────────────────────────────
ALTER TABLE public.client_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes_audit_log ENABLE ROW LEVEL SECURITY;

-- ── 5. RLS Policies for client_notes ────────────────────────────────────────

-- Clients can read their own client_notes
CREATE POLICY "Clients can read their own notes" ON public.client_notes
  FOR SELECT USING (auth.uid() = client_id);

-- Clients can write their own client_notes
CREATE POLICY "Clients can create and update their own notes" ON public.client_notes
  FOR INSERT WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can update their own notes" ON public.client_notes
  FOR UPDATE USING (auth.uid() = client_id);

-- Admins can read all client_notes
CREATE POLICY "Admins can read all client notes" ON public.client_notes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can manage client_notes
CREATE POLICY "Admins can manage client notes" ON public.client_notes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── 6. Enhanced RLS Policies for session_reflections ────────────────────────

-- Clients can read public reflections (when is_public = true)
CREATE POLICY "Clients can read their public reflections" ON public.session_reflections
  FOR SELECT USING (
    auth.uid() = client_id AND is_public = true
  );

-- Clients can read all their own reflections (including private)
CREATE POLICY "Clients can read all their reflections" ON public.session_reflections
  FOR SELECT USING (auth.uid() = client_id);

-- Admins can read all reflections
CREATE POLICY "Admins can read all reflections (updated)" ON public.session_reflections
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can update session_reflections (publish, add mentor notes, change status)
CREATE POLICY "Admins can update reflections (updated)" ON public.session_reflections
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── 7. RLS Policies for notes_audit_log ─────────────────────────────────────

-- Admins can read audit logs
CREATE POLICY "Admins can read audit logs" ON public.notes_audit_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- System (SECURITY DEFINER) can insert audit logs
CREATE POLICY "System can insert audit logs" ON public.notes_audit_log
  FOR INSERT WITH CHECK (true);

-- ── 8. Audit trigger for session_reflections ───────────────────────────────

CREATE OR REPLACE FUNCTION public.audit_session_reflections()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notes_audit_log (
      table_name, record_id, action, changed_by, new_data
    ) VALUES (
      'session_reflections',
      NEW.id,
      'INSERT',
      auth.uid(),
      to_jsonb(NEW)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.notes_audit_log (
      table_name, record_id, action, changed_by, old_data, new_data
    ) VALUES (
      'session_reflections',
      NEW.id,
      'UPDATE',
      auth.uid(),
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.notes_audit_log (
      table_name, record_id, action, changed_by, old_data
    ) VALUES (
      'session_reflections',
      OLD.id,
      'DELETE',
      auth.uid(),
      to_jsonb(OLD)
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_session_reflections_trigger ON public.session_reflections;
CREATE TRIGGER audit_session_reflections_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.session_reflections
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_session_reflections();

-- ── 9. Audit trigger for client_notes ───────────────────────────────────────

CREATE OR REPLACE FUNCTION public.audit_client_notes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notes_audit_log (
      table_name, record_id, action, changed_by, new_data
    ) VALUES (
      'client_notes',
      NEW.id,
      'INSERT',
      auth.uid(),
      to_jsonb(NEW)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.notes_audit_log (
      table_name, record_id, action, changed_by, old_data, new_data
    ) VALUES (
      'client_notes',
      NEW.id,
      'UPDATE',
      auth.uid(),
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.notes_audit_log (
      table_name, record_id, action, changed_by, old_data
    ) VALUES (
      'client_notes',
      OLD.id,
      'DELETE',
      auth.uid(),
      to_jsonb(OLD)
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_client_notes_trigger ON public.client_notes;
CREATE TRIGGER audit_client_notes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.client_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_client_notes();

-- ── 10. Indexes for performance ──────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_client_notes_booking ON public.client_notes (booking_id);
CREATE INDEX IF NOT EXISTS idx_client_notes_client ON public.client_notes (client_id);
CREATE INDEX IF NOT EXISTS idx_client_notes_public ON public.client_notes (is_public);
CREATE INDEX IF NOT EXISTS idx_client_notes_updated ON public.client_notes (updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_session_reflections_client ON public.session_reflections (client_id);
CREATE INDEX IF NOT EXISTS idx_session_reflections_public ON public.session_reflections (is_public);
CREATE INDEX IF NOT EXISTS idx_session_reflections_status ON public.session_reflections (status);
CREATE INDEX IF NOT EXISTS idx_session_reflections_updated ON public.session_reflections (updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_notes_audit_log_table ON public.notes_audit_log (table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_notes_audit_log_changed ON public.notes_audit_log (changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_audit_log_user ON public.notes_audit_log (changed_by);

-- ── 11. GRANTS ──────────────────────────────────────────────────────────────
-- Allow authenticated users and anon to use the new tables within RLS constraints

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.client_notes TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.client_notes TO authenticated;
GRANT SELECT ON public.notes_audit_log TO authenticated;
GRANT INSERT ON public.notes_audit_log TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

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

-- Track which pre-session reminder emails have already gone out for a booking,
-- so the cron (/api/cron/reminders) never double-sends. NULL = not sent yet.
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS reminder_1d_sent_at  timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_30m_sent_at timestamptz;

-- Add track column: mentee (client's goals), mentor (coach's notes), session (booking milestone)
ALTER TABLE public.user_tasks
  ADD COLUMN IF NOT EXISTS track TEXT NOT NULL DEFAULT 'mentee'
  CHECK (track IN ('mentee', 'mentor', 'session'));

ALTER TABLE public.user_tasks
  ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS user_tasks_track_idx ON public.user_tasks (user_id, track);

-- Allow admins to read/write any user's tasks (for mentor track)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_tasks' AND policyname = 'Admins can manage all user_tasks'
  ) THEN
    CREATE POLICY "Admins can manage all user_tasks"
      ON public.user_tasks FOR ALL
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;

-- ============================================================
-- SESSION NOTES MIGRATION (Phase 3: Bidirectional Notes)
-- Run after skills_migration.sql
-- ============================================================

-- ── 1. Client notes (client public and private notes) ──────────────────────
-- This table stores session notes that clients attach to their bookings

CREATE TABLE IF NOT EXISTS public.client_notes (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id        UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  client_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_ar        TEXT NOT NULL,
  content_en        TEXT NOT NULL,
  is_public         BOOLEAN NOT NULL DEFAULT false,  -- true = visible to mentor/admin, false = private
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT client_notes_belongs_to_client CHECK (client_id = (SELECT user_id FROM public.bookings WHERE id = booking_id))
);

-- ── 2. Update session_reflections to include mentor notes and status ──────────

ALTER TABLE public.session_reflections
  ADD COLUMN IF NOT EXISTS mentor_notes_ar TEXT,
  ADD COLUMN IF NOT EXISTS mentor_notes_en TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'published')),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ── 3. Indexes ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_client_notes_booking ON public.client_notes (booking_id);
CREATE INDEX IF NOT EXISTS idx_client_notes_client ON public.client_notes (client_id);
CREATE INDEX IF NOT EXISTS idx_client_notes_created_at ON public.client_notes (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_notes_is_public ON public.client_notes (is_public);
CREATE INDEX IF NOT EXISTS idx_session_reflections_booking ON public.session_reflections (booking_id);
CREATE INDEX IF NOT EXISTS idx_session_reflections_client ON public.session_reflections (client_id);
CREATE INDEX IF NOT EXISTS idx_session_reflections_status ON public.session_reflections (status);

-- ── 4. RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE public.client_notes ENABLE ROW LEVEL SECURITY;

-- client_notes: clients can read/write their own (both public and private),
--               admins can read all public notes and manage all notes
CREATE POLICY "Clients can read their own notes" ON public.client_notes
  FOR SELECT USING (auth.uid() = client_id);

CREATE POLICY "Admins can read all notes" ON public.client_notes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Clients can create notes" ON public.client_notes
  FOR INSERT WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can update their own notes" ON public.client_notes
  FOR UPDATE USING (auth.uid() = client_id);

CREATE POLICY "Clients can delete their own notes" ON public.client_notes
  FOR DELETE USING (auth.uid() = client_id);

-- session_reflections: clients can read their encouragement (public fields),
--                      admins can read and write all fields
CREATE POLICY "Clients can view their reflection encouragement" ON public.session_reflections
  FOR SELECT USING (
    auth.uid() = client_id AND status = 'published'
  );

CREATE POLICY "Admins can view all reflections" ON public.session_reflections
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can create reflections" ON public.session_reflections
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update reflections" ON public.session_reflections
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── 5. Audit trail (append-only log for tracking changes) ──────────────────

CREATE TABLE IF NOT EXISTS public.notes_audit_log (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name      TEXT NOT NULL,
  record_id       UUID NOT NULL,
  operation       TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  changed_by      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  old_values      JSONB,
  new_values      JSONB,
  timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notes_audit_log_record ON public.notes_audit_log (table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_notes_audit_log_timestamp ON public.notes_audit_log (timestamp DESC);

ALTER TABLE public.notes_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit logs" ON public.notes_audit_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- SKILLS LAYER MIGRATION
-- Run after the main schema.sql and compass_migration.sql
-- ============================================================

-- ── 1. Skills catalog ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.skills (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dimension    TEXT NOT NULL CHECK (dimension IN ('HAP', 'DIR', 'PRD', 'CNF', 'COM', 'NRG')),
  name_ar      TEXT NOT NULL,
  name_en      TEXT NOT NULL,
  description_ar TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  is_active    BOOLEAN NOT NULL DEFAULT true,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. Client skill profile (single source of truth) ────────────────────────

CREATE TABLE IF NOT EXISTS public.client_skills (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_id      UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  self_level    INTEGER CHECK (self_level BETWEEN 1 AND 5),   -- from assessments
  mentor_level  INTEGER CHECK (mentor_level BETWEEN 1 AND 5), -- from mentor input
  combined_level INTEGER CHECK (combined_level BETWEEN 1 AND 5), -- derived (40/60)
  last_self_at  TIMESTAMPTZ,
  last_mentor_at TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (client_id, skill_id)
);

-- ── 3. Skill history (append-only) ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.client_skill_history (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_id      UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  source        TEXT NOT NULL CHECK (source IN ('assessment', 'mentor', 'roadmap')),
  level_type    TEXT NOT NULL CHECK (level_type IN ('self', 'mentor', 'combined')),
  value         INTEGER NOT NULL CHECK (value BETWEEN 1 AND 5),
  assessment_id UUID REFERENCES public.assessments(id) ON DELETE SET NULL,
  booking_id    UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  notes         TEXT,
  recorded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 4. Workshop ↔ Skills tagging ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.workshop_skills (
  workshop_id UUID NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  skill_id    UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  PRIMARY KEY (workshop_id, skill_id)
);

-- ── 5. Client roadmap milestones ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.roadmap_milestones (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id               UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_id                UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  target_level            INTEGER NOT NULL CHECK (target_level BETWEEN 1 AND 5),
  recommended_workshop_id UUID REFERENCES public.workshops(id) ON DELETE SET NULL,
  recommended_session_type TEXT CHECK (recommended_session_type IN ('group', 'individual')),
  title_ar                TEXT NOT NULL,
  title_en                TEXT NOT NULL,
  status                  TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'skipped')),
  sort_order              INTEGER NOT NULL DEFAULT 0,
  assessment_id           UUID REFERENCES public.assessments(id) ON DELETE SET NULL,
  completed_at            TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 6. Session reflections (mentor input) ───────────────────────────────────

CREATE TABLE IF NOT EXISTS public.session_reflections (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id       UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  client_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mentor_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  private_notes    TEXT,
  encouragement_ar TEXT,  -- client-visible
  encouragement_en TEXT,  -- client-visible
  submitted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (booking_id)     -- one reflection per booking
);

CREATE TABLE IF NOT EXISTS public.session_reflection_skills (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reflection_id UUID NOT NULL REFERENCES public.session_reflections(id) ON DELETE CASCADE,
  skill_id      UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  mentor_level  INTEGER NOT NULL CHECK (mentor_level BETWEEN 1 AND 5),
  UNIQUE (reflection_id, skill_id)
);

CREATE TABLE IF NOT EXISTS public.session_reflection_milestones (
  reflection_id UUID NOT NULL REFERENCES public.session_reflections(id) ON DELETE CASCADE,
  milestone_id  UUID NOT NULL REFERENCES public.roadmap_milestones(id) ON DELETE CASCADE,
  PRIMARY KEY (reflection_id, milestone_id)
);

-- ── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_client_skills_client ON public.client_skills (client_id);
CREATE INDEX IF NOT EXISTS idx_client_skill_history_client ON public.client_skill_history (client_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_roadmap_milestones_client ON public.roadmap_milestones (client_id, status);
CREATE INDEX IF NOT EXISTS idx_skills_dimension ON public.skills (dimension, sort_order);

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_skill_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_reflection_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_reflection_milestones ENABLE ROW LEVEL SECURITY;

-- skills: anyone can read, admins manage
CREATE POLICY "Anyone can read active skills" ON public.skills
  FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage skills" ON public.skills
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- client_skills
CREATE POLICY "Users can view their own skill profile" ON public.client_skills
  FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "Admins can view all skill profiles" ON public.client_skills
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "System can upsert client skills" ON public.client_skills
  FOR ALL USING (auth.uid() = client_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- client_skill_history
CREATE POLICY "Users can view their own skill history" ON public.client_skill_history
  FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "Admins can view all skill history" ON public.client_skill_history
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "System can insert skill history" ON public.client_skill_history
  FOR INSERT WITH CHECK (auth.uid() = client_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- workshop_skills
CREATE POLICY "Anyone can read workshop skills" ON public.workshop_skills
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage workshop skills" ON public.workshop_skills
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- roadmap_milestones
CREATE POLICY "Users can view their own milestones" ON public.roadmap_milestones
  FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "Admins can view all milestones" ON public.roadmap_milestones
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "System can manage milestones" ON public.roadmap_milestones
  FOR ALL USING (auth.uid() = client_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- session_reflections
CREATE POLICY "Clients can view their reflections" ON public.session_reflections
  FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "Admins can manage reflections" ON public.session_reflections
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- session_reflection_skills
CREATE POLICY "Clients can view reflection skills" ON public.session_reflection_skills
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.session_reflections WHERE id = reflection_id AND client_id = auth.uid())
  );
CREATE POLICY "Admins can manage reflection skills" ON public.session_reflection_skills
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- session_reflection_milestones
CREATE POLICY "Clients can view reflection milestones" ON public.session_reflection_milestones
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.session_reflections WHERE id = reflection_id AND client_id = auth.uid())
  );
CREATE POLICY "Admins can manage reflection milestones" ON public.session_reflection_milestones
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── Seed: starter skills library ─────────────────────────────────────────────

INSERT INTO public.skills (id, dimension, name_ar, name_en, description_ar, description_en, sort_order)
VALUES
  -- HAP — Happiness & Meaning
  ('11111111-1111-1111-1101-000000000001', 'HAP', 'الوعي العاطفي بالذات', 'Emotional Self-Awareness',
   'القدرة على تمييز مشاعرك وفهم تأثيرها عليك',
   'Recognizing your emotions and understanding how they affect you', 1),
  ('11111111-1111-1111-1102-000000000001', 'HAP', 'الامتنان والتقدير', 'Gratitude & Savoring',
   'القدرة على ملاحظة اللحظات الجميلة والتوقف عندها بامتنان',
   'Noticing beautiful moments and dwelling in them with gratitude', 2),
  ('11111111-1111-1111-1103-000000000001', 'HAP', 'الشعور بالمعنى والقيم', 'Sense of Meaning & Values',
   'العيش وفق ما يهمك فعلاً وشعورك بأن ما تفعله ذو معنى',
   'Living in alignment with what truly matters and feeling your actions have purpose', 3),
  ('11111111-1111-1111-1104-000000000001', 'HAP', 'الأمل والتفاؤل', 'Hope & Optimism',
   'القدرة على رؤية إمكانية التحسين والتطلع للمستقبل بإيجابية',
   'Seeing the possibility of improvement and approaching the future with genuine hope', 4),

  -- DIR — Clarity & Direction
  ('22222222-2222-2222-2201-000000000001', 'DIR', 'وضع الأهداف', 'Goal-Setting',
   'القدرة على تحديد أهداف واضحة وقابلة للتحقيق',
   'Ability to define clear, achievable goals and commit to them', 1),
  ('22222222-2222-2222-2202-000000000001', 'DIR', 'وضوح القيم', 'Values Clarity',
   'معرفة ما يهمك حقاً واستخدامه بوصلة لقراراتك',
   'Knowing what truly matters to you and using it as a compass for your decisions', 2),
  ('22222222-2222-2222-2203-000000000001', 'DIR', 'صنع القرار', 'Decision-Making',
   'القدرة على اتخاذ القرارات المهمة بثقة وبدون تجميد طويل',
   'Making important decisions with confidence and without prolonged paralysis', 3),
  ('22222222-2222-2222-2204-000000000001', 'DIR', 'الرؤية بعيدة المدى', 'Long-Term Vision',
   'وضوح الصورة الكبيرة وإلى أين تريد أن تصل',
   'Clarity on the big picture and where you want your life to go', 4),
  ('22222222-2222-2222-2205-000000000001', 'DIR', 'تحديد الأولويات الحياتية', 'Life Prioritization',
   'القدرة على تحديد ما يأتي أولاً في حياتك وتخصيص وقتك وفقاً لذلك',
   'Deciding what comes first in your life and allocating your time accordingly', 5),

  -- PRD — Productivity & Focus
  ('33333333-3333-3333-3301-000000000001', 'PRD', 'تحديد الأولويات', 'Prioritization',
   'تمييز المهم من العاجل وإعطاء كل شيء حجمه الصحيح',
   'Distinguishing important from urgent and giving everything its right weight', 1),
  ('33333333-3333-3333-3302-000000000001', 'PRD', 'التخطيط وإدارة الوقت', 'Planning & Time Management',
   'القدرة على التخطيط المسبق والاستخدام الفعّال للوقت',
   'Planning ahead and using time effectively toward what matters', 2),
  ('33333333-3333-3333-3303-000000000001', 'PRD', 'التركيز والانتباه', 'Focus & Attention Control',
   'القدرة على الانغماس في ما تفعله وحماية انتباهك من المشتتات',
   'Immersing in your work and protecting your attention from distractions', 3),
  ('33333333-3333-3333-3304-000000000001', 'PRD', 'المتابعة والاتساق', 'Follow-Through & Consistency',
   'إتمام ما تبدأه والمحافظة على الاتساق عبر الزمن',
   'Finishing what you start and staying consistent over time', 4),
  ('33333333-3333-3333-3305-000000000001', 'PRD', 'التغلب على المماطلة', 'Beating Procrastination',
   'القدرة على البدء بالمهام الصعبة دون تأجيل',
   'Starting difficult tasks without delay and overcoming avoidance patterns', 5),

  -- CNF — Confidence & Self-worth
  ('44444444-4444-4444-4401-000000000001', 'CNF', 'الحوار الإيجابي مع الذات', 'Positive Self-Talk',
   'استبدال النقد الداخلي القاسي بصوت داخلي داعم وواقعي',
   'Replacing harsh inner criticism with a supportive, realistic inner voice', 1),
  ('44444444-4444-4444-4402-000000000001', 'CNF', 'التعاطف مع الذات', 'Self-Compassion',
   'معاملة نفسك بنفس اللطف الذي تعامل به صديقاً عزيزاً عند الخطأ',
   'Treating yourself with the same kindness you would offer a dear friend when you fail', 2),
  ('44444444-4444-4444-4403-000000000001', 'CNF', 'الحزم والمبادرة', 'Assertiveness',
   'التعبير عن احتياجاتك ورأيك بثقة واحترام متبادل',
   'Expressing your needs and opinions with confidence and mutual respect', 3),
  ('44444444-4444-4444-4404-000000000001', 'CNF', 'المرونة والتعافي', 'Resilience',
   'القدرة على الارتداد من الانتكاسات والتعلم منها',
   'Bouncing back from setbacks and using them as learning opportunities', 4),
  ('44444444-4444-4444-4405-000000000001', 'CNF', 'الشجاعة والتصرف رغم الخوف', 'Courage',
   'القدرة على التحرك والمجازفة رغم الخوف من الفشل أو الرأي',
   'Moving forward and taking risks despite fear of failure or judgment', 5),
  ('44444444-4444-4444-4406-000000000001', 'CNF', 'التحرر من المقارنة', 'Freedom from Comparison',
   'التركيز على مسارك الخاص بدلاً من قياس نفسك بالآخرين',
   'Focusing on your own path instead of measuring yourself against others', 6),

  -- COM — Communication & Connection
  ('55555555-5555-5555-5501-000000000001', 'COM', 'الاستماع الفعّال', 'Active Listening',
   'الحضور الكامل في المحادثات وجعل الآخرين يشعرون بأنهم مسموعون',
   'Being fully present in conversations and making others feel genuinely heard', 1),
  ('55555555-5555-5555-5502-000000000001', 'COM', 'التعبير عن الاحتياجات والمشاعر', 'Expressing Needs & Feelings',
   'القدرة على التعبير عن ما تحتاجه وتشعر به بوضوح وصدق',
   'Expressing what you need and feel with clarity and honesty', 2),
  ('55555555-5555-5555-5503-000000000001', 'COM', 'إدارة الخلافات', 'Conflict Resolution',
   'التعامل مع الخلافات بهدوء وبناءية بدلاً من تجنبها أو التصعيد',
   'Handling disagreements calmly and constructively instead of avoiding or escalating', 3),
  ('55555555-5555-5555-5504-000000000001', 'COM', 'التعاطف مع الآخرين', 'Empathy',
   'القدرة على فهم مشاعر ومنظور الآخرين والتواصل منها',
   'Understanding others'' feelings and perspective and connecting from that place', 4),
  ('55555555-5555-5555-5505-000000000001', 'COM', 'وضع الحدود', 'Boundary-Setting',
   'تحديد الحدود الصحية في علاقاتك بوضوح واحترام',
   'Setting healthy limits in your relationships with clarity and self-respect', 5),
  ('55555555-5555-5555-5506-000000000001', 'COM', 'بناء الألفة والتواصل', 'Building Rapport',
   'القدرة على بناء علاقات حقيقية وإنشاء ألفة مع الآخرين',
   'Building genuine relationships and creating authentic connection with others', 6),

  -- NRG — Energy & Wellbeing
  ('66666666-6666-6666-6601-000000000001', 'NRG', 'إدارة الضغط', 'Stress Management',
   'التعامل مع الضغط بفاعلية وعدم تراكمه حتى الانهيار',
   'Handling pressure effectively without letting it accumulate into overwhelm', 1),
  ('66666666-6666-6666-6602-000000000001', 'NRG', 'الراحة والتعافي', 'Rest & Recovery',
   'الحصول على نوم كافٍ ووقت راحة حقيقي يعيد شحن طاقتك',
   'Getting enough sleep and real downtime that genuinely restores your energy', 2),
  ('66666666-6666-6666-6603-000000000001', 'NRG', 'عادات الاعتناء بالذات', 'Self-Care Habits',
   'الحفاظ على عادات يومية تدعم صحتك الجسدية والنفسية',
   'Maintaining daily habits that support your physical and mental health', 3),
  ('66666666-6666-6666-6604-000000000001', 'NRG', 'التوازن بين الشغل والحياة', 'Work-Life Balance',
   'الحفاظ على توازن صحي بين التزاماتك المختلفة',
   'Keeping a healthy balance across your life commitments without one consuming the rest', 4),
  ('66666666-6666-6666-6605-000000000001', 'NRG', 'التنظيم العاطفي', 'Emotional Regulation',
   'القدرة على إدارة مشاعرك بدلاً من أن تقودك',
   'Managing your emotions so they inform you rather than control you', 5)

ON CONFLICT (id) DO NOTHING;

-- Each roadmap task gets its own mini-roadmap of steps (so a goal can be broken
-- down and tracked individually). Stored as JSONB: [{id, title, done}].
ALTER TABLE public.user_tasks
  ADD COLUMN IF NOT EXISTS steps JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Run this in Supabase Dashboard > SQL Editor
CREATE TABLE IF NOT EXISTS user_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  icon TEXT DEFAULT '🎯',
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done')),
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE user_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY tasks_self ON user_tasks
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Add curriculum fields to workshops table
ALTER TABLE public.workshops
  ADD COLUMN IF NOT EXISTS outline_en JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS outline_ar JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS end_goals_en JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS end_goals_ar JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS target_audience_en TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS target_audience_ar TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS spots_available INTEGER DEFAULT NULL;

-- Update the 3 real workshops with full curriculum data
UPDATE public.workshops SET
  title_en        = 'Play it Right. Get Accepted',
  title_ar        = 'العب صح، واتقبل',
  description_en  = 'Scholarships aren''t luck. They''re a game with rules. And there are people who win every time, not because they''re smarter, but because they understand how to play. If you keep getting rejected while others with less effort get through, the problem isn''t you. It''s how you''re presenting yourself.',
  description_ar  = 'المنح مش حظ. دي لعبة ليها قواعد، وفي ناس بتكسبها كل مرة؛ مش لإنهم أذكى، لكن لإنهم ازاي يلعبوها صح. لو مبتتقبلش رغم إنك شايف ناس بمجهود أقل بيوصلوا، فالمشكلة مش فيك… المشكلة في الطريقه اللي بتقدم بيها نفسك.',
  topic           = 'scholarships',
  target_audience_en = 'Anyone who wants to apply for scholarships or study abroad opportunities',
  target_audience_ar = 'أي حد عايز يقدم على منح أو فرص دراسة بالخارج',
  spots_available = 5,
  outline_en      = '[
    {"session": "Session 1", "title": "Self-Discovery", "bullets": ["Why do you want to study abroad?", "What are your real motivations?", "Finding the best country + field for you"]},
    {"session": "Session 2", "title": "Your Personalized Scholarship Catalog", "bullets": ["We build you a full catalog of suitable scholarships", "All available options based on your field and goals", "Review the list and pick your target"]},
    {"session": "Session 3", "title": "Mentor from the Same Experience", "bullets": ["A mentor who got a similar scholarship in your field", "They tell you everything required", "Easiest path to get there", "Clear materials to start with"]},
    {"session": "Session 4", "title": "First Application Review", "bullets": ["You write your first application draft", "Mentor reviews your SOP (Statement of Purpose)", "Mentor reviews your Recommendation Letters"]},
    {"session": "Session 5", "title": "Final Review & Edits", "bullets": ["Improving every weak point", "Final version review", "Preparation before the deadline"]}
  ]'::jsonb,
  outline_ar      = '[
    {"session": "الجلسة 1", "title": "اكتشاف نفسك", "bullets": ["إنت عايز تسافر ليه؟", "إيه دوافعك الحقيقية؟", "أنسب دولة + مجال ليك"]},
    {"session": "الجلسة 2", "title": "قائمة منح مخصصة ليك", "bullets": ["بنجهز لك كتالوج منح كامل مناسب ليك", "كل الخيارات المتاحة حسب مجالك وهدفك", "بنراجع القائمة ونختار الهدف"]},
    {"session": "الجلسة 3", "title": "Mentor من نفس التجربة", "bullets": ["أخد منحة شبه اللي إنت مقدم عليها في نفس مجالك", "يقولك كل المطلوب", "أسهل طريقة توصله", "يديك materials واضحة تبدأ بيها"]},
    {"session": "الجلسة 4", "title": "أول مراجعة للابلكيشن", "bullets": ["تكتب أول نسخة من الـ Application", "الـ Mentor يراجع SOP (خطاب الحافز)", "الـ Mentor يراجع Recommendation Letters"]},
    {"session": "الجلسة 5", "title": "مراجعة نهائية وتعديلات", "bullets": ["تحسين كل نقطة ضعيفة", "مراجعة النسخة النهائية", "تجهيزك قبل الديدلاين"]}
  ]'::jsonb,
  end_goals_en    = '[
    "Personalized scholarship & opportunities catalog",
    "Clear, organized monthly application plan",
    "Continuous review of your applications and submissions",
    "CV writing training and academic letters coaching",
    "Connection with universities matching your specialty and goals",
    "Practical training on reaching out to professors and building academic relationships",
    "Live Q&A sessions",
    "Free updates on academic opportunities, conferences, and events"
  ]'::jsonb,
  end_goals_ar    = '[
    "كتالوج منح وفرص مخصص لك",
    "خطة تقديم شهرية واضحة ومنظمة",
    "مراجعة مستمرة للأبلكيشن والتقديمات",
    "تدريب على كتابة السيرة الذاتية والرسائل الأكاديمية",
    "ربطك بالجامعات المناسبة لتخصصك وأهدافك",
    "تدريب عملي على التواصل مع الأساتذة وبناء العلاقات الأكاديمية",
    "جلسات أسئلة وأجوبة مباشرة (Q&A)",
    "إطلاعك على الفرص والمؤتمرات والفعاليات الأكاديمية مجاناً"
  ]'::jsonb
WHERE id = 'a1b2c3d4-0001-0001-0001-000000000001';

UPDATE public.workshops SET
  title_en        = 'Start Ahead. Stay Ahead',
  title_ar        = 'ابدأ بدري، وافضل قدّام',
  description_en  = 'You don''t need to choose a college. You need to understand your future before you choose it. Most people enter a field then discover it''s not for them. Here you do the opposite: explore the fields first, then choose between them. This program is like time travel: it lets you see yourself in multiple scenarios before committing.',
  description_ar  = 'إنت مش محتاج تختار كلية… إنت محتاج تفهم مستقبلك قبل ما تختاره. معظم الناس بتدخل كلية وبعدين تكتشف إنها مش ليها؛ إنت هنا بتعمل العكس: تستكشف المجالات الأول… وبعدين تختار بينها عن اقتناع. البرنامج ده كإنه سفر عبر الزمن: بيخليك تشوف نفسك في أكتر من سيناريو قبل ما تلتزم بواحد.',
  topic           = 'career-discovery',
  target_audience_en = '1st/2nd year high school · Gap Year students · 1st/2nd year university',
  target_audience_ar = 'أولى / تانية ثانوي · Gap Year · أولى / تانية جامعة',
  spots_available = 5,
  outline_en      = '[
    {"session": "Session 1", "title": "Self-Discovery", "bullets": ["Understanding your personality", "Mapping your interests", "Identifying your strengths"]},
    {"session": "Session 2", "title": "Future Simulation: Explore Paths", "bullets": ["Different fields and what life looks like in each", "Work and travel opportunities per field", "A real mentor from each field answers all your questions"]},
    {"session": "Session 3", "title": "Build Strong Activities (Not Random Ones)", "bullets": ["Not just any activities, meaningful ones", "Projects that matter", "Volunteering with purpose", "Real experiences that build your story"]},
    {"session": "Session 4", "title": "Academic Guidance", "bullets": ["Choosing the right major for you", "Choosing a university and country", "Understanding application requirements"]},
    {"session": "Session 5", "title": "Thinking & Analysis Skills", "bullets": ["Critical thinking", "Decision making", "Problem solving"]},
    {"session": "Ongoing", "title": "Continuous Follow-Up", "bullets": ["Progress review sessions", "Course correction when needed", "Continuous support throughout"]}
  ]'::jsonb,
  outline_ar      = '[
    {"session": "الجلسة 1", "title": "اكتشاف الذات", "bullets": ["بنبدأ نفهم شخصيتك", "اهتماماتك", "نقاط قوتك"]},
    {"session": "الجلسة 2", "title": "استكشاف المسارات (Future Simulation)", "bullets": ["مجالات مختلفة وشكل الحياة في كل مجال", "فرص الشغل والسفر", "Mentor من المجال نفسه جاهز لكل أسئلتك"]},
    {"session": "الجلسة 3", "title": "بناء Activities قوية، مش عشوائية", "bullets": ["مش Activities عشوائية", "Projects حقيقية", "Volunteering بهدف", "Experiences تبني قصتك"]},
    {"session": "الجلسة 4", "title": "توجيه أكاديمي", "bullets": ["اختيار تخصص مناسب", "اختيار جامعة/دولة", "فهم متطلبات التقديم"]},
    {"session": "الجلسة 5", "title": "مهارات التفكير والتحليل", "bullets": ["تفكير نقدي", "اتخاذ القرار", "حل المشاكل"]},
    {"session": "مستمر", "title": "متابعة مستمرة", "bullets": ["مراجعة تقدمك", "تعديل المسار", "دعم مستمر"]}
  ]'::jsonb,
  end_goals_en    = '[
    "Know yourself and your interests with full clarity",
    "A determined major and suitable path chosen for you",
    "Real activities that strengthen your CV",
    "A deep early understanding of the job market"
  ]'::jsonb,
  end_goals_ar    = '[
    "عارف نفسك واهتماماتك بوضوح",
    "محدد تخصص ومسار مناسب ليك",
    "عندك Activities حقيقية تقوي الـ CV",
    "فاهم سوق العمل بدري جداً"
  ]'::jsonb
WHERE id = 'a1b2c3d4-0002-0002-0002-000000000002';

UPDATE public.workshops SET
  title_en        = 'Break the Loop',
  title_ar        = 'اكسر الدايرة',
  description_en  = 'If you''re on a train you want to get off, but fear what comes next might get you more lost. Every day is the same as before, and life is passing fast. Here you can explore a completely different path without risking what you already have. Without wasting another part of your life in a field you''re not sure about.',
  description_ar  = 'لو حاسس إنك راكب قطر عايز تنزل منه، بس خايف إن اللي بعده يتوّهك أكتر… وكل يوم بقى زي اللي قبله وعمرك بيعدّي بسرعة. هنا تقدر تستكشف مسار تاني لآخره من غير ما تخاطر باللي معاك، ومن غير ما تضيّع جزء تاني من عمرك في مجال مش متأكد إنك عايزه.',
  topic           = 'career-change',
  target_audience_en = 'Anyone feeling stuck in their current career path and wanting to explore a change',
  target_audience_ar = 'أي حد حاسس إنه عالق في مساره الحالي وعايز يغير',
  spots_available = 5,
  outline_en      = '[
    {"session": "Session 1", "title": "Self-Awareness & Skill Assessment", "bullets": ["Who you really are, not who circumstances made you", "Your real interests", "Your personality and thinking style", "What gives you energy vs. what drains you", "Skills you already have", "What''s transferable to a new field", "Most suitable fields based on all of this"]},
    {"session": "Session 2", "title": "Market Exploration", "bullets": ["Real research, not theory", "What the market actually needs right now", "Fields that suit you AND have real opportunities", "What each field requires to get started"]},
    {"session": "Session 3", "title": "Gradual Transition Plan", "bullets": ["Step-by-step plan, no jumping into the unknown", "Balance between your current job and the new beginning", "Clear milestones to follow"]},
    {"session": "Mentor Sessions (×3)", "title": "Support During Execution", "bullets": ["A real mentor already working in the field you chose", "Session 1: Taking the first step, starting right", "Session 2: Course correction, fixing any confusion early", "Session 3: Market entry, getting you into your first work environment"]}
  ]'::jsonb,
  outline_ar      = '[
    {"session": "الجلسة 1", "title": "الوعي الذاتي وتحليل المهارات", "bullets": ["إنت مين بجد، مش إنت اللي الظروف حطتك فيه", "اهتماماتك الحقيقية", "شخصيتك وطريقة تفكيرك", "الحاجات اللي بتديك طاقة vs اللي بتستنزفك", "إيه المهارات اللي معاك بالفعل", "إيه اللي ينفع يتنقل معاك لمجال جديد (transferable skills)", "أنسب مجالات ليك بناءً على ده"]},
    {"session": "الجلسة 2", "title": "استكشاف السوق", "bullets": ["مرحلة بحث حقيقي، مش كلام نظري", "السوق محتاج إيه فعلاً", "المجالات اللي مناسبة لك + ليها فرص", "كل مجال محتاج إيه عشان تبدأ فيه"]},
    {"session": "الجلسة 3", "title": "خطة انتقال تدريجية", "bullets": ["خطة خطوة بخطوة، مش هترمي نفسك في المجهول", "توازن بين شغلك الحالي والبداية الجديدة", "Milestones واضحة تمشي عليها"]},
    {"session": "جلسات Mentor (×3)", "title": "دعم أثناء التنفيذ", "bullets": ["Mentor حقيقي في المجال اللي اخترته", "الجلسة 1: أول خطوة، تبدأ فعلياً صح", "الجلسة 2: تعديل المسار، نصلّح أي لخبطة بدري", "الجلسة 3: الدخول للسوق، نوصّلك لأول بيئة شغل"]}
  ]'::jsonb,
  end_goals_en    = '[
    "A clear, confirmed career decision, not a maybe or a trial",
    "A new determined path with actual steps (a Roadmap to walk)",
    "A real beginning in the field: first executive step or entering a work environment",
    "Confidence that you''re moving in the right direction, not just moving"
  ]'::jsonb,
  end_goals_ar    = '[
    "قرار مهني واضح ومؤكد، مش احتمال ولا تجربة",
    "مسار جديد محدد بخطوات فعلية (Roadmap تمشي عليه)",
    "بداية حقيقية في المجال: أول خطوة تنفيذية أو دخول بيئة شغل",
    "ثقة إنك ماشي في الاتجاه الصح، مش ماشي وخلاص"
  ]'::jsonb
WHERE id = 'a1b2c3d4-0003-0003-0003-000000000003';

-- Latest Content (vlogs) seed — placeholder entries for the homepage "Latest Vlogs" section.
-- video_url values are placeholders (REPLACE_ME_n) — swap in real video links via /admin/vlogs
-- (delete the placeholder row, add the real one) or directly in Supabase before these go live.
-- Run in Supabase SQL Editor, both local and production, once real links are ready.

INSERT INTO public.vlogs (title_ar, title_en, description_ar, description_en, video_url, thumbnail_url)
VALUES
  (
    'إزاي تلاقي بوصلتك في شغلك',
    'Finding Your Compass at Work',
    'مش كل حد لازم يكون عارف طريقه من الأول. في الفيديو ده بحكي إزاي تبدأ تسأل الأسئلة الصح عشان توصل للاتجاه اللي يناسبك، مش اللي الناس حواليك بتقولك عليه.',
    'Not everyone has it figured out from day one — and that''s okay. In this video I walk through the questions that actually help you find your direction, instead of the one everyone around you keeps pushing.',
    'https://youtube.com/watch?v=REPLACE_ME_1',
    NULL
  ),
  (
    'لما تحس إنك تايه في مسارك المهني',
    'When You Feel Lost in Your Career',
    'التوهان مش معناه إنك فاشل، معناه إنك محتاج توقف شوية وتراجع. في الفيديو ده بشارك معاك الخطوات اللي بستخدمها مع عملائي لما يحسوا إنهم واقفين في نفس المكان من غير تقدم.',
    'Feeling lost doesn''t mean you''re failing — it means it''s time to pause and reassess. Here I share the exact steps I use with my clients when they feel stuck in the same place with no progress.',
    'https://youtube.com/watch?v=REPLACE_ME_2',
    NULL
  ),
  (
    'إزاي تبني هويتك المهنية',
    'Building Your Professional Identity',
    'هويتك المهنية مش بس السيرة الذاتية بتاعتك، هي إزاي بتتكلم عن نفسك وإزاي الناس بتحس بيك في أول خمس دقايق. في الفيديو ده بوريك إزاي تبني الصورة دي بثقة.',
    'Your professional identity isn''t just your CV — it''s how you talk about yourself and how people read you in the first five minutes. In this video I show you how to build that with confidence.',
    'https://youtube.com/watch?v=REPLACE_ME_3',
    NULL
  ),
  (
    'التفاوض على راتبك من غير خوف',
    'Negotiating Your Salary Without Fear',
    'كتير مننا بيوافق على أول رقم يتقالوله بس عشان مش عايز يبان طماع. في الفيديو ده بشرح إزاي تتفاوض بثقة وباحترافية من غير ما تحس بالذنب.',
    'A lot of us accept the first number just to avoid seeming greedy. Here I break down how to negotiate confidently and professionally, without the guilt.',
    'https://youtube.com/watch?v=REPLACE_ME_4',
    NULL
  ),
  (
    'التوازن بين شغلك وحياتك',
    'Balancing Your Work and Your Life',
    'النجاح المهني من غير توازن بيتعب في الآخر. في الفيديو ده بتكلم عن إزاي تحافظ على حماسك وطاقتك من غير ما تحرق نفسك في الطريق.',
    'Career success without balance eventually wears you down. In this video I talk about how to protect your energy and motivation without burning out along the way.',
    'https://youtube.com/watch?v=REPLACE_ME_5',
    NULL
  ),
  (
    'قبل ما تغيّر مسارك المهني بالكامل',
    'Before You Make a Full Career Change',
    'تغيير المسار قرار كبير، ولازم ياخد وقته. في الفيديو ده بشارك معاك الأسئلة اللي لازم تجاوب عليها بصدق قبل ما تاخد الخطوة دي، عشان تكون متأكد إنها الاتجاه الصح.',
    'Changing your career path is a big decision that deserves real thought. Here I share the questions you need to answer honestly before taking that leap, so you know it''s the right direction.',
    'https://youtube.com/watch?v=REPLACE_ME_6',
    NULL
  );

-- ============================================================
-- Workshop pricing — aligns session prices with the official
-- PDF pricing (EGP). Safe to run on an already-seeded database
-- (idempotent: matches by workshop_id + session type).
--
-- Model: each workshop has two bookable sessions —
--   type 'group'      = "الورشة الكاملة" (full multi-session workshop)
--   type 'individual' = "جلسة فردية" (single session)
-- ============================================================

-- Pricing for active workshops only (dummy workshops removed)
