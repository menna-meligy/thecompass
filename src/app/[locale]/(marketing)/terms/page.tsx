import { getLocale } from "next-intl/server";

export default async function TermsPage() {
  const locale = await getLocale();
  const isAr = locale === "ar";

  const sections = isAr
    ? [
        { h: "استخدام المنصة", p: "باستخدامك للبوصلة، إنت موافق إنك تستخدم الخدمة لأغراض شخصية ومشروعة، وإن البيانات اللي بتدخلها صحيحة." },
        { h: "الحجوزات والدفع", p: "الحجز بيتأكد بعد ما تحوّل المبلغ وترفع صورة الإيصال، ومراجعة الإدارة ليه. الأسعار معروضة على المنصة وممكن تتغير." },
        { h: "الإلغاء والاسترجاع", p: "لو حبيت تلغي حجز، تواصل معانا قبل موعد الجلسة بوقت كافي. سياسة الاسترجاع بتختلف حسب نوع الجلسة أو الورشة." },
        { h: "المحتوى", p: "كل المحتوى على المنصة ملك للبوصلة، ومش مسموح بإعادة نشره من غير إذن." },
        { h: "تعديلات", p: "ممكن نحدّث الشروط دي من وقت للتاني، وهنعرض أي تغييرات على الصفحة دي." },
      ]
    : [
        { h: "Using the platform", p: "By using The Compass, you agree to use the service for lawful, personal purposes and to provide accurate information." },
        { h: "Bookings & payment", p: "A booking is confirmed after you transfer the amount, upload the receipt, and it is reviewed. Prices are shown on the platform and may change." },
        { h: "Cancellation & refunds", p: "To cancel a booking, contact us well before the session time. Refund policy varies by session or workshop type." },
        { h: "Content", p: "All content on the platform belongs to The Compass and may not be redistributed without permission." },
        { h: "Changes", p: "We may update these terms from time to time; any changes will be posted on this page." },
      ];

  return (
    <div className="bg-[#0f172a] min-h-screen">
      <div style={{ maxWidth: "48rem", margin: "0 auto", padding: "3rem 1.5rem 4rem" }}>
        <div style={{ width: "40px", height: "3px", background: "#F59E0B", opacity: 0.7, marginBottom: "1.25rem" }} />
        <h1 className="text-3xl md:text-4xl font-black text-white mb-3">
          {isAr ? "شروط الاستخدام" : "Terms of Use"}
        </h1>
        <p className="text-white/40 text-sm mb-10">
          {isAr ? "الشروط اللي بتنظّم استخدامك للبوصلة." : "The terms that govern your use of The Compass."}
        </p>
        <div className="space-y-8">
          {sections.map((s, i) => (
            <section key={i}>
              <h2 className="text-white font-bold text-lg mb-2">{s.h}</h2>
              <p className="text-white/55 text-sm leading-relaxed">{s.p}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
