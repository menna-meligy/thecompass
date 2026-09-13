import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { workshop_id, type = "individual", price, capacity = 1 } = body;

    if (!workshop_id) {
      return NextResponse.json(
        { error: "workshop_id is required" },
        { status: 400 }
      );
    }

    const { data: session, error } = await (supabase as any)
      .from("sessions")
      .insert({
        workshop_id,
        type,
        price: price || (type === "individual" ? 500 : 1200),
        capacity,
        status: "published",
        starts_at: new Date().toISOString(),
        ends_at: new Date(Date.now() + 3600000).toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(session);
  } catch (err) {
    console.error("Error creating session:", err);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}
