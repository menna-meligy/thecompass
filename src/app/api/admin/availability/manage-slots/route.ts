import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const adminClient = await createAdminClient();

  // Verify admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { action, sessionId, date, startTime, endTime, capacity } = body;

  if (action === "add") {
    if (!sessionId || !date || !startTime || !endTime || !capacity) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate that end time is after start time
    if (endTime <= startTime) {
      return NextResponse.json(
        { error: "End time must be after start time" },
        { status: 400 }
      );
    }

    const startsAt = `${date}T${startTime}:00+02:00`;
    const endsAt = `${date}T${endTime}:00+02:00`;

    const { data: timeSlot, error } = await adminClient
      .from("time_slots")
      .insert({
        session_id: sessionId,
        starts_at: startsAt,
        ends_at: endsAt,
        capacity,
        booked_count: 0,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ timeSlot, message: "Time slot added successfully" });
  }

  if (action === "remove") {
    if (!sessionId || !date || !startTime) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const startsAt = `${date}T${startTime}:00+02:00`;

    const { error } = await adminClient
      .from("time_slots")
      .delete()
      .eq("session_id", sessionId)
      .eq("starts_at", startsAt);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Time slot removed successfully" });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
