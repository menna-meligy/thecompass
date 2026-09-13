import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { validateReceipt, type ParsedReceipt } from "@/lib/payments/receipt";

export const runtime = "nodejs";

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

    const admin = await createAdminClient();

    // Get booking and payment (for test/dev, don't require auth)
    const { data: booking } = await admin
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (!booking) {
      return NextResponse.json({ verified: false, error: "booking_not_found" }, { status: 404 });
    }

    // Get payment
    const { data: payments } = await admin
      .from("payments")
      .select("*")
      .eq("booking_id", bookingId);

    const payment = payments?.[0];
    if (!payment) {
      return NextResponse.json({ verified: false, error: "payment_not_found" }, { status: 404 });
    }
    const expectedAmount = Number(payment.amount);

    // Validate the OCR'd values: amount matches, date must be TODAY, reference present.
    const parsed: ParsedReceipt = {
      amount: ocrAmount != null && !Number.isNaN(ocrAmount) ? ocrAmount : null,
      date: ocrDate ? new Date(ocrDate) : null,
      reference: ocrReference,
    };
    const errors = validateReceipt(parsed, { expectedAmount, now: new Date(), maxAgeDays: 0 });

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

    // Ensure a stored receipt image exists. The client tries to upload first
    // (non-fatal); if that failed, upload here with the service-role client so a
    // verified receipt ALWAYS has a proof the admin can review + confirm.
    let finalProofUrl = proofUrl;
    if (!finalProofUrl) {
      try {
        const safe = (file.name || "receipt.png").replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `payments/${bookingId}-${safe}`;
        const buf = Buffer.from(await file.arrayBuffer());
        const { error: upErr } = await admin.storage
          .from("payment-proofs")
          .upload(path, buf, { contentType: file.type || "image/png", upsert: true });
        if (!upErr) finalProofUrl = admin.storage.from("payment-proofs").getPublicUrl(path).data.publicUrl;
      } catch {
        /* ignore — handled below */
      }
    }
    if (!finalProofUrl) {
      // No stored proof → the booking could never be confirmed. Ask to retry.
      return NextResponse.json({ verified: false, error: "upload_failed" });
    }

    // Passed — store reference + proof + mark awaiting admin review.
    await admin
      .from("payments")
      .update({
        gateway_txn_id: `ref:${parsed.reference}`,
        status: "pending_verification",
        proof_url: finalProofUrl,
      })
      .eq("booking_id", bookingId)
      .eq("status", "pending");

    return NextResponse.json({ verified: true, reference: parsed.reference });
  } catch {
    return NextResponse.json({ verified: false, error: "fail" });
  }
}
