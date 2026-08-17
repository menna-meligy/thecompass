import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { createSessionReflection, updateSessionReflection } from "@/lib/notes/operations";
import { logError } from "@/lib/observability/logger";

interface CreateReflectionBody {
  bookingId: string;
  clientId: string;
  encouragement_ar?: string | null;
  encouragement_en?: string | null;
  private_notes?: string | null;
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
      private_notes,
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

    // Check if reflection exists
    const { data: existing, error: checkError } = await db
      .from("session_reflections")
      .select("id")
      .eq("booking_id", bookingId)
      .maybeSingle();

    let result;
    if (existing) {
      // Update existing reflection
      result = await updateSessionReflection(
        db,
        existing.id,
        {
          encouragement_ar: encouragement_ar ?? undefined,
          encouragement_en: encouragement_en ?? undefined,
          private_notes: private_notes ?? undefined,
        },
        user.id
      );
    } else {
      // Create new reflection
      result = await createSessionReflection(
        db,
        bookingId,
        user.id,
        clientId,
        {
          encouragement_ar: encouragement_ar ?? undefined,
          encouragement_en: encouragement_en ?? undefined,
          private_notes: private_notes ?? undefined,
        }
      );
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.message },
        { status: result.error.code === "REFLECTION_EXISTS" ? 409 : 400 }
      );
    }

    return NextResponse.json(
      {
        id: result.data.id,
        booking_id: bookingId,
        created_at: result.data.submitted_at,
      },
      { status: existing ? 200 : 201 }
    );
  } catch (err) {
    logError(err, {
      where: "api/admin/session-reflections:POST",
      op: "createOrUpdateReflection",
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
