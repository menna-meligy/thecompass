import { QUESTIONS, INTENT_ROUTE } from "./questions";
import type { Dimension, DimensionScores, Zone, Recommendation, AssessmentResult, DimensionRead } from "./types";
import { DIMENSION_READS, NARRATIVES, MICRO_ACTIONS, DIM_LABELS } from "./templates";

// ── Zone boundaries ──────────────────────────────────────────────────────────

export function getZone(score: number): Zone {
  if (score >= 3.5) return "thriving";
  if (score >= 3.0) return "steady";
  if (score >= 2.0) return "emerging";
  return "needs_care";
}

// ── Core scoring ─────────────────────────────────────────────────────────────

export function computeScores(answers: Record<string, number>): DimensionScores {
  const buckets: Record<Dimension, number[]> = {
    HAP: [], DIR: [], PRD: [], CNF: [], COM: [], NRG: [],
  };

  for (const q of QUESTIONS) {
    if (!q.scored) continue;
    if (q.dimension === "CONTEXT" || q.dimension === "INTENT") continue;
    const score = answers[q.id];
    if (score !== undefined) {
      buckets[q.dimension as Dimension].push(score);
    }
  }

  const result = {} as DimensionScores;
  for (const dim of Object.keys(buckets) as Dimension[]) {
    const arr = buckets[dim];
    result[dim] = arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 2.5;
  }
  return result;
}

export function computeHappinessScore(scores: DimensionScores): number {
  return (scores.HAP + scores.NRG) / 2;
}

// ── Recommendation logic ─────────────────────────────────────────────────────

export function computeRecommendation(
  scores: DimensionScores,
  intentAnswer?: number
): Recommendation {
  const routed: Dimension[] = ["PRD", "CNF", "COM"];
  const routedScores = routed.map((d) => ({ dim: d, score: scores[d] }));
  routedScores.sort((a, b) => a.score - b.score);

  const lowest = routedScores[0];
  const dirScore = scores.DIR;
  const happinessScore = computeHappinessScore(scores);
  const happinessZone = getZone(happinessScore);

  // Check for session recommendation conditions
  const tieAtBottom =
    routedScores[0].score === routedScores[1].score ||
    (dirScore <= routedScores[0].score + 0.15 && dirScore < 2.5);

  const needsSession =
    dirScore < lowest.score - 0.05 || // DIR clearly the lowest
    tieAtBottom ||
    happinessZone === "needs_care" ||
    (intentAnswer === 0 || intentAnswer === 4); // intent says clarity or wellbeing

  if (needsSession) {
    return { type: "session" };
  }

  // Intent tie-breaker among routed dimensions
  if (intentAnswer !== undefined) {
    const intentDimMap: Record<number, Dimension | null> = {
      1: "PRD",
      2: "CNF",
      3: "COM",
    };
    const intentDim = intentDimMap[intentAnswer];
    if (intentDim && Math.abs(scores[intentDim] - lowest.score) < 0.3) {
      return {
        type: "workshop",
        dimension: intentDim,
        workshopTopic: WORKSHOP_TOPICS[intentDim],
      };
    }
  }

  return {
    type: "workshop",
    dimension: lowest.dim,
    workshopTopic: WORKSHOP_TOPICS[lowest.dim],
  };
}

const WORKSHOP_TOPICS: Record<Dimension, string | undefined> = {
  PRD: "time-management",
  CNF: "confidence",
  COM: "communication",
  HAP: undefined,
  DIR: undefined,
  NRG: undefined,
};

// ── Full result assembly ──────────────────────────────────────────────────────

export function assembleResult(
  answers: Record<string, number>,
  intentAnswer?: number,
  openingAr = "",
  openingEn = ""
): AssessmentResult {
  const dimScores = computeScores(answers);
  const happinessScore = computeHappinessScore(dimScores);
  const happinessZone = getZone(happinessScore);
  const recommendation = computeRecommendation(dimScores, intentAnswer);

  const dims: Dimension[] = ["HAP", "DIR", "PRD", "CNF", "COM", "NRG"];

  const dimensionReads: DimensionRead[] = dims.map((dim) => {
    const score = dimScores[dim];
    const zone = getZone(score);
    const reads = DIMENSION_READS[dim][zone];
    const labels = DIM_LABELS[dim];
    return {
      dimension: dim,
      score,
      zone,
      label_ar: labels.ar,
      label_en: labels.en,
      read_ar: reads.ar,
      read_en: reads.en,
    };
  });

  // Sort: thriving/steady first (strengths), then emerging/needs_care (growth)
  dimensionReads.sort((a, b) => b.score - a.score);

  const topStrength = dimensionReads[0].dimension;
  const mainGrowthArea = dimensionReads[dimensionReads.length - 1].dimension;

  const narrative = NARRATIVES[happinessZone];
  const microAction = MICRO_ACTIONS[recommendation.type === "session" ? "session" : (recommendation.dimension ?? "PRD")];

  // Fallback opening (used if AI call fails)
  if (!openingAr) {
    openingAr = buildFallbackOpening(dimScores, topStrength, mainGrowthArea, "ar");
  }
  if (!openingEn) {
    openingEn = buildFallbackOpening(dimScores, topStrength, mainGrowthArea, "en");
  }

  return {
    dimensionScores: dimScores,
    happinessScore,
    happinessZone,
    dimensionReads,
    topStrength,
    mainGrowthArea,
    recommendation,
    narrative_ar: narrative.ar,
    narrative_en: narrative.en,
    microAction_ar: microAction.ar,
    microAction_en: microAction.en,
    opening_ar: openingAr,
    opening_en: openingEn,
  };
}

function buildFallbackOpening(
  scores: DimensionScores,
  topStrength: Dimension,
  growthArea: Dimension,
  locale: "ar" | "en"
): string {
  const strengthLabel = DIM_LABELS[topStrength];
  const growthLabel = DIM_LABELS[growthArea];
  const happinessScore = computeHappinessScore(scores);
  const zone = getZone(happinessScore);

  const openers: Record<Zone, Record<"ar" | "en", string>> = {
    needs_care: {
      ar: `قراءة بوصلتك دلوقتي بتكشف إن في ضغط حقيقي بتمر بيه، وده يحتاج اهتمام وليس تجاهل. نقطة قوتك الواضحة في **${strengthLabel.ar}**، وأكبر فرصة للنمو قدّامك في **${growthLabel.ar}**، والبداية من هنا هتحدث فرقاً.`,
      en: `Your compass reading right now reveals real pressure in your life, something worth acknowledging, not ignoring. Your clearest strength shows in **${strengthLabel.en}**, and your biggest growth opportunity lies in **${growthLabel.en}**; starting there will make a real difference.`,
    },
    emerging: {
      ar: `في حاجات بتتحسّن في حياتك دلوقتي، وفي نفس الوقت في مناطق محتاجة انتباه أكتر. قوتك في **${strengthLabel.ar}** حاجة تبني عليها، وتطوير **${growthLabel.ar}** هيفتح ليك باب جديد.`,
      en: `There's real forward movement in your life right now, alongside areas that need more attention. Your strength in **${strengthLabel.en}** is something to build on, and developing **${growthLabel.en}** will open a new door for you.`,
    },
    steady: {
      ar: `بوصلتك دلوقتي بتكشف أساس كويس وحياة فيها توازن. أقوى ما عندك في **${strengthLabel.ar}**، وده رصيد حقيقي. الخطوة الجاية هي توسيع **${growthLabel.ar}** لتاخد حياتك للمستوى الجاي.`,
      en: `Your compass reveals a solid foundation and a balanced life. Your greatest asset is **${strengthLabel.en}**; that's real capital. The next move is expanding **${growthLabel.en}** to take your life to the next level.`,
    },
    thriving: {
      ar: `بوصلتك دلوقتي بتعكس حياة فيها وضوح ورضا حقيقي، ده من أجمل ما يكون. قوتك في **${strengthLabel.ar}** واضحة وحقيقية، وحتى في مرحلة الازدهار في **${growthLabel.ar}** ممكن تعمق أكتر.`,
      en: `Your compass reflects a life of real clarity and contentment; that's genuinely beautiful. Your strength in **${strengthLabel.en}** is clear and real, and even in a thriving season, there's more depth available in **${growthLabel.en}**.`,
    },
  };

  return openers[zone][locale];
}

// ── Unit-testable exports ────────────────────────────────────────────────────

export { WORKSHOP_TOPICS };
