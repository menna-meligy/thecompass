import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { writeMentorSkills } from "@/lib/skills/operations";
import type { SkillLevel } from "@/lib/skills/types";

interface SkillRating {
  skill_id: string;
  mentor_level: SkillLevel;
}

interface ReflectionBody {
  booking_id: string;
  client_id: string;
  skill_ratings: SkillRating[];
  completed_milestone_ids: string[];
  private_notes?: string;
  encouragement_ar?: string;
  encouragement_en?: string;
}

export async function POST(req: NextRequest) {
  try {
    // Auth check via user client (reads session cookie)
    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin role
    const { data: profile, error: profileError } = await userClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse and validate body
    const body = await req.json() as ReflectionBody;
    const {
      booking_id,
      client_id,
      skill_ratings,
      completed_milestone_ids,
      private_notes,
      encouragement_ar,
      encouragement_en,
    } = body;

    if (!booking_id || !client_id) {
      return NextResponse.json(
        { error: "booking_id and client_id are required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(skill_ratings) || !Array.isArray(completed_milestone_ids)) {
      return NextResponse.json(
        { error: "skill_ratings and completed_milestone_ids must be arrays" },
        { status: 400 }
      );
    }

    // Use admin client for writes
    const db = await createAdminClient();

    // Create the session_reflection row
    const { data: reflection, error: reflectionError } = await db
      .from("session_reflections")
      .insert({
        booking_id,
        client_id,
        mentor_id: user.id,
        private_notes: private_notes ?? null,
        encouragement_ar: encouragement_ar ?? null,
        encouragement_en: encouragement_en ?? null,
        submitted_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (reflectionError || !reflection) {
      console.error("Failed to create session_reflection:", reflectionError);
      return NextResponse.json({ error: "Failed to create reflection" }, { status: 500 });
    }

    const reflectionId = reflection.id as string;

    // Create session_reflection_skills rows
    if (skill_ratings.length > 0) {
      const skillRows = skill_ratings.map(({ skill_id, mentor_level }) => ({
        reflection_id: reflectionId,
        skill_id,
        mentor_level,
      }));

      const { error: skillsError } = await db
        .from("session_reflection_skills")
        .insert(skillRows);

      if (skillsError) {
        console.error("Failed to create session_reflection_skills:", skillsError);
        return NextResponse.json({ error: "Failed to save skill ratings" }, { status: 500 });
      }
    }

    // Write mentor skill levels to client_skills and history
    if (skill_ratings.length > 0) {
      await writeMentorSkills(db, client_id, booking_id, reflectionId, skill_ratings);
    }

    // Update completed milestones and create junction rows
    if (completed_milestone_ids.length > 0) {
      const now = new Date().toISOString();

      const { error: milestoneUpdateError } = await db
        .from("roadmap_milestones")
        .update({ status: "completed", completed_at: now })
        .in("id", completed_milestone_ids)
        .eq("client_id", client_id);

      if (milestoneUpdateError) {
        console.error("Failed to update roadmap_milestones:", milestoneUpdateError);
        return NextResponse.json({ error: "Failed to update milestones" }, { status: 500 });
      }

      const milestoneRows = completed_milestone_ids.map((milestone_id) => ({
        reflection_id: reflectionId,
        milestone_id,
      }));

      const { error: milestoneJunctionError } = await db
        .from("session_reflection_milestones")
        .insert(milestoneRows);

      if (milestoneJunctionError) {
        console.error("Failed to create session_reflection_milestones:", milestoneJunctionError);
        return NextResponse.json({ error: "Failed to save milestone records" }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, reflection_id: reflectionId });
  } catch (err) {
    console.error("Unexpected error in session-reflection route:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
