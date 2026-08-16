import Link from "next/link";
import { BookOpen, Clock, ArrowLeft, ArrowRight } from "lucide-react";
import ContentGraphic from "@/components/content/ContentGraphic";
import type { Article } from "@/content/articles";

export default function ArticleCard({ article, locale }: { article: Article; locale: string }) {
  const isRtl = locale === "ar";
  const title = isRtl ? article.title_ar : article.title_en;
  const excerpt = isRtl ? article.excerpt_ar : article.excerpt_en;
  const Arrow = isRtl ? ArrowLeft : ArrowRight;
  const dateStr = new Date(article.date).toLocaleDateString(isRtl ? "ar-EG" : "en-US", { year: "numeric", month: "short", day: "numeric" });

  return (
    <Link
      href={`/${locale}/vlogs/${article.slug}`}
      className="group workshop-card"
      style={{
        display: "flex", flexDirection: "column", overflow: "hidden",
        background: "rgba(15,23,42,0.7)", border: "1px solid rgba(245,158,11,0.14)",
        borderRadius: "16px", boxShadow: "0 4px 28px rgba(0,0,0,0.45)",
        textDecoration: "none", height: "100%",
      }}
    >
      {/* Branded graphic thumbnail */}
      <div style={{ position: "relative", height: "180px", flexShrink: 0 }}>
        <ContentGraphic motif={article.heroMotif} variant="card" className="transition-transform duration-500 group-hover:scale-105" />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(15,23,42,0.9) 2%, transparent 42%)" }} />
        <div style={{ position: "absolute", top: "14px", insetInlineStart: "14px" }}>
          <span style={{ background: "rgba(15,23,42,0.72)", border: `1px solid ${article.accent}55`, color: article.accent, fontSize: "0.62rem", fontWeight: 800, padding: "4px 10px", borderRadius: "6px", textTransform: "uppercase", letterSpacing: "0.08em", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", gap: "4px" }}>
            <BookOpen style={{ width: "10px", height: "10px" }} />
            {isRtl ? "مقال" : "Article"}
          </span>
        </div>
        <div style={{ position: "absolute", top: "14px", insetInlineEnd: "14px" }}>
          <span style={{ background: "rgba(0,0,0,0.72)", border: "1px solid rgba(245,158,11,0.25)", color: "#FCD34D", fontSize: "0.62rem", fontWeight: 800, padding: "4px 9px", borderRadius: "6px", display: "flex", alignItems: "center", gap: "4px", backdropFilter: "blur(4px)" }}>
            <Clock style={{ width: "11px", height: "11px" }} />
            {article.readMinutes} {isRtl ? "د" : "min"}
          </span>
        </div>
      </div>

      {/* Body */}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "20px 22px 22px", textAlign: isRtl ? "right" : "left" }}>
        <h3 className="workshop-card-title" style={{ fontWeight: 900, color: "#fff", fontSize: "1.3rem", lineHeight: 1.3, marginBottom: "10px" }}>{title}</h3>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.9rem", lineHeight: 1.75, flex: 1, marginBottom: "20px", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{excerpt}</p>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "16px", borderTop: "1px solid rgba(245,158,11,0.1)", marginTop: "auto" }}>
          <span style={{ color: "rgba(255,255,255,0.32)", fontSize: "0.75rem", fontWeight: 600 }}>{dateStr}</span>
          <span className="workshop-card-cta" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.83rem", fontWeight: 800, color: "#0f172a", background: "#F59E0B", padding: "8px 16px", borderRadius: "8px" }}>
            {isRtl ? "اقرأ المقال" : "Read"}
            <Arrow style={{ width: "14px", height: "14px" }} />
          </span>
        </div>
      </div>
    </Link>
  );
}
