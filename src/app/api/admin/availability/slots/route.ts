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

  const { date, start_time, end_time, admin_marked_status = "available", capacity = 1, session_id, workshop_id, assignments } = await request.json();

  if (!date || !start_time || !end_time) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  // Check if slot already exists for this time
  const { data: existingSlot } = await (supabase as any)
    .from("availability_slots")
    .select("id")
    .eq("date", date)
    .eq("start_time", start_time)
    .eq("end_time", end_time)
    .single();

  let slot = existingSlot;
  let data = null;

  if (!existingSlot) {
    // Create new slot if it doesn't exist
    const { data: newSlot, error } = await (supabase as any)
      .from("availability_slots")
      .insert({
        date,
        start_time,
        end_time,
        capacity,
        status: "published",
        admin_marked_status: admin_marked_status || "available",
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    data = newSlot;
    slot = newSlot;
  } else {
    // Use existing slot - update admin_marked_status
    if (admin_marked_status) {
      const { data: updated, error: updateError } = await (supabase as any)
        .from("availability_slots")
        .update({ admin_marked_status })
        .eq("id", existingSlot.id)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
      data = updated;
      slot = updated;
    } else {
      data = existingSlot;
      slot = existingSlot;
    }
  }

  // Create assignments for all session types (only if not marking unavailable)
  if (slot?.id && admin_marked_status !== "unavailable") {
    let assignmentsToCreate: any[] = [];

    // Handle new multi-select format
    if (assignments && Array.isArray(assignments)) {
      assignmentsToCreate = assignments
        .map((a: any) => ({
          slot_id: slot.id,
          session_id: a.session_id || null,
          workshop_id: a.workshop_id || null,
        }))
        .filter((a) => a.session_id !== null || a.workshop_id !== null);
    }
    // Handle legacy single assignment format
    else if (session_id || workshop_id) {
      assignmentsToCreate = [{
        slot_id: slot.id,
        session_id: session_id || null,
        workshop_id: workshop_id || null,
      }];
    }

    if (assignmentsToCreate.length > 0) {
      // Filter out assignments that already exist
      const { data: existingAssignments } = await (supabase as any)
        .from("slot_assignments")
        .select("session_id, workshop_id")
        .eq("slot_id", slot.id);

      const existingSet = new Set(
        existingAssignments?.map((a: any) =>
          `${a.session_id || "null"}-${a.workshop_id || "null"}`
        ) || []
      );

      const newAssignments = assignmentsToCreate.filter((a) => {
        const key = `${a.session_id || "null"}-${a.workshop_id || "null"}`;
        return !existingSet.has(key);
      });

      if (newAssignments.length > 0) {
        const { error: assignmentError } = await (supabase as any)
          .from("slot_assignments")
          .insert(newAssignments);

        if (assignmentError) {
          // Only delete the slot if we just created it (not an existing one)
          if (!existingSlot) {
            await (supabase as any)
              .from("availability_slots")
              .delete()
              .eq("id", slot.id);
          }
          return NextResponse.json({ error: assignmentError.message }, { status: 500 });
        }
      }
    }
  }

  return NextResponse.json(data);
}
