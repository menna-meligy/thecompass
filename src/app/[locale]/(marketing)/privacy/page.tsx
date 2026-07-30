import { getLocale } from "next-intl/server";

export default async function PrivacyPage() {
  const locale = await getLocale();
  const isAr = locale === "ar";

  const sections = isAr
    ? [
        { h: "البيانات اللي بنجمعها", p: "بنجمع البيانات اللي بتدخلها بنفسك زي الاسم والإيميل ورقم التليفون وبيانات الحجز، بالإضافة لبيانات الاستخدام الأساسية عشان نحسّن الخدمة." },
        { h: "إزاي بنستخدم بياناتك", p: "بنستخدم بياناتك عشان نأكد حجوزاتك، نتواصل معاك بخصوص جلساتك، ونحسّن تجربتك على المنصة. مابنبيعش بياناتك لأي طرف تاني." },
        { h: "الدفع", p: "التحويلات بتتم يدويًا عن طريق إنستاباي أو فودافون كاش. إحنا مابنخزنش أي بيانات بطاقات بنكية." },
        { h: "حقوقك", p: "تقدر في أي وقت تطلب تعديل أو حذف بياناتك عن طريق التواصل معانا." },
        { h: "التواصل", p: "لأي استفسار بخصوص الخصوصية، تواصل معانا من صفحة التواصل." },
      ]
    : [
        { h: "Data we collect", p: "We collect the information you provide (name, email, phone, and booking details) plus basic usage data to improve the service." },
        { h: "How we use your data", p: "We use your data to confirm bookings, communicate about your sessions, and improve your experience. We never sell your data." },
        { h: "Payments", p: "Transfers are made manually via InstaPay or Vodafone Cash. We do not store any bank card details." },
        { h: "Your rights", p: "You may request correction or deletion of your data at any time by contacting us." },
        { h: "Contact", p: "For any privacy questions, reach out via our contact page." },
      ];

  return (
    <div className="bg-[#0f172a] min-h-screen">
      <div style={{ maxWidth: "48rem", margin: "0 auto", padding: "3rem 1.5rem 4rem" }}>
        <div style={{ width: "40px", height: "3px", background: "#F59E0B", opacity: 0.7, marginBottom: "1.25rem" }} />
        <h1 className="text-3xl md:text-4xl font-black text-white mb-3">
          {isAr ? "سياسة الخصوصية" : "Privacy Policy"}
        </h1>
        <p className="text-white/40 text-sm mb-10">
          {isAr ? "بنحترم خصوصيتك، ودي نظرة سريعة على إزاي بنتعامل مع بياناتك." : "We respect your privacy. Here is how we handle your data."}
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
