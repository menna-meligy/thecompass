import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: slots, error } = await (supabase as any)
    .from("availability_slots")
    .select(`
      *,
      assignments:slot_assignments(
        id,
        session_id,
        workshop_id,
        session:sessions(workshop:workshops(title_ar, title_en)),
        workshop:workshops(title_ar, title_en)
      )
    `)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(slots || []);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { date, start_time, end_time, admin_marked_status = "available", session_id, workshop_id, assignments } = await request.json();

  if (!date || !start_time || !end_time) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const { data, error } = await (supabase as any)
    .from("availability_slots")
    .insert({
      date,
      start_time,
      end_time,
      capacity: 1,
      admin_marked_status: admin_marked_status || "available",
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Create assignments for all session types
  if (data?.id) {
    let assignmentsToCreate: any[] = [];

    // Handle new multi-select format
    if (assignments && Array.isArray(assignments)) {
      assignmentsToCreate = assignments.map((a: any) => ({
        slot_id: data.id,
        session_id: a.session_id || null,
        workshop_id: a.workshop_id || null,
      }));
    }
    // Handle legacy single assignment format
    else if (session_id || workshop_id) {
      assignmentsToCreate = [{
        slot_id: data.id,
        session_id: session_id || null,
        workshop_id: workshop_id || null,
      }];
    }

    if (assignmentsToCreate.length > 0) {
      const { error: assignmentError } = await (supabase as any)
        .from("slot_assignments")
        .insert(assignmentsToCreate);

      if (assignmentError) {
        // Delete the slot if assignments fail
        await (supabase as any)
          .from("availability_slots")
          .delete()
          .eq("id", data.id);
        return NextResponse.json({ error: assignmentError.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json(data);
}
