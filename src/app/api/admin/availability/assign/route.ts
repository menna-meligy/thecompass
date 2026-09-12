import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  const { slot_id, workshop_id, session_id } = await request.json();

  if (!slot_id || (!workshop_id && !session_id)) {
    return NextResponse.json(
      { error: "slot_id and (workshop_id or session_id) required" },
      { status: 400 }
    );
  }

  const { data, error } = await (supabase as any)
    .from("slot_assignments")
    .insert({
      slot_id,
      workshop_id: workshop_id || null,
      session_id: session_id || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
