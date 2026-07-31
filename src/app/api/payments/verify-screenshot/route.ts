import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Deterministic manual-payment check — NO AI.
// The transfer amount is fixed (the booking price) and the recipient/amount/date
// are confirmed by the admin against the uploaded screenshot on approval. Here we
// only enforce what a machine can prove: a valid screenshot + a transaction
// reference number that hasn't already been used for another booking.

const digits = (s: string | null | undefined) => (s || "").replace(/\D/g, "");

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const reference = digits((form.get("reference") as string) || "");
    const bookingId = (form.get("booking_id") as string) || null;

    if (!file || !file.type.startsWith("image/")) {
      return NextResponse.json({ verified: false, error: "no_image" });
    }
    if (file.size < 20 * 1024) {
      return NextResponse.json({ verified: false, error: "fail" });
    }
    if (reference.length < 6) {
      return NextResponse.json({ verified: false, error: "bad_reference" });
    }

    const supabase = await createClient();

    // Anti-replay: the same transaction reference can't be used for another booking.
    let q = supabase
      .from("payments")
      .select("booking_id")
      .eq("gateway_txn_id", reference)
      .not("status", "eq", "failed");
    if (bookingId) q = q.neq("booking_id", bookingId);
    const { data: existing } = await q.limit(1).maybeSingle();

    if (existing) {
      return NextResponse.json({ verified: false, error: "duplicate_proof" });
    }

    // Record the reference on the pending payment (also enforces future uniqueness).
    if (bookingId) {
      await supabase
        .from("payments")
        .update({ gateway_txn_id: reference })
        .eq("booking_id", bookingId)
        .eq("status", "pending");
    }

    // Accepted for admin review. The admin confirms amount/recipient/date on approval.
    return NextResponse.json({ verified: true, pendingReview: true, reference });
  } catch {
    return NextResponse.json({ verified: false, error: "fail" });
  }
}
