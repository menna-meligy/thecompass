import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Confirms the caller is a signed-in admin and hands back a service-role client.
 *
 * The identity check runs on the cookie client (so it's the real logged-in user)
 * while the work runs on the service-role client — RLS on `bookings`/`payments`
 * only ever lets a user see their own rows, so an admin screen that reads with
 * the cookie client silently shows an empty list.
 */
export async function requireAdmin(): Promise<
  | { ok: true; admin: SupabaseClient<any, any, any>; userId: string }
  | { ok: false; response: NextResponse }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  const admin = (await createAdminClient()) as unknown as SupabaseClient<any, any, any>;
  return { ok: true, admin, userId: user.id };
}
