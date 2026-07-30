"use client";

import { useRef, useState, useEffect } from "react";
import {
  motion,
  useScroll,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
} from "framer-motion";
import Link from "next/link";
import { useLocale } from "next-intl";
import { MapPin, Calendar, Zap, Compass } from "lucide-react";

/**
 * JourneyRoad — a scroll-driven "road" the visitor travels down.
 * A winding gold path fills in as the user scrolls, a compass marker
 * walks along it, and the three milestones light up as it passes.
 * On-brand with البوصلة (compass / navigation) theme.
 */

const GOLD = "#F59E0B";

// Winding road in viewBox units (100 wide × 260 tall).
const ROAD_D =
  "M 50 6 C 82 38, 82 66, 50 96 C 18 126, 18 154, 50 184 C 82 214, 82 236, 50 256";

// Milestone fractions along the path (0..1) and their content.
const MILESTONES = [
  {
    t: 0.16,
    icon: MapPin,
    path: "workshops",
    titleAr: "اكتشف",
    titleEn: "Explore",
    descAr: "تصفّح الورش والمحتوى واختر اللي يناسب رحلتك",
    descEn: "Browse workshops and content, find what fits you",
  },
  {
    t: 0.5,
    icon: Calendar,
    path: "workshops",
    titleAr: "احجز",
    titleEn: "Book",
    descAr: "سجّل في الجلسة المناسبة واختر وقتك",
    descEn: "Register for the right session and pick your time",
  },
  {
    t: 0.84,
    icon: Zap,
    path: "dashboard/roadmap",
    titleAr: "تحوّل",
    titleEn: "Transform",
    descAr: "طبّق اللي اتعلمته وتابع تقدّمك على الخريطة",
    descEn: "Apply what you learn and track your progress",
  },
];

interface Point {
  x: number;
  y: number;
}

export default function JourneyRoad({ isRtl }: { isRtl: boolean }) {
  const locale = useLocale();
  const sectionRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);

  // Scroll progress across the whole section (0 at top-aligned, 1 at bottom-aligned).
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  // Marker position (in viewBox units) driven by scroll.
  const mx = useMotionValue(50);
  const my = useMotionValue(6);
  const needleRotate = useTransform(scrollYProgress, [0, 1], [0, 720]);

  // Milestone anchor points, computed from the actual path geometry.
  const [points, setPoints] = useState<Point[]>([]);
  const [active, setActive] = useState(-1);

  useEffect(() => {
    const p = pathRef.current;
    if (!p) return;
    const len = p.getTotalLength();
    setPoints(MILESTONES.map((m) => p.getPointAtLength(m.t * len)));
    // Seed marker at the start.
    const start = p.getPointAtLength(0);
    mx.set(start.x);
    my.set(start.y);
  }, [mx, my]);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const p = pathRef.current;
    if (!p) return;
    const len = p.getTotalLength();
    const pt = p.getPointAtLength(Math.max(0, Math.min(1, v)) * len);
    mx.set(pt.x);
    my.set(pt.y);
    // Which milestones have been reached.
    let idx = -1;
    for (let i = 0; i < MILESTONES.length; i++) {
      if (v >= MILESTONES[i].t - 0.04) idx = i;
    }
    setActive((prev) => (prev === idx ? prev : idx));
  });

  return (
    <section
      ref={sectionRef}
      className="relative bg-[#0d1526]"
      style={{ paddingTop: "4rem", paddingBottom: "4rem", overflowX: "hidden" }}
    >
      {/* Section header */}
      <div style={{ textAlign: "center", marginBottom: "1rem" }} className="relative z-10">
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
          <div style={{ width: "40px", height: "3px", background: GOLD, opacity: 0.65 }} />
        </div>
        <h2 className="text-3xl md:text-4xl font-black text-white" style={{ marginBottom: "0.85rem" }}>
          {isRtl ? "رحلتك مع البوصلة" : "Your Journey with The Compass"}
        </h2>
        <p className="text-white/50 text-base" style={{ maxWidth: "40rem", margin: "0 auto" }}>
          {isRtl
            ? "انزل بالماوس واتبع الطريق… كل خطوة تقرّبك من التغيير"
            : "Scroll down and follow the road. Every step gets you closer to change"}
        </p>
      </div>

      {/* The road: SVG (scales with width) + HTML label overlay on the same box */}
      <div
        className="relative"
        style={{ maxWidth: "560px", margin: "0 auto", padding: "0 1.5rem" }}
      >
        <div className="relative">
          <svg
            viewBox="0 0 100 260"
            width="100%"
            style={{ display: "block", overflow: "visible" }}
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="roadGold" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FBBF24" />
                <stop offset="50%" stopColor={GOLD} />
                <stop offset="100%" stopColor="#D97706" />
              </linearGradient>
              <filter id="roadGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2.2" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Faint base road */}
            <path
              ref={pathRef}
              d={ROAD_D}
              fill="none"
              stroke="rgba(148,163,184,0.14)"
              strokeWidth="6"
              strokeLinecap="round"
            />
            {/* Dashed centre line */}
            <path
              d={ROAD_D}
              fill="none"
              stroke="rgba(245,158,11,0.18)"
              strokeWidth="0.6"
              strokeLinecap="round"
              strokeDasharray="1.5 3"
            />

            {/* Gold progress road — fills as you scroll */}
            <motion.path
              d={ROAD_D}
              fill="none"
              stroke="url(#roadGold)"
              strokeWidth="2.6"
              strokeLinecap="round"
              filter="url(#roadGlow)"
              style={{ pathLength: scrollYProgress }}
            />

            {/* Milestone nodes on the path, with a signpost arm reaching toward each card */}
            {points.map((pt, i) => {
              const reached = i <= active;
              const onRight = pt.x >= 50;
              const armLen = 9;
              const armX = pt.x + (onRight ? armLen : -armLen);
              return (
                <g key={i}>
                  {/* Dashed arm connecting the road to the milestone card */}
                  <line
                    x1={pt.x}
                    y1={pt.y}
                    x2={armX}
                    y2={pt.y}
                    stroke={reached ? GOLD : "rgba(148,163,184,0.25)"}
                    strokeWidth="0.8"
                    strokeDasharray="1.6 1.4"
                    style={{ transition: "stroke 0.4s" }}
                  />
                  <circle
                    cx={armX}
                    cy={pt.y}
                    r="1.1"
                    fill={reached ? GOLD : "rgba(148,163,184,0.4)"}
                    style={{ transition: "fill 0.4s" }}
                  />
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={reached ? 5.5 : 4}
                    fill={reached ? GOLD : "#1e293b"}
                    stroke={reached ? "#FBBF24" : "rgba(245,158,11,0.35)"}
                    strokeWidth="1"
                    style={{ transition: "r 0.3s, fill 0.3s, stroke 0.3s" }}
                  />
                  <text
                    x={pt.x}
                    y={pt.y + 1.4}
                    textAnchor="middle"
                    fontSize="4"
                    fontWeight="800"
                    fill={reached ? "#0f172a" : "rgba(245,158,11,0.6)"}
                  >
                    {i + 1}
                  </text>
                </g>
              );
            })}

            {/* Traveling compass marker */}
            <motion.g style={{ x: mx, y: my }}>
              <circle r="7" fill="#0f172a" stroke={GOLD} strokeWidth="1.4" filter="url(#roadGlow)" />
              <motion.g style={{ rotate: needleRotate }}>
                <polygon points="0,-4 1.2,0 0,1 -1.2,0" fill={GOLD} />
                <polygon points="0,4 1.2,0 0,-1 -1.2,0" fill="rgba(245,158,11,0.4)" />
              </motion.g>
            </motion.g>
          </svg>

          {/* HTML label cards, positioned to match each node (viewBox 100×260) */}
          {points.map((pt, i) => {
            const m = MILESTONES[i];
            const Icon = m.icon;
            const reached = i <= active;
            // Alternate label side based on which half the node sits in.
            const onRight = pt.x >= 50;
            const armEndPct = pt.x + (onRight ? 9 : -9);
            return (
              <motion.div
                key={i}
                initial={false}
                animate={{ opacity: reached ? 1 : 0.35, y: reached ? 0 : 8 }}
                transition={{ duration: 0.4 }}
                className="absolute"
                style={{
                  top: `${(pt.y / 260) * 100}%`,
                  [onRight ? "left" : "right"]: `${onRight ? armEndPct : 100 - armEndPct}%`,
                  transform: "translateY(-50%)",
                  marginInlineStart: onRight ? "1.5%" : 0,
                  marginInlineEnd: onRight ? 0 : "1.5%",
                  width: "42%",
                  maxWidth: "200px",
                  textAlign: onRight ? "start" : "end",
                }}
              >
                <Link
                  href={`/${locale}/${m.path}`}
                  className="relative rounded-xl p-3.5 group transition-transform duration-200 hover:-translate-y-0.5"
                  style={{
                    background: reached ? "rgba(245,158,11,0.10)" : "rgba(30,41,59,0.5)",
                    border: `1px solid ${reached ? "rgba(245,158,11,0.4)" : "rgba(148,163,184,0.12)"}`,
                    backdropFilter: "blur(8px)",
                    transition: "background 0.4s, border-color 0.4s, transform 0.2s",
                    display: "inline-block",
                    cursor: "pointer",
                  }}
                >
                  {/* Tail pointing back at the road, welding the card onto its signpost arm */}
                  <span
                    aria-hidden="true"
                    className="absolute"
                    style={{
                      top: "50%",
                      [onRight ? "left" : "right"]: "-5px",
                      width: "10px",
                      height: "10px",
                      transform: "translateY(-50%) rotate(45deg)",
                      background: reached ? "rgba(245,158,11,0.10)" : "rgba(30,41,59,0.5)",
                      borderInlineStart: onRight ? `1px solid ${reached ? "rgba(245,158,11,0.4)" : "rgba(148,163,184,0.12)"}` : "none",
                      borderBlockStart: onRight ? `1px solid ${reached ? "rgba(245,158,11,0.4)" : "rgba(148,163,184,0.12)"}` : "none",
                      borderInlineEnd: onRight ? "none" : `1px solid ${reached ? "rgba(245,158,11,0.4)" : "rgba(148,163,184,0.12)"}`,
                      borderBlockEnd: onRight ? "none" : `1px solid ${reached ? "rgba(245,158,11,0.4)" : "rgba(148,163,184,0.12)"}`,
                      transition: "background 0.4s, border-color 0.4s",
                    }}
                  />
                  <div
                    className="flex items-center gap-2 mb-1.5"
                    style={{ flexDirection: onRight ? "row" : "row-reverse" }}
                  >
                    <span
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{
                        background: reached ? GOLD : "rgba(245,158,11,0.12)",
                        color: reached ? "#0f172a" : GOLD,
                        transition: "background 0.4s, color 0.4s",
                      }}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <h3 className="text-white font-black text-base group-hover:text-[#F59E0B] transition-colors">
                      {isRtl ? m.titleAr : m.titleEn}
                    </h3>
                  </div>
                  <p className="text-white/55 text-xs leading-relaxed">
                    {isRtl ? m.descAr : m.descEn}
                  </p>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Footer flourish */}
      <div style={{ textAlign: "center", marginTop: "1rem" }} className="relative z-10">
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
          style={{ background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.25)" }}
        >
          <Compass className="h-4 w-4 text-[#F59E0B]" />
          <span className="text-[#F59E0B] text-sm font-bold">
            {isRtl ? "الوجهة: النسخة الأفضل منك" : "Destination: the best version of you"}
          </span>
        </div>
      </div>
    </section>
  );
}
