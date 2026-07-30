import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import WorkshopCard from "@/components/workshops/WorkshopCard";
import VlogCard from "@/components/vlogs/VlogCard";
import type { Workshop, Vlog, Announcement } from "@/types/index";
import { getLocalizedField } from "@/lib/utils";
import { BookOpen, Users, Star, ChevronRight, Award } from "lucide-react";
import JourneyRoad from "@/components/home/JourneyRoad";
import CareerCompass from "@/components/home/CareerCompass";

export default async function HomePage() {
  const t = await getTranslations("home");
  const locale = await getLocale();
  const supabase = await createClient();

  const [{ data: workshops }, { data: vlogs }, { data: announcements }] =
    await Promise.all([
      supabase.from("workshops").select("*").limit(3),
      supabase.from("vlogs").select("*").order("created_at", { ascending: false }).limit(3),
      supabase
        .from("announcements")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false }),
    ]);

  const testimonials = [
    {
      name: "سارة أحمد",
      role: "مطورة برمجيات",
      text: "البوصلة غيّرت مسار حياتي المهنية بالكامل. الورش عملية ومفيدة جداً وأحسست إن عندي اتجاه واضح للأول مرة.",
      stars: 5,
      avatar: "سأ",
    },
    {
      name: "محمد علي",
      role: "رائد أعمال",
      text: "أحسن استثمار لنفسي. المنتور محترف جداً وبيفهم احتياجات كل شخص. ورشة بناء هوية العمل غيّرت كل حاجة.",
      stars: 5,
      avatar: "مع",
    },
    {
      name: "نور حسن",
      role: "مديرة مشاريع",
      text: "تجربة رائعة! تعلمت كيف أضع أهدافاً واقعية وأحققها خطوة بخطوة. الآن عندي خارطة طريق واضحة.",
      stars: 5,
      avatar: "نح",
    },
  ];

  const stats = [
    { valueAr: "٥٠٠+", valueEn: "500+", labelAr: "عميل راضٍ", labelEn: "Happy Clients", icon: Users },
    { valueAr: "٢٠+", valueEn: "20+", labelAr: "ورشة متخصصة", labelEn: "Workshops", icon: BookOpen },
    { valueAr: "٩٨٪", valueEn: "98%", labelAr: "نسبة الرضا", labelEn: "Satisfaction", icon: Star },
    { valueAr: "٥+", valueEn: "5+", labelAr: "سنوات خبرة", labelEn: "Years of Experience", icon: Award },
  ];

  const isRtl = locale === "ar";

  return (
    <div className="flex flex-col" style={{ background: "#0f172a" }}>
      {/* ── Announcement Banner ── */}
      {announcements && announcements.length > 0 && (
        <div className="bg-[#F59E0B] text-[#0f172a] text-sm text-center py-2.5 px-4 font-semibold">
          <span className="inline-flex items-center gap-2">
            <Star className="h-3.5 w-3.5 flex-shrink-0" />
            {getLocalizedField(announcements[0] as unknown as Record<string, unknown>, "body", locale)}
          </span>
        </div>
      )}

      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden bg-[#0f172a] flex items-center" style={{ minHeight: "auto" }}>
        {/* Star dots scattered */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-[8%] left-[12%] w-1 h-1 rounded-full bg-white/40" />
          <div className="absolute top-[15%] left-[35%] w-0.5 h-0.5 rounded-full bg-white/25" />
          <div className="absolute top-[22%] left-[65%] w-1 h-1 rounded-full bg-[#F59E0B]/60" />
          <div className="absolute top-[10%] left-[78%] w-0.5 h-0.5 rounded-full bg-white/30" />
          <div className="absolute top-[35%] left-[5%] w-0.5 h-0.5 rounded-full bg-white/20" />
          <div className="absolute top-[45%] left-[90%] w-1 h-1 rounded-full bg-white/35" />
          <div className="absolute top-[55%] left-[18%] w-0.5 h-0.5 rounded-full bg-[#F59E0B]/40" />
          <div className="absolute top-[60%] left-[72%] w-1 h-1 rounded-full bg-white/25" />
          <div className="absolute top-[70%] left-[42%] w-0.5 h-0.5 rounded-full bg-white/30" />
          <div className="absolute top-[80%] left-[85%] w-1 h-1 rounded-full bg-[#F59E0B]/50" />
          <div className="absolute top-[85%] left-[25%] w-0.5 h-0.5 rounded-full bg-white/20" />
          <div className="absolute top-[90%] left-[58%] w-0.5 h-0.5 rounded-full bg-white/35" />
          <div className="absolute top-[28%] left-[50%] w-1.5 h-1.5 rounded-full bg-white/15" />
          <div className="absolute top-[5%] left-[50%] w-0.5 h-0.5 rounded-full bg-[#F59E0B]/30" />
          <div className="absolute top-[40%] left-[30%] w-0.5 h-0.5 rounded-full bg-white/25" />
        </div>

        {/* Large compass SVG watermark — gold, 4% opacity */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ opacity: 0.04 }}
          aria-hidden="true"
        >
          <svg viewBox="0 0 400 400" className="w-[640px] h-[640px]" fill="#F59E0B">
            <circle cx="200" cy="200" r="190" fill="none" stroke="#F59E0B" strokeWidth="6" />
            <circle cx="200" cy="200" r="160" fill="none" stroke="#F59E0B" strokeWidth="2" />
            <circle cx="200" cy="200" r="10" fill="#F59E0B" />
            <polygon points="200,20 190,100 200,80 210,100" fill="#F59E0B" />
            <polygon points="200,380 190,300 200,320 210,300" fill="#F59E0B" />
            <polygon points="380,200 300,190 320,200 300,210" fill="#F59E0B" />
            <polygon points="20,200 100,190 80,200 100,210" fill="#F59E0B" />
            <line x1="200" y1="30" x2="200" y2="50" stroke="#F59E0B" strokeWidth="3" />
            <line x1="200" y1="350" x2="200" y2="370" stroke="#F59E0B" strokeWidth="3" />
            <line x1="30" y1="200" x2="50" y2="200" stroke="#F59E0B" strokeWidth="3" />
            <line x1="350" y1="200" x2="370" y2="200" stroke="#F59E0B" strokeWidth="3" />
          </svg>
        </div>

        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a] via-[#0f172a]/90 to-[#0d1526] pointer-events-none" />

        <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "clamp(4rem, 8vw, 6rem) 1.5rem", textAlign: "center" }} className="relative w-full">

          {/* Eyebrow — force centered with flex wrapper */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "2rem" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "6px 16px", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)", color: "#F59E0B", fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", borderRadius: "6px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#F59E0B", animation: "pulse 2s infinite", flexShrink: 0 }} />
              {isRtl ? "منصة التطوير الشخصي والمهني" : "Personal & Professional Development"}
            </div>
          </div>

          {/* Gold divider */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "2.5rem" }}>
            <div style={{ width: "48px", height: "2px", background: "#F59E0B", opacity: 0.6 }} />
          </div>

          {/* Headline */}
          <h1 style={{ fontSize: "clamp(2.8rem, 7vw, 5rem)", fontWeight: 900, lineHeight: 1.05, color: "white", marginBottom: "1.5rem" }}>
            {t("heroTitle")}
            <span
              style={{
                display: "block",
                marginTop: "0.5rem",
                background: "linear-gradient(135deg, #F59E0B 0%, #FBBF24 50%, #D97706 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {isRtl ? "البوصلة" : "The Compass"}
            </span>
          </h1>

          {/* Subtitle — force centered */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "3rem" }}>
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "1.1rem", lineHeight: 1.7, maxWidth: "38rem", textAlign: "center" }}>
              {t("heroSubtitle")}
            </p>
          </div>

          {/* CTAs */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem", justifyContent: "center", marginTop: "0.5rem" }}>
            <Link
              href={`/${locale}/auth`}
              className="inline-flex items-center justify-center px-10 py-4 bg-[#F59E0B] text-[#0f172a] font-black text-base hover:bg-[#FBBF24] transition-all duration-200 hover:-translate-y-0.5 shadow-[0_8px_24px_rgba(245,158,11,0.30)] hover:shadow-[0_14px_36px_rgba(245,158,11,0.45)]"
              style={{ borderRadius: "12px", minWidth: "196px" }}
            >
              {t("heroButton")}
            </Link>
            <Link
              href={`/${locale}/workshops`}
              className="inline-flex items-center justify-center px-10 py-4 text-[#F59E0B] font-semibold text-base hover:bg-[rgba(245,158,11,0.10)] border border-[rgba(245,158,11,0.35)] hover:border-[#F59E0B] transition-all duration-200 hover:-translate-y-0.5"
              style={{ borderRadius: "12px", minWidth: "196px" }}
            >
              {t("heroSecondaryButton")}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <section className="relative bg-[#0d1526] py-12 border-y border-[#F59E0B]/10 overflow-hidden">
        <div style={{maxWidth:"64rem",margin:"0 auto",padding:"0 1.5rem"}} className="relative">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4 divide-x-0 md:divide-x divide-[#F59E0B]/10 rtl:divide-x-reverse">
            {stats.map(({ valueAr, valueEn, labelAr, labelEn, icon: Icon }, i) => (
              <div key={i} className="flex flex-col items-center text-center group px-4">
                {/* Gold glass icon circle */}
                <div className="w-12 h-12 rounded-2xl bg-[rgba(245,158,11,0.12)] border border-[rgba(245,158,11,0.20)] flex items-center justify-center mb-4 group-hover:bg-[rgba(245,158,11,0.22)] transition-colors backdrop-blur-sm">
                  <Icon className="h-5 w-5 text-[#F59E0B]" />
                </div>
                {/* Gold number */}
                <div
                  className="text-5xl font-black mb-1 tabular-nums"
                  style={{
                    background: "linear-gradient(135deg, #F59E0B 0%, #FBBF24 60%, #D97706 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  {isRtl ? valueAr : valueEn}
                </div>
                <div className="text-sm font-medium text-white/50">
                  {isRtl ? labelAr : labelEn}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Career Compass self-assessment ── */}
      <CareerCompass />

      {/* ── How It Works — animated scroll journey ── */}
      <JourneyRoad isRtl={isRtl} />

      {/* ── Featured Workshops ── */}
      {workshops && workshops.length > 0 && (
        <section className="bg-[#0f172a]" style={{paddingTop:"4rem",paddingBottom:"4rem"}}>
          <div style={{maxWidth:"80rem",margin:"0 auto",padding:"0 1.5rem"}}>
            {/* Centered section header */}
            <div style={{ textAlign: "center", marginBottom: "3rem" }}>
              <div style={{display:"flex",justifyContent:"center",marginBottom:"1.25rem"}}><div style={{width:"40px",height:"3px",background:"#F59E0B",opacity:"0.65"}} /></div>
              <h2 className="text-3xl md:text-4xl font-black text-white" style={{ marginBottom: "0.85rem" }}>
                {t("featuredWorkshops")}
              </h2>
              <p className="text-white/45 text-base" style={{ maxWidth: "40rem", margin: "0 auto" }}>
                {isRtl ? "اختر الورشة المناسبة لرحلتك" : "Choose the workshop that fits your journey"}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
              {(workshops as Workshop[]).map((workshop) => (
                <WorkshopCard key={workshop.id} workshop={workshop} />
              ))}
            </div>

            <div className="flex justify-center" style={{ marginTop: "2.5rem" }}>
              <Link
                href={`/${locale}/workshops`}
                className="inline-flex items-center justify-center gap-2 font-bold transition-all duration-200 hover:-translate-y-0.5 hover:bg-[rgba(245,158,11,0.08)]" style={{padding:"13px 38px",borderRadius:"12px",border:"1.5px solid rgba(245,158,11,0.4)",color:"#F59E0B",fontSize:"0.9rem"}}
              >
                {t("viewAll")}
                <ChevronRight className={`h-4 w-4 ${isRtl ? "rotate-180" : ""}`} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Testimonials ── */}
      <section className="bg-[#0f172a]" style={{paddingTop:"4rem",paddingBottom:"4rem"}}>
        <div style={{maxWidth:"80rem",margin:"0 auto",padding:"0 1.5rem"}}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <div style={{display:"flex",justifyContent:"center",marginBottom:"1.5rem"}}><div style={{width:"40px",height:"3px",background:"#F59E0B",opacity:"0.65"}} /></div>
            <h2 className="text-3xl md:text-4xl font-black text-white" style={{ marginBottom: "0.85rem" }}>
              {t("testimonials")}
            </h2>
            <p className="text-white/50 text-base" style={{ maxWidth: "40rem", margin: "0 auto" }}>
              {t("testimonialsSubtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
            {testimonials.map((item) => (
              <div
                key={item.name}
                className="rounded-2xl border-s-4 border-[#F59E0B] p-7 hover:-translate-y-1 hover:shadow-[0_16px_48px_rgba(0,0,0,0.50)] transition-all duration-300 group"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  backdropFilter: "blur(12px)",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.30)",
                }}
              >
                {/* Quote mark */}
                <div className="text-5xl font-black text-[#F59E0B]/25 leading-none mb-4 font-serif select-none" aria-hidden="true">
                  &ldquo;
                </div>

                {/* Stars */}
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: item.stars }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-[#F59E0B] fill-[#F59E0B]" />
                  ))}
                </div>

                <p className="text-white/70 text-sm leading-relaxed mb-6">
                  {item.text}
                </p>

                <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-[#F59E0B] font-bold text-sm flex-shrink-0" style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)" }}>
                    {item.avatar}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white">{item.name}</div>
                    <div className="text-xs text-white/45">{item.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Latest Vlogs ── */}
      {vlogs && vlogs.length > 0 && (
        <section className="bg-[#0d1526]" style={{paddingTop:"4rem",paddingBottom:"4rem"}}>
          <div style={{maxWidth:"80rem",margin:"0 auto",padding:"0 1.5rem"}}>
            {/* Centered section header */}
            <div style={{ textAlign: "center", marginBottom: "3rem" }}>
              <div style={{display:"flex",justifyContent:"center",marginBottom:"1.25rem"}}><div style={{width:"40px",height:"3px",background:"#F59E0B",opacity:"0.65"}} /></div>
              <h2 className="text-3xl md:text-4xl font-black text-white" style={{ marginBottom: "0.85rem" }}>
                {t("latestVlogs")}
              </h2>
              <p className="text-white/45 text-base" style={{ maxWidth: "40rem", margin: "0 auto" }}>
                {isRtl ? "محتوى مرئي لإلهامك وتوجيهك" : "Video content to inspire and guide you"}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
              {(vlogs as Vlog[]).map((vlog) => (
                <VlogCard key={vlog.id} vlog={vlog} />
              ))}
            </div>

            <div className="flex justify-center" style={{ marginTop: "2.5rem" }}>
              <Link
                href={`/${locale}/vlogs`}
                className="inline-flex items-center justify-center gap-2 font-bold transition-all duration-200 hover:-translate-y-0.5 hover:bg-[rgba(245,158,11,0.08)]" style={{padding:"13px 38px",borderRadius:"12px",border:"1.5px solid rgba(245,158,11,0.4)",color:"#F59E0B",fontSize:"0.9rem"}}
              >
                {t("viewAll")}
                <ChevronRight className={`h-4 w-4 ${isRtl ? "rotate-180" : ""}`} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── CTA Band ── */}
      <section className="relative bg-[#0f172a] overflow-hidden" style={{paddingTop:"4.5rem",paddingBottom:"4.5rem"}}>
        {/* Compass watermark */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ opacity: 0.04 }}
          aria-hidden="true"
        >
          <svg viewBox="0 0 400 400" className="w-[700px] h-[700px]" fill="#F59E0B">
            <circle cx="200" cy="200" r="190" fill="none" stroke="#F59E0B" strokeWidth="5" />
            <circle cx="200" cy="200" r="155" fill="none" stroke="#F59E0B" strokeWidth="2" />
            <circle cx="200" cy="200" r="12" fill="#F59E0B" />
            <polygon points="200,15 188,110 200,85 212,110" fill="#F59E0B" />
            <polygon points="200,385 188,290 200,315 212,290" fill="#F59E0B" />
            <polygon points="385,200 290,188 315,200 290,212" fill="#F59E0B" />
            <polygon points="15,200 110,188 85,200 110,212" fill="#F59E0B" />
            <line x1="200" y1="40" x2="200" y2="55" stroke="#F59E0B" strokeWidth="3" />
            <line x1="200" y1="345" x2="200" y2="360" stroke="#F59E0B" strokeWidth="3" />
            <line x1="40" y1="200" x2="55" y2="200" stroke="#F59E0B" strokeWidth="3" />
            <line x1="345" y1="200" x2="360" y2="200" stroke="#F59E0B" strokeWidth="3" />
          </svg>
        </div>

        {/* Star dots */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-[15%] left-[10%] w-1 h-1 rounded-full bg-white/30" />
          <div className="absolute top-[25%] left-[80%] w-0.5 h-0.5 rounded-full bg-[#F59E0B]/40" />
          <div className="absolute top-[70%] left-[15%] w-0.5 h-0.5 rounded-full bg-white/20" />
          <div className="absolute top-[80%] left-[88%] w-1 h-1 rounded-full bg-white/25" />
        </div>

        <div style={{maxWidth:"48rem",margin:"0 auto",padding:"0 1.5rem",textAlign:"center"}} className="relative">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F59E0B]/10 text-[#F59E0B] text-sm font-medium border border-[#F59E0B]/20" style={{ marginBottom: "1.75rem" }}>
            {isRtl ? "ابدأ رحلتك اليوم" : "Start Your Journey Today"}
          </div>

          {/* Gold divider */}
          <div style={{display:"flex",justifyContent:"center",marginBottom:"2rem"}}><div style={{width:"48px",height:"3px",background:"#F59E0B",opacity:"0.7"}} /></div>

          <h2 className="text-3xl md:text-5xl font-black text-white leading-tight" style={{ marginBottom: "1.15rem" }}>
            {isRtl ? "أنت على بُعد خطوة من التغيير" : "You're One Step From Change"}
          </h2>
          <p className="text-white/55 text-lg" style={{ maxWidth: "36rem", margin: "0 auto 2.75rem" }}>
            {isRtl
              ? "انضم لمئات العملاء الذين غيّروا مساراتهم مع البوصلة"
              : "Join hundreds of clients who transformed their paths with The Compass"}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href={`/${locale}/auth`}
              className="inline-flex items-center justify-center px-10 py-4 bg-[#F59E0B] text-[#0f172a] font-black text-base hover:bg-[#FBBF24] transition-all duration-200 hover:-translate-y-0.5 shadow-[0_8px_24px_rgba(245,158,11,0.30)] hover:shadow-[0_14px_36px_rgba(245,158,11,0.45)]"
              style={{ borderRadius: "12px", minWidth: "196px" }}
            >
              {isRtl ? "سجّل الآن مجاناً" : "Sign Up Free"}
            </Link>
            <Link
              href={`/${locale}/workshops`}
              className="inline-flex items-center justify-center px-10 py-4 text-[#F59E0B] font-semibold text-base hover:bg-[rgba(245,158,11,0.10)] border border-[rgba(245,158,11,0.35)] hover:border-[#F59E0B] transition-all duration-200 hover:-translate-y-0.5"
              style={{ borderRadius: "12px", minWidth: "196px" }}
            >
              {isRtl ? "استعرض الورش" : "Browse Workshops"}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
