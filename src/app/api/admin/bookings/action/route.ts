import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";

type Action = "confirm" | "reject" | "cancel" | "attended";

/**
 * Every admin decision on a booking goes through here.
 *
 * It runs with the service role, so it can't silently no-op the way the old
 * browser-side `supabase.from("bookings").update(...)` calls did when RLS
 * refused the write — and it's the only place that gives a slot back when a
 * booking dies, so availability can't drift away from reality.
 */
export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const { admin, userId } = guard;

  const { booking_id: bookingId, action, notes } = await request.json().catch(() => ({}));

  if (!bookingId || !["confirm", "reject", "cancel", "attended"].includes(action)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const { data: booking } = await admin
    .from("bookings")
    .select("id, status, slot_reserved_at, payment:payments(id, status, proof_url, created_at)")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const payments = Array.isArray((booking as any).payment) ? (booking as any).payment : [];
  const payment = [...payments].sort(
    (a, z) => new Date(z.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
  )[0];

  const now = new Date().toISOString();

  if (action === "confirm") {
    if (!payment?.proof_url) {
      return NextResponse.json(
        {
          error: "no_receipt",
          message: "This client hasn't uploaded a receipt yet, so there's nothing to approve.",
        },
        { status: 409 },
      );
    }

    await admin
      .from("payments")
      .update({
        status: "paid",
        admin_approved: true,
        approved_at: now,
        approved_by: userId,
        receipt_validation_status: "approved",
        ...(notes ? { admin_approval_notes_ar: notes, admin_approval_notes_en: notes } : {}),
      })
      .eq("id", payment.id);

    const { error } = await admin
      .from("bookings")
      .update({ status: "confirmed" })
      .eq("id", bookingId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // The seat is already held from the receipt upload; make sure of it anyway.
    await (admin as any).rpc("reserve_slot_for_booking", { p_booking: bookingId });

    return NextResponse.json({ ok: true, status: "confirmed" });
  }

  if (action === "attended") {
    const { error } = await admin
      .from("bookings")
      .update({ status: "attended" })
      .eq("id", bookingId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, status: "attended" });
  }

  // reject (receipt refused) and cancel both kill the booking and, crucially,
  // hand the appointment back to the calendar.
  if (payment) {
    await admin
      .from("payments")
      .update({
        status: "failed",
        admin_approved: false,
        receipt_validation_status: action === "reject" ? "rejected" : "cancelled",
        ...(notes ? { admin_approval_notes_ar: notes, admin_approval_notes_en: notes } : {}),
      })
      .eq("id", payment.id);
  }

  const { error } = await admin
    .from("bookings")
    .update({ status: "cancelled", payment_cancelled_at: now })
    .eq("id", bookingId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await (admin as any).rpc("release_slot_for_booking", { p_booking: bookingId });

  return NextResponse.json({ ok: true, status: "cancelled", released: true });
}
