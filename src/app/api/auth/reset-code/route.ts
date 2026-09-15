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

function coolingDown(email: string): boolean {
  const prev = lastSent.get(email);
  return !!prev && Date.now() - prev < COOLDOWN_MS;
}

/**
 * Only a message that actually went out starts the cooldown. Recording the
 * attempt up front meant a failed send locked the client out for a minute: no
 * email arrived, and the retry answered "too many requests" — which reads as
 * the system working when nothing had been sent at all.
 */
function markSent(email: string): void {
  const now = Date.now();
  lastSent.set(email, now);
  if (lastSent.size > 500) {
    for (const [k, v] of lastSent) if (now - v > COOLDOWN_MS) lastSent.delete(k);
  }
}

export async function POST(request: NextRequest) {
  const { email } = await request.json().catch(() => ({ email: null }));

  const address = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!address || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  if (coolingDown(address)) {
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
      markSent(address);
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
    // `ok` is also true when Resend isn't configured and the send was skipped.
    // Treating that as success meant the code went nowhere, the fallback below
    // never ran, and the client was told to check their inbox.
    if (res.delivered) {
      markSent(address);
      return NextResponse.json({ ok: true, via: "resend" });
    }

    logError(new Error(`reset code not delivered by Resend (${res.skipped ? "not configured" : res.error}), falling back`), {
      where: "api/auth/reset-code",
      op: "sendEmail",
    });

    // Resend refuses every recipient but the account owner until a sending
    // domain is verified, so for real clients this is currently the only route
    // that reaches them. It is Supabase's shared mailer — rate-limited to a
    // handful an hour — hence it is the fallback and not the primary.
    const fellBack = await sendViaSupabase(address);
    if (fellBack) {
      markSent(address);
      return NextResponse.json({ ok: true, via: "supabase" });
    }

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
