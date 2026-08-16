import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { CheckCircle, Clock } from "lucide-react";
import PaymentCountdownTimer from "@/components/booking/PaymentCountdownTimer";

interface SearchParams {
  deadline?: string;
}

export default async function BookingConfirmationPage(props: { searchParams: Promise<SearchParams> }) {
  const t = await getTranslations("booking");
  const locale = await getLocale();
  const searchParams = await props.searchParams;

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-[#0f172a] px-4">
      <div className="w-full max-w-md">
        {/* Success circle */}
        <div className="bg-[rgba(34,197,94,0.12)] border border-[rgba(34,197,94,0.25)] w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8">
          <CheckCircle className="h-12 w-12 text-green-400" />
        </div>

        <h1 className="text-3xl font-black text-white mb-3 text-center">{t("confirmation")}</h1>
        <p className="text-white/50 mb-8 text-sm leading-relaxed text-center">{t("confirmationMessage")}</p>

        {/* Payment deadline timer */}
        {searchParams.deadline && (
          <div className="mb-8">
            <PaymentCountdownTimer paymentDeadline={searchParams.deadline} />
          </div>
        )}

        {/* Info box */}
        <div className="bg-amber-500/10 border border-amber-500/25 rounded-lg p-4 mb-8 flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-white/70">
            <p className="font-semibold text-amber-500 mb-1">
              {locale === "ar" ? "⏳ لديك 24 ساعة لاستكمال الدفع" : "⏳ You have 24 hours to complete payment"}
            </p>
            <p className="text-xs">
              {locale === "ar"
                ? "إذا لم تكمل الدفع في الوقت المحدد، سيتم إلغاء حجزك تلقائياً"
                : "If payment is not completed in time, your booking will be automatically cancelled"}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href={`/${locale}/dashboard/bookings`}
            className="bg-[#F59E0B] text-[#0f172a] font-bold px-6 py-3 rounded-xl hover:bg-[#FCD34D] transition-colors text-sm text-center"
          >
            {locale === "ar" ? "استكمل الدفع" : "Complete Payment"}
          </Link>
          <Link
            href={`/${locale}/workshops`}
            className="bg-transparent border border-[rgba(245,158,11,0.35)] text-[#F59E0B] font-semibold px-6 py-3 rounded-xl hover:bg-[rgba(245,158,11,0.08)] transition-colors text-sm text-center"
          >
            {t("backToWorkshops")}
          </Link>
        </div>
      </div>
    </div>
  );
}
