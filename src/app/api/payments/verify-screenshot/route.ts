import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ocrReceipt, parseReceipt, validateReceipt } from "@/lib/payments/receipt";

export const runtime = "nodejs";
export const maxDuration = 60;

// Manual InstaPay / Vodafone Cash verification (no external AI / gateway).
// Reads the uploaded screenshot with OCR and checks:
//   1) amount matches the booking price
//   2) date is recent (today / within a couple of days)
//   3) a transaction reference is present AND not reused on another booking
// The reference is stored on the payment; the admin still confirms on approval.

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const bookingId = (form.get("booking_id") as string) || null;
    const proofUrl = (form.get("proof_url") as string) || null;

    if (!file || !file.type.startsWith("image/")) {
      return NextResponse.json({ verified: false, error: "no_image" });
    }
    if (file.size < 20 * 1024) {
      return NextResponse.json({ verified: false, error: "fail" });
    }
    if (!bookingId) {
      return NextResponse.json({ verified: false, error: "fail" });
    }

    // Identify caller.
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ verified: false, error: "unauthorized" }, { status: 401 });
    }

    const admin = await createAdminClient();

    // Ownership + trusted expected amount (server-created, not from the client).
    const { data: booking } = await admin
      .from("bookings")
      .select("user_id, payment:payments(id, amount)")
      .eq("id", bookingId)
      .single();
    const payment = Array.isArray(booking?.payment) ? booking?.payment[0] : booking?.payment;
    if (!booking || booking.user_id !== user.id || !payment) {
      return NextResponse.json({ verified: false, error: "forbidden" }, { status: 403 });
    }
    const expectedAmount = Number(payment.amount);

    // OCR + parse + validate (amount / date / reference).
    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await ocrReceipt(buffer, file.type);
    const parsed = parseReceipt(text);
    const errors = validateReceipt(parsed, { expectedAmount, now: new Date() });

    // Reference must be unique across bookings.
    if (parsed.reference) {
      let dq = admin
        .from("payments")
        .select("booking_id")
        .eq("gateway_txn_id", `ref:${parsed.reference}`)
        .not("status", "eq", "failed");
      dq = dq.neq("booking_id", bookingId);
      const { data: dup } = await dq.limit(1).maybeSingle();
      if (dup) errors.push("duplicate_reference");
    }

    if (errors.length > 0) {
      return NextResponse.json({
        verified: false,
        error: errors[0],
        errors,
        parsed: { amount: parsed.amount, reference: parsed.reference, date: parsed.date?.toISOString() ?? null },
        expected: expectedAmount,
      });
    }

    // Passed — store reference + proof + mark awaiting admin.
    await admin
      .from("payments")
      .update({
        gateway_txn_id: `ref:${parsed.reference}`,
        status: "pending_verification",
        ...(proofUrl ? { proof_url: proofUrl } : {}),
      })
      .eq("booking_id", bookingId)
      .eq("status", "pending");

    return NextResponse.json({
      verified: true,
      reference: parsed.reference,
      amount: parsed.amount,
    });
  } catch {
    return NextResponse.json({ verified: false, error: "fail" });
  }
}
