import type { SkillLevel } from "./types";
import type { Dimension } from "@/lib/compass/types";

/** Config — adjustable without DB migration */
export const SKILLS_CONFIG = {
  ASSESSMENT_COOLDOWN_HOURS: 24 * 30, // one reading per month

  MENTOR_WEIGHT: 0.6,
  SELF_WEIGHT: 0.4,
} as const;

export interface LevelLabel {
  ar: string;
  en: string;
  color: string;
}

export const LEVEL_LABELS: Record<SkillLevel, LevelLabel> = {
  1: { ar: "يبدأ",   en: "Emerging",    color: "#94a3b8" },
  2: { ar: "ينمو",   en: "Developing",  color: "#60a5fa" },
  3: { ar: "يتمرّن", en: "Practising",  color: "#34d399" },
  4: { ar: "قوي",    en: "Strong",      color: "#f59e0b" },
  5: { ar: "إتقان",  en: "Mastery",     color: "#a78bfa" },
};

/** Map a 1-4 dimension score (from assessment) to a 1-5 skill level */
export function mapScoreToLevel(score: number): SkillLevel {
  if (score >= 3.5) return 5;
  if (score >= 2.75) return 4;
  if (score >= 2.0) return 3;
  if (score >= 1.5) return 2;
  return 1;
}

/** Derive combined level: mentor 60% + self 40% when both exist */
export function computeCombinedLevel(
  selfLevel: SkillLevel | null,
  mentorLevel: SkillLevel | null
): SkillLevel | null {
  if (selfLevel === null && mentorLevel === null) return null;
  if (selfLevel === null) return mentorLevel;
  if (mentorLevel === null) return selfLevel;
  const raw = selfLevel * SKILLS_CONFIG.SELF_WEIGHT + mentorLevel * SKILLS_CONFIG.MENTOR_WEIGHT;
  return Math.max(1, Math.min(5, Math.round(raw))) as SkillLevel;
}

/** The dimension a skill belongs to in the assessment */
export const DIMENSION_SKILLS_MAP: Record<Dimension, string[]> = {
  HAP: [
    "11111111-1111-1111-1101-000000000001",
    "11111111-1111-1111-1102-000000000001",
    "11111111-1111-1111-1103-000000000001",
    "11111111-1111-1111-1104-000000000001",
  ],
  DIR: [
    "22222222-2222-2222-2201-000000000001",
    "22222222-2222-2222-2202-000000000001",
    "22222222-2222-2222-2203-000000000001",
    "22222222-2222-2222-2204-000000000001",
    "22222222-2222-2222-2205-000000000001",
  ],
  PRD: [
    "33333333-3333-3333-3301-000000000001",
    "33333333-3333-3333-3302-000000000001",
    "33333333-3333-3333-3303-000000000001",
    "33333333-3333-3333-3304-000000000001",
    "33333333-3333-3333-3305-000000000001",
  ],
  CNF: [
    "44444444-4444-4444-4401-000000000001",
    "44444444-4444-4444-4402-000000000001",
    "44444444-4444-4444-4403-000000000001",
    "44444444-4444-4444-4404-000000000001",
    "44444444-4444-4444-4405-000000000001",
    "44444444-4444-4444-4406-000000000001",
  ],
  COM: [
    "55555555-5555-5555-5501-000000000001",
    "55555555-5555-5555-5502-000000000001",
    "55555555-5555-5555-5503-000000000001",
    "55555555-5555-5555-5504-000000000001",
    "55555555-5555-5555-5505-000000000001",
    "55555555-5555-5555-5506-000000000001",
  ],
  NRG: [
    "66666666-6666-6666-6601-000000000001",
    "66666666-6666-6666-6602-000000000001",
    "66666666-6666-6666-6603-000000000001",
    "66666666-6666-6666-6604-000000000001",
    "66666666-6666-6666-6605-000000000001",
  ],
};

/** Build the list of { skill_id, level } updates for a given set of dimension scores */
export function buildSkillUpdatesFromScores(
  dimensionScores: Record<Dimension, number>
): Array<{ skill_id: string; level: SkillLevel }> {
  const updates: Array<{ skill_id: string; level: SkillLevel }> = [];
  for (const [dim, score] of Object.entries(dimensionScores) as [Dimension, number][]) {
    const skillIds = DIMENSION_SKILLS_MAP[dim] ?? [];
    const level = mapScoreToLevel(score);
    for (const skill_id of skillIds) {
      updates.push({ skill_id, level });
    }
  }
  return updates;
}

/** Compute what the unlock date/time would be given a last assessment date */
export function computeUnlockDate(lastAssessmentAt: string): Date {
  const d = new Date(lastAssessmentAt);
  d.setHours(d.getHours() + SKILLS_CONFIG.ASSESSMENT_COOLDOWN_HOURS);
  return d;
}

/** Gap (in days) between two dates */
export function daysBetween(a: Date | string, b: Date | string): number {
  const msA = typeof a === "string" ? new Date(a).getTime() : a.getTime();
  const msB = typeof b === "string" ? new Date(b).getTime() : b.getTime();
  return Math.floor(Math.abs(msB - msA) / 86_400_000);
}
