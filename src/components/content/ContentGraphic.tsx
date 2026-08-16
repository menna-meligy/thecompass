import {
  Compass, Map, Fingerprint, Scale, HeartPulse, Signpost,
  Timer, Repeat, Brain, Target, TrendingUp, Sprout, Sparkles,
  Lightbulb, Coins, type LucideIcon,
} from "lucide-react";

/**
 * ContentGraphic — branded, per-concept SVG scene used across the content
 * articles instead of stock photos. Dark compass-themed frame (rings + stars)
 * with an accent colour, a concept-specific decorative layer, and a centred
 * icon badge. Purely presentational; safe in a server component.
 */

export type Motif =
  | "compass" | "map" | "identity" | "scale" | "balance" | "fork"
  | "timer" | "loop" | "brain" | "target" | "growth" | "seed" | "spark" | "idea" | "coins";

interface MotifCfg {
  Icon: LucideIcon;
  accent: string;
  accent2: string;
}

const MOTIFS: Record<Motif, MotifCfg> = {
  compass:  { Icon: Compass,     accent: "#F59E0B", accent2: "#D97706" },
  map:      { Icon: Map,         accent: "#22D3EE", accent2: "#0891B2" },
  identity: { Icon: Fingerprint, accent: "#A78BFA", accent2: "#7C3AED" },
  scale:    { Icon: Scale,       accent: "#FBBF24", accent2: "#D97706" },
  balance:  { Icon: HeartPulse,  accent: "#34D399", accent2: "#059669" },
  fork:     { Icon: Signpost,    accent: "#FB923C", accent2: "#EA580C" },
  timer:    { Icon: Timer,       accent: "#60A5FA", accent2: "#2563EB" },
  loop:     { Icon: Repeat,      accent: "#4ADE80", accent2: "#16A34A" },
  brain:    { Icon: Brain,       accent: "#F472B6", accent2: "#DB2777" },
  target:   { Icon: Target,      accent: "#F87171", accent2: "#DC2626" },
  growth:   { Icon: TrendingUp,  accent: "#34D399", accent2: "#059669" },
  seed:     { Icon: Sprout,      accent: "#A3E635", accent2: "#65A30D" },
  spark:    { Icon: Sparkles,    accent: "#FCD34D", accent2: "#F59E0B" },
  idea:     { Icon: Lightbulb,   accent: "#FDE047", accent2: "#CA8A04" },
  coins:    { Icon: Coins,       accent: "#FBBF24", accent2: "#B45309" },
};

/** Concept-specific decorative vector layer drawn in the accent colour. */
function Decoration({ motif, accent }: { motif: Motif; accent: string }) {
  const s = { stroke: accent, fill: "none", strokeWidth: 2, strokeLinecap: "round" as const, opacity: 0.5 };
  switch (motif) {
    case "scale":
    case "balance":
      return (
        <g style={s}>
          <line x1="60" y1="40" x2="140" y2="40" />
          <line x1="100" y1="30" x2="100" y2="44" />
          <path d="M60 40 l-14 26 h28 z" />
          <path d="M140 40 l-14 26 h28 z" />
        </g>
      );
    case "fork":
      return (
        <g style={s}>
          <path d="M100 150 V96" />
          <path d="M100 96 C100 70 66 74 58 48" />
          <path d="M100 96 C100 70 134 74 142 48" />
          <circle cx="58" cy="44" r="5" style={{ fill: accent, stroke: "none" }} />
          <circle cx="142" cy="44" r="5" style={{ fill: accent, stroke: "none" }} />
        </g>
      );
    case "loop":
      return (
        <g style={s}>
          <path d="M64 100 a36 36 0 1 1 12 26" />
          <path d="M70 96 l-8 8 l10 6" />
        </g>
      );
    case "timer":
      return (
        <g style={s}>
          <path d="M64 104 a36 36 0 1 0 6 -22" />
          <path d="M64 78 l8 4" />
        </g>
      );
    case "map":
      return (
        <g style={{ ...s, strokeDasharray: "5 7" }}>
          <path d="M52 132 C90 120 74 78 120 70 S150 52 150 52" />
          <circle cx="52" cy="132" r="4" style={{ fill: accent, stroke: "none" }} />
          <circle cx="150" cy="52" r="5" style={{ fill: accent, stroke: "none" }} />
        </g>
      );
    case "growth":
      return (
        <g style={s}>
          <path d="M54 138 L86 108 L108 122 L150 70" />
          <path d="M150 70 l-16 2 M150 70 l-2 16" />
        </g>
      );
    case "target":
      return (
        <g style={s}>
          <circle cx="100" cy="92" r="34" />
          <circle cx="100" cy="92" r="20" />
        </g>
      );
    case "identity":
      return (
        <g style={s}>
          <path d="M74 118 c0 -24 52 -24 52 0" />
          <circle cx="100" cy="78" r="16" />
        </g>
      );
    default:
      return (
        <g style={{ ...s, opacity: 0.35 }}>
          <circle cx="100" cy="92" r="40" style={{ strokeDasharray: "3 8" }} />
        </g>
      );
  }
}

export default function ContentGraphic({
  motif,
  variant = "card",
  className,
}: {
  motif: Motif;
  variant?: "card" | "hero";
  className?: string;
}) {
  const cfg = MOTIFS[motif] ?? MOTIFS.compass;
  const { Icon, accent, accent2 } = cfg;
  const isHero = variant === "hero";
  const badge = isHero ? 116 : 76;
  const iconSize = isHero ? 54 : 36;

  return (
    <div
      aria-hidden="true"
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        background: `radial-gradient(120% 90% at 50% 12%, ${accent2}22, transparent 60%), #0b1220`,
      }}
    >
      {/* faint concentric rings + concept decoration */}
      <svg viewBox="0 0 200 184" preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <circle cx="100" cy="92" r="78" fill="none" stroke={accent} strokeOpacity="0.10" strokeWidth="1" />
        <circle cx="100" cy="92" r="58" fill="none" stroke={accent} strokeOpacity="0.14" strokeWidth="1" strokeDasharray="2 9" />
        {/* scattered stars */}
        {[[26,30],[168,42],[150,140],[40,150],[180,100],[20,96]].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={i % 2 ? 1.6 : 1} fill={accent} fillOpacity={0.5} />
        ))}
        <Decoration motif={motif} accent={accent} />
      </svg>

      {/* centre icon badge */}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            width: badge, height: badge, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: `linear-gradient(135deg, ${accent}, ${accent2})`,
            boxShadow: `0 10px 34px ${accent}44`,
          }}
        >
          <Icon width={iconSize} height={iconSize} strokeWidth={1.75} color="#0b1220" />
        </div>
      </div>
    </div>
  );
}

/** Big stat ring — used inline in article sections. */
export function StatBadge({
  value, unit, label, accent = "#F59E0B",
}: {
  value: string; unit?: string; label: string; accent?: string;
}) {
  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: "16px",
        background: "rgba(15,23,42,0.6)", border: `1px solid ${accent}33`,
        borderRadius: "14px", padding: "16px 20px", margin: "6px 0",
      }}
    >
      <div
        style={{
          flexShrink: 0, width: "68px", height: "68px", borderRadius: "50%",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          background: `radial-gradient(circle at 50% 40%, ${accent}22, transparent 70%)`,
          border: `2px solid ${accent}`,
        }}
      >
        <span style={{ color: "#fff", fontWeight: 900, fontSize: "1.15rem", lineHeight: 1 }}>{value}</span>
        {unit && <span style={{ color: accent, fontWeight: 800, fontSize: "0.62rem", marginTop: "2px" }}>{unit}</span>}
      </div>
      <span style={{ color: "rgba(255,255,255,0.72)", fontSize: "0.92rem", lineHeight: 1.6, fontWeight: 600 }}>{label}</span>
    </div>
  );
}
