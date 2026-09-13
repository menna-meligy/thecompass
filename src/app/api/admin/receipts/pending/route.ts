import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();

  // Verify user is authenticated (admin check will be added later with user_roles table)
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch pending receipts
  const { data: receipts, error } = await (supabase as any)
    .from("pending_receipts")
    .select("*")
    .eq("status", "pending")
    .order("uploaded_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(receipts);
}
