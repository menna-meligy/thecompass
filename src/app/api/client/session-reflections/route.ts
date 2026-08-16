import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getReflectionWithNotes } from "@/lib/notes/operations";
import { logError } from "@/lib/observability/logger";

export async function GET(req: NextRequest) {
  try {
    // Auth check via user client (reads session cookie)
    const userClient = await createClient();
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get bookingId from query params
    const bookingId = req.nextUrl.searchParams.get("bookingId");
    if (!bookingId) {
      return NextResponse.json(
        { error: "bookingId query parameter is required" },
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

    // Fetch reflection and notes
    const data = await fetchClientSessionReflection(userClient, bookingId, user.id);

    return NextResponse.json({
      reflection: data.reflection,
      clientNotes: data.clientNotes,
      metadata: data.metadata,
    });
  } catch (err) {
    logError(err, {
      where: "api/client/session-reflections:GET",
      op: "fetchReflection",
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
