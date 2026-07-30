export type Dimension = "HAP" | "DIR" | "PRD" | "CNF" | "COM" | "NRG";
export type QuestionDimension = Dimension | "CONTEXT" | "INTENT";
export type Zone = "needs_care" | "emerging" | "steady" | "thriving";
export type RecommendationType = "session" | "workshop";

export interface QuestionOption {
  label_ar: string;
  label_en: string;
  score: number; // 1–4 for scored; 0 for unscored
}

export interface Question {
  id: string;
  dimension: QuestionDimension;
  order: number;
  text_ar: string;
  text_en: string;
  options: QuestionOption[];
  scored: boolean;
}

export type DimensionScores = Record<Dimension, number>;

export interface Recommendation {
  type: RecommendationType;
  workshopTopic?: string; // matches topic slug in workshops table
  workshopId?: string;   // resolved at runtime
  dimension?: Dimension;
}

export interface DimensionRead {
  dimension: Dimension;
  score: number;
  zone: Zone;
  label_ar: string;
  label_en: string;
  read_ar: string;
  read_en: string;
}

export interface AssessmentResult {
  dimensionScores: DimensionScores;
  happinessScore: number;
  happinessZone: Zone;
  dimensionReads: DimensionRead[];
  topStrength: Dimension;
  mainGrowthArea: Dimension;
  recommendation: Recommendation;
  narrative_ar: string;
  narrative_en: string;
  microAction_ar: string;
  microAction_en: string;
  opening_ar: string;
  opening_en: string;
}

export interface SavedAssessment {
  id: string;
  completedAt: string;
  result: AssessmentResult;
  locale: string;
}
