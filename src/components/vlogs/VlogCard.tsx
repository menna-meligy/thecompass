import Image from "next/image";
import { useLocale } from "next-intl";
import { getLocalizedField } from "@/lib/utils";
import type { Vlog } from "@/types/index";
import { Play, Clock, Video } from "lucide-react";
import WorkshopGraphic from "@/components/workshops/WorkshopGraphic";

interface VlogCardProps {
  vlog: Vlog;
  duration?: string; // e.g. "12:35"
}

export function VlogCard({ vlog, duration }: VlogCardProps) {
  const locale = useLocale();
  const isRtl = locale === "ar";
  const title = getLocalizedField(vlog as unknown as Record<string, unknown>, "title", locale);
  const description = getLocalizedField(vlog as unknown as Record<string, unknown>, "description", locale);

  return (
    <a
      href={vlog.video_url}
      target="_blank"
      rel="noopener noreferrer"
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
      {/* Thumbnail (or branded graphic when none is set) */}
      <div style={{ position: "relative", height: "180px", flexShrink: 0 }}>
        {vlog.thumbnail_url ? (
          <Image
            src={vlog.thumbnail_url}
            alt={title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <WorkshopGraphic topic="vlog" variant="card" />
        )}
        {/* Bottom fade into the body */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(15,23,42,0.9) 2%, transparent 42%)" }} />

        {/* Play button — appears on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div
            className="flex items-center justify-center"
            style={{ width: "56px", height: "56px", borderRadius: "50%", background: "#F59E0B", boxShadow: "0 4px 20px rgba(245,158,11,0.4)" }}
          >
            <Play className="h-6 w-6 text-[#0f172a] ms-0.5 fill-[#0f172a]" />
          </div>
        </div>

        {/* Content tag */}
        <div style={{ position: "absolute", top: "14px", insetInlineStart: "14px" }}>
          <span style={{ background: "rgba(15,23,42,0.72)", border: "1px solid rgba(245,158,11,0.3)", color: "#FCD34D", fontSize: "0.62rem", fontWeight: 800, padding: "4px 10px", borderRadius: "6px", textTransform: "uppercase", letterSpacing: "0.08em", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", gap: "4px" }}>
            <Video style={{ width: "10px", height: "10px" }} />
            {isRtl ? "فيديو" : "Video"}
          </span>
        </div>

        {/* Duration badge */}
        {duration && (
          <div style={{ position: "absolute", top: "14px", insetInlineEnd: "14px" }}>
            <span style={{ background: "rgba(0,0,0,0.72)", border: "1px solid rgba(245,158,11,0.25)", color: "#FCD34D", fontSize: "0.62rem", fontWeight: 800, padding: "4px 9px", borderRadius: "6px", display: "flex", alignItems: "center", gap: "4px", backdropFilter: "blur(4px)" }}>
              <Clock style={{ width: "11px", height: "11px" }} />
              {duration}
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
        {description && (
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
        )}

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "16px", borderTop: "1px solid rgba(245,158,11,0.1)", marginTop: "auto" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "rgba(255,255,255,0.32)", fontSize: "0.75rem", fontWeight: 600 }}>
            {new Date(vlog.created_at).toLocaleDateString(
              isRtl ? "ar-EG" : "en-US",
              { year: "numeric", month: "short", day: "numeric" }
            )}
          </span>

          <span
            className="workshop-card-cta"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.83rem", fontWeight: 800, color: "#0f172a", background: "#F59E0B", padding: "8px 16px", borderRadius: "8px" }}
          >
            {isRtl ? "اتفرّج دلوقتي" : "Watch Now"}
            <Play style={{ width: "14px", height: "14px" }} className="fill-current" />
          </span>
        </div>
      </div>
    </a>
  );
}

export default VlogCard;
