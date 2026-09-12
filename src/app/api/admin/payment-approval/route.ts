import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Check admin authorization
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const {
    booking_id,
    approved,
    notes_ar,
    notes_en
  } = await request.json();

  if (!booking_id || typeof approved !== "boolean") {
    return NextResponse.json(
      { error: "Missing required fields: booking_id, approved" },
      { status: 400 }
    );
  }

  // Get the payment for this booking
  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .select("*")
    .eq("booking_id", booking_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (paymentError || !payment) {
    return NextResponse.json(
      { error: "Payment not found" },
      { status: 404 }
    );
  }

  // Update the payment with manual approval
  const { error: updateError } = await supabase
    .from("payments")
    .update({
      admin_approved: approved,
      admin_approval_notes_ar: notes_ar || null,
      admin_approval_notes_en: notes_en || null,
      approved_by: approved ? user.id : null,
      approved_at: approved ? new Date().toISOString() : null,
    })
    .eq("id", payment.id);

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to update payment approval" },
      { status: 500 }
    );
  }

  // If approved, send notification email
  if (approved) {
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "payment_approved",
        booking_id,
        admin_notes: notes_ar || notes_en
      }),
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, admin_approved: approved });
}
