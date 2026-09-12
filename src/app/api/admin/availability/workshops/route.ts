import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: workshops, error } = await (supabase as any)
    .from("workshops")
    .select("id, title_ar, title_en")
    .eq("status", "published")
    .order("title_en");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(workshops || []);
}
