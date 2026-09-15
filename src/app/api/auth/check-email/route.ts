import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// Existence check the signup form calls BEFORE supabase.auth.signUp().
//
// Why this has to happen up front: if the email belongs to an *unconfirmed*
// account, Supabase Auth's own signUp() doesn't error or no-op — it deletes
// the old auth.users row and creates a brand new one, which cascades through
// ON DELETE CASCADE and wipes the person's profile, roadmap progress and
// everything else tied to that id. Blocking the request here, before signUp
// is ever called, is what prevents that data loss. (A confirmed-account
// duplicate is separately caught in AuthForm via the empty `identities` array
// signUp() returns for that case — this route covers the unconfirmed case
// signUp itself can't safely tell us about after the fact.)
export async function POST(req: NextRequest) {
  const { email } = await req.json().catch(() => ({ email: null }));
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }

  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .ilike("email", email.trim())
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "lookup failed" }, { status: 500 });
  }

  return NextResponse.json({ exists: !!data });
}
