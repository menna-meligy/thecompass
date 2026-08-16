import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const bookingId = searchParams.get("booking_id");
    const clientId = searchParams.get("client_id");

    if (!bookingId || !clientId) {
      return NextResponse.json(
        { error: "booking_id and client_id required" },
        { status: 400 }
      );
    }

    // Verify client is fetching their own reflection
    if (user.id !== clientId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch reflection with skills
    const { data: reflection, error } = await supabase
      .from("session_reflections")
      .select(
        `
        id,
        booking_id,
        client_id,
        mentor_id,
        private_notes,
        encouragement_ar,
        encouragement_en,
        submitted_at,
        skills:session_reflection_skills(
          id,
          reflection_id,
          skill_id,
          mentor_level,
          skill:skills(id, dimension, name_ar, name_en, description_ar, description_en)
        )
      `
      )
      .eq("booking_id", bookingId)
      .eq("client_id", clientId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching reflection:", error);
      return NextResponse.json(
        { error: "Failed to fetch reflection" },
        { status: 500 }
      );
    }

    if (!reflection) {
      return NextResponse.json(null, { status: 404 });
    }

    return NextResponse.json(reflection);
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
