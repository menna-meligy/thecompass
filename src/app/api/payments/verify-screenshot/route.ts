import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { validateReceipt, type ParsedReceipt } from "@/lib/payments/receipt";

export const runtime = "nodejs";

/**
 * Manual InstaPay / Vodafone Cash verification (no gateway, no AI).
 *
 * The receipt is OCR'd in the browser; here we validate the extracted values
 * against the booking's trusted price + today, and enforce that the transaction
 * reference hasn't been reused.
 *
 * Crucially, this is also the moment the slot becomes TAKEN. Reservation runs
 * through an atomic Postgres function before the receipt is accepted, so two
 * clients uploading receipts for the same one-seat slot in the same second can
 * never both win — and the loser is told immediately rather than discovering it
 * at the session.
 */

const PROOF_BUCKETS = ["payment-proofs", "proofs"];

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
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ verified: false, error: "unauthenticated" }, { status: 401 });
    }

    const admin = await createAdminClient();

    const { data: booking } = await admin
      .from("bookings")
      .select("id, user_id, slot_id, status, slot_reserved_at")
      .eq("id", bookingId)
      .maybeSingle();

    if (!booking) {
      return NextResponse.json({ verified: false, error: "booking_not_found" }, { status: 404 });
    }
    if ((booking as any).user_id !== user.id) {
      return NextResponse.json({ verified: false, error: "forbidden" }, { status: 403 });
    }

    const { data: payments } = await admin
      .from("payments")
      .select("*")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: false });

    const payment = payments?.[0] as any;
    if (!payment) {
      return NextResponse.json({ verified: false, error: "payment_not_found" }, { status: 404 });
    }
    const expectedAmount = Number(payment.amount);

    // ── Validate the OCR'd values ──────────────────────────────────────────
    const parsed: ParsedReceipt = {
      amount: ocrAmount != null && !Number.isNaN(ocrAmount) ? ocrAmount : null,
      date: ocrDate ? new Date(ocrDate) : null,
      reference: ocrReference,
    };
    const errors = validateReceipt(parsed, { expectedAmount, now: new Date(), maxAgeDays: 0 });

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

    // ── Take the slot, atomically, before accepting the receipt ────────────
    const { data: reservation, error: reserveError } = await (admin as any).rpc(
      "reserve_slot_for_booking",
      { p_booking: bookingId },
    );

    if (reserveError) {
      console.error("reserve_slot_for_booking failed:", reserveError.message);
      return NextResponse.json({ verified: false, error: "fail" });
    }

    if (reservation === "full" || reservation === "unavailable") {
      return NextResponse.json({ verified: false, error: "slot_taken", errors: ["slot_taken"] });
    }

    // ── Store the proof so the admin can review it ─────────────────────────
    let finalProofUrl = proofUrl;
    if (!finalProofUrl) {
      const safe = (file.name || "receipt.png").replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `payments/${bookingId}-${Date.now()}-${safe}`;
      const buf = Buffer.from(await file.arrayBuffer());
      for (const bucket of PROOF_BUCKETS) {
        try {
          const { error: upErr } = await admin.storage
            .from(bucket)
            .upload(path, buf, { contentType: file.type || "image/png", upsert: true });
          if (!upErr) {
            finalProofUrl = admin.storage.from(bucket).getPublicUrl(path).data.publicUrl;
            break;
          }
        } catch {
          /* try the next bucket */
        }
      }
    }

    if (!finalProofUrl) {
      // No stored proof → the admin could never review it. Give the slot back.
      await (admin as any).rpc("release_slot_for_booking", { p_booking: bookingId });
      return NextResponse.json({ verified: false, error: "upload_failed" });
    }

    await admin
      .from("payments")
      .update({
        gateway_txn_id: `ref:${parsed.reference}`,
        status: "pending_verification",
        proof_url: finalProofUrl,
        receipt_image_url: finalProofUrl,
        receipt_validated_at: new Date().toISOString(),
        receipt_validation_status: "pending_manual_review",
      })
      .eq("id", payment.id);

    return NextResponse.json({
      verified: true,
      reference: parsed.reference,
      reserved: reservation,
    });
  } catch (err) {
    console.error("verify-screenshot error:", err);
    return NextResponse.json({ verified: false, error: "fail" });
  }
}
