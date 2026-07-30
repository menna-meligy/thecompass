import type { Question } from "./types";

export const QUESTIONS: Question[] = [
  // ── CONTEXT (optional opener, unscored) ─────────────────────────────────────
  {
    id: "Q0",
    dimension: "CONTEXT",
    order: 0,
    scored: false,
    text_ar: "إيه اللي شاغل بالك أكتر في الفترة دي؟",
    text_en: "What's on your mind most lately?",
    options: [
      { label_ar: "الشغل", label_en: "Work", score: 0 },
      { label_ar: "نفسي", label_en: "Myself", score: 0 },
      { label_ar: "علاقاتي", label_en: "Relationships", score: 0 },
      { label_ar: "اتجاهي في الحياة", label_en: "Direction in life", score: 0 },
    ],
  },

  // ── HAP — Happiness & Meaning ────────────────────────────────────────────────
  {
    id: "Q1",
    dimension: "HAP",
    order: 1,
    scored: true,
    text_ar: "لما تفكّر في حياتك ككل دلوقتي، بتحس بإيه؟",
    text_en: "When you think about your life as a whole right now, how do you feel?",
    options: [
      { label_ar: "بصراحة بمرّ بفترة صعبة، ومعظم أيامي تقيلة.", label_en: "Honestly, I'm going through a hard time and most days feel heavy.", score: 1 },
      { label_ar: "في حاجات تمام، بس في شيء مهم حاسس إنه ناقص.", label_en: "Some things are fine, but something important feels missing.", score: 2 },
      { label_ar: "بشكل عام أنا مرتاح، مع الصعود والهبوط الطبيعي.", label_en: "Overall I'm content, with the normal ups and downs.", score: 3 },
      { label_ar: "حاسس برضا حقيقي وامتنان في الفترة دي.", label_en: "I feel real contentment and gratitude these days.", score: 4 },
    ],
  },
  {
    id: "Q2",
    dimension: "HAP",
    order: 2,
    scored: true,
    text_ar: "قد إيه بتحس إن اللي بتعمله ليه معنى وقيمة؟",
    text_en: "How often do you feel that what you do matters and has meaning?",
    options: [
      { label_ar: "نادراً، حاسس إني بمشي ورا اليوم من غير معنى.", label_en: "Rarely; I feel like I'm just going through the motions.", score: 1 },
      { label_ar: "أحياناً، بس مش بالقدر الكافي.", label_en: "Sometimes, but not enough.", score: 2 },
      { label_ar: "في أغلب الأوقات.", label_en: "Fairly often.", score: 3 },
      { label_ar: "كل يوم تقريباً.", label_en: "Almost every day.", score: 4 },
    ],
  },
  {
    id: "Q3",
    dimension: "HAP",
    order: 3,
    scored: true,
    text_ar: "لما تفكّر في الشهور الجاية، بتحس بإيه؟",
    text_en: "When you think about the months ahead, what do you feel?",
    options: [
      { label_ar: "أغلبه قلق، مش قادر أتخيّل إن الأمور هتتحسّن.", label_en: "Mostly worry; I can't picture things getting better.", score: 1 },
      { label_ar: "مش متأكد، بتمنى بس مش واثق.", label_en: "Uncertain; I hope, but I'm not sure.", score: 2 },
      { label_ar: "متفائل بحذر.", label_en: "Cautiously hopeful.", score: 3 },
      { label_ar: "متفائل فعلاً ومستني الجاي.", label_en: "Genuinely hopeful and looking forward.", score: 4 },
    ],
  },

  // ── DIR — Clarity & Direction ────────────────────────────────────────────────
  {
    id: "Q4",
    dimension: "DIR",
    order: 4,
    scored: true,
    text_ar: "قد إيه عندك وضوح عن المكان اللي عايز توصّل له في حياتك أو شغلك؟",
    text_en: "How clear are you about where you want your life or career to go?",
    options: [
      { label_ar: "حاسس إني تايه ومش عارف أنا عايز إيه فعلاً.", label_en: "I feel lost; I don't really know what I want.", score: 1 },
      { label_ar: "عندي فكرة مبدئية بس من غير خطة واضحة.", label_en: "I have a vague idea but no real plan.", score: 2 },
      { label_ar: "عارف الاتجاه، بس محتاج مساعدة أوصل له.", label_en: "I know the direction, I just need help getting there.", score: 3 },
      { label_ar: "عندي وضوح كبير وبتحرك ناحيته.", label_en: "I'm very clear and already moving toward it.", score: 4 },
    ],
  },
  {
    id: "Q5",
    dimension: "DIR",
    order: 5,
    scored: true,
    text_ar: "لما تواجه قرار مهم بخصوص مستقبلك، عادةً بيحصل إيه؟",
    text_en: "When you face an important decision about your future, what usually happens?",
    options: [
      { label_ar: "بتجمّد وبتجنّبه.", label_en: "I freeze and avoid it.", score: 1 },
      { label_ar: "بفكر فيه كتير لفترة طويلة وبحس إني عالق.", label_en: "I overthink it for a long time and feel stuck.", score: 2 },
      { label_ar: "بوازن الأمور وفي الآخر بقرر.", label_en: "I weigh it and eventually decide.", score: 3 },
      { label_ar: "بثق في نفسي وبتحرك.", label_en: "I trust myself and move forward.", score: 4 },
    ],
  },
  {
    id: "Q6",
    dimension: "DIR",
    order: 6,
    scored: true,
    text_ar: "قد إيه حياتك اليومية متماشية مع اللي بيهمّك فعلاً؟",
    text_en: "How aligned is your daily life with what truly matters to you?",
    options: [
      { label_ar: "خالص، حاسس إني بعيد عن طريقي.", label_en: "Not at all; I feel off-track.", score: 1 },
      { label_ar: "شوية، بس أغلب يومي رايح في حاجة تانية.", label_en: "A little, but most of my day goes elsewhere.", score: 2 },
      { label_ar: "متماشية في أغلبها.", label_en: "Mostly aligned.", score: 3 },
      { label_ar: "متماشية جداً، بعيش على اللي بيهمّني.", label_en: "Strongly aligned; I live by what matters to me.", score: 4 },
    ],
  },

  // ── PRD — Productivity & Focus ───────────────────────────────────────────────
  {
    id: "Q7",
    dimension: "PRD",
    order: 7,
    scored: true,
    text_ar: "أنهي وصف أقرب لأسبوعك المعتاد؟",
    text_en: "Which best describes your typical week?",
    options: [
      { label_ar: "طول الوقت بردّ فعل ومش بلحق حاجة.", label_en: "I'm constantly reacting and never catch up.", score: 1 },
      { label_ar: "مشغول، بس كتير من اللي بعمله مش بيقدّمني.", label_en: "I'm busy, but much of it doesn't move me forward.", score: 2 },
      { label_ar: "في أغلب الأسابيع بخلّص الحاجات المهمة.", label_en: "I get the important things done most weeks.", score: 3 },
      { label_ar: "حاسس إني مسيطر على وقتي وأولوياتي.", label_en: "I feel in control of my time and priorities.", score: 4 },
    ],
  },
  {
    id: "Q8",
    dimension: "PRD",
    order: 8,
    scored: true,
    text_ar: "لما بتحطّ هدف لنفسك، عادةً بيحصل إيه؟",
    text_en: "When you set a goal for yourself, what usually happens?",
    options: [
      { label_ar: "نادراً ما ببدأ، أو ببطّل بسرعة.", label_en: "I rarely start, or give up quickly.", score: 1 },
      { label_ar: "ببدأ بحماس بس بفقد الاندفاع.", label_en: "I start strong but lose momentum.", score: 2 },
      { label_ar: "بكمّل أغلب اللي ببدأه.", label_en: "I finish most of what I start.", score: 3 },
      { label_ar: "بلتزم وبكمّل بانتظام.", label_en: "I follow through consistently.", score: 4 },
    ],
  },
  {
    id: "Q9",
    dimension: "PRD",
    order: 9,
    scored: true,
    text_ar: "قد إيه بتقدر تركّز في المهم من غير ما تتشتت؟",
    text_en: "How easily can you focus on what matters without getting pulled away?",
    options: [
      { label_ar: "مشتت طول الوقت تقريباً.", label_en: "I'm distracted almost all the time.", score: 1 },
      { label_ar: "بصعب عليّ التركيز في أغلب الأحيان.", label_en: "I struggle to focus more often than not.", score: 2 },
      { label_ar: "بقدر أركّز لما أحتاج فعلاً.", label_en: "I can focus when I really need to.", score: 3 },
      { label_ar: "بركّز كويس وبحافظ على انتباهي.", label_en: "I focus well and protect my attention.", score: 4 },
    ],
  },
  {
    id: "Q10",
    dimension: "PRD",
    order: 10,
    scored: true,
    text_ar: "لما يكون قدّامك حاجة مهمة بس صعبة، بتميل تعمل إيه؟",
    text_en: "When something important but hard is in front of you, what do you tend to do?",
    options: [
      { label_ar: "بفضل أأجّلها لحد ما تتكوّم.", label_en: "I keep putting it off until it piles up.", score: 1 },
      { label_ar: "بأجّل وبعدين بعملها بسرعة في آخر لحظة.", label_en: "I delay, then rush it at the last minute.", score: 2 },
      { label_ar: "عادةً بعملها في وقت معقول.", label_en: "I usually get to it in reasonable time.", score: 3 },
      { label_ar: "ببدأ بدري وبقسّمها خطوات.", label_en: "I tackle it early and break it into steps.", score: 4 },
    ],
  },

  // ── CNF — Confidence & Self-worth ────────────────────────────────────────────
  {
    id: "Q11",
    dimension: "CNF",
    order: 11,
    scored: true,
    text_ar: "إزاي بتحس تجاه قدراتك بشكل عام؟",
    text_en: "How do you usually feel about your own abilities?",
    options: [
      { label_ar: "كتير بشكّ في نفسي وبحس إني مش كفاية.", label_en: "I often doubt myself and feel I'm not enough.", score: 1 },
      { label_ar: "ثقتي بنفسي بتطلع وتنزل كتير.", label_en: "My confidence rises and falls a lot.", score: 2 },
      { label_ar: "بثق في نفسي في أغلب الأوقات.", label_en: "I believe in myself most of the time.", score: 3 },
      { label_ar: "واثق من قدراتي وبسند نفسي.", label_en: "I trust my abilities and back myself.", score: 4 },
    ],
  },
  {
    id: "Q12",
    dimension: "CNF",
    order: 12,
    scored: true,
    text_ar: "قد إيه الخوف من الفشل أو رأي الناس بيوقّفك؟",
    text_en: "How much does fear of failure or others' opinions hold you back?",
    options: [
      { label_ar: "كتير، بيمنعني إني أجرّب أصلاً.", label_en: "A lot; it stops me from even trying.", score: 1 },
      { label_ar: "بيعطّلني في أحيان كتير.", label_en: "Often enough to slow me down.", score: 2 },
      { label_ar: "أحياناً، بس بكمّل رغم الخوف.", label_en: "Sometimes, but I push through.", score: 3 },
      { label_ar: "نادراً، بتصرّف رغم الخوف.", label_en: "Rarely; I act despite the fear.", score: 4 },
    ],
  },
  {
    id: "Q13",
    dimension: "CNF",
    order: 13,
    scored: true,
    text_ar: "لما بتقارن نفسك بالناس، بتحس بإيه؟",
    text_en: "When you compare yourself to others, how do you feel?",
    options: [
      { label_ar: "غالباً بحس إني متأخر أو أقل.", label_en: "I usually feel behind or less-than.", score: 1 },
      { label_ar: "المقارنة بتقلقني كتير.", label_en: "Comparison often makes me anxious.", score: 2 },
      { label_ar: "بتأثر فيّ شوية بس بفضل ثابت.", label_en: "It affects me a little, but I stay grounded.", score: 3 },
      { label_ar: "بركّز على طريقي وبحس بسلام.", label_en: "I focus on my own path and feel at peace.", score: 4 },
    ],
  },
  {
    id: "Q14",
    dimension: "CNF",
    order: 14,
    scored: true,
    text_ar: "لما تواجه انتكاسة أو تغلط، عادةً بتردّ إزاي؟",
    text_en: "When you face a setback or make a mistake, how do you usually respond?",
    options: [
      { label_ar: "بقسى على نفسي جداً وبتفضل معايا.", label_en: "I'm very hard on myself and it stays with me.", score: 1 },
      { label_ar: "بتوقّعني لفترة.", label_en: "It knocks me down for a while.", score: 2 },
      { label_ar: "برجع لنفسي بعد شوية.", label_en: "I recover after a bit.", score: 3 },
      { label_ar: "بتعلّم منها وبرجع أقوى.", label_en: "I learn from it and bounce back stronger.", score: 4 },
    ],
  },

  // ── COM — Communication & Connection ─────────────────────────────────────────
  {
    id: "Q15",
    dimension: "COM",
    order: 15,
    scored: true,
    text_ar: "قد إيه بتقدر تعبّر عن اللي بتفكر فيه وتحسه قدّام الناس؟",
    text_en: "How easily can you express what you really think and feel to others?",
    options: [
      { label_ar: "غالباً بكتم وبسكت.", label_en: "I usually hold back and stay silent.", score: 1 },
      { label_ar: "بصعب عليّ، خصوصاً في المواقف الصعبة.", label_en: "I find it hard, especially in tough moments.", score: 2 },
      { label_ar: "بقدر أعبّر عن نفسي في أغلب المواقف.", label_en: "I can express myself in most situations.", score: 3 },
      { label_ar: "بتواصل بصراحة ووضوح.", label_en: "I communicate openly and clearly.", score: 4 },
    ],
  },
  {
    id: "Q16",
    dimension: "COM",
    order: 16,
    scored: true,
    text_ar: "لما يكون في توتر أو خلاف مع حد، بتعمل إيه؟",
    text_en: "When there's tension or disagreement with someone, what do you do?",
    options: [
      { label_ar: "بتجنّبه تماماً.", label_en: "I avoid it completely.", score: 1 },
      { label_ar: "بتوتر وكتير بندم على طريقة تعاملي.", label_en: "I get anxious and often regret how I handle it.", score: 2 },
      { label_ar: "بتعامل معاه بشكل مقبول في أغلب الأوقات.", label_en: "I manage it okay most of the time.", score: 3 },
      { label_ar: "بتعامل بهدوء وبشكل بنّاء.", label_en: "I handle it calmly and constructively.", score: 4 },
    ],
  },
  {
    id: "Q17",
    dimension: "COM",
    order: 17,
    scored: true,
    text_ar: "قد إيه بتحس بالقرب وإن الناس فاهماك في علاقاتك؟",
    text_en: "How connected and understood do you feel in your relationships?",
    options: [
      { label_ar: "كتير بحس بالوحدة حتى وأنا بين الناس.", label_en: "Often lonely, even around people.", score: 1 },
      { label_ar: "في تواصل، بس نفسي في قرب أعمق.", label_en: "There's some connection, but I crave something deeper.", score: 2 },
      { label_ar: "حاسس بتواصل معقول.", label_en: "I feel reasonably connected.", score: 3 },
      { label_ar: "حاسس بقرب وإن الناس فاهماني.", label_en: "I feel close and understood.", score: 4 },
    ],
  },
  {
    id: "Q18",
    dimension: "COM",
    order: 18,
    scored: true,
    text_ar: "في الكلام مع الناس، قد إيه بتكون حاضر وبتسمع كويس؟",
    text_en: "In conversations, how present are you and how well do you listen?",
    options: [
      { label_ar: "ذهني بيسرح أو بستنى دوري أتكلم.", label_en: "My mind drifts, or I'm just waiting for my turn to talk.", score: 1 },
      { label_ar: "بسمع، بس كتير مشتت.", label_en: "I listen, but I'm often distracted.", score: 2 },
      { label_ar: "بسمع بشكل كويس نسبياً.", label_en: "I'm a fairly good listener.", score: 3 },
      { label_ar: "بكون حاضر تماماً والناس بتحس إنها مسموعة معايا.", label_en: "I'm fully present, and people feel heard with me.", score: 4 },
    ],
  },

  // ── NRG — Energy & Wellbeing ──────────────────────────────────────────────────
  {
    id: "Q19",
    dimension: "NRG",
    order: 19,
    scored: true,
    text_ar: "إزاي طاقتك ومستوى التوتر عندك في أغلب الأيام؟",
    text_en: "How are your energy and stress levels most days?",
    options: [
      { label_ar: "منهَك ومضغوط أغلب الوقت.", label_en: "Drained and overwhelmed most of the time.", score: 1 },
      { label_ar: "كتير تعبان أو مشدود.", label_en: "Often tired or stretched thin.", score: 2 },
      { label_ar: "بشكل عام تمام، والتوتر في حدود المعقول.", label_en: "Generally okay, stress is manageable.", score: 3 },
      { label_ar: "عندي طاقة واتزان.", label_en: "Energized and balanced.", score: 4 },
    ],
  },
  {
    id: "Q20",
    dimension: "NRG",
    order: 20,
    scored: true,
    text_ar: "قد إيه بتهتم بنفسك (راحة، صحة، الحاجات اللي بتبسطك)؟",
    text_en: "How well are you taking care of yourself (rest, health, things you enjoy)?",
    options: [
      { label_ar: "بهمل نفسي تقريباً تماماً.", label_en: "I neglect myself almost entirely.", score: 1 },
      { label_ar: "بحاول، بس ده أول حاجة بتقع.", label_en: "I try, but it's the first thing to slip.", score: 2 },
      { label_ar: "بحقّق توازن معقول.", label_en: "I keep a decent balance.", score: 3 },
      { label_ar: "بهتم بنفسي كويس.", label_en: "I take good care of myself.", score: 4 },
    ],
  },
  {
    id: "Q21",
    dimension: "NRG",
    order: 21,
    scored: true,
    text_ar: "قد إيه بترتاح وبتستعيد طاقتك (نوم، وقت راحة)؟",
    text_en: "How well do you rest and recover (sleep, downtime)?",
    options: [
      { label_ar: "ماشي على آخر طاقتي.", label_en: "I'm running on empty.", score: 1 },
      { label_ar: "راحتي مش كفاية أو مش حقيقية.", label_en: "My rest isn't enough, or doesn't really restore me.", score: 2 },
      { label_ar: "بستعيد طاقتي بشكل معقول.", label_en: "I recover reasonably well.", score: 3 },
      { label_ar: "بريّح كويس وبشحن طاقتي.", label_en: "I rest well and recharge.", score: 4 },
    ],
  },

  // ── INTENT (unscored — tie-breaker + tone personalization) ───────────────────
  {
    id: "Q22",
    dimension: "INTENT",
    order: 22,
    scored: false,
    text_ar: "لو حاجة واحدة في حياتك تتغير في الشهور الجاية، تختار إيه؟",
    text_en: "If one thing in your life could shift in the next few months, what would you choose?",
    options: [
      { label_ar: "أوصل لوضوح واتجاه لمستقبلي.", label_en: "Get clarity and direction for my future.", score: 0 },
      { label_ar: "أنظّم وقتي وأنجز فعلاً.", label_en: "Manage my time and actually get things done.", score: 0 },
      { label_ar: "أبني ثقة حقيقية بنفسي.", label_en: "Build real confidence and self-belief.", score: 0 },
      { label_ar: "أتواصل أحسن وأطوّر علاقاتي.", label_en: "Communicate better and improve my relationships.", score: 0 },
      { label_ar: "أحس بسعادة أكتر وضغط أقل.", label_en: "Feel happier and less overwhelmed.", score: 0 },
    ],
  },
];

// Helper: all scored questions only
export const SCORED_QUESTIONS = QUESTIONS.filter((q) => q.scored);

// Helper: questions shown in the flow (context first, then scored 1-21, then intent)
export const FLOW_QUESTIONS = QUESTIONS;

// Map intent option index to routing hint
export const INTENT_ROUTE: Record<number, string> = {
  0: "session",   // DIR / 1:1
  1: "PRD",       // Productivity
  2: "CNF",       // Confidence
  3: "COM",       // Communication
  4: "session",   // wellbeing / 1:1
};
