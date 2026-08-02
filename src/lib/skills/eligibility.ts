import type { EligibilityResult, AssessmentEligibility } from "./types";
import { computeUnlockDate } from "./levels";

interface EligibilityInput {
  completedAssessments: Array<{ id: string; completed_at: string }>;
  now?: Date;
}

/**
 * Pure function — determines the client's assessment eligibility state.
 * Only rule: one reading per SKILLS_CONFIG.ASSESSMENT_COOLDOWN_HOURS.
 */
export function computeEligibility(input: EligibilityInput): EligibilityResult {
  const { completedAssessments, now = new Date() } = input;

  const totalAssessments = completedAssessments.length;

  // BASELINE_OPEN: never assessed
  if (totalAssessments === 0) {
    return {
      state: "BASELINE_OPEN",
      totalAssessments: 0,
    };
  }

  // Sort descending to find the latest completed assessment
  const sorted = [...completedAssessments].sort(
    (a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
  );
  const lastAssessmentAt = sorted[0].completed_at;

  // LOCKED_COOLDOWN: within the cooldown window of the last assessment
  const unlockDate = computeUnlockDate(lastAssessmentAt);
  if (now < unlockDate) {
    return {
      state: "LOCKED_COOLDOWN",
      lastAssessmentAt,
      unlockDate: unlockDate.toISOString(),
      totalAssessments,
    };
  }

  // ELIGIBLE
  return {
    state: "ELIGIBLE",
    lastAssessmentAt,
    totalAssessments,
  };
}

/** Human-readable status message for each eligibility state */
export function getEligibilityMessage(
  result: EligibilityResult,
  locale: "ar" | "en"
): { title: string; body: string; cta?: string } {
  const state: AssessmentEligibility = result.state;

  if (state === "BASELINE_OPEN") {
    return locale === "ar"
      ? { title: "ابدأ رحلتك", body: "ابدأ تقييمك الأول واعرف انت فين دلوقتي.", cta: "ابدأ التقييم" }
      : { title: "Start your journey", body: "Take your first reading and discover where you are right now.", cta: "Start assessment" };
  }

  if (state === "LOCKED_COOLDOWN") {
    const unlockDate = result.unlockDate ? new Date(result.unlockDate) : null;
    const dateStr = unlockDate
      ? unlockDate.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-GB", { day: "numeric", month: "long" })
      : "";
    return locale === "ar"
      ? { title: "تقييمك الجاي قريّب", body: `تقييمك الجاي هيفتح يوم ${dateStr}. تقييم واحد كل شهر عشان التقدم يبان بصدق.` }
      : { title: "Next reading coming soon", body: `Your next assessment unlocks on ${dateStr}. One assessment a month so progress shows honestly.` };
  }

  // ELIGIBLE
  return locale === "ar"
    ? { title: "تقييمك الجديد جاهز", body: "حان وقت قياس التقدم.", cta: "ابدأ التقييم الجديد" }
    : { title: "Your new reading is ready", body: "Time to measure your progress.", cta: "Start new assessment" };
}
