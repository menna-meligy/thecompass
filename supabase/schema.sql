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

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

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
-- SEED DATA
-- ============================================================

-- Note: Run this after creating your admin user in Supabase Auth
-- Replace the UUIDs below with actual auth user IDs

-- Demo workshops (no user dependency)
INSERT INTO public.workshops (id, title_ar, title_en, description_ar, description_en, topic, image_url, created_by)
VALUES
  (
    'a1b2c3d4-0001-0001-0001-000000000001',
    'إدارة الوقت وتحديد الأولويات',
    'Time Management & Prioritization',
    'تعلم كيف تدير وقتك بفعالية وتحدد أولوياتك بشكل صحيح لتحقيق أهدافك',
    'Learn how to effectively manage your time and properly set priorities to achieve your goals',
    'productivity',
    'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=800',
    NULL
  ),
  (
    'a1b2c3d4-0002-0002-0002-000000000002',
    'بناء الثقة بالنفس',
    'Building Self-Confidence',
    'رحلة عملية لاكتشاف نقاط قوتك وبناء ثقة حقيقية بالنفس',
    'A practical journey to discover your strengths and build genuine self-confidence',
    'personal-development',
    'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800',
    NULL
  ),
  (
    'a1b2c3d4-0003-0003-0003-000000000003',
    'فن التواصل الفعّال',
    'The Art of Effective Communication',
    'اكتسب مهارات التواصل الفعّال في الحياة المهنية والشخصية',
    'Acquire effective communication skills for professional and personal life',
    'communication',
    'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800',
    NULL
  )
ON CONFLICT (id) DO NOTHING;

-- Demo sessions
INSERT INTO public.sessions (id, workshop_id, type, price, capacity, starts_at, ends_at, location_or_link, status)
VALUES
  (
    'b1b2c3d4-0001-0001-0001-000000000001',
    'a1b2c3d4-0001-0001-0001-000000000001',
    'group',
    500,
    15,
    NOW() + INTERVAL '7 days',
    NOW() + INTERVAL '7 days' + INTERVAL '2 hours',
    'https://meet.google.com/demo',
    'published'
  ),
  (
    'b1b2c3d4-0002-0002-0002-000000000002',
    'a1b2c3d4-0001-0001-0001-000000000001',
    'individual',
    1200,
    1,
    NOW() + INTERVAL '14 days',
    NOW() + INTERVAL '14 days' + INTERVAL '1 hour',
    'https://meet.google.com/demo-individual',
    'published'
  ),
  (
    'b1b2c3d4-0003-0003-0003-000000000003',
    'a1b2c3d4-0002-0002-0002-000000000002',
    'group',
    700,
    12,
    NOW() + INTERVAL '10 days',
    NOW() + INTERVAL '10 days' + INTERVAL '2 hours',
    'القاهرة - مصر الجديدة',
    'published'
  ),
  (
    'b1b2c3d4-0004-0004-0004-000000000004',
    'a1b2c3d4-0003-0003-0003-000000000003',
    'group',
    600,
    20,
    NOW() + INTERVAL '21 days',
    NOW() + INTERVAL '21 days' + INTERVAL '3 hours',
    'https://zoom.us/demo',
    'published'
  ),
  (
    'b1b2c3d4-0005-0005-0005-000000000005',
    'a1b2c3d4-0003-0003-0003-000000000003',
    'individual',
    1500,
    1,
    NOW() + INTERVAL '5 days',
    NOW() + INTERVAL '5 days' + INTERVAL '90 minutes',
    'https://meet.google.com/comm-individual',
    'published'
  )
ON CONFLICT (id) DO NOTHING;

-- Demo vlogs
INSERT INTO public.vlogs (id, title_ar, title_en, description_ar, description_en, video_url, thumbnail_url)
VALUES
  (
    'c1b2c3d4-0001-0001-0001-000000000001',
    '3 تقنيات لتحسين إنتاجيتك اليومية',
    '3 Techniques to Improve Your Daily Productivity',
    'في هذا الفيديو نتحدث عن 3 تقنيات بسيطة وفعالة لتحسين إنتاجيتك اليومية',
    'In this video we discuss 3 simple and effective techniques to improve your daily productivity',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800'
  ),
  (
    'c1b2c3d4-0002-0002-0002-000000000002',
    'كيف تبني عادات صحية تدوم',
    'How to Build Lasting Healthy Habits',
    'تعلم العلم وراء بناء العادات وكيف تجعلها تدوم مدى الحياة',
    'Learn the science behind habit building and how to make them last a lifetime',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800'
  )
ON CONFLICT (id) DO NOTHING;

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
    'مرحباً بكم في البوصلة!',
    'Welcome to Al-Bosla!',
    'نحن سعداء بانضمامكم إلى مجتمع البوصلة. استخدم كود WELCOME20 للحصول على خصم 20% على أول جلسة.',
    'We are happy to have you join the Al-Bosla community. Use code WELCOME20 for 20% off your first session.',
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
