import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getReflectionWithNotes } from "@/lib/notes/operations";
import { logError } from "@/lib/observability/logger";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const bookingId = params.id;

    // Verify booking exists
    const { data: booking, error: bookingError } = await userClient
      .from("bookings")
      .select("id")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Fetch admin view of notes
    const data = await fetchAdminBookingNotes(userClient, bookingId);

    return NextResponse.json({
      reflection: data.reflection,
      clientPublicNotes: data.clientPublicNotes,
      metadata: data.metadata,
    });
  } catch (err) {
    logError(err, {
      where: "api/admin/booking/[id]/notes:GET",
      op: "fetchBookingNotes",
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
