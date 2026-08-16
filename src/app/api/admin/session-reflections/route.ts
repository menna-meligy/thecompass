import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { createSessionReflection, updateSessionReflection } from "@/lib/notes/operations";
import { logError } from "@/lib/observability/logger";

interface CreateReflectionBody {
  bookingId: string;
  clientId: string;
  encouragement_ar?: string | null;
  encouragement_en?: string | null;
  mentor_notes_ar?: string | null;
  mentor_notes_en?: string | null;
  is_public?: boolean;
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
    const body = await req.json() as CreateReflectionBody;
    const {
      bookingId,
      clientId,
      encouragement_ar,
      encouragement_en,
      mentor_notes_ar,
      mentor_notes_en,
      is_public = false,
    } = body;

    if (!bookingId || !clientId) {
      return NextResponse.json(
        { error: "bookingId and clientId are required" },
        { status: 400 }
      );
    }

    // Verify booking exists and belongs to client
    const { data: booking, error: bookingError } = await userClient
      .from("bookings")
      .select("user_id")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking || booking.user_id !== clientId) {
      return NextResponse.json({ error: "Booking not found or mismatch" }, { status: 404 });
    }

    // Use admin client for write
    const db = await createAdminClient();

    // Create or update reflection
    const result = await createOrUpdateReflection(
      db,
      bookingId,
      clientId,
      user.id,
      encouragement_ar ?? null,
      encouragement_en ?? null,
      mentor_notes_ar ?? null,
      mentor_notes_en ?? null,
      is_public
    );

    return NextResponse.json(
      {
        id: result.id,
        booking_id: bookingId,
        status: result.status,
        created_at: result.created_at,
      },
      { status: 201 }
    );
  } catch (err) {
    logError(err, {
      where: "api/admin/session-reflections:POST",
      op: "createReflection",
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
