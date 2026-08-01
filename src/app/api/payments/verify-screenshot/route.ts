import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createHash } from "crypto";

// Deterministic manual-payment check — NO AI, no user-typed reference.
// The customer just uploads the transfer screenshot. We enforce what a machine
// can prove: it's a real image AND the exact same screenshot hasn't already been
// used for another booking (blocks recurring clients reusing an old receipt).
// The admin confirms the amount / date / recipient on the screenshot at approval.

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const bookingId = (form.get("booking_id") as string) || null;

    if (!file || !file.type.startsWith("image/")) {
      return NextResponse.json({ verified: false, error: "no_image" });
    }
    if (file.size < 20 * 1024) {
      return NextResponse.json({ verified: false, error: "fail" });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const imageHash = createHash("sha256").update(buffer).digest("hex");
    const supabase = await createClient();

    // Anti-reuse: the exact same screenshot can't be used for another booking.
    let q = supabase
      .from("payments")
      .select("booking_id")
      .eq("gateway_txn_id", `proof_hash:${imageHash}`)
      .not("status", "eq", "failed");
    if (bookingId) q = q.neq("booking_id", bookingId);
    const { data: existing } = await q.limit(1).maybeSingle();

    if (existing) {
      return NextResponse.json({ verified: false, error: "duplicate_proof" });
    }

    // Record the image hash on the pending payment (enforces future uniqueness).
    if (bookingId) {
      await supabase
        .from("payments")
        .update({ gateway_txn_id: `proof_hash:${imageHash}` })
        .eq("booking_id", bookingId)
        .eq("status", "pending");
    }

    // Accepted for admin review (admin confirms amount/recipient/date on approval).
    return NextResponse.json({ verified: true, pendingReview: true });
  } catch {
    return NextResponse.json({ verified: false, error: "fail" });
  }
}
