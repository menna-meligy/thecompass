import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/types/index";

export async function createClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder";

  return createServerClient<Database>(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server component - cookies can't be set here
          }
        },
      },
    }
  );
}

// TRUE service-role client. Must NOT be the cookie-aware SSR client: with a
// logged-in user's cookie present, that client sends the user's JWT as the
// Authorization header and PostgREST applies the user's role (RLS), never
// service_role. A plain supabase-js client uses the service key as the auth,
// so RLS is bypassed. Never expose this to the browser.
export async function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "placeholder";
  return createSupabaseClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
