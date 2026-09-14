/**
 * Payment deadline reminder cron.
 *
 * Runs on a schedule (see vercel.json) and for every PENDING booking with an unpaid payment:
 *   • sends a payment reminder email at 12 hours remaining
 *   • cancels the booking if payment_deadline has passed
 *
 * Auth: Vercel Cron automatically sends `Authorization: Bearer <CRON_SECRET>`
 * when CRON_SECRET is set.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/resend";
import { paymentReminderEmail, paymentCancelledEmail } from "@/lib/email/templates";
import { logError } from "@/lib/observability/logger";
import { offeringTitle, isOfferingType } from "@/lib/offerings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface BookingRow {
  id: string;
  user_id: string;
  session_id: string;
  status: string;
  payment_deadline: string | null;
  payment_reminder_sent_at: string | null;
  payment_cancelled_at: string | null;
  user: { email: string | null; full_name: string | null } | null;
  offering_type: string | null;
  workshop: { title_ar: string; title_en: string } | null;
  _unused_session: {
    workshop: { title_ar: string | null; title_en: string | null } | null;
  } | null;
  payment: { amount: number | null; status: string } | null;
}

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

function hoursUntil(deadline: string): number {
  const ms = new Date(deadline).getTime() - Date.now();
  return Math.ceil(ms / (60 * 60 * 1000));
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const now = new Date();
  const summary = { considered: 0, reminded: 0, cancelled: 0, failed: 0 };

  try {
    const supabase = await createAdminClient();

    const { data, error } = await (supabase as unknown as {
      from: (t: string) => {
        select: (q: string) => {
          eq: (c: string, v: string) => {
            is: (c: string, v: boolean) => Promise<{ data: BookingRow[] | null; error: unknown }>;
          };
        };
      };
    })
      .from("bookings")
      .select(
        "id, status, payment_deadline, payment_reminder_sent_at, payment_cancelled_at, user_id, session_id, offering_type, user:profiles(email, full_name), workshop:workshops(title_ar, title_en), payment:payments(amount, status)"
      )
      .eq("status", "pending")
      .is("payment_cancelled_at", false);

    if (error) {
      const detail = JSON.stringify(error);
      // If the payment_deadline columns aren't there yet, the migration hasn't run
      if (detail.includes("payment_deadline")) {
        return NextResponse.json({ ok: true, note: "payment_deadline_migration_pending", ...summary });
      }
      logError(new Error("Failed to query bookings for payment reminders"), {
        where: "api/cron/payment-reminders",
        op: "queryBookings",
        extra: { detail },
      });
      return NextResponse.json({ ok: false, error: "query_failed" }, { status: 500 });
    }

    const bookings = (data ?? []).filter((b) => b.payment_deadline);
    summary.considered = bookings.length;

    for (const b of bookings) {
      const deadline = new Date(b.payment_deadline!).getTime();
      const ms = deadline - now.getTime();
      const hours = ms / (60 * 60 * 1000);

      const email = b.user?.email;
      const name = b.user?.full_name || "صديقنا";
      const title = offeringTitle(
        isOfferingType(b.offering_type) ? b.offering_type : "career",
        b.workshop,
        true,
      );
      const amount = b.payment?.amount ? `${b.payment.amount} ج.م` : "-";

      // Cancel if deadline passed
      if (ms <= 0) {
        const { subject, html } = paymentCancelledEmail({
          userName: name,
          workshopTitle: title,
          amount,
          appUrl,
        });

        if (email) {
          await sendEmail({ to: email, subject, html });
        }

        // Update booking to cancelled, and give the appointment back in case
        // this booking was holding one.
        await (supabase as any)
          .from("bookings")
          .update({ status: "cancelled", payment_cancelled_at: now.toISOString() })
          .eq("id", b.id);
        await (supabase as any).rpc("release_slot_for_booking", { p_booking: b.id });

        summary.cancelled++;
      }
      // Send reminder if 12-24 hours remaining and not sent yet
      else if (hours > 0 && hours <= 12 && !b.payment_reminder_sent_at) {
        if (!email) continue;

        const { subject, html } = paymentReminderEmail({
          userName: name,
          workshopTitle: title,
          amount,
          hoursRemaining: Math.ceil(hours),
          appUrl,
        });

        const res = await sendEmail({ to: email, subject, html });
        if (res.ok && !res.skipped) {
          await (supabase as any)
            .from("bookings")
            .update({ payment_reminder_sent_at: now.toISOString() })
            .eq("id", b.id);
          summary.reminded++;
        } else if (!res.ok) {
          summary.failed++;
        }
      }
    }

    return NextResponse.json({ ok: true, at: now.toISOString(), ...summary });
  } catch (e) {
    logError(e, { where: "api/cron/payment-reminders", op: "run" });
    return NextResponse.json({ ok: false, error: "cron_failed" }, { status: 500 });
  }
}
