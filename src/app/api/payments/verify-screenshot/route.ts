import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { createHash } from "crypto";

// Deterministic manual-payment check — NO AI, no user-typed reference.
// The customer uploads the transfer screenshot; we store it on the payment (so
// the admin can review the amount/date), and block the exact same screenshot from
// being reused for another booking. Writes go through the service-role client
// because RLS only lets admins UPDATE payments — a user cannot update their own.

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

    // Identify the caller.
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ verified: false, error: "unauthorized" }, { status: 401 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const imageHash = createHash("sha256").update(buffer).digest("hex");
    const admin = await createAdminClient();

    // Ownership: the booking must belong to the caller.
    if (bookingId) {
      const { data: bk } = await admin.from("bookings").select("user_id").eq("id", bookingId).single();
      if (!bk || bk.user_id !== user.id) {
        return NextResponse.json({ verified: false, error: "forbidden" }, { status: 403 });
      }
    }

    // Anti-reuse: the exact same screenshot can't be used for another booking.
    let q = admin
      .from("payments")
      .select("booking_id")
      .eq("gateway_txn_id", `proof_hash:${imageHash}`)
      .not("status", "eq", "failed");
    if (bookingId) q = q.neq("booking_id", bookingId);
    const { data: existing } = await q.limit(1).maybeSingle();

    if (existing) {
      return NextResponse.json({ verified: false, error: "duplicate_proof" });
    }

    // Attach the proof + hash to the pending payment (service role bypasses RLS).
    if (bookingId) {
      await admin
        .from("payments")
        .update({
          gateway_txn_id: `proof_hash:${imageHash}`,
          status: "proof_submitted",
          ...(proofUrl ? { proof_url: proofUrl } : {}),
        })
        .eq("booking_id", bookingId)
        .eq("status", "pending");
    }

    // Accepted for admin review (admin confirms amount/recipient/date on approval).
    return NextResponse.json({ verified: true, pendingReview: true });
  } catch {
    return NextResponse.json({ verified: false, error: "fail" });
  }
}
