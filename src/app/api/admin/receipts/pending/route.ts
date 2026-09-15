import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { normaliseDate, shortTime } from "@/lib/schedule-dates";
import { offeringTitle, isOfferingType } from "@/lib/offerings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Receipts clients have actually uploaded.
 *
 * Previously this read a `pending_receipts` table that nothing writes any more,
 * so the admin's receipts screen was permanently empty while real receipts sat
 * on `payments.proof_url` where nobody looked. It now reads the real thing.
 *
 * ?status=needs_review | pending | approved | rejected | all
 *
 * "needs_review" is a receipt the automatic OCR check refused. It is kept and
 * shown here on purpose: that check runs on a phone photo and misreads real
 * digits, so a human has to be able to look at the image and decide.
 */
export async function GET(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const { admin } = guard;

  const status = request.nextUrl.searchParams.get("status") ?? "open";

  const { data, error } = await admin
    .from("bookings")
    .select(
      `id, status, offering_type, workshop_id, seats, created_at, slot_reserved_at, scheduled_at,
       user:profiles(full_name, email, phone),
       workshop:workshops(id, title_ar, title_en),
       slot:availability_slots(id, date, start_time, end_time),
       payment:payments(id, amount, currency, method, status, proof_url, receipt_image_url,
                        gateway_txn_id, admin_approved, approved_at, created_at,
                        receipt_validation_status, receipt_validation_errors,
                        receipt_attempts, receipt_last_attempt_at)`,
    )
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? [])
    .map((b: any) => {
      const payments = Array.isArray(b.payment) ? b.payment : b.payment ? [b.payment] : [];
      const payment = [...payments].sort(
        (a, z) => new Date(z.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
      )[0];
      return { booking: b, payment };
    })
    // A "receipt" is a payment with a stored proof. Anything else isn't here yet.
    .filter(({ payment }) => !!payment?.proof_url)
    .map(({ booking: b, payment }) => {
      const offeringType = isOfferingType(b.offering_type) ? b.offering_type : "career";
      const decided =
        payment.status === "paid" || payment.admin_approved
          ? "approved"
          : payment.status === "failed" || b.status === "cancelled"
            ? "rejected"
            : null;
      // Undecided receipts split by whether the automatic check was happy.
      const state =
        decided ??
        (payment.receipt_validation_status === "needs_review" ? "needs_review" : "pending");

      return {
        id: b.id,
        booking_id: b.id,
        payment_id: payment.id,
        state,
        booking_status: b.status,
        payment_status: payment.status,
        offering_type: offeringType,
        title_ar: offeringTitle(offeringType, b.workshop, true),
        title_en: offeringTitle(offeringType, b.workshop, false),
        slot_date: b.slot ? normaliseDate(b.slot.date) : null,
        slot_start: b.slot ? shortTime(b.slot.start_time) : null,
        slot_end: b.slot ? shortTime(b.slot.end_time) : null,
        amount: payment.amount,
        currency: payment.currency ?? "EGP",
        method: payment.method,
        reference: (payment.gateway_txn_id ?? "").replace(/^ref:/, "") || null,
        proof_url: payment.proof_url ?? payment.receipt_image_url ?? null,
        validation_errors: Array.isArray(payment.receipt_validation_errors)
          ? payment.receipt_validation_errors
          : [],
        attempts: payment.receipt_attempts ?? 1,
        holds_slot: !!b.slot_reserved_at,
        uploaded_at: payment.receipt_last_attempt_at ?? payment.created_at,
        approved_at: payment.approved_at,
        user_name: b.user?.full_name ?? null,
        user_email: b.user?.email ?? null,
        user_phone: b.user?.phone ?? null,
      };
    })
    .filter((r) =>
      status === "all"
        ? true
        : status === "open"
          ? r.state === "pending" || r.state === "needs_review"
          : r.state === status,
    );

  return NextResponse.json(rows);
}
