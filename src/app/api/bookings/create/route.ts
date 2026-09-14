import { NextResponse, type NextRequest } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { capacityFor, parseOfferingKey, priceFor } from "@/lib/offerings";
import { isPastSlot, normaliseDate, shortTime, slotStartsAtISO } from "@/lib/schedule-dates";

export const runtime = "nodejs";

const PAYMENT_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Creates the booking + its pending payment for a chosen slot.
 *
 * Deliberately does NOT take the slot yet — a slot is only "taken" once the
 * client uploads a receipt (see /api/payments/verify-screenshot). Holding it at
 * this point would let anyone who opens the payment screen and walks away burn
 * an appointment for 24 hours.
 *
 * The price is resolved on the server from the offering. The browser doesn't
 * get to name its own amount — the receipt is validated against this number.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { slotId, offering: offeringKey, payment_method, locale = "en" } = body;
    const isAr = locale === "ar";

    const t = (ar: string, en: string) => (isAr ? ar : en);

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "unauthenticated",
          message: t("يرجى تسجيل الدخول لإتمام الحجز.", "Please sign in to complete your booking."),
        },
        { status: 401 },
      );
    }

    const offering = parseOfferingKey(offeringKey);
    if (!slotId || !offering) {
      return NextResponse.json(
        {
          error: "bad_request",
          message: t("بيانات الحجز ناقصة. يرجى إعادة المحاولة.", "Booking details are incomplete. Please try again."),
        },
        { status: 400 },
      );
    }

    const admin = await createAdminClient();

    // Keep profiles in step with auth without ever clobbering a real email.
    await admin.from("profiles").upsert(
      {
        id: user.id,
        email: user.email ?? `user-${user.id}@albosla.local`,
        full_name: (user.user_metadata as Record<string, string> | null)?.full_name ?? null,
        role: "user",
      },
      { onConflict: "id", ignoreDuplicates: true },
    );

    // ── Validate the slot is genuinely bookable for this offering ──────────
    const { data: slot } = await admin
      .from("availability_slots")
      .select(
        `id, date, start_time, end_time, capacity, booked_count, status,
         admin_marked_status, is_day_block, committed_offering_type, committed_workshop_id,
         slot_assignments(offering_type, workshop_id)`,
      )
      .eq("id", slotId)
      .maybeSingle();

    if (!slot) {
      return NextResponse.json(
        {
          error: "slot_not_found",
          message: t("هذا الموعد لم يعد متاحاً. اختر موعداً آخر.", "This time is no longer available. Please pick another."),
        },
        { status: 404 },
      );
    }

    const s = slot as any;

    if (s.is_day_block || s.status !== "published" || (s.admin_marked_status ?? "available") !== "available") {
      return NextResponse.json(
        {
          error: "slot_unavailable",
          message: t("هذا الموعد مقفول. اختر موعداً آخر.", "This time is closed. Please pick another."),
        },
        { status: 409 },
      );
    }

    if (s.booked_count >= s.capacity) {
      return NextResponse.json(
        {
          error: "slot_full",
          message: t("هذا الموعد اتحجز للتو. اختر موعداً آخر.", "This time was just taken. Please pick another."),
        },
        { status: 409 },
      );
    }

    if (isPastSlot(s.date, s.start_time)) {
      return NextResponse.json(
        {
          error: "slot_past",
          message: t("هذا الموعد عدّى بالفعل. اختر موعداً قادماً.", "This time has already passed. Please pick an upcoming one."),
        },
        { status: 409 },
      );
    }

    // A window that someone has already taken IS that thing now — you can only
    // join the same group, never book a 1-on-1 over it.
    if (
      s.committed_offering_type &&
      (s.committed_offering_type !== offering.offeringType ||
        (s.committed_workshop_id ?? null) !== offering.workshopId)
    ) {
      return NextResponse.json(
        {
          error: "slot_committed",
          message: t("الموعد ده اتحجز لجلسة تانية. اختار موعد تاني.", "This time was taken for a different session. Please pick another."),
        },
        { status: 409 },
      );
    }

    const matches = (s.slot_assignments ?? []).some(
      (a: any) =>
        a.offering_type === offering.offeringType && (a.workshop_id ?? null) === offering.workshopId,
    );
    if (!matches) {
      return NextResponse.json(
        {
          error: "offering_mismatch",
          message: t("هذا الموعد مش متاح للجلسة دي.", "This time isn't open for this session type."),
        },
        { status: 409 },
      );
    }

    const price = priceFor(offering.offeringType);
    const method = payment_method === "vodafone_cash" ? "vodafone_cash" : "instapay";

    // Re-use an unpaid booking the same client already started for this slot,
    // so refreshing the payment screen doesn't pile up duplicate rows.
    const { data: existing } = await admin
      .from("bookings")
      .select("id, payment_deadline, payment:payments(id, status)")
      .eq("user_id", user.id)
      .eq("slot_id", slotId)
      .eq("status", "pending")
      .is("slot_reserved_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      const payments = Array.isArray((existing as any).payment) ? (existing as any).payment : [];
      const pending = payments.find((p: any) => p.status === "pending");
      if (pending) {
        await admin
          .from("payments")
          .update({ amount: price, method })
          .eq("id", pending.id);
        return NextResponse.json({
          booking: { id: (existing as any).id },
          payment: { id: pending.id },
          payment_deadline: (existing as any).payment_deadline,
          price,
          success: true,
        });
      }
    }

    const paymentDeadline = new Date(Date.now() + PAYMENT_WINDOW_MS).toISOString();
    const scheduledAt = slotStartsAtISO(s.date, s.start_time);

    const { data: booking, error: bookingError } = await admin
      .from("bookings")
      .insert({
        user_id: user.id,
        slot_id: slotId,
        workshop_id: offering.workshopId,
        offering_type: offering.offeringType,
        seats: 1,
        // How many this offering seats, so the database can decide what the
        // window becomes without duplicating the catalogue in SQL.
        offering_capacity: capacityFor(offering.offeringType),
        status: "pending",
        payment_deadline: paymentDeadline,
        scheduled_at: scheduledAt,
      })
      .select("id")
      .single();

    if (bookingError || !booking) {
      console.error("BOOKING_CREATE_FAILED:", bookingError);
      return NextResponse.json(
        {
          error: "booking_failed",
          message: t("فشل إنشاء الحجز. حاول تاني.", "Could not create the booking. Please try again."),
        },
        { status: 500 },
      );
    }

    const { data: payment, error: paymentError } = await admin
      .from("payments")
      .insert({
        booking_id: booking.id,
        user_id: user.id,
        amount: price,
        currency: "EGP",
        method,
        status: "pending",
      })
      .select("id")
      .single();

    if (paymentError) {
      console.error("PAYMENT_CREATE_FAILED:", paymentError);
      await admin.from("bookings").delete().eq("id", booking.id);
      return NextResponse.json(
        {
          error: "payment_failed",
          message: t("فشل إنشاء الدفعة. حاول تاني.", "Could not start the payment. Please try again."),
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      booking: { id: booking.id },
      payment: { id: payment?.id },
      payment_deadline: paymentDeadline,
      price,
      slot: {
        date: normaliseDate(s.date),
        start_time: shortTime(s.start_time),
        end_time: shortTime(s.end_time),
      },
      success: true,
    });
  } catch (err) {
    console.error("BOOKING_CREATE_ERROR:", err);
    return NextResponse.json({ error: "error", message: String(err) }, { status: 500 });
  }
}
