// ── Career Compass — short, career-focused self-assessment for the homepage ──
// 7 questions: 5 "feeling" (scored 1–4), 1 "goal" (routes the recommendation),
// 1 "help" (refines tone). Bilingual AR/EN.

export type QuizLocale = "ar" | "en";
export type QuestionKind = "feeling" | "goal" | "help";

export interface QuizOption {
  ar: string;
  en: string;
  score?: number; // for feeling questions (1–4)
}

export interface QuizQuestion {
  id: string;
  kind: QuestionKind;
  ar: string;
  en: string;
  options: QuizOption[];
}

export const CAREER_QUESTIONS: QuizQuestion[] = [
  {
    id: "satisfaction",
    kind: "feeling",
    ar: "لما تفكّر في شغلك أو مسارك دلوقتي، بتحس بإيه؟",
    en: "When you think about your work or career right now, how do you feel?",
    options: [
      { ar: "محبط ومخنوق، كل يوم زي التاني", en: "Frustrated and stuck, every day feels the same", score: 1 },
      { ar: "مش مبسوط قوي، حاسس إن في حاجة ناقصة", en: "Not great, something important feels missing", score: 2 },
      { ar: "تمام بشكل عام، مع صعود وهبوط", en: "Generally okay, with ups and downs", score: 3 },
      { ar: "مبسوط ومتحمّس للي جاي", en: "Happy and excited about what's next", score: 4 },
    ],
  },
  {
    id: "clarity",
    kind: "feeling",
    ar: "قد إيه عندك وضوح عن المكان اللي عايز توصّله في مسارك؟",
    en: "How clear are you about where you want your career to go?",
    options: [
      { ar: "تايه تماماً، مش عارف عايز إيه", en: "Totally lost, I don't know what I want", score: 1 },
      { ar: "عندي فكرة مبدئية بس من غير خطة", en: "A vague idea, but no real plan", score: 2 },
      { ar: "عارف الاتجاه، بس محتاج مساعدة أوصله", en: "I know the direction, I just need help getting there", score: 3 },
      { ar: "واضح قدّامي وبتحرّك ناحيته", en: "Very clear and already moving toward it", score: 4 },
    ],
  },
  {
    id: "stuck",
    kind: "feeling",
    ar: "قد إيه حاسس إنك عالق في مكانك الحالي؟",
    en: "How stuck do you feel where you are right now?",
    options: [
      { ar: "عالق تماماً وعايز أطلع بأي طريقة", en: "Completely stuck, I want out any way I can", score: 1 },
      { ar: "عالق شوية، بفكّر في التغيير", en: "A bit stuck, I keep thinking about change", score: 2 },
      { ar: "مرتاح نسبياً بس نفسي أتطوّر", en: "Fairly comfortable, but I want to grow", score: 3 },
      { ar: "مش عالق خالص، ماشي في طريقي", en: "Not stuck at all, I'm on my path", score: 4 },
    ],
  },
  {
    id: "confidence",
    kind: "feeling",
    ar: "قد إيه واثق في مهاراتك وقدرتك على خطوتك الجاية؟",
    en: "How confident are you in your skills and your next move?",
    options: [
      { ar: "بشكّ في نفسي كتير", en: "I doubt myself a lot", score: 1 },
      { ar: "ثقتي بتطلع وتنزل", en: "My confidence goes up and down", score: 2 },
      { ar: "واثق في أغلب الأوقات", en: "Confident most of the time", score: 3 },
      { ar: "واثق تماماً وسانِد نفسي", en: "Fully confident and backing myself", score: 4 },
    ],
  },
  {
    id: "momentum",
    kind: "feeling",
    ar: "قد إيه بتاخد خطوات فعلية ناحية اللي عايزه؟",
    en: "How much are you actually taking steps toward what you want?",
    options: [
      { ar: "واقف مكاني، مش عارف أبدأ منين", en: "I'm frozen, I don't know where to start", score: 1 },
      { ar: "ببدأ وببطّل بسرعة", en: "I start, then lose momentum fast", score: 2 },
      { ar: "بتحرّك بس ببطء", en: "I'm moving, but slowly", score: 3 },
      { ar: "ماشي بخطوات ثابتة", en: "I'm taking steady, consistent steps", score: 4 },
    ],
  },
  {
    id: "goal",
    kind: "goal",
    ar: "لو تقدر تحقّق حاجة واحدة في مسارك دلوقتي، تختار إيه؟",
    en: "If you could achieve one thing in your career right now, what would it be?",
    options: [
      { ar: "أغيّر مجالي بالكامل لحاجة أحبها", en: "Change my field entirely to something I love" },
      { ar: "ألاقي المجال الصح ليا قبل ما أختار", en: "Figure out the right field for me before I commit" },
      { ar: "أسافر أو أدرس بره (منحة)", en: "Study or go abroad (a scholarship)" },
      { ar: "أكبر وأتقدّم في مجالي الحالي", en: "Grow and advance in my current field" },
      { ar: "لسه مش عارف، محتاج وضوح", en: "I'm not sure yet, I just need clarity" },
    ],
  },
  {
    id: "help",
    kind: "help",
    ar: "إيه اللي ممكن يساعدك أكتر في الفترة الجاية؟",
    en: "What would help you most in the coming period?",
    options: [
      { ar: "خطة واضحة أمشي عليها خطوة بخطوة", en: "A clear step-by-step plan to follow" },
      { ar: "توجيه شخصي 1:1 من حد خبير", en: "Personal 1:1 guidance from an expert" },
      { ar: "ورشة منظّمة تاخدني من الصفر", en: "A structured workshop that takes me from zero" },
      { ar: "حد يتابع معايا ويحاسبني", en: "Someone to follow up and keep me accountable" },
    ],
  },
];

// ── Recommendation ──────────────────────────────────────────────────────────
export type RecKind = "workshop" | "session";

export interface RecTarget {
  kind: RecKind;
  topic?: string; // workshop topic slug when kind === "workshop"
}

// The "goal" answer (index) is the primary router.
const GOAL_ROUTE: RecTarget[] = [
  { kind: "workshop", topic: "career-change" },     // change my field
  { kind: "workshop", topic: "career-discovery" },  // find the right field
  { kind: "workshop", topic: "scholarships" },      // study abroad / scholarship
  { kind: "session" },                              // grow in current field
  { kind: "session" },                              // not sure / need clarity
];

export function recommend(goalIndex: number): RecTarget {
  return GOAL_ROUTE[goalIndex] ?? { kind: "session" };
}

export type Zone = "needs_care" | "emerging" | "steady" | "thriving";

export function zoneFromAvg(avg: number): Zone {
  if (avg <= 2) return "needs_care";
  if (avg <= 2.75) return "emerging";
  if (avg <= 3.4) return "steady";
  return "thriving";
}

// The "cool descriptive name" for the general first session.
export const KICKSTART_SESSION = {
  ar: { name: "جلسة الانطلاقة", tagline: "جلسة 1:1 نحدّد فيها وجهتك وأول خطوة عملية" },
  en: { name: "Kickstart Session", tagline: "A 1:1 session to map your direction and first real step" },
};
