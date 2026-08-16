import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const sessionId = request.nextUrl.searchParams.get("sessionId");
  const workshopId = request.nextUrl.searchParams.get("workshopId");
  const type = request.nextUrl.searchParams.get("type"); // "group" or "individual"

  try {
    let query = supabase
      .from("sessions")
      .select("id, workshop_id, type, starts_at, ends_at, price, capacity, location_or_link")
      .eq("status", "published");

    if (sessionId) query = query.eq("id", sessionId);
    if (workshopId) query = query.eq("workshop_id", workshopId);
    if (type) query = query.eq("type", type);

    // Only future sessions
    query = query.gt("starts_at", new Date().toISOString());

    const { data: sessions, error: sessionError } = await query;

    if (sessionError) {
      return NextResponse.json({ error: sessionError.message }, { status: 500 });
    }

    // Get time slots for each session
    const sessionIds = sessions?.map((s) => s.id) || [];
    let slots = [];

    if (sessionIds.length > 0) {
      const { data: timeSlots, error: slotsError } = await supabase
        .from("time_slots")
        .select("id, session_id, starts_at, ends_at, booked_count, capacity")
        .in("session_id", sessionIds);

      if (slotsError) {
        return NextResponse.json({ error: slotsError.message }, { status: 500 });
      }

      slots = timeSlots || [];
    }

    // Format response with sessions and their time slots
    const result = sessions?.map((session) => ({
      id: session.id,
      workshopId: session.workshop_id,
      type: session.type,
      price: session.price,
      capacity: session.capacity,
      location: session.location_or_link,
      timeSlots: slots
        .filter((s) => s.session_id === session.id)
        .map((s) => ({
          id: s.id,
          date: s.starts_at.split("T")[0],
          startTime: s.starts_at.split("T")[1].substring(0, 5),
          endTime: s.ends_at.split("T")[1].substring(0, 5),
          capacity: s.capacity,
          booked: s.booked_count,
        }))
        .sort((a, b) => {
          const dateA = a.date;
          const dateB = b.date;
          if (dateA !== dateB) return dateA.localeCompare(dateB);
          return a.startTime.localeCompare(b.startTime);
        }),
    }));

    return NextResponse.json({ sessions: result || [] });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
