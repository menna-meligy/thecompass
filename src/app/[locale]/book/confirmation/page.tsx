import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { CheckCircle } from "lucide-react";

export default async function BookingConfirmationPage() {
  const t = await getTranslations("booking");
  const locale = await getLocale();

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-[#0f172a] px-4">
      <div className="text-center max-w-md">
        {/* Success circle */}
        <div className="bg-[rgba(34,197,94,0.12)] border border-[rgba(34,197,94,0.25)] w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8">
          <CheckCircle className="h-12 w-12 text-green-400" />
        </div>

        <h1 className="text-3xl font-black text-white mb-3">{t("confirmation")}</h1>
        <p className="text-white/50 mb-10 text-sm leading-relaxed">{t("confirmationMessage")}</p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href={`/${locale}/dashboard`}
            className="bg-[#F59E0B] text-[#0f172a] font-bold px-6 py-3 rounded-xl hover:bg-[#FCD34D] transition-colors text-sm"
          >
            {locale === "ar" ? "لوحة التحكم" : "My Dashboard"}
          </Link>
          <Link
            href={`/${locale}/workshops`}
            className="bg-transparent border border-[rgba(245,158,11,0.35)] text-[#F59E0B] font-semibold px-6 py-3 rounded-xl hover:bg-[rgba(245,158,11,0.08)] transition-colors text-sm"
          >
            {t("backToWorkshops")}
          </Link>
        </div>
      </div>
    </div>
  );
}
