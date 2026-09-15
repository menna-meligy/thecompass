"use client";

import { useLocale } from "next-intl";
import OfferingCalendar from "@/components/booking/OfferingCalendar";
import { CAREER_KEY, CAREER_TITLE_AR, CAREER_TITLE_EN, OFFERING_PRICE } from "@/lib/offerings";

/**
 * Booking the Self Awareness & Career Direction session. Uses the exact same calendar and payment
 * flow as the three workshops — there is only one booking path in this product.
 */
export default function CareerSessionBookingPage() {
  const locale = useLocale();
  const isAr = locale === "ar";
  const title = isAr ? CAREER_TITLE_AR : CAREER_TITLE_EN;

  const benefits = isAr
    ? [
        { h: "افهم نفسك", p: "اكتشف نقاط قوتك وضعفك وإيه اللي بيحفزك فعلاً" },
        { h: "خطّط مسارك", p: "حدّد أهدافك والطريقة اللي توصلك ليها" },
        { h: "اتحرك بثقة", p: "من الفهم للتحرك الفعلي في كل جلسة" },
      ]
    : [
        { h: "Understand yourself", p: "Find your strengths, your gaps, and what actually drives you" },
        { h: "Map your path", p: "Set the goal and the route that gets you there" },
        { h: "Move with confidence", p: "Every session turns insight into a concrete next step" },
      ];

  return (
    <div className="min-h-screen bg-[#0f172a] p-4 md:p-6">
      <div className="max-w-3xl mx-auto" dir={isAr ? "rtl" : "ltr"}>
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-black text-white mb-2">
            {isAr ? "🧭 تعرّف على نفسك" : "🧭 Find your direction"}
          </h1>
          <p className="text-white/50 text-sm">{title}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
          {benefits.map((b) => (
            <div
              key={b.h}
              className="p-4 bg-white/5 border border-white/10 rounded-lg hover:border-amber-500/30 transition"
            >
              <p className="text-amber-300 font-bold mb-2">{b.h}</p>
              <p className="text-white/70 text-sm">{b.p}</p>
            </div>
          ))}
        </div>

        <OfferingCalendar
          offering={CAREER_KEY}
          title={title}
          price={OFFERING_PRICE.career}
          isAr={isAr}
        />
      </div>
    </div>
  );
}
