import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { validateReceipt, type ParsedReceipt } from "@/lib/payments/receipt";

// Manual InstaPay / Vodafone Cash verification (no external AI / gateway).
// The receipt is OCR'd in the browser; here we validate the extracted values
// against the booking's trusted price + today, and enforce that the transaction
// reference hasn't been reused. The admin still confirms on approval.

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const bookingId = (form.get("booking_id") as string) || null;
    const proofUrl = (form.get("proof_url") as string) || null;
    const ocrAmount = form.get("ocr_amount") ? Number(form.get("ocr_amount")) : null;
    const ocrDate = (form.get("ocr_date") as string) || null;
    const ocrReference = ((form.get("ocr_reference") as string) || "").replace(/\D/g, "") || null;

    if (!file || !file.type.startsWith("image/")) {
      return NextResponse.json({ verified: false, error: "no_image" });
    }
    if (file.size < 20 * 1024) return NextResponse.json({ verified: false, error: "fail" });
    if (!bookingId) return NextResponse.json({ verified: false, error: "fail" });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ verified: false, error: "unauthorized" }, { status: 401 });

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

    // Validate the OCR'd values: amount matches, date recent, reference present.
    const parsed: ParsedReceipt = {
      amount: ocrAmount != null && !Number.isNaN(ocrAmount) ? ocrAmount : null,
      date: ocrDate ? new Date(ocrDate) : null,
      reference: ocrReference,
    };
    const errors = validateReceipt(parsed, { expectedAmount, now: new Date() });

    // Reference must be unique across bookings.
    if (parsed.reference) {
      const { data: dup } = await admin
        .from("payments")
        .select("booking_id")
        .eq("gateway_txn_id", `ref:${parsed.reference}`)
        .not("status", "eq", "failed")
        .neq("booking_id", bookingId)
        .limit(1)
        .maybeSingle();
      if (dup) errors.push("duplicate_reference");
    }

    if (errors.length > 0) {
      return NextResponse.json({ verified: false, error: errors[0], errors, expected: expectedAmount });
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

    return NextResponse.json({ verified: true, reference: parsed.reference });
  } catch {
    return NextResponse.json({ verified: false, error: "fail" });
  }
}
