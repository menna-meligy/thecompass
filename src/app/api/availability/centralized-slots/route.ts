import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();

  // Get all slots with their assignments
  const { data: slots, error } = await (supabase as any)
    .from("availability_slots")
    .select(`
      id,
      date,
      start_time,
      end_time,
      capacity,
      booked_count,
      assignments:slot_assignments(
        id,
        workshop_id,
        session_id,
        workshop:workshops(id, title_ar, title_en),
        session:sessions(workshop:workshops(id, title_ar, title_en))
      )
    `)
    .eq("status", "published")
    .gte("date", new Date().toISOString().split("T")[0])
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(slots || []);
}
