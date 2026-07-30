"use client";

import type { DimensionRead } from "@/lib/compass/types";
import { ZONE_LABELS } from "@/lib/compass/templates";
import { cn } from "@/lib/utils";

interface CompassDialProps {
  reads: DimensionRead[];
  locale: "ar" | "en";
  size?: number;
}

export function CompassDial({ reads, locale, size = 260 }: CompassDialProps) {
  const isAr = locale === "ar";
  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.38; // outer radius of the chart

  // Order: HAP top, then clockwise: PRD, NRG, COM, CNF, DIR
  const ORDER = ["HAP", "PRD", "NRG", "COM", "CNF", "DIR"] as const;

  const readsMap = Object.fromEntries(reads.map((r) => [r.dimension, r]));

  const points = ORDER.map((dim, i) => {
    const angle = (i / ORDER.length) * 2 * Math.PI - Math.PI / 2;
    const read = readsMap[dim];
    const score = read?.score ?? 2.5;
    const fraction = Math.max(0.1, (score - 1) / 3); // 1→0.1, 4→1.0
    const r = fraction * R;
    return {
      dim,
      angle,
      r,
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
      labelX: cx + (R + 22) * Math.cos(angle),
      labelY: cy + (R + 22) * Math.sin(angle),
      read,
    };
  });

  const polyPoints = points.map((p) => `${p.x},${p.y}`).join(" ");

  // Grid rings at 25%, 50%, 75%, 100%
  const rings = [0.25, 0.5, 0.75, 1.0];

  function ringPoints(frac: number) {
    return ORDER.map((_, i) => {
      const angle = (i / ORDER.length) * 2 * Math.PI - Math.PI / 2;
      const r = frac * R;
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
    }).join(" ");
  }

  // Dimension short label
  const SHORT: Record<string, { ar: string; en: string }> = {
    HAP: { ar: "السعادة", en: "Joy" },
    DIR: { ar: "الاتجاه", en: "Direction" },
    PRD: { ar: "الإنجاز", en: "Focus" },
    CNF: { ar: "الثقة", en: "Confidence" },
    COM: { ar: "التواصل", en: "Connection" },
    NRG: { ar: "الطاقة", en: "Energy" },
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        {/* Grid rings */}
        {rings.map((frac) => (
          <polygon
            key={frac}
            points={ringPoints(frac)}
            fill="none"
            stroke={frac === 1.0 ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.06)"}
            strokeWidth={frac === 1.0 ? 1 : 0.5}
          />
        ))}

        {/* Spokes */}
        {points.map((p) => (
          <line
            key={p.dim}
            x1={cx} y1={cy}
            x2={cx + R * Math.cos(p.angle)}
            y2={cy + R * Math.sin(p.angle)}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={1}
          />
        ))}

        {/* Filled polygon */}
        <polygon
          points={polyPoints}
          fill="rgba(245,158,11,0.18)"
          stroke="rgba(245,158,11,0.65)"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />

        {/* Score dots */}
        {points.map((p) => (
          <circle
            key={p.dim}
            cx={p.x} cy={p.y} r={4}
            fill="#F59E0B"
            stroke="rgba(13,21,38,0.8)"
            strokeWidth={1.5}
          />
        ))}

        {/* Labels */}
        {points.map((p) => {
          const label = SHORT[p.dim];
          const score = p.read?.score ?? 2.5;
          const textAnchor =
            Math.abs(p.labelX - cx) < 5 ? "middle"
              : p.labelX < cx ? "end"
              : "start";
          return (
            <g key={p.dim}>
              <text
                x={p.labelX}
                y={p.labelY - 4}
                textAnchor={textAnchor}
                dominantBaseline="auto"
                fontSize={9}
                fontWeight="600"
                fill="rgba(255,255,255,0.55)"
                fontFamily="Cairo, Inter, sans-serif"
              >
                {isAr ? label.ar : label.en}
              </text>
              <text
                x={p.labelX}
                y={p.labelY + 8}
                textAnchor={textAnchor}
                dominantBaseline="auto"
                fontSize={9}
                fontWeight="700"
                fill="#F59E0B"
                fontFamily="Cairo, Inter, sans-serif"
              >
                {score.toFixed(1)}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Zone legend */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {(["needs_care", "emerging", "steady", "thriving"] as const).map((zone) => {
          const colors: Record<string, string> = {
            needs_care: "bg-red-500/40",
            emerging:   "bg-amber-500/40",
            steady:     "bg-blue-400/40",
            thriving:   "bg-emerald-500/40",
          };
          return (
            <span key={zone} className="flex items-center gap-1 text-xs text-white/40">
              <span className={cn("w-2 h-2 rounded-full", colors[zone])} />
              {isAr ? ZONE_LABELS[zone].ar : ZONE_LABELS[zone].en}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default CompassDial;
