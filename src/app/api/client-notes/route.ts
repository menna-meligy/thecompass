import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    // Verify client can only fetch their own notes
    if (user.id !== clientId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch client's own notes (both draft and published)
    const { data: clientNotes, error: notesError } = await supabase
      .from("client_notes")
      .select("*")
      .eq("booking_id", bookingId)
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    if (notesError) {
      console.error("Error fetching client notes:", notesError);
      return NextResponse.json(
        { error: "Failed to fetch notes" },
        { status: 500 }
      );
    }

    // Also fetch mentor's published notes from session_reflections
    const { data: reflection, error: reflectionError } = await supabase
      .from("session_reflections")
      .select("id, mentor_notes_ar, mentor_notes_en, status, updated_at")
      .eq("booking_id", bookingId)
      .eq("client_id", clientId)
      .eq("status", "published")
      .maybeSingle();

    if (reflectionError && reflectionError.code !== "PGRST116") {
      console.error("Error fetching mentor notes:", reflectionError);
    }

    return NextResponse.json({
      clientNotes: clientNotes || [],
      mentorNotes: reflection || null,
    });
  } catch (err) {
    console.error("Unexpected error in client-notes GET:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      booking_id,
      client_id,
      content_ar,
      content_en,
      // Everything a client writes is for their mentor to read — the UI no
      // longer offers a private note, so nothing should default to hidden.
      is_public = true,
    } = body;

    if (!booking_id || !client_id) {
      return NextResponse.json(
        { error: "booking_id and client_id are required" },
        { status: 400 }
      );
    }

    // Verify client can only write their own notes
    if (user.id !== client_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if a note with this is_public status already exists
    const { data: existingNote } = await supabase
      .from("client_notes")
      .select("id")
      .eq("booking_id", booking_id)
      .eq("client_id", client_id)
      .eq("is_public", is_public)
      .maybeSingle();

    let result;
    if (existingNote) {
      // Update existing note
      const { data: updated, error: updateError } = await supabase
        .from("client_notes")
        .update({
          content_ar: content_ar || null,
          content_en: content_en || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingNote.id)
        .select("*")
        .single();

      if (updateError) {
        console.error("Error updating note:", updateError);
        return NextResponse.json(
          { error: "Failed to update note" },
          { status: 500 }
        );
      }
      result = updated;
    } else {
      // Create new note
      const { data: created, error: insertError } = await supabase
        .from("client_notes")
        .insert({
          booking_id,
          client_id,
          content_ar: content_ar || null,
          content_en: content_en || null,
          is_public,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("*")
        .single();

      if (insertError) {
        console.error("Error creating note:", insertError);
        return NextResponse.json(
          { error: "Failed to create note" },
          { status: 500 }
        );
      }
      result = created;
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Unexpected error in client-notes POST:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
