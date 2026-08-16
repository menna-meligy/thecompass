import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

interface ClientNotesBody {
  booking_id: string;
  client_id: string;
  public_notes?: string | null;
  private_notes?: string | null;
}

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

    // Verify client is fetching their own notes
    if (user.id !== clientId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch client notes
    const { data: notes, error } = await supabase
      .from("client_session_notes")
      .select("id, booking_id, client_id, public_notes, private_notes, updated_at")
      .eq("booking_id", bookingId)
      .eq("client_id", clientId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching notes:", error);
      return NextResponse.json(
        { error: "Failed to fetch notes" },
        { status: 500 }
      );
    }

    if (!notes) {
      return NextResponse.json(null, { status: 404 });
    }

    return NextResponse.json(notes);
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as ClientNotesBody;
    const { booking_id, client_id, public_notes, private_notes } = body;

    if (!booking_id || !client_id) {
      return NextResponse.json(
        { error: "booking_id and client_id required" },
        { status: 400 }
      );
    }

    // Verify client can only save their own notes
    if (user.id !== client_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = await createAdminClient();

    // Try to find existing notes
    const { data: existing } = await db
      .from("client_session_notes")
      .select("id")
      .eq("booking_id", booking_id)
      .eq("client_id", client_id)
      .maybeSingle();

    let result;

    if (existing) {
      // Update existing notes
      const { data, error } = await db
        .from("client_session_notes")
        .update({
          public_notes: public_notes || null,
          private_notes: private_notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select("id, booking_id, client_id, public_notes, private_notes, updated_at")
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Create new notes
      const { data, error } = await db
        .from("client_session_notes")
        .insert({
          booking_id,
          client_id,
          public_notes: public_notes || null,
          private_notes: private_notes || null,
          updated_at: new Date().toISOString(),
        })
        .select("id, booking_id, client_id, public_notes, private_notes, updated_at")
        .single();

      if (error) throw error;
      result = data;
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
