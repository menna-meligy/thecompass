import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { booking_id } = await request.json();

  if (!booking_id) {
    return NextResponse.json({ error: "Missing booking_id" }, { status: 400 });
  }

  await supabase
    .from("payments")
    .update({ status: "paid" })
    .eq("booking_id", booking_id);

  await supabase
    .from("bookings")
    .update({ status: "confirmed" })
    .eq("id", booking_id);

  // Fetch the booking with session info to create roadmap milestone
  const { data: booking } = await (supabase as any)
    .from("bookings")
    .select("*, user_id, session:sessions(*, workshop:workshops(*))")
    .eq("id", booking_id)
    .single();

  if (booking) {
    const workshopTitle =
      booking.session?.workshop?.title_ar ||
      booking.session?.workshop?.title_en ||
      "Session";
    const sessionDate = booking.session?.starts_at
      ? new Date(booking.session.starts_at).toLocaleDateString("ar-EG", {
          month: "short",
          day: "numeric",
        })
      : "";

    await (supabase as any).from("user_tasks").upsert(
      {
        id: `session-${booking_id}`,
        user_id: booking.user_id,
        title: `${workshopTitle}${sessionDate ? ` - ${sessionDate}` : ""}`,
        icon: "📅",
        status: "done",
        position: 999,
        pinned: true,
        track: "session",
        booking_id: booking_id,
      },
      { onConflict: "id" }
    );
  }

  return NextResponse.json({ ok: true });
}
