import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { assembleResult } from "@/lib/compass/scoring";
import { writeAssessmentSkills, refreshRoadmapMilestones } from "@/lib/skills/operations";
import type { DimensionScores } from "@/lib/compass/types";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { answers, intentAnswer, openingAr, openingEn, locale } = await req.json() as {
      answers: Record<string, number>;
      intentAnswer?: number;
      openingAr?: string;
      openingEn?: string;
      locale?: "ar" | "en";
    };

    if (!answers || typeof answers !== "object") {
      return NextResponse.json({ error: "answers required" }, { status: 400 });
    }

    // Assemble the result from answers
    const result = assembleResult(answers, intentAnswer, openingAr, openingEn);

    // Save the assessment to the DB
    const { data: assessment, error: saveError } = await supabase
      .from("assessments")
      .insert({
        client_id: user.id,
        locale: locale ?? "ar",
        completed_at: new Date().toISOString(),
        dimension_scores: result.dimensionScores as unknown as Record<string, number>,
        happiness_score: result.happinessScore,
        recommended_type: result.recommendation.type,
        recommended_workshop_id: result.recommendation.workshopId ?? null,
        result_snapshot: result as unknown as Record<string, unknown>,
      })
      .select("id")
      .single();

    if (saveError || !assessment) {
      console.error("Assessment save error:", saveError);
      return NextResponse.json({ error: "Failed to save assessment" }, { status: 500 });
    }

    const assessmentId = assessment.id;

    // Write skill levels from dimension scores (fire and forget errors — don't block result delivery)
    try {
      await writeAssessmentSkills(
        supabase,
        user.id,
        assessmentId,
        result.dimensionScores as DimensionScores
      );
    } catch (err) {
      console.error("writeAssessmentSkills error:", err);
    }

    // Refresh roadmap milestones
    try {
      await refreshRoadmapMilestones(
        supabase,
        user.id,
        assessmentId,
        result.dimensionScores as DimensionScores,
        locale ?? "ar"
      );
    } catch (err) {
      console.error("refreshRoadmapMilestones error:", err);
    }

    return NextResponse.json({
      assessmentId,
      result,
    });
  } catch (err) {
    console.error("Compass save error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
