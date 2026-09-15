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

-- One account per email address (case-insensitive). See unique_email_migration.sql
-- for applying this to an already-running database.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique_idx
  ON public.profiles (lower(email));

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

-- Real workshops
INSERT INTO public.workshops (id, title_ar, title_en, description_ar, description_en, topic, image_url, target_audience_en, target_audience_ar, spots_available, outline_en, outline_ar, end_goals_en, end_goals_ar, created_by)
VALUES
  (
    'a1b2c3d4-0001-0001-0001-000000000001',
    'العب صح. اتقبل',
    'Play it Right. Get Accepted',
    'المنح مش حظ. دي لعبة، وفي ناس بتكسبها كل مرة، مش عشان أذكى، لكن عشان فاهمة قواعد اللعبة. لو إنت مبتتقبلش رغم إنك شايف ناس بمجهود أقل بيوصلوا، المشكلة مش فيك… المشكلة في إزاي بتقدّم نفسك.',
    'Scholarships aren''t luck. They''re a game with rules. And there are people who win every time, not because they''re smarter, but because they understand how to play. If you keep getting rejected while others with less effort get through, the problem isn''t you. It''s how you''re presenting yourself.',
    'scholarships',
    'https://images.unsplash.com/photo-1627556704302-624286467c65?w=800',
    'Anyone who wants to apply for scholarships or study abroad opportunities',
    'أي حد عايز يقدم على منح أو فرص دراسة بالخارج',
    5,
    '[
      {"session": "Session 1", "title": "Self-Discovery", "bullets": ["Why do you want to study abroad?", "What are your real motivations?", "Finding the best country + field for you"]},
      {"session": "Session 2", "title": "Your Personalized Scholarship Catalog", "bullets": ["We build you a full catalog of suitable scholarships", "All available options based on your field and goals", "Review the list and pick your target"]},
      {"session": "Session 3", "title": "Mentor from the Same Experience", "bullets": ["A mentor who got a similar scholarship in your field", "They tell you everything required", "Easiest path to get there", "Clear materials to start with"]},
      {"session": "Session 4", "title": "First Application Review", "bullets": ["You write your first application draft", "Mentor reviews your SOP (Statement of Purpose)", "Mentor reviews your Recommendation Letters"]},
      {"session": "Session 5", "title": "Final Review & Edits", "bullets": ["Improving every weak point", "Final version review", "Preparation before the deadline"]}
    ]'::jsonb,
    '[
      {"session": "الجلسة 1", "title": "اكتشاف نفسك", "bullets": ["إنت عايز تسافر ليه؟", "إيه دوافعك الحقيقية؟", "أنسب دولة + مجال ليك"]},
      {"session": "الجلسة 2", "title": "قائمة منح مخصصة ليك", "bullets": ["بنجهز لك كتالوج منح كامل مناسب ليك", "كل الخيارات المتاحة حسب مجالك وهدفك", "بنراجع القائمة ونختار الهدف"]},
      {"session": "الجلسة 3", "title": "Mentor من نفس التجربة", "bullets": ["أخد منحة شبه اللي إنت مقدم عليها في نفس مجالك", "يقولك كل المطلوب", "أسهل طريقة توصله", "يديك materials واضحة تبدأ بيها"]},
      {"session": "الجلسة 4", "title": "أول مراجعة للابلكيشن", "bullets": ["تكتب أول نسخة من الـ Application", "الـ Mentor يراجع SOP (خطاب الحافز)", "الـ Mentor يراجع Recommendation Letters"]},
      {"session": "الجلسة 5", "title": "مراجعة نهائية وتعديلات", "bullets": ["تحسين كل نقطة ضعيفة", "مراجعة النسخة النهائية", "تجهيزك قبل الديدلاين"]}
    ]'::jsonb,
    '["Personalized scholarship & opportunities catalog", "Clear, organized monthly application plan", "Continuous review of your applications and submissions", "CV writing training and academic letters coaching", "Connection with universities matching your specialty and goals", "Practical training on reaching out to professors and building academic relationships", "Live Q&A sessions", "Free updates on academic opportunities, conferences, and events"]'::jsonb,
    '["كتالوج منح وفرص مخصص لك", "خطة تقديم شهرية واضحة ومنظمة", "مراجعة مستمرة للأبلكيشن والتقديمات", "تدريب على كتابة السيرة الذاتية والرسائل الأكاديمية", "ربطك بالجامعات المناسبة لتخصصك وأهدافك", "تدريب عملي على التواصل مع الأساتذة وبناء العلاقات الأكاديمية", "جلسات أسئلة وأجوبة مباشرة (Q&A)", "إطلاعك على الفرص والمؤتمرات والفعاليات الأكاديمية مجاناً"]'::jsonb,
    NULL
  ),
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
  ),
  (
    'a1b2c3d4-0003-0003-0003-000000000003',
    'اكسر الحلقة',
    'Break the Loop',
    'لو ركبت قطر عايز تنزل منه، لكن مؤثر عليك خوفك إن اللي بعده ممكن يتوهك أكتر، كل يوم زي اللي قبله وحياتك بتعدي بسرعة! هنا تقدر تستكشف مسار تاني لآخره من غير ما تخاطر باللي معاك.',
    'If you''re on a train you want to get off, but fear what comes next might get you more lost. Every day is the same, life passing fast. Here you can explore a completely different path without risking what you already have.',
    'career-change',
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800',
    'Anyone feeling stuck in their current career path and wanting to explore a change',
    'أي حد حاسس إنه عالق في مساره الحالي وعايز يغير',
    5,
    '[
      {"session": "Session 1", "title": "Self-Awareness & Skill Assessment", "bullets": ["Who you really are, not who circumstances made you", "Your real interests and thinking style", "What gives you energy vs. what drains you", "Skills you already have (including transferable ones)", "Most suitable fields based on all of this"]},
      {"session": "Session 2", "title": "Market Exploration", "bullets": ["Real research, not theory", "What the market actually needs right now", "Fields that suit you AND have real opportunities", "What each field requires to get started"]},
      {"session": "Session 3", "title": "Gradual Transition Plan", "bullets": ["Step-by-step plan, no jumping into the unknown", "Balance between your current job and the new beginning", "Clear milestones to follow"]},
      {"session": "Mentor Sessions (×3)", "title": "Support During Execution", "bullets": ["A real mentor already working in the field you chose", "Session 1: Taking the first step, starting right", "Session 2: Course correction, fixing any confusion early", "Session 3: Market entry, getting you into your first work environment"]}
    ]'::jsonb,
    '[
      {"session": "الجلسة 1", "title": "الوعي الذاتي وتحليل المهارات", "bullets": ["إنت مين بجد، مش إنت اللي الظروف حطتك فيه", "اهتماماتك الحقيقية وطريقة تفكيرك", "الحاجات اللي بتديك طاقة vs اللي بتستنزفك", "المهارات اللي معاك بالفعل (والـ transferable منها)", "أنسب مجالات ليك بناءً على ده"]},
      {"session": "الجلسة 2", "title": "استكشاف السوق", "bullets": ["مرحلة بحث حقيقي، مش كلام نظري", "السوق محتاج إيه فعلاً", "المجالات اللي مناسبة لك + ليها فرص", "كل مجال محتاج إيه عشان تبدأ فيه"]},
      {"session": "الجلسة 3", "title": "خطة انتقال تدريجية", "bullets": ["خطة خطوة بخطوة، مش هترمي نفسك في المجهول", "توازن بين شغلك الحالي والبداية الجديدة", "Milestones واضحة تمشي عليها"]},
      {"session": "جلسات Mentor (×3)", "title": "دعم أثناء التنفيذ", "bullets": ["Mentor حقيقي في المجال اللي اخترته", "الجلسة 1: أول خطوة، تبدأ فعلياً صح", "الجلسة 2: تعديل المسار، نصلّح أي لخبطة بدري", "الجلسة 3: الدخول للسوق، نوصّلك لأول بيئة شغل"]}
    ]'::jsonb,
    '["A clear, confirmed career decision, not a maybe or a trial", "A new determined path with actual steps (a Roadmap to walk)", "A real beginning in the field: first executive step or entering a work environment", "Confidence that you''re moving in the right direction, not just moving"]'::jsonb,
    '["قرار مهني واضح ومؤكد، مش احتمال ولا تجربة", "مسار جديد محدد بخطوات فعلية (Roadmap تمشي عليه)", "بداية حقيقية في المجال: أول خطوة تنفيذية أو دخول بيئة شغل", "ثقة إنك ماشي في الاتجاه الصح، مش ماشي وخلاص"]'::jsonb,
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
    1150,
    5,
    NOW() + INTERVAL '7 days',
    NOW() + INTERVAL '7 days' + INTERVAL '2 hours',
    'https://meet.google.com/demo',
    'published'
  ),
  (
    'b1b2c3d4-0002-0002-0002-000000000002',
    'a1b2c3d4-0001-0001-0001-000000000001',
    'individual',
    250,
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
    1500,
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
    300,
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
    'في الفيديو ده بنشرح 3 تقنيات بسيطة وفعالة لتحسين إنتاجيتك اليومية وبتخليك تنجز أكتر في وقت أقل',
    'In this video we discuss 3 simple and effective techniques to improve your daily productivity',
    NULL,
    'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800'
  ),
  (
    'c1b2c3d4-0002-0002-0002-000000000002',
    'كيف تبني عادات صحية تدوم',
    'How to Build Lasting Healthy Habits',
    'اتعرّف على العلم وراء بناء العادات وإزاي تخليها تدوم طول عمرك، مش بس شهر أو اتنين',
    'Learn the science behind habit building and how to make them last a lifetime',
    NULL,
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
    'Welcome to The Compass!',
    'نحن سعداء بانضمامكم إلى مجتمع البوصلة. استخدم كود WELCOME20 للحصول على خصم 20% على أول جلسة.',
    'We are happy to have you join The Compass community. Use code WELCOME20 for 20% off your first session.',
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
