import type { Dimension, Zone } from "./types";

type BilingualString = { ar: string; en: string };

// ── Dimension display labels ──────────────────────────────────────────────────

export const DIM_LABELS: Record<Dimension, BilingualString> = {
  HAP: { ar: "السعادة والمعنى",        en: "Happiness & Meaning" },
  DIR: { ar: "الوضوح والاتجاه",         en: "Clarity & Direction" },
  PRD: { ar: "الإنتاجية والتركيز",      en: "Productivity & Focus" },
  CNF: { ar: "الثقة بالنفس",           en: "Confidence & Self-worth" },
  COM: { ar: "التواصل والعلاقات",       en: "Communication & Connection" },
  NRG: { ar: "الطاقة والصحة",           en: "Energy & Wellbeing" },
};

export const ZONE_LABELS: Record<Zone, BilingualString> = {
  needs_care: { ar: "يحتاج رعاية", en: "Needs Care" },
  emerging:   { ar: "في الطريق",   en: "Emerging" },
  steady:     { ar: "ثابت",        en: "Steady" },
  thriving:   { ar: "مزدهر",       en: "Thriving" },
};

// ── Per-dimension × zone reads ───────────────────────────────────────────────
// One honest, warm sentence per combination (6 dimensions × 4 zones)

export const DIMENSION_READS: Record<Dimension, Record<Zone, BilingualString>> = {
  HAP: {
    needs_care: {
      ar: "الرضا الحقيقي لسه بيدور عن طريقه في حياتك، ده مش حكم، ده نقطة انطلاق تستحق الاهتمام.",
      en: "Real contentment is still finding its way to you; that's not a verdict, it's a starting point worth acknowledging.",
    },
    emerging: {
      ar: "في بصيص أمل ورضا بيبدأ يظهر، اللحظات الجميلة موجودة، بس لسه محتاجة أرضية تتبنى عليها.",
      en: "There are real sparks of joy and meaning beginning to surface; the good moments exist, they just need more ground beneath them.",
    },
    steady: {
      ar: "في رضا حقيقي في حياتك مع إدراك صادق إن الطريق لسه فيه مسافة، ده توازن صحي.",
      en: "There's genuine satisfaction in your life alongside honest awareness that the path still has distance; that's a healthy balance.",
    },
    thriving: {
      ar: "الرضا والامتنان بيلوّنوا أيامك فعلاً، ده من أجمل ما يكون، واحفظ دي.",
      en: "Contentment and gratitude genuinely color your days; that's a beautiful place to be, and worth protecting.",
    },
  },
  DIR: {
    needs_care: {
      ar: "الوضوح لسه بيتشكّل في حياتك، والتيه اللي بتحسه ده مش ضعف، ده بداية.",
      en: "Clarity is still taking shape in your life; the feeling of being lost isn't weakness, it's the beginning of a search.",
    },
    emerging: {
      ar: "عندك حاسة بالاتجاه بدأت تصحى، بس المسار لسه بيحتاج تفاصيل وخطوات واضحة.",
      en: "A sense of direction is waking up in you, but the path still needs definition and clear next steps.",
    },
    steady: {
      ar: "الاتجاه عندك واضح وبتتحرك بقرارات معقولة نحو اللي بتريده، ده أساس قوي.",
      en: "Your direction is clear and you move toward what you want with sound decisions; that's a strong foundation.",
    },
    thriving: {
      ar: "وضوح رائع ورؤية حقيقية، بتعيش بهدف ومسار، وده ميزة نادرة.",
      en: "Remarkable clarity and real vision; you live with purpose and a path, and that's a rare thing.",
    },
  },
  PRD: {
    needs_care: {
      ar: "الإنجاز بيتحداك دلوقتي، بين التأجيل والتشتت، الأولويات محتاجة تتترتب من جديد.",
      en: "Getting things done is challenging you right now; between procrastination and distraction, priorities need sorting.",
    },
    emerging: {
      ar: "بتحاول تنظّم وقتك وطاقتك مع وعي إن الطريقة لسه محتاجة تتضبط، وده وعي مهم.",
      en: "You're working to organize your time and energy, with awareness that the approach still needs refinement; and that awareness matters.",
    },
    steady: {
      ar: "بتخلّص المهم في أغلب الأوقات، الانتظام موجود والتطوير قدّامك.",
      en: "You get what matters done most of the time; the consistency is there and growth is right ahead.",
    },
    thriving: {
      ar: "منتج ومركّز بشكل حقيقي، بتحمي وقتك وبتنجز فعلاً وبشكل مستدام.",
      en: "Genuinely productive and focused; you protect your time and follow through in a sustainable way.",
    },
  },
  CNF: {
    needs_care: {
      ar: "الثقة بالنفس دلوقتي في مرحلة تحتاج رعاية حقيقية، والشك اللي بتحسه مؤقت وليس دائماً.",
      en: "Your confidence is in a phase that needs real care right now; the doubt you feel is temporary, not permanent.",
    },
    emerging: {
      ar: "ثقتك بنفسك بتتبنى، في لحظات بتتألق فيها، وفي تانية بتتزعزع، وده طبيعي في مرحلة النمو.",
      en: "Your confidence is being built; there are moments you shine and others you wobble, and that's natural in a growth phase.",
    },
    steady: {
      ar: "بتؤمن بنفسك في أغلب الأوقات مع وعي بالمناطق اللي لسه بتتنمى فيها، ده إيمان ناضج.",
      en: "You believe in yourself most of the time with awareness of the areas still growing; that's mature confidence.",
    },
    thriving: {
      ar: "ثقة راسخة وإيمان حقيقي بقدراتك، بتقدّم بثبات ومن مكان داخلي قوي.",
      en: "Grounded confidence and genuine belief in your abilities; you show up steadily from a strong inner place.",
    },
  },
  COM: {
    needs_care: {
      ar: "التواصل مع الآخرين بيتحداك دلوقتي، سواء في التعبير عن نفسك أو الوصول للقرب الحقيقي.",
      en: "Connecting with others is challenging you right now; whether in expressing yourself or reaching real closeness.",
    },
    emerging: {
      ar: "التواصل بيتحسّن مع وعي بالمواقف اللي لسه صعبة، وده وعي هو أول خطوة للتغيير.",
      en: "Communication is improving, with awareness of the situations still difficult; and that awareness is the first step to change.",
    },
    steady: {
      ar: "بتتواصل بفاعلية في معظم المواقف مع رغبة حقيقية في تعمّق أكتر، ده طموح صحي.",
      en: "You communicate effectively in most situations with a genuine desire to go deeper; that's healthy ambition.",
    },
    thriving: {
      ar: "متواصل بعمق ووضوح، الناس بتحس بالقرب والفهم معاك، وده هدية.",
      en: "Deep, clear connection; people feel closeness and understanding with you, and that's a gift.",
    },
  },
  NRG: {
    needs_care: {
      ar: "طاقتك دلوقتي في مستوى يستحق اهتمام حقيقي، جسمك وروحك بيطلبوا رعاية وليس تجاهل.",
      en: "Your energy is at a level that deserves real attention right now; your body and spirit are asking for care, not dismissal.",
    },
    emerging: {
      ar: "طاقتك بتتحسّن بس لسه مش مستقرة، بعض عادات الرعاية الذاتية بدأت تتشكّل وده مشجّع.",
      en: "Your energy is improving but still unstable; some self-care habits are beginning to form and that's encouraging.",
    },
    steady: {
      ar: "طاقتك بشكل عام متوازنة، بتقدر تمشي يومك بثبات وبتدير التوتر بشكل معقول.",
      en: "Your energy is generally balanced; you move through your days steadily and manage stress reasonably.",
    },
    thriving: {
      ar: "مشحون ومتوازن، بتهتم بنفسك وبتستعيد طاقتك بانتظام وده يظهر في كل حياتك.",
      en: "Energized and balanced; you take care of yourself and recharge consistently, and it shows across your life.",
    },
  },
};

// ── Overall narrative per happiness zone ─────────────────────────────────────

export const NARRATIVES: Record<Zone, BilingualString> = {
  needs_care: {
    ar: "أنت دلوقتي في مرحلة تستحق فيها أن تتوقف وتسمع لنفسك، مش عشان في حاجة غلط، لكن عشان في حاجة مهمة بتنادي. الحقيقة إن الوصول لهنا وعمل التقييم ده بحد ذاته خطوة، وكل تغيير حقيقي بيبدأ بوضوح زي اللي عندك دلوقتي.",
    en: "You're in a season that deserves you stopping and listening to yourself; not because something is wrong with you, but because something important is calling. The truth is, showing up here and doing this is already a step, and every real change begins with the kind of clarity you now have.",
  },
  emerging: {
    ar: "حياتك دلوقتي في حالة حركة، في حاجات بتتحسّن وفي حاجات لسه محتاجة وقت وجهد. الجزء الجميل إن عندك وعي كافي تشوف الصورة كاملة، وده بالظبط اللي بيجعل التغيير الحقيقي ممكن.",
    en: "Your life is in motion right now; some things are improving and some still need time and effort. The beautiful part is that you have enough awareness to see the full picture, and that's precisely what makes real change possible.",
  },
  steady: {
    ar: "بتقف على أساس كويس دلوقتي، في توازن حقيقي في حياتك، مع إدراك صادق للمناطق اللي فيها مجال للنمو. ده مش توقف، ده منصة انطلاق لمرحلة أعمق.",
    en: "You're standing on a solid foundation right now; there's real balance in your life, alongside honest awareness of where growth is possible. This isn't a plateau; it's a launchpad for a deeper chapter.",
  },
  thriving: {
    ar: "بوصلتك دلوقتي بتعكس حياة فيها وضوح ورضا وحركة في الاتجاه الصح، وده يستحق تعترف بيه. حتى في مرحلة الازدهار في صعود مستمر، والوعي بالمناطق اللي ممكن تتعمّق فيها هو اللي بيفرق بين المستوي والمتقدّم.",
    en: "Your compass right now reflects a life of clarity, contentment, and movement in the right direction; and that deserves acknowledgment. Even in a thriving season there's always a next level, and awareness of where you can deepen is what separates the steady from the advancing.",
  },
};

// ── Micro-actions per recommendation ────────────────────────────────────────

export const MICRO_ACTIONS: Record<string, BilingualString> = {
  session: {
    ar: "اكتب 3 أشياء تريد أن تكون قد تحققت لك بعد 6 أشهر من الآن، أي أشياء، ما يخطر في بالك بصدق.",
    en: "Write down 3 things you want to have happened in your life 6 months from now; anything that comes to mind honestly.",
  },
  PRD: {
    ar: "اختر غداً مهمة واحدة مهمة فعلاً، واحجز لها 45 دقيقة متواصلة بدون مقاطعة.",
    en: "Choose one genuinely important task for tomorrow and block 45 uninterrupted minutes for it.",
  },
  CNF: {
    ar: "اكتب 3 أشياء نجحت فيها الأسبوع الماضي، صغيرة أو كبيرة، المهم إنها حقيقية.",
    en: "Write 3 things you did well last week; small or large, as long as they're real.",
  },
  COM: {
    ar: "في أقرب محادثة مهمة ليك اليوم، ركّز تسمع تماماً بدون ما تبدأ تفكر في ردك.",
    en: "In your next meaningful conversation today, focus fully on listening without preparing your response.",
  },
  HAP: {
    ar: "اعمل اليوم شيئاً واحداً لنفسك فقط، حتى لو 15 دقيقة.",
    en: "Do one thing just for yourself today; even if it's only 15 minutes.",
  },
  NRG: {
    ar: "اعمل اليوم شيئاً واحداً يشحن طاقتك، نوم مبكر، مشي، أو وقت هادي.",
    en: "Do one thing today that genuinely recharges you; early sleep, a walk, or quiet time.",
  },
};

// ── Recommendation copy ───────────────────────────────────────────────────────

export const RECOMMENDATION_COPY: Record<
  string,
  { title: BilingualString; why: BilingualString }
> = {
  session: {
    title: {
      ar: "جلسة فردية مع المدربة",
      en: "1:1 Coaching Session",
    },
    why: {
      ar: "قراءتك بتقول إن الخطوة الأقوى ليك دلوقتي هي محادثة مباشرة، مكان تقدر فيه تفكّر بصوت عالٍ وتوصل للوضوح اللي بتبحث عنه.",
      en: "Your reading suggests the most powerful next step for you is a direct conversation; a place to think out loud and reach the clarity you're looking for.",
    },
  },
  PRD: {
    title: {
      ar: "ورشة إدارة الوقت وتحديد الأولويات",
      en: "Time Management & Priorities Workshop",
    },
    why: {
      ar: "في منطقة الإنتاجية والتركيز عندك الفرصة الأكبر للنمو دلوقتي، هذه الورشة بتعطيك أدوات عملية تتعامل بيها مع التشتت والتأجيل وتحديد اللي يستحق وقتك فعلاً.",
      en: "Productivity and focus is where your biggest growth opportunity lies right now; this workshop gives you practical tools to tackle distraction, procrastination, and decide what truly deserves your time.",
    },
  },
  CNF: {
    title: {
      ar: "ورشة بناء الثقة بالنفس",
      en: "Building Self-Confidence Workshop",
    },
    why: {
      ar: "قراءتك بتكشف إن الثقة بالنفس هي المنطقة اللي فيها أكبر تأثير على بقية حياتك دلوقتي، هذه الورشة بتبني ثقة من مكان حقيقي وليس من الشكل الخارجي.",
      en: "Your reading reveals that self-confidence is the area with the greatest impact on the rest of your life right now; this workshop builds confidence from a real inner place, not just surface performance.",
    },
  },
  COM: {
    title: {
      ar: "ورشة فن التواصل الفعّال",
      en: "Effective Communication Workshop",
    },
    why: {
      ar: "التواصل هو المنطقة اللي فيها أكبر فرصة للنمو عندك، وتحسينه بيؤثر على علاقاتك وشغلك وكيف بتحس بنفسك.",
      en: "Communication is where your greatest growth opportunity lies; and improving it ripples into your relationships, your work, and how you feel about yourself.",
    },
  },
};
