import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin authorization
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get("booking_id");
    const clientId = searchParams.get("client_id");

    if (!bookingId || !clientId) {
      return NextResponse.json(
        { error: "booking_id and client_id required" },
        { status: 400 }
      );
    }

    // Fetch mentor notes from session_reflections
    const { data: reflection, error: reflectionError } = await supabase
      .from("session_reflections")
      .select(
        "id, booking_id, client_id, mentor_notes_ar, mentor_notes_en, status, updated_at, submitted_at"
      )
      .eq("booking_id", bookingId)
      .eq("client_id", clientId)
      .maybeSingle();

    if (reflectionError && reflectionError.code !== "PGRST116") {
      console.error("Error fetching mentor notes:", reflectionError);
      return NextResponse.json(
        { error: "Failed to fetch mentor notes" },
        { status: 500 }
      );
    }

    // Also fetch client's published notes
    const { data: clientNotes, error: notesError } = await supabase
      .from("client_notes")
      .select("*")
      .eq("booking_id", bookingId)
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (notesError) {
      console.error("Error fetching client notes:", notesError);
    }

    return NextResponse.json({
      mentorNotes: reflection || null,
      clientPublishedNotes: clientNotes?.[0] || null,
    });
  } catch (err) {
    console.error("Unexpected error in mentor-notes GET:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin authorization
    const { data: profile } = await userClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      booking_id,
      client_id,
      mentor_notes_ar,
      mentor_notes_en,
      action = "save", // "save" for draft, "publish" for published
    } = body;

    if (!booking_id || !client_id) {
      return NextResponse.json(
        { error: "booking_id and client_id are required" },
        { status: 400 }
      );
    }

    const db = await createAdminClient();

    // Check if reflection exists for this booking
    const { data: existingReflection } = await db
      .from("session_reflections")
      .select("id, status")
      .eq("booking_id", booking_id)
      .eq("client_id", client_id)
      .maybeSingle();

    const newStatus = action === "publish" ? "published" : "draft";

    if (existingReflection) {
      // Update existing reflection with mentor notes
      const { data: updated, error: updateError } = await db
        .from("session_reflections")
        .update({
          mentor_notes_ar: mentor_notes_ar || null,
          mentor_notes_en: mentor_notes_en || null,
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingReflection.id)
        .select("*")
        .single();

      if (updateError) {
        console.error("Error updating mentor notes:", updateError);
        return NextResponse.json(
          { error: "Failed to update mentor notes" },
          { status: 500 }
        );
      }

      return NextResponse.json(updated);
    } else {
      // Create new reflection with mentor notes
      const { data: created, error: insertError } = await db
        .from("session_reflections")
        .insert({
          booking_id,
          client_id,
          mentor_id: user.id,
          mentor_notes_ar: mentor_notes_ar || null,
          mentor_notes_en: mentor_notes_en || null,
          status: newStatus,
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("*")
        .single();

      if (insertError) {
        console.error("Error creating mentor notes:", insertError);
        return NextResponse.json(
          { error: "Failed to create mentor notes" },
          { status: 500 }
        );
      }

      return NextResponse.json(created);
    }
  } catch (err) {
    console.error("Unexpected error in mentor-notes POST:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
