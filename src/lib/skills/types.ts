import type { Dimension } from "@/lib/compass/types";

export type SkillLevel = 1 | 2 | 3 | 4 | 5;

export type SkillLevelSource = "assessment" | "mentor" | "roadmap";
export type SkillLevelType = "self" | "mentor" | "combined";
export type MilestoneStatus = "active" | "completed" | "skipped";

/** Assessment eligibility state machine */
export type AssessmentEligibility =
  | "BASELINE_OPEN"
  | "LOCKED_COOLDOWN"
  | "ELIGIBLE";

export interface EligibilityResult {
  state: AssessmentEligibility;
  unlockDate?: string;   // ISO string — for LOCKED_COOLDOWN
  lastAssessmentAt?: string;
  totalAssessments: number;
}

export interface Skill {
  id: string;
  dimension: Dimension;
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface ClientSkill {
  id: string;
  client_id: string;
  skill_id: string;
  self_level: SkillLevel | null;
  mentor_level: SkillLevel | null;
  combined_level: SkillLevel | null;
  last_self_at: string | null;
  last_mentor_at: string | null;
  updated_at: string;
  skill?: Skill;
}

export interface ClientSkillHistory {
  id: string;
  client_id: string;
  skill_id: string;
  source: SkillLevelSource;
  level_type: SkillLevelType;
  value: SkillLevel;
  assessment_id: string | null;
  booking_id: string | null;
  notes: string | null;
  recorded_at: string;
  skill?: Skill;
}

export interface RoadmapMilestone {
  id: string;
  client_id: string;
  skill_id: string;
  target_level: SkillLevel;
  recommended_workshop_id: string | null;
  recommended_session_type: "group" | "individual" | null;
  title_ar: string;
  title_en: string;
  status: MilestoneStatus;
  sort_order: number;
  assessment_id: string | null;
  completed_at: string | null;
  created_at: string;
  skill?: Skill;
}

export interface SessionReflection {
  id: string;
  booking_id: string;
  client_id: string;
  mentor_id: string;
  private_notes: string | null;
  encouragement_ar: string | null;
  encouragement_en: string | null;
  submitted_at: string;
  skills?: SessionReflectionSkill[];
  completed_milestones?: string[]; // milestone ids
}

export interface SessionReflectionSkill {
  id: string;
  reflection_id: string;
  skill_id: string;
  mentor_level: SkillLevel;
  skill?: Skill;
}

/** Grouped skills by dimension for display */
export interface SkillsByDimension {
  dimension: Dimension;
  label_ar: string;
  label_en: string;
  skills: ClientSkill[];
}

/** Rich context passed to the assessment for personalization */
export interface AssessmentContext {
  isBaseline: boolean;
  previousAssessmentAt?: string;
  attendedSessionsSinceLastAssessment: number;
  activeMilestones: RoadmapMilestone[];
  weakestSkills: ClientSkill[];          // skills with lowest combined_level
  strongestSkills: ClientSkill[];        // skills with highest combined_level
  mentorEncouragement?: string;          // most recent mentor note (client-visible)
  completedMilestonesCount: number;
  activeMilestonesCount: number;
}
