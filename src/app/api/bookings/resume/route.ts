import { NextResponse, type NextRequest } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { isPastSlot } from "@/lib/schedule-dates";
import { HOLD_MINUTES } from "@/lib/offerings";

export const runtime = "nodejs";

/**
 * Picks an unfinished booking back up.
 *
 * A client who closed the tab mid-payment had no way back: the dashboard showed
 * them a 24-hour countdown with nothing to click, and starting again would have
 * made a second booking. This re-enters the payment step on the SAME booking,
 * so the countdown they're looking at is the one they're racing.
 */
export async function POST(req: NextRequest) {
  try {
    const { booking_id: bookingId, payment_method, locale = "en" } = await req
      .json()
      .catch(() => ({}));
    const isAr = locale === "ar";
    const t = (ar: string, en: string) => (isAr ? ar : en);

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "unauthenticated", message: t("سجّل دخولك الأول.", "Please sign in first.") },
        { status: 401 },
      );
    }
    if (!bookingId) {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }

    const admin = await createAdminClient();

    const { data: booking } = await admin
      .from("bookings")
      .select(
        `id, user_id, status, payment_deadline, slot_id,
         slot:availability_slots(date, start_time),
         payment:payments(id, status, amount, created_at)`,
      )
      .eq("id", bookingId)
      .maybeSingle();

    if (!booking) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if ((booking as any).user_id !== user.id) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const b = booking as any;

    if (b.status === "cancelled") {
      return NextResponse.json(
        {
          error: "cancelled",
          message: t("الحجز ده اتلغى. اختار موعد جديد.", "This booking was cancelled. Please pick a new time."),
        },
        { status: 409 },
      );
    }

    const payments = Array.isArray(b.payment) ? b.payment : b.payment ? [b.payment] : [];
    const payment = [...payments].sort(
      (x, z) => new Date(z.created_at ?? 0).getTime() - new Date(x.created_at ?? 0).getTime(),
    )[0];

    if (!payment) {
      return NextResponse.json({ error: "no_payment" }, { status: 409 });
    }
    if (payment.status === "paid") {
      return NextResponse.json(
        {
          error: "already_paid",
          message: t("الحجز ده متأكد بالفعل.", "This booking is already confirmed."),
        },
        { status: 409 },
      );
    }

    if (b.slot && isPastSlot(b.slot.date, b.slot.start_time)) {
      return NextResponse.json(
        {
          error: "slot_past",
          message: t("الموعد ده عدّى. اختار موعد جديد.", "That time has passed. Please pick a new one."),
        },
        { status: 409 },
      );
    }

    const method = payment_method === "vodafone_cash" ? "vodafone_cash" : "instapay";
    await admin.from("payments").update({ method }).eq("id", payment.id);

    // Coming back to pay re-takes the window (their old hold may have lapsed).
    const { data: reservation } = await (admin as any).rpc("reserve_slot_for_booking", {
      p_booking: b.id,
      p_hold_minutes: HOLD_MINUTES,
    });

    if (reservation === "full" || reservation === "unavailable" || reservation === "committed_elsewhere") {
      return NextResponse.json(
        {
          error: "slot_taken",
          message: t(
            "للأسف الموعد ده اتحجز وانت بعيد. اختار موعد تاني.",
            "Someone took this time while you were away. Please pick another.",
          ),
        },
        { status: 409 },
      );
    }

    return NextResponse.json({
      booking: { id: b.id },
      payment: { id: payment.id },
      payment_deadline: b.payment_deadline,
      hold_minutes: HOLD_MINUTES,
      hold_expires_at: new Date(Date.now() + HOLD_MINUTES * 60_000).toISOString(),
      success: true,
    });
  } catch (err) {
    console.error("BOOKING_RESUME_ERROR:", err);
    return NextResponse.json({ error: "error", message: String(err) }, { status: 500 });
  }
}
