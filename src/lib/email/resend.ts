/**
 * Single place that talks to Resend. Every email in the app should go through
 * `sendEmail` so failures are logged consistently and a missing key degrades
 * gracefully (skipped, never thrown).
 */
import { Resend } from "resend";
import { logError } from "@/lib/observability/logger";

let cached: Resend | null | undefined;

function getResend(): Resend | null {
  if (cached !== undefined) return cached;
  const key = process.env.RESEND_API_KEY;
  cached = !key || key === "your_resend_api_key" ? null : new Resend(key);
  return cached;
}

export interface SendResult {
  ok: boolean;
  /** true when Resend isn't configured — treated as a non-error no-op. */
  skipped?: boolean;
  id?: string;
  error?: string;
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}): Promise<SendResult> {
  const resend = getResend();
  if (!resend) return { ok: true, skipped: true, error: "Resend not configured" };

  const from = opts.from || process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
  try {
    const { data, error } = await resend.emails.send({
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    if (error) {
      logError(new Error(error.message || "Resend returned an error"), {
        where: "lib/email/resend",
        op: "sendEmail",
        extra: { subject: opts.subject },
      });
      return { ok: false, error: error.message };
    }
    return { ok: true, id: data?.id };
  } catch (e) {
    logError(e, { where: "lib/email/resend", op: "sendEmail", extra: { subject: opts.subject } });
    return { ok: false, error: (e as Error).message };
  }
}
