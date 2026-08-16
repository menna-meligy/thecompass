import { notFound } from "next/navigation";
import Link from "next/link";
import { getLocale } from "next-intl/server";
import { getArticle } from "@/content/articles";
import ContentGraphic, { StatBadge } from "@/components/content/ContentGraphic";
import { ArrowLeft, ArrowRight, Clock, Calendar, FlaskConical, Check, Sparkles } from "lucide-react";

export default async function ArticlePage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();
  const isRtl = locale === "ar";
  const article = getArticle(slug);
  if (!article) notFound();

  const t = (ar: string, en: string) => (isRtl ? ar : en);
  const Arrow = isRtl ? ArrowRight : ArrowLeft;
  const title = isRtl ? article.title_ar : article.title_en;
  const hook = isRtl ? article.hook_ar : article.hook_en;
  const takeaways = isRtl ? article.takeaway_ar : article.takeaway_en;
  const dateStr = new Date(article.date).toLocaleDateString(isRtl ? "ar-EG" : "en-US", { year: "numeric", month: "long", day: "numeric" });
  const align = isRtl ? "right" : "left";

  return (
    <div className="min-h-screen" style={{ background: "#0f172a" }}>
      {/* ── Hero ── */}
      <div style={{ position: "relative", height: "clamp(220px, 34vw, 340px)", overflow: "hidden" }}>
        <ContentGraphic motif={article.heroMotif} variant="hero" />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, #0f172a 4%, rgba(15,23,42,0.55) 45%, transparent 80%)" }} />
        <div style={{ position: "absolute", insetInlineStart: 0, insetInlineEnd: 0, bottom: 0, maxWidth: "46rem", margin: "0 auto", padding: "0 1.5rem 1.75rem", textAlign: align }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: `${article.accent}22`, border: `1px solid ${article.accent}55`, color: article.accent, fontSize: "0.68rem", fontWeight: 800, padding: "5px 12px", borderRadius: "6px", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
            <Sparkles style={{ width: "12px", height: "12px" }} />
            {t("مقال", "Article")}
          </span>
          <h1 style={{ color: "#fff", fontWeight: 900, fontSize: "clamp(1.6rem, 4.5vw, 2.5rem)", lineHeight: 1.2 }}>{title}</h1>
        </div>
      </div>

      <article style={{ maxWidth: "46rem", margin: "0 auto", padding: "0 1.5rem 4rem", textAlign: align }}>
        {/* back + meta */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", padding: "20px 0", borderBottom: "1px solid rgba(245,158,11,0.12)" }}>
          <Link href={`/${locale}/vlogs`} style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", fontWeight: 700, textDecoration: "none" }}>
            <Arrow style={{ width: "15px", height: "15px" }} />
            {t("كل المقالات", "All articles")}
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", color: "rgba(255,255,255,0.4)", fontSize: "0.78rem", fontWeight: 600 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}><Calendar style={{ width: "13px", height: "13px" }} />{dateStr}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}><Clock style={{ width: "13px", height: "13px" }} />{article.readMinutes} {t("دقايق قراية", "min read")}</span>
          </div>
        </div>

        {/* hook / lead */}
        <div style={{ padding: "26px 0 6px" }}>
          {hook.map((p, i) => (
            <p key={i} style={{ color: "rgba(255,255,255,0.82)", fontSize: "1.12rem", lineHeight: 1.95, marginBottom: "16px", fontWeight: i === 0 ? 600 : 400 }}>{p}</p>
          ))}
        </div>

        {/* sections */}
        {article.sections.map((s, i) => {
          const heading = isRtl ? s.heading_ar : s.heading_en;
          const paras = isRtl ? s.paras_ar : s.paras_en;
          const science = isRtl ? s.science_ar : s.science_en;
          return (
            <section key={i} style={{ marginTop: "34px" }}>
              {/* motif banner */}
              <div style={{ position: "relative", height: "128px", borderRadius: "16px", overflow: "hidden", border: `1px solid ${article.accent}22`, marginBottom: "20px" }}>
                <ContentGraphic motif={s.motif} variant="card" />
              </div>

              <h2 style={{ color: "#fff", fontWeight: 900, fontSize: "1.4rem", lineHeight: 1.35, marginBottom: "14px", display: "flex", alignItems: "baseline", gap: "10px" }}>
                <span style={{ color: article.accent, fontSize: "1rem", fontWeight: 900 }}>{String(i + 1).padStart(2, "0")}</span>
                {heading}
              </h2>

              {paras.map((p, j) => (
                <p key={j} style={{ color: "rgba(255,255,255,0.72)", fontSize: "1.02rem", lineHeight: 1.9, marginBottom: "14px" }}>{p}</p>
              ))}

              {s.stat && (
                <StatBadge
                  value={s.stat.value}
                  unit={isRtl ? s.stat.unit_ar : s.stat.unit_en}
                  label={isRtl ? s.stat.label_ar : s.stat.label_en}
                  accent={article.accent}
                />
              )}

              {/* science callout */}
              <div style={{ display: "flex", gap: "12px", background: "rgba(15,23,42,0.55)", borderInlineStart: `3px solid ${article.accent}`, borderRadius: "10px", padding: "14px 16px", marginTop: "14px" }}>
                <FlaskConical style={{ width: "18px", height: "18px", color: article.accent, flexShrink: 0, marginTop: "2px" }} />
                <p style={{ color: "rgba(255,255,255,0.66)", fontSize: "0.9rem", lineHeight: 1.7, margin: 0 }}>{science}</p>
              </div>
            </section>
          );
        })}

        {/* takeaways */}
        <div style={{ marginTop: "40px", background: `linear-gradient(135deg, ${article.accent}14, rgba(15,23,42,0.4))`, border: `1px solid ${article.accent}33`, borderRadius: "16px", padding: "24px 24px 26px" }}>
          <h3 style={{ color: "#fff", fontWeight: 900, fontSize: "1.2rem", marginBottom: "16px" }}>{t("الخلاصة 🎯", "Key takeaways 🎯")}</h3>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
            {takeaways.map((tk, i) => (
              <li key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <span style={{ flexShrink: 0, width: "22px", height: "22px", borderRadius: "50%", background: article.accent, display: "flex", alignItems: "center", justifyContent: "center", marginTop: "1px" }}>
                  <Check style={{ width: "13px", height: "13px", color: "#0f172a" }} strokeWidth={3} />
                </span>
                <span style={{ color: "rgba(255,255,255,0.82)", fontSize: "0.98rem", lineHeight: 1.7 }}>{tk}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <div style={{ marginTop: "32px", textAlign: "center", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "16px", padding: "28px 24px" }}>
          <p style={{ color: "#fff", fontWeight: 800, fontSize: "1.1rem", marginBottom: "6px" }}>{t("عايز حد يمشي معاك الطريق؟", "Want someone to walk the path with you?")}</p>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.92rem", marginBottom: "18px" }}>{t("احجز جلسة مع البوصلة وابدأ رحلتك بخطة واضحة.", "Book a session with The Compass and start with a clear plan.")}</p>
          <Link href={`/${locale}/book/general`} className="inline-flex items-center gap-2" style={{ background: "#F59E0B", color: "#0f172a", fontWeight: 800, fontSize: "0.95rem", padding: "12px 28px", borderRadius: "12px", textDecoration: "none" }}>
            {t("احجز جلسة", "Book a session")}
            <Arrow style={{ width: "16px", height: "16px" }} />
          </Link>
        </div>
      </article>
    </div>
  );
}
