import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/index";
import type { SkillLevel, RoadmapMilestone } from "./types";
import type { Dimension, DimensionScores } from "@/lib/compass/types";
import { computeCombinedLevel, buildSkillUpdatesFromScores, DIMENSION_SKILLS_MAP } from "./levels";
import { DIM_LABELS } from "@/lib/compass/templates";

type DB = SupabaseClient<Database>;

/**
 * Upsert all skill self-levels from assessment dimension scores.
 * Writes to client_skills and appends to client_skill_history.
 */
export async function writeAssessmentSkills(
  db: DB,
  clientId: string,
  assessmentId: string,
  dimensionScores: DimensionScores
): Promise<void> {
  const updates = buildSkillUpdatesFromScores(dimensionScores);

  for (const { skill_id, level } of updates) {
    // Read existing combined data to recompute combined_level
    const { data: existing } = await db
      .from("client_skills")
      .select("mentor_level")
      .eq("client_id", clientId)
      .eq("skill_id", skill_id)
      .maybeSingle();

    const mentorLevel = (existing?.mentor_level ?? null) as SkillLevel | null;
    const combined = computeCombinedLevel(level, mentorLevel);

    // Upsert the skill profile row
    await db.from("client_skills").upsert(
      {
        client_id: clientId,
        skill_id,
        self_level: level,
        combined_level: combined,
        last_self_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "client_id,skill_id" }
    );

    // Append history
    await db.from("client_skill_history").insert({
      client_id: clientId,
      skill_id,
      source: "assessment",
      level_type: "self",
      value: level,
      assessment_id: assessmentId,
    });
  }
}

/**
 * Write mentor levels from a session reflection.
 * Updates client_skills.mentor_level and recomputes combined_level.
 */
export async function writeMentorSkills(
  db: DB,
  clientId: string,
  bookingId: string,
  reflectionId: string,
  skillRatings: Array<{ skill_id: string; mentor_level: SkillLevel }>
): Promise<void> {
  for (const { skill_id, mentor_level } of skillRatings) {
    const { data: existing } = await db
      .from("client_skills")
      .select("self_level")
      .eq("client_id", clientId)
      .eq("skill_id", skill_id)
      .maybeSingle();

    const selfLevel = (existing?.self_level ?? null) as SkillLevel | null;
    const combined = computeCombinedLevel(selfLevel, mentor_level);

    await db.from("client_skills").upsert(
      {
        client_id: clientId,
        skill_id,
        mentor_level,
        combined_level: combined,
        last_mentor_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "client_id,skill_id" }
    );

    await db.from("client_skill_history").insert({
      client_id: clientId,
      skill_id,
      source: "mentor",
      level_type: "mentor",
      value: mentor_level,
      booking_id: bookingId,
      notes: `reflection:${reflectionId}`,
    });
  }
}

/**
 * Generate/refresh the roadmap milestones after an assessment.
 * Keeps completed milestones; replaces active ones based on weakest skills.
 */
export async function refreshRoadmapMilestones(
  db: DB,
  clientId: string,
  assessmentId: string,
  dimensionScores: DimensionScores,
  locale: "ar" | "en" = "ar"
): Promise<void> {
  // Get the client's current skill profile
  const { data: clientSkillsData } = await db
    .from("client_skills")
    .select("*, skill:skills(*)")
    .eq("client_id", clientId);

  const clientSkills = clientSkillsData ?? [];

  // Mark any existing active milestones as skipped (they'll be rebuilt)
  await db
    .from("roadmap_milestones")
    .update({ status: "skipped" })
    .eq("client_id", clientId)
    .eq("status", "active");

  // Build new milestones from weakest dimensions (sorted ascending)
  type DimScore = { dim: Dimension; score: number };
  const sorted: DimScore[] = (Object.entries(dimensionScores) as [Dimension, number][])
    .map(([dim, score]) => ({ dim, score }))
    .sort((a, b) => a.score - b.score);

  // Take the 3 weakest dimensions for active milestones
  const focusDims = sorted.slice(0, 3);

  let order = 0;
  for (const { dim } of focusDims) {
    const skillIds = DIMENSION_SKILLS_MAP[dim];
    const dimLabel = DIM_LABELS[dim];

    // Find the weakest skill in this dimension
    const dimSkills = clientSkills.filter((cs) =>
      skillIds.includes(cs.skill_id)
    );
    const weakest = dimSkills.sort((a, b) =>
      (a.combined_level ?? a.self_level ?? 0) - (b.combined_level ?? b.self_level ?? 0)
    )[0];

    if (!weakest?.skill) continue;

    const currentLevel = (weakest.combined_level ?? weakest.self_level ?? 1) as SkillLevel;
    const targetLevel = Math.min(5, currentLevel + 1) as SkillLevel;

    const skillName = locale === "ar"
      ? (weakest.skill as unknown as { name_ar: string }).name_ar
      : (weakest.skill as unknown as { name_en: string }).name_en;

    const title_ar = `طوّر ${(weakest.skill as unknown as { name_ar: string }).name_ar}`;
    const title_en = `Develop ${(weakest.skill as unknown as { name_en: string }).name_en}`;

    // Look for a recommended workshop tagged with this skill
    const { data: workshopLink } = await db
      .from("workshop_skills")
      .select("workshop_id")
      .eq("skill_id", weakest.skill_id)
      .limit(1)
      .maybeSingle();

    await db.from("roadmap_milestones").insert({
      client_id: clientId,
      skill_id: weakest.skill_id,
      target_level: targetLevel,
      recommended_workshop_id: workshopLink?.workshop_id ?? null,
      title_ar,
      title_en,
      status: "active",
      sort_order: order++,
      assessment_id: assessmentId,
    });

    void skillName; // used in title construction above
    void dimLabel;
  }
}

/** Fetch eligibility data from DB for a client */
export async function fetchEligibilityData(
  db: DB,
  clientId: string
): Promise<{
  completedAssessments: Array<{ id: string; completed_at: string }>;
}> {
  const { data: assessments } = await db
    .from("assessments")
    .select("id, completed_at")
    .eq("client_id", clientId)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false });

  const completedAssessments = (assessments ?? []).map((a) => ({
    id: a.id,
    completed_at: a.completed_at as string,
  }));

  return { completedAssessments };
}
