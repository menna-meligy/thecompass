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
  description_ar  = 'المنح مش حظ. دي لعبة ليها قواعد، وفي ناس بتكسبها كل مرة؛ مش لإنهم أذكى، لكن لإنهم فاهمين يلعبوها صح. لو مبتتقبلش رغم إنك شايف ناس بمجهود أقل بيوصلوا، فالمشكلة مش فيك… المشكلة في طريقة ما بتقدّم بيها نفسك.',
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
    {"session": "الجلسة 2", "title": "قائمة منح مخصصة ليك", "bullets": ["بنجهز لك Catalog منح كامل مناسب ليك", "كل الخيارات المتاحة حسب مجالك وهدفك", "بنراجع القائمة ونختار الهدف"]},
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
