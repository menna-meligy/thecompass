import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClientNote } from "@/lib/notes/operations";
import { logError } from "@/lib/observability/logger";

interface CreateNoteBody {
  bookingId: string;
  content_ar: string;
  content_en: string;
  is_public: boolean;
}

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate body
    const body = await req.json() as CreateNoteBody;
    const { bookingId, content_ar, content_en, is_public } = body;

    // Validate required fields
    if (!bookingId || !content_ar || !content_en) {
      return NextResponse.json(
        { error: "bookingId, content_ar, and content_en are required" },
        { status: 400 }
      );
    }

    if (content_ar.trim().length === 0 || content_en.trim().length === 0) {
      return NextResponse.json(
        { error: "Content cannot be empty" },
        { status: 400 }
      );
    }

    // Verify booking belongs to this client
    const { data: booking, error: bookingError } = await userClient
      .from("bookings")
      .select("user_id")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking || booking.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Create note using operations
    const result = await createClientNote(
      userClient,
      bookingId,
      user.id,
      { ar: content_ar, en: content_en },
      is_public ?? false
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        id: result.data.id,
        created_at: result.data.created_at,
        is_public: result.data.is_public,
      },
      { status: 201 }
    );
  } catch (err) {
    logError(err, {
      where: "api/client/notes:POST",
      op: "createNote",
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
