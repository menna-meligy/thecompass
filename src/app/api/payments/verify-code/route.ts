import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const { code } = await request.json();

  if (!code) {
    return NextResponse.json({ error: "Code is required" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data } = await supabase
    .from("discount_codes")
    .select("*")
    .eq("code", code.toUpperCase())
    .eq("is_active", true)
    .single();

  if (!data) {
    return NextResponse.json({ error: "Invalid or inactive code" }, { status: 404 });
  }

  // Check expiry
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ error: "Code has expired" }, { status: 400 });
  }

  // Check max uses
  if (data.max_uses !== null && data.used_count >= data.max_uses) {
    return NextResponse.json({ error: "Code usage limit reached" }, { status: 400 });
  }

  return NextResponse.json({
    type: data.type,
    value: data.value,
    code: data.code,
  });
}
