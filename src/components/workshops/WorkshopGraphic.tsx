import { Route, Telescope, GraduationCap, Compass, type LucideIcon } from "lucide-react";

/**
 * WorkshopGraphic — a branded, per-topic graphic used instead of stock photos.
 * Dark compass-themed background with a topic accent colour, faint rings,
 * scattered stars and a crisp centred icon badge. Purely presentational.
 */

interface TopicCfg {
  accent: string;
  accent2: string;
  Icon: LucideIcon;
}

const TOPIC_CFG: Record<string, TopicCfg> = {
  "career-change": { accent: "#F59E0B", accent2: "#D97706", Icon: Route },
  "career-discovery": { accent: "#34D399", accent2: "#059669", Icon: Telescope },
  scholarships: { accent: "#818CF8", accent2: "#4F46E5", Icon: GraduationCap },
};

export default function WorkshopGraphic({
  topic,
  variant = "card",
}: {
  topic: string;
  variant?: "card" | "hero";
}) {
  const cfg = TOPIC_CFG[topic] ?? { accent: "#F59E0B", accent2: "#B45309", Icon: Compass };
  const { accent, accent2, Icon } = cfg;
  const isHero = variant === "hero";
  const badge = isHero ? 128 : 84;
  const iconSize = isHero ? 60 : 40;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        background: `radial-gradient(120% 95% at 75% 12%, ${accent}33 0%, transparent 55%), linear-gradient(150deg, ${accent}22 0%, #0d1526 50%, #0b1120 100%)`,
      }}
    >
      {/* Faint concentric compass rings, off to one side */}
      <svg
        viewBox="0 0 240 240"
        style={{
          position: "absolute",
          top: isHero ? "-18%" : "-30%",
          insetInlineEnd: "-14%",
          width: isHero ? "70%" : "90%",
          opacity: 0.16,
        }}
        fill="none"
        stroke={accent}
      >
        <circle cx="120" cy="120" r="115" strokeWidth="1.5" />
        <circle cx="120" cy="120" r="88" strokeWidth="1" />
        <circle cx="120" cy="120" r="60" strokeWidth="1" strokeDasharray="3 5" />
        <line x1="120" y1="0" x2="120" y2="30" strokeWidth="2" />
        <line x1="120" y1="210" x2="120" y2="240" strokeWidth="2" />
        <line x1="0" y1="120" x2="30" y2="120" strokeWidth="2" />
        <line x1="210" y1="120" x2="240" y2="120" strokeWidth="2" />
      </svg>

      {/* Scattered stars */}
      <span style={{ position: "absolute", top: "22%", insetInlineStart: "16%", width: 4, height: 4, borderRadius: "50%", background: `${accent}99` }} />
      <span style={{ position: "absolute", top: "68%", insetInlineStart: "26%", width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,0.35)" }} />
      <span style={{ position: "absolute", top: "78%", insetInlineEnd: "22%", width: 5, height: 5, borderRadius: "50%", background: `${accent}66` }} />
      <span style={{ position: "absolute", top: "40%", insetInlineStart: "8%", width: 2, height: 2, borderRadius: "50%", background: "rgba(255,255,255,0.4)" }} />

      {/* Centred icon badge with glow */}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            width: badge,
            height: badge,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: `linear-gradient(150deg, ${accent}2e, ${accent2}14)`,
            border: `1.5px solid ${accent}59`,
            boxShadow: `0 0 40px ${accent}3a, inset 0 0 24px ${accent}1f`,
          }}
        >
          <Icon size={iconSize} color={accent} strokeWidth={1.5} />
        </div>
      </div>
    </div>
  );
}
