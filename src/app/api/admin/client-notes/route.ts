import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // Check admin authorization
  const { data: { user } } = await supabase.auth.getUser();
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

  // Get booking_id from query params
  const bookingId = request.nextUrl.searchParams.get("booking_id");
  if (!bookingId) {
    return NextResponse.json(
      { error: "Missing booking_id parameter" },
      { status: 400 }
    );
  }

  // Fetch client notes for this booking
  const { data: notes, error } = await supabase
    .from("client_notes")
    .select("*")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch client notes" },
      { status: 500 }
    );
  }

  return NextResponse.json({ notes: notes || [] });
}
