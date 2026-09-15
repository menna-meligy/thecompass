import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { validateReceipt, type ParsedReceipt } from "@/lib/payments/receipt";

export const runtime = "nodejs";

/**
 * Manual InstaPay / Vodafone Cash verification (no gateway, no AI).
 *
 * The receipt is OCR'd in the client's browser and the extracted values are
 * checked here against the booking's trusted price and today's date.
 *
 * Those checks decide how confident we are — they do NOT decide whether the
 * upload is kept. OCR runs on a photo of a phone screen and misreads real
 * digits, so a rejected receipt is stored exactly like an accepted one and put
 * in front of the coach with the reasons it failed. Throwing it away left an
 * honest client at a dead end and the coach unaware they had even tried.
 *
 * This is also where a slot becomes TAKEN, through an atomic Postgres function,
 * so two clients uploading for the same one-seat slot can never both win.
 */

const PROOF_BUCKETS = ["payment-proofs", "proofs"];

/**
 * Reusing another booking's transaction reference isn't a bad photo, it's a
 * duplicate payment claim — so it must never hold a slot. Everything else is
 * treated as "we couldn't read it", which a human can settle.
 */
const FRAUD_SIGNALS = new Set(["duplicate_reference", "duplicate_proof"]);

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

    // ── What the automatic checks make of it ───────────────────────────────
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

    const passed = errors.length === 0;
    const hasFraudSignal = errors.some((e) => FRAUD_SIGNALS.has(e));

    // ── Keep the image, whatever the checks concluded ──────────────────────
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
      // Nothing stored means the coach would have nothing to look at.
      return NextResponse.json({ verified: false, error: "upload_failed", errors: ["upload_failed"] });
    }

    // ── Hold the slot for any genuine attempt ──────────────────────────────
    // A client whose real receipt the OCR misread shouldn't lose their
    // appointment while waiting for a human. Rejecting the receipt hands it
    // straight back (see /api/admin/bookings/action).
    let reservation: string | null = null;
    if (!hasFraudSignal) {
      const { data, error: reserveError } = await (admin as any).rpc("reserve_slot_for_booking", {
        p_booking: bookingId,
      });
      if (reserveError) {
        console.error("reserve_slot_for_booking failed:", reserveError.message);
      } else {
        reservation = data as string;
      }
    }

    if (reservation === "full" || reservation === "unavailable" || reservation === "committed_elsewhere") {
      // Someone else got there first — don't keep their money in limbo.
      await admin
        .from("payments")
        .update({
          proof_url: finalProofUrl,
          receipt_image_url: finalProofUrl,
          receipt_validation_status: "needs_review",
          receipt_validation_errors: ["slot_taken"],
          receipt_attempts: (payment.receipt_attempts ?? 0) + 1,
          receipt_last_attempt_at: new Date().toISOString(),
        })
        .eq("id", payment.id);
      return NextResponse.json({ verified: false, error: "slot_taken", errors: ["slot_taken"] });
    }

    await admin
      .from("payments")
      .update({
        ...(parsed.reference ? { gateway_txn_id: `ref:${parsed.reference}` } : {}),
        status: "pending_verification",
        proof_url: finalProofUrl,
        receipt_image_url: finalProofUrl,
        receipt_validated_at: new Date().toISOString(),
        receipt_validation_status: passed ? "auto_verified" : "needs_review",
        receipt_validation_errors: passed ? null : errors,
        receipt_attempts: (payment.receipt_attempts ?? 0) + 1,
        receipt_last_attempt_at: new Date().toISOString(),
      })
      .eq("id", payment.id);

    if (passed) {
      return NextResponse.json({ verified: true, reference: parsed.reference, reserved: reservation });
    }

    // Stored, visible to the coach, and (unless it looked like a duplicate
    // payment claim) the appointment is being held meanwhile.
    return NextResponse.json({
      verified: false,
      needsReview: true,
      slotHeld: !hasFraudSignal,
      error: errors[0],
      errors,
      expected: expectedAmount,
    });
  } catch (err) {
    console.error("verify-screenshot error:", err);
    return NextResponse.json({ verified: false, error: "fail" });
  }
}
