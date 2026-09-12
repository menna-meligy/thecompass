import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  try {
    // 1. Find pending bookings that need payment reminder (within 24 hours, not yet reminded in last 12 hours)
    const now = new Date();
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);

    const { data: pendingBookings } = await supabase
      .from("bookings")
      .select(`
        id,
        user_id,
        payment_deadline,
        session:sessions(
          id,
          workshop:workshops(title_ar, title_en)
        ),
        payment:payments(amount)
      `)
      .eq("status", "pending")
      .not("payment_deadline", "is", null)
      .gt("payment_deadline", now.toISOString())
      .order("payment_deadline", { ascending: true });

    // 2. Get user details for reminder emails
    if (pendingBookings && pendingBookings.length > 0) {
      for (const booking of pendingBookings) {
        try {
          const { data: user } = await supabase
            .from("profiles")
            .select("email, full_name")
            .eq("id", booking.user_id)
            .single();

          if (!user?.email) continue;

          const deadline = new Date(booking.payment_deadline);
          const hoursRemaining = Math.ceil(
            (deadline.getTime() - now.getTime()) / (60 * 60 * 1000)
          );

          const workshopTitle =
            booking.session?.workshop?.title_ar ||
            "جلسة";
          const paymentArray = booking.payment as any[];
          const payment = Array.isArray(paymentArray) ? paymentArray[0] : paymentArray;
          const amount = payment?.amount || 0;

          // Send reminder email
          await resend.emails.send({
            from: "البوصلة <noreply@albosla.vercel.app>",
            to: user.email,
            subject: `⏰ تذكير: استكمل دفعتك لتأكيد جلستك — ${workshopTitle}`,
            html: `
              <div style="direction: rtl; font-family: Arial, sans-serif; background: #0f172a; color: white; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; background: rgba(30,41,59,0.6); border-radius: 12px; padding: 30px;">
                  <h2 style="color: #F59E0B; margin: 0 0 20px;">تذكير بالدفع ⏰</h2>
                  <p style="line-height: 1.7; margin: 0 0 12px;">أهلاً ${user.full_name}،</p>
                  <p style="line-height: 1.7; margin: 0 0 12px;">
                    اخترت جلسة في <strong style="color: #F59E0B;">${workshopTitle}</strong> بقيمة <strong style="color: #F59E0B;">${amount} ج</strong>، لكن لما تكملش الدفع فيها بعد!
                  </p>
                  <p style="line-height: 1.7; margin: 0 0 12px; color: #fca5a5;">
                    ⏳ عندك <strong style="color: #fca5a5;">${hoursRemaining} ساعات</strong> عشان تكمل الدفع وإلا هنلغي حجزك!
                  </p>
                  <div style="background: rgba(245,158,11,0.1); border-right: 3px solid #F59E0B; padding: 12px 16px; margin: 14px 0; border-radius: 4px;">
                    <p style="color: #F59E0B; margin: 0; font-weight: bold;">💡 استكمل الدفع دلوقتي عشان ما تخسر مكانك</p>
                  </div>
                  <a href="${process.env.NEXT_PUBLIC_APP_URL}/ar/dashboard/bookings" style="display: inline-block; background: #F59E0B; color: #0f172a; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 20px;">استكمل الدفع</a>
                  <p style="margin-top: 30px; color: rgba(255,255,255,0.4); font-size: 12px;">
                    هذا بريد تلقائي، من فضلك لا ترد عليه.
                  </p>
                </div>
              </div>
            `,
          });
        } catch (emailError) {
          console.error(
            `Failed to send reminder for booking ${booking.id}:`,
            emailError
          );
        }
      }
    }

    // 3. Find expired bookings (payment deadline has passed) and cancel them
    const { data: expiredBookings } = await supabase
      .from("bookings")
      .select(`
        id,
        user_id,
        payment_deadline,
        session:sessions(
          workshop:workshops(title_ar, title_en)
        ),
        payment:payments(amount)
      `)
      .eq("status", "pending")
      .not("payment_deadline", "is", null)
      .lt("payment_deadline", now.toISOString());

    if (expiredBookings && expiredBookings.length > 0) {
      for (const booking of expiredBookings) {
        try {
          // Update booking status to cancelled
          await supabase
            .from("bookings")
            .update({ status: "cancelled" })
            .eq("id", booking.id);

          // Update payment status to failed
          await supabase
            .from("payments")
            .update({ status: "failed" })
            .eq("booking_id", booking.id);

          // Get user details for cancellation email
          const { data: user } = await supabase
            .from("profiles")
            .select("email, full_name")
            .eq("id", booking.user_id)
            .single();

          if (user?.email) {
            const workshopTitle =
              booking.session?.workshop?.title_ar ||
              "جلسة";

            // Send cancellation email
            await resend.emails.send({
              from: "البوصلة <noreply@albosla.vercel.app>",
              to: user.email,
              subject: `❌ تم إلغاء حجزك — لم تكمل الدفع في الوقت المحدد`,
              html: `
                <div style="direction: rtl; font-family: Arial, sans-serif; background: #0f172a; color: white; padding: 20px;">
                  <div style="max-width: 600px; margin: 0 auto; background: rgba(30,41,59,0.6); border-radius: 12px; padding: 30px;">
                    <h2 style="color: #fca5a5; margin: 0 0 20px;">تم إلغاء الحجز ❌</h2>
                    <p style="line-height: 1.7; margin: 0 0 12px;">أهلاً ${user.full_name}،</p>
                    <p style="line-height: 1.7; margin: 0 0 12px;">
                      نأسف، لكن حجزك في <strong>${workshopTitle}</strong> تم إلغاؤه لأنك ما أكملتش الدفع في الوقت المحدد.
                    </p>
                    <p style="line-height: 1.7; margin: 0 0 12px;">
                      لو بتفكر تحجز مرة ثانية، اضغط الزرار تحت وختار جلسة جديدة. 💪
                    </p>
                    <a href="${process.env.NEXT_PUBLIC_APP_URL}/ar/book/general" style="display: inline-block; background: #F59E0B; color: #0f172a; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 20px;">اختر جلسة جديدة</a>
                    <p style="margin-top: 30px; color: rgba(255,255,255,0.4); font-size: 12px;">
                      هذا بريد تلقائي، من فضلك لا ترد عليه.
                    </p>
                  </div>
                </div>
              `,
            });
          }
        } catch (error) {
          console.error(
            `Failed to cancel booking ${booking.id}:`,
            error
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      reminders_sent: pendingBookings?.length || 0,
      bookings_cancelled: expiredBookings?.length || 0,
    });
  } catch (error) {
    console.error("Payment reminders job failed:", error);
    return NextResponse.json(
      { error: "Failed to process payment reminders" },
      { status: 500 }
    );
  }
}
