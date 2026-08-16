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
    .select("*, user:profiles(*), session:sessions(*, workshop:workshops(*)), payment:payments(amount, method, status)")
    .eq("id", booking_id)
    .single();

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const userEmail = (booking as { user?: { email?: string } }).user?.email;
  const userName = (booking as { user?: { full_name?: string } }).user?.full_name || userEmail || "عميل";
  const userPhone = (booking as { user?: { phone?: string } }).user?.phone || "-";
  const workshopTitle =
    (booking as { session?: { workshop?: { title_ar?: string } } }).session?.workshop?.title_ar || "الجلسة";
  const payment = (booking as { payment?: { amount?: number; method?: string } }).payment;
  const amountStr = payment?.amount != null ? `${payment.amount} ج.م` : "-";
  const methodStr = payment?.method === "vodafone_cash" ? "فودافون كاش" : payment?.method === "instapay" ? "إنستاباي" : payment?.method || "-";
  const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@albosla.com";

  // Admin notifications go to the admin inbox; user notifications go to the user.
  let recipient = userEmail;
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
        <p style="color: #666; font-size: 12px;">البوصلة: دليلك نحو النجاح</p>
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
        <p style="color: #666; font-size: 12px;">البوصلة: دليلك نحو النجاح</p>
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
        <p style="color: #666; font-size: 12px;">البوصلة: دليلك نحو النجاح</p>
      </div>
    `;
  } else if (type === "admin_new_payment") {
    // Notify the admin that a client submitted a payment awaiting review.
    recipient = process.env.ADMIN_EMAIL || "";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
    subject = `💰 دفعة جديدة تنتظر المراجعة: ${workshopTitle}`;
    html = `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #F59E0B;">البوصلة 🧭</h1>
        <h2>دفعة جديدة تحتاج مراجعة</h2>
        <p>قام عميل برفع إيصال دفع لحجز جديد:</p>
        <table style="border-collapse: collapse; width: 100%; font-size: 14px;">
          <tr><td style="padding:6px 0; color:#666;">العميل</td><td><strong>${userName}</strong></td></tr>
          <tr><td style="padding:6px 0; color:#666;">التواصل</td><td>${userEmail || "-"} · ${userPhone}</td></tr>
          <tr><td style="padding:6px 0; color:#666;">الورشة</td><td><strong>${workshopTitle}</strong></td></tr>
          <tr><td style="padding:6px 0; color:#666;">المبلغ</td><td><strong>${amountStr}</strong> عبر ${methodStr}</td></tr>
        </table>
        <p style="margin-top:16px;">
          <a href="${appUrl}/ar/admin/bookings" style="background:#F59E0B; color:#0f172a; padding:10px 18px; border-radius:8px; text-decoration:none; font-weight:bold;">راجِع الحجز وأكِّد الدفع ←</a>
        </p>
        <hr />
        <p style="color: #666; font-size: 12px;">البوصلة: إشعار إداري</p>
      </div>
    `;
  } else if (type === "activation") {
    const activationLink = body.activation_link;
    if (!activationLink) {
      return NextResponse.json({ error: "Missing activation_link" }, { status: 400 });
    }
    const { activationEmail: activationEmailFn } = await import("@/lib/email/templates");
    const emailData = { userName, activationLink };
    const result = activationEmailFn(emailData);
    subject = result.subject;
    html = result.html;
  } else if (type === "payment_reminder") {
    const { paymentReminderEmail: paymentReminderFn } = await import("@/lib/email/templates");
    const hoursRemaining = body.hours_remaining || 24;
    const amount = payment?.amount != null ? `${payment.amount} ج.م` : body.amount || "-";
    const emailData = { userName, workshopTitle, amount, hoursRemaining, appUrl: process.env.NEXT_PUBLIC_APP_URL };
    const result = paymentReminderFn(emailData);
    subject = result.subject;
    html = result.html;
  } else if (type === "payment_cancelled") {
    const { paymentCancelledEmail: paymentCancelledFn } = await import("@/lib/email/templates");
    const amount = payment?.amount != null ? `${payment.amount} ج.م` : body.amount || "-";
    const emailData = { userName, workshopTitle, amount, appUrl: process.env.NEXT_PUBLIC_APP_URL };
    const result = paymentCancelledFn(emailData);
    subject = result.subject;
    html = result.html;
  } else {
    return NextResponse.json({ error: "Unknown email type" }, { status: 400 });
  }

  if (!recipient) {
    return NextResponse.json(
      { ok: true, skipped: true, note: type === "admin_new_payment" ? "ADMIN_EMAIL not configured" : "No user email" }
    );
  }

  const resend = getResend();
  if (!resend) {
    return NextResponse.json({ ok: true, queued: true, note: "Resend not configured" });
  }

  try {
    await resend.emails.send({ from: fromEmail, to: recipient, subject, html });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
