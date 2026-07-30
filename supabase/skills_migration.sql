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
