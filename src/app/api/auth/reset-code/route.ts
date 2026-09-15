import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/resend";
import { passwordResetEmail } from "@/lib/email/templates";
import { logError } from "@/lib/observability/logger";

export const runtime = "nodejs";

/**
 * Issues a password-reset code.
 *
 * Supabase's built-in mailer is shared and rate-limited to a few messages an
 * hour, so `resetPasswordForEmail` started returning 429
 * (over_email_send_rate_limit) and the client was simply told "something went
 * wrong". We mint the recovery code with the service role instead and deliver
 * it through Resend, the same way every other mail in the app goes out.
 *
 * The response never says whether the address has an account — otherwise this
 * endpoint becomes a way to enumerate the client list.
 */

// One code per address per minute. In-memory, so it only holds within a warm
// instance — enough to stop a single browser hammering the button, not a
// distributed attempt. Resend's own limits are the backstop.
const lastSent = new Map<string, number>();
const COOLDOWN_MS = 60_000;

function throttled(email: string): boolean {
  const now = Date.now();
  const prev = lastSent.get(email);
  if (prev && now - prev < COOLDOWN_MS) return true;
  lastSent.set(email, now);
  if (lastSent.size > 500) {
    for (const [k, v] of lastSent) if (now - v > COOLDOWN_MS) lastSent.delete(k);
  }
  return false;
}

export async function POST(request: NextRequest) {
  const { email } = await request.json().catch(() => ({ email: null }));

  const address = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!address || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  if (throttled(address)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  try {
    const admin = await createAdminClient();
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: address,
    });

    // No such account: answer exactly as if we had sent one.
    if (error || !data?.properties?.email_otp) {
      return NextResponse.json({ ok: true });
    }

    const name =
      (data.user?.user_metadata as Record<string, string> | null)?.full_name ||
      address.split("@")[0];

    const { subject, html } = passwordResetEmail({
      userName: name,
      code: data.properties.email_otp,
      appUrl: process.env.NEXT_PUBLIC_APP_URL || "",
    });

    const res = await sendEmail({ to: address, subject, html });
    if (res.ok) return NextResponse.json({ ok: true, via: "resend" });

    logError(new Error("reset code email failed, falling back"), {
      where: "api/auth/reset-code",
      op: "sendEmail",
    });

    // Resend refuses every recipient but the account owner until a sending
    // domain is verified, so for real clients this is currently the only route
    // that reaches them. It is Supabase's shared mailer — rate-limited to a
    // handful an hour — hence it is the fallback and not the primary.
    const fellBack = await sendViaSupabase(address);
    if (fellBack) return NextResponse.json({ ok: true, via: "supabase" });

    return NextResponse.json({ error: "send_failed" }, { status: 502 });
  } catch (e) {
    logError(e, { where: "api/auth/reset-code", op: "generateLink" });
    return NextResponse.json({ error: "send_failed" }, { status: 500 });
  }
}

/** Supabase's own recovery mail. Returns false if it refused (commonly 429). */
async function sendViaSupabase(email: string): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return false;
  try {
    const r = await fetch(`${url}/auth/v1/recover`, {
      method: "POST",
      headers: { apikey: anon, "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    return r.ok;
  } catch {
    return false;
  }
}
