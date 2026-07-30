import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch client_skills joined with skills, filtered to active skills only
    const { data: clientSkills, error: skillsError } = await supabase
      .from("client_skills")
      .select("*, skill:skills(*)")
      .eq("client_id", user.id)
      .eq("skills.is_active", true)
      .order("skills(dimension)", { ascending: true })
      .order("skills(sort_order)", { ascending: true });

    if (skillsError) {
      return NextResponse.json({ error: skillsError.message }, { status: 500 });
    }

    // Fetch the 3 most recent skill assessments for comparison
    const { data: recentAssessments, error: assessmentsError } = await supabase
      .from("skill_assessments")
      .select("*, responses:skill_assessment_responses(*, skill:skills(*))")
      .eq("client_id", user.id)
      .order("created_at", { ascending: false })
      .limit(3);

    if (assessmentsError) {
      return NextResponse.json({ error: assessmentsError.message }, { status: 500 });
    }

    // Fetch active roadmap milestones with skill details
    const { data: activeMilestones, error: milestonesError } = await supabase
      .from("roadmap_milestones")
      .select("*, skill:skills(*)")
      .eq("client_id", user.id)
      .eq("status", "active")
      .order("sort_order", { ascending: true });

    if (milestonesError) {
      return NextResponse.json({ error: milestonesError.message }, { status: 500 });
    }

    return NextResponse.json({
      clientSkills: clientSkills ?? [],
      recentAssessments: recentAssessments ?? [],
      activeMilestones: activeMilestones ?? [],
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
