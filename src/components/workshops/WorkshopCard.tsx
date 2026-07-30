import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { getLocalizedField } from "@/lib/utils";
import type { Workshop } from "@/types/index";
import { ArrowRight, ArrowLeft, Users, Compass } from "lucide-react";
import WorkshopGraphic from "./WorkshopGraphic";

interface WorkshopCardProps {
  workshop: Workshop;
  sessionCount?: number;
  minPrice?: number;
}

export function WorkshopCard({ workshop }: WorkshopCardProps) {
  const t = useTranslations("workshops");
  const locale = useLocale();
  const isRtl = locale === "ar";
  const title = getLocalizedField(workshop as unknown as Record<string, unknown>, "title", locale);
  const description = getLocalizedField(workshop as unknown as Record<string, unknown>, "description", locale);
  const Arrow = isRtl ? ArrowLeft : ArrowRight;

  return (
    <Link
      href={`/${locale}/workshops/${workshop.id}`}
      className="group workshop-card"
      style={{
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "rgba(15,23,42,0.7)",
        border: "1px solid rgba(245,158,11,0.14)",
        borderRadius: "16px",
        boxShadow: "0 4px 28px rgba(0,0,0,0.45)",
        textDecoration: "none",
        height: "100%",
      }}
    >
      {/* Branded graphic (no photo) */}
      <div style={{ position: "relative", height: "180px", flexShrink: 0 }}>
        <WorkshopGraphic topic={workshop.topic} variant="card" />
        {/* Bottom fade into the body */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(15,23,42,0.9) 2%, transparent 42%)" }} />

        {/* Topic tag */}
        {workshop.topic && (
          <div style={{ position: "absolute", top: "14px", insetInlineStart: "14px" }}>
            <span style={{ background: "rgba(15,23,42,0.72)", border: "1px solid rgba(245,158,11,0.3)", color: "#FCD34D", fontSize: "0.62rem", fontWeight: 800, padding: "4px 10px", borderRadius: "6px", textTransform: "uppercase", letterSpacing: "0.08em", backdropFilter: "blur(4px)" }}>
              {workshop.topic.replace("-", " ")}
            </span>
          </div>
        )}

        {/* Spots badge */}
        {workshop.spots_available != null && (
          <div style={{ position: "absolute", top: "14px", insetInlineEnd: "14px" }}>
            <span style={{ background: "rgba(239,68,68,0.18)", border: "1px solid rgba(239,68,68,0.4)", color: "#fca5a5", fontSize: "0.62rem", fontWeight: 800, padding: "4px 9px", borderRadius: "6px", display: "flex", alignItems: "center", gap: "4px", backdropFilter: "blur(4px)" }}>
              <Users style={{ width: "11px", height: "11px" }} />
              {workshop.spots_available} {isRtl ? "أماكن" : "spots"}
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "20px 22px 22px", textAlign: isRtl ? "right" : "left" }}>
        <h3
          className="workshop-card-title"
          style={{ fontWeight: 900, color: "#fff", fontSize: "1.3rem", lineHeight: 1.3, marginBottom: "10px" }}
        >
          {title}
        </h3>
        <p
          style={{
            color: "rgba(255,255,255,0.5)",
            fontSize: "0.9rem",
            lineHeight: 1.75,
            flex: 1,
            marginBottom: "20px",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {description}
        </p>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "16px", borderTop: "1px solid rgba(245,158,11,0.1)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "rgba(255,255,255,0.32)", fontSize: "0.75rem", fontWeight: 600 }}>
            <Compass style={{ width: "14px", height: "14px", color: "rgba(245,158,11,0.4)" }} />
            {isRtl ? "استكشف الجلسات" : "Explore sessions"}
          </span>

          <span
            className="workshop-card-cta"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.83rem", fontWeight: 800, color: "#0f172a", background: "#F59E0B", padding: "8px 16px", borderRadius: "8px" }}
          >
            {t("learnMore")}
            <Arrow style={{ width: "14px", height: "14px" }} />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default WorkshopCard;
