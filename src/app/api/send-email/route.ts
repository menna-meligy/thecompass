import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key || key === "your_resend_api_key") return null;
  return new Resend(key);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { type, booking_id } = body;

  if (!booking_id) {
    return NextResponse.json({ error: "Missing booking_id" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: booking } = await supabase
    .from("bookings")
    .select("*, user:profiles(*), session:sessions(*, workshop:workshops(*))")
    .eq("id", booking_id)
    .single();

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const userEmail = (booking as { user?: { email?: string } }).user?.email;
  const workshopTitle =
    (booking as { session?: { workshop?: { title_ar?: string } } }).session?.workshop?.title_ar || "الجلسة";
  const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@albosla.com";

  let subject = "";
  let html = "";

  if (type === "booking_confirmed") {
    subject = `تأكيد الحجز - ${workshopTitle}`;
    html = `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #8B0000;">البوصلة 🧭</h1>
        <h2>تأكيد الحجز</h2>
        <p>تم تأكيد حجزك في <strong>${workshopTitle}</strong>.</p>
        <p>سنتواصل معك قريباً بتفاصيل الجلسة.</p>
        <hr />
        <p style="color: #666; font-size: 12px;">البوصلة — دليلك نحو النجاح</p>
      </div>
    `;
  } else if (type === "payment_approved") {
    subject = `تم تأكيد دفعتك - ${workshopTitle}`;
    html = `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #8B0000;">البوصلة 🧭</h1>
        <h2>تم تأكيد الدفع ✅</h2>
        <p>تم التحقق من دفعتك وتأكيد حجزك في <strong>${workshopTitle}</strong>.</p>
        <p>نتطلع إلى لقائك!</p>
        <hr />
        <p style="color: #666; font-size: 12px;">البوصلة — دليلك نحو النجاح</p>
      </div>
    `;
  } else if (type === "session_reminder") {
    subject = `تذكير - جلستك غداً: ${workshopTitle}`;
    html = `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #8B0000;">البوصلة 🧭</h1>
        <h2>تذكير بجلستك ⏰</h2>
        <p>جلستك في <strong>${workshopTitle}</strong> غداً.</p>
        <p>تأكد من الحضور في الوقت المحدد!</p>
        <hr />
        <p style="color: #666; font-size: 12px;">البوصلة — دليلك نحو النجاح</p>
      </div>
    `;
  } else {
    return NextResponse.json({ error: "Unknown email type" }, { status: 400 });
  }

  if (!userEmail) {
    return NextResponse.json({ error: "No user email" }, { status: 400 });
  }

  const resend = getResend();
  if (!resend) {
    return NextResponse.json({ ok: true, queued: true, note: "Resend not configured" });
  }

  try {
    await resend.emails.send({ from: fromEmail, to: userEmail, subject, html });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
