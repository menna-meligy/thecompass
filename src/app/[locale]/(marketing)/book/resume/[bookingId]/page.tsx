import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import BookingFlow from "@/components/booking/BookingFlow";
import { isOfferingType, offeringKey, offeringTitle, priceFor } from "@/lib/offerings";
import { formatISODate, isPastSlot, normaliseDate, shortTime, slotStartsAtISO } from "@/lib/schedule-dates";
import { Calendar, Clock } from "lucide-react";

/**
 * Finish paying for a booking you already started.
 *
 * Without this, walking away from the payment screen was terminal — the
 * dashboard counted down 24 hours at the client with nothing to click, and
 * booking again would have created a duplicate.
 */
export default async function ResumeBookingPage(props: {
  params: Promise<{ bookingId: string; locale: string }>;
}) {
  const { bookingId } = await props.params;
  const locale = await getLocale();
  const isAr = locale === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth?redirect=/${locale}/book/resume/${bookingId}`);

  const admin = await createAdminClient();
  const { data } = await admin
    .from("bookings")
    .select(
      `id, user_id, status, payment_deadline, offering_type, workshop_id, slot_id,
       workshop:workshops(id, title_ar, title_en),
       slot:availability_slots(id, date, start_time, end_time),
       payment:payments(id, status, amount, proof_url, receipt_validation_status, created_at)`,
    )
    .eq("id", bookingId)
    .maybeSingle();

  const booking = data as any;

  function Problem({ title, body }: { title: string; body: string }) {
    return (
      <div className="min-h-screen bg-[#0f172a] p-6" dir={isAr ? "rtl" : "ltr"}>
        <div className="max-w-xl mx-auto mt-16 bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.15)] rounded-2xl p-8 text-center">
          <h1 className="text-xl font-black text-white mb-2">{title}</h1>
          <p className="text-white/60 mb-6">{body}</p>
          <Link
            href={`/${locale}/dashboard/bookings`}
            className="inline-block px-5 py-3 rounded-lg bg-[#F59E0B] text-[#0f172a] font-bold"
          >
            {t("رجوع لحجوزاتي", "Back to my bookings")}
          </Link>
        </div>
      </div>
    );
  }

  if (!booking || booking.user_id !== user.id) {
    return (
      <Problem
        title={t("الحجز ده مش موجود", "We couldn't find that booking")}
        body={t("يمكن يكون اتلغى أو بتاع حساب تاني.", "It may have been cancelled, or it belongs to another account.")}
      />
    );
  }

  const payments = Array.isArray(booking.payment) ? booking.payment : booking.payment ? [booking.payment] : [];
  const payment = [...payments].sort(
    (a, z) => new Date(z.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
  )[0];

  if (booking.status === "cancelled") {
    return (
      <Problem
        title={t("الحجز ده اتلغى", "This booking was cancelled")}
        body={t("اختار موعد جديد من صفحة الحجز.", "Pick a new time from the booking page.")}
      />
    );
  }

  if (payment?.status === "paid" || booking.status === "confirmed") {
    return (
      <Problem
        title={t("الحجز ده متأكد ✅", "This booking is confirmed ✅")}
        body={t("مفيش حاجة مطلوبة منك.", "There's nothing left for you to do.")}
      />
    );
  }

  if (payment?.proof_url && payment?.receipt_validation_status !== "needs_review") {
    return (
      <Problem
        title={t("إيصالك تحت المراجعة ⏳", "Your receipt is being reviewed ⏳")}
        body={t(
          "استلمنا الإيصال والفريق بيراجعه. هيوصلك إيميل أول ما يتأكد.",
          "We have your receipt and the team is checking it. You'll get an email once it's confirmed.",
        )}
      />
    );
  }

  const slot = booking.slot;
  if (!slot) {
    return (
      <Problem
        title={t("الحجز ده مش مربوط بموعد", "This booking has no time attached")}
        body={t("كلّمنا عشان نظبطه.", "Please contact us so we can sort it out.")}
      />
    );
  }

  if (isPastSlot(slot.date, slot.start_time)) {
    return (
      <Problem
        title={t("الموعد ده عدّى", "That time has passed")}
        body={t("اختار موعد جديد من صفحة الحجز.", "Pick a new time from the booking page.")}
      />
    );
  }

  const offeringType = isOfferingType(booking.offering_type) ? booking.offering_type : "career";
  const title = offeringTitle(offeringType, booking.workshop, isAr);
  const price = Number(payment?.amount ?? priceFor(offeringType));
  const date = normaliseDate(slot.date);

  return (
    <div className="min-h-screen bg-[#0f172a] p-4 md:p-6">
      <div className="max-w-2xl mx-auto" dir={isAr ? "rtl" : "ltr"}>
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-black text-white mb-2">
            {t("كمّل دفع حجزك", "Finish paying for your booking")}
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-white/55 text-sm">
            <span>{title}</span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {formatISODate(date, isAr)}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {shortTime(slot.start_time)}–{shortTime(slot.end_time)}
            </span>
          </div>
        </div>

        {payment?.receipt_validation_status === "needs_review" && (
          <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-sm text-white/75 leading-relaxed">
            <p className="font-bold text-[#F59E0B] mb-1">
              {t("إيصالك عند الفريق بيراجعوه", "Your receipt is with the team")}
            </p>
            {t(
              "لو عايز تستعجل، ارفع صورة أوضح من هنا.",
              "To speed it up, you can upload a clearer photo here.",
            )}
          </div>
        )}

        <BookingFlow
          sessionId={slot.id}
          offering={offeringKey(offeringType, booking.workshop_id)}
          workshopTitle={title}
          price={price}
          userId={user.id}
          sessionStartsAt={slotStartsAtISO(date, slot.start_time)}
          sessionEndsAt={slotStartsAtISO(date, slot.end_time)}
          resumeBookingId={booking.id}
          resumeDeadline={booking.payment_deadline}
        />
      </div>
    </div>
  );
}
