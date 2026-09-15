import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { normaliseDate, shortTime } from "@/lib/schedule-dates";
import { isOfferingType, offeringTitle } from "@/lib/offerings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Every booking, with the details the coach actually needs: when the session is,
 * what was booked, who booked it, and where the payment stands.
 *
 * The appointment time comes from `availability_slots` via `bookings.slot_id`.
 * This used to join `sessions`, a table that is empty in production — so every
 * row rendered with a blank date and a blank workshop name.
 */

export type AdminBookingState =
  | "awaiting_receipt"
  | "receipt_to_review"
  | "receipt_needs_review"
  | "confirmed"
  | "attended"
  | "cancelled";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const { admin } = guard;

  const params = req.nextUrl.searchParams;
  const state = params.get("state");
  const search = (params.get("search") || "").trim().toLowerCase();

  const { data, error } = await admin
    .from("bookings")
    .select(
      `id, user_id, status, created_at, payment_deadline, scheduled_at, offering_type,
       workshop_id, seats, slot_reserved_at, google_meet_link,
       user:profiles(full_name, email, phone),
       workshop:workshops(id, title_ar, title_en),
       slot:availability_slots(id, date, start_time, end_time, capacity, booked_count),
       payment:payments(id, amount, currency, method, status, proof_url, gateway_txn_id,
                        admin_approved, approved_at, created_at,
                        receipt_validation_status, receipt_validation_errors, receipt_attempts)`,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let bookings = (data ?? []).map((b: any) => {
    const payments = Array.isArray(b.payment) ? b.payment : b.payment ? [b.payment] : [];
    const payment = [...payments].sort(
      (a, z) => new Date(z.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
    )[0] ?? null;

    const offeringType = isOfferingType(b.offering_type) ? b.offering_type : "career";

    let derived: AdminBookingState;
    if (b.status === "cancelled") derived = "cancelled";
    else if (b.status === "attended") derived = "attended";
    else if (b.status === "confirmed") derived = "confirmed";
    else if (payment?.proof_url)
      derived =
        payment.receipt_validation_status === "needs_review"
          ? "receipt_needs_review"
          : "receipt_to_review";
    else derived = "awaiting_receipt";

    return {
      id: b.id,
      user_id: b.user_id,
      status: b.status,
      state: derived,
      created_at: b.created_at,
      payment_deadline: b.payment_deadline,
      scheduled_at: b.scheduled_at,
      google_meet_link: b.google_meet_link,
      seats: b.seats ?? 1,
      holds_slot: !!b.slot_reserved_at,
      offering_type: offeringType,
      title_ar: offeringTitle(offeringType, b.workshop, true),
      title_en: offeringTitle(offeringType, b.workshop, false),
      slot: b.slot
        ? {
            id: b.slot.id,
            date: normaliseDate(b.slot.date),
            start_time: shortTime(b.slot.start_time),
            end_time: shortTime(b.slot.end_time),
            capacity: b.slot.capacity,
            booked_count: b.slot.booked_count,
          }
        : null,
      user: b.user ?? null,
      payment: payment
        ? {
            ...payment,
            reference: (payment.gateway_txn_id ?? "").replace(/^ref:/, "") || null,
            validation_errors: Array.isArray(payment.receipt_validation_errors)
              ? payment.receipt_validation_errors
              : [],
          }
        : null,
    };
  });

  // Tab counts describe the whole set, so they must be taken before filtering.
  const counts = bookings.reduce<Record<string, number>>((acc, b) => {
    acc[b.state] = (acc[b.state] ?? 0) + 1;
    return acc;
  }, {});

  if (state && state !== "all") {
    bookings = bookings.filter((b) => b.state === state);
  }

  if (search) {
    bookings = bookings.filter((b) => {
      const haystack = [
        b.user?.full_name,
        b.user?.email,
        b.user?.phone,
        b.title_ar,
        b.title_en,
        b.id,
        b.payment?.reference,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(search);
    });
  }

  return NextResponse.json({ bookings, counts, total: bookings.length });
}
