/**
 * Pre-session reminder cron.
 *
 * Runs on a schedule (see vercel.json) and, for every CONFIRMED booking:
 *   • sends a "your session is tomorrow" email  (≤ 24h out, > 30m out)
 *   • sends a "starts in ~30 min" email          (≤ 30m out, still upcoming)
 * Each reminder is sent at most once (tracked on the booking row), and the
 * windows are "catch-up" style so a missed run is recovered on the next tick.
 *
 * Auth: Vercel Cron automatically sends `Authorization: Bearer <CRON_SECRET>`
 * when CRON_SECRET is set, so the same check guards manual calls too.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/resend";
import { reminder1DayEmail, reminder30MinEmail } from "@/lib/email/templates";
import { logError } from "@/lib/observability/logger";
import { offeringTitle, isOfferingType } from "@/lib/offerings";
import { slotStartsAtISO } from "@/lib/schedule-dates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAY = 24 * 60 * 60 * 1000;
const MIN = 60 * 1000;

interface BookingRow {
  id: string;
  status: string;
  reminder_1d_sent_at: string | null;
  reminder_30m_sent_at: string | null;
  offering_type: string | null;
  google_meet_link: string | null;
  user: { email: string | null; full_name: string | null } | null;
  workshop: { title_ar: string; title_en: string } | null;
  slot: { date: string | null; start_time: string | null } | null;
}

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // no secret configured → allow (dev)
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const now = Date.now();
  const summary = { considered: 0, sent1d: 0, sent30m: 0, skippedNoEmail: 0, failed: 0 };

  try {
    const supabase = await createAdminClient();
    // Fetch confirmed bookings with their slot; filter the reminder windows in
    // JS (the set of upcoming confirmed bookings is small, and filtering an
    // embedded to-one resource in PostgREST silently nulls the embed).
    const { data, error } = await (supabase as unknown as {
      from: (t: string) => {
        select: (q: string) => {
          eq: (c: string, v: string) => Promise<{ data: BookingRow[] | null; error: unknown }>;
        };
      };
    })
      .from("bookings")
      .select(
        "id, status, offering_type, google_meet_link, reminder_1d_sent_at, reminder_30m_sent_at, user:profiles(email, full_name), workshop:workshops(title_ar, title_en), slot:availability_slots(date, start_time)"
      )
      .eq("status", "confirmed");

    if (error) {
      const detail = JSON.stringify(error);
      // If the reminder columns aren't there yet, the migration hasn't been run
      // on this database — degrade quietly instead of erroring every tick.
      if (detail.includes("reminder_1d_sent_at") || detail.includes("reminder_30m_sent_at") || detail.includes("42703")) {
        return NextResponse.json({ ok: true, note: "reminders_migration_pending", ...summary });
      }
      logError(new Error("Failed to query bookings for reminders"), {
        where: "api/cron/reminders",
        op: "queryBookings",
        extra: { detail },
      });
      return NextResponse.json({ ok: false, error: "query_failed" }, { status: 500 });
    }

    const bookings = (data ?? []).filter((b) => b.slot?.date && b.slot?.start_time);
    summary.considered = bookings.length;

    for (const b of bookings) {
      const startsAtISO = slotStartsAtISO(b.slot!.date!, b.slot!.start_time!);
      const startsAt = new Date(startsAtISO).getTime();
      const ms = startsAt - now;
      if (ms <= 0) continue; // already started

      const email = b.user?.email;
      const name = b.user?.full_name || "صديقنا";
      const title = offeringTitle(
        isOfferingType(b.offering_type) ? b.offering_type : "career",
        b.workshop,
        true,
      );
      const link = b.google_meet_link ?? null;

      const due1d = !b.reminder_1d_sent_at && ms <= DAY && ms > 30 * MIN;
      const due30m = !b.reminder_30m_sent_at && ms <= 35 * MIN && ms > 0;

      if (!due1d && !due30m) continue;
      if (!email) {
        summary.skippedNoEmail++;
        continue;
      }

      const data_ = { userName: name, workshopTitle: title, startsAt: startsAtISO, locationOrLink: link, appUrl };

      if (due30m) {
        const { subject, html } = reminder30MinEmail(data_);
        const res = await sendEmail({ to: email, subject, html });
        if (res.ok && !res.skipped) {
          await markSent(supabase, b.id, "reminder_30m_sent_at");
          summary.sent30m++;
        } else if (!res.ok) {
          summary.failed++;
        }
      } else if (due1d) {
        const { subject, html } = reminder1DayEmail(data_);
        const res = await sendEmail({ to: email, subject, html });
        if (res.ok && !res.skipped) {
          await markSent(supabase, b.id, "reminder_1d_sent_at");
          summary.sent1d++;
        } else if (!res.ok) {
          summary.failed++;
        }
      }
    }

    return NextResponse.json({ ok: true, at: new Date(now).toISOString(), ...summary });
  } catch (e) {
    logError(e, { where: "api/cron/reminders", op: "run" });
    return NextResponse.json({ ok: false, error: "cron_failed" }, { status: 500 });
  }
}

async function markSent(supabase: unknown, bookingId: string, column: "reminder_1d_sent_at" | "reminder_30m_sent_at") {
  await (supabase as {
    from: (t: string) => { update: (v: Record<string, string>) => { eq: (c: string, v: string) => Promise<unknown> } };
  })
    .from("bookings")
    .update({ [column]: new Date().toISOString() })
    .eq("id", bookingId);
}
