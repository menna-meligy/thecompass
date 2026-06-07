"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { useTranslations } from "next-intl";
import { CheckCircle, Lock, MapPin, Star, Zap, Trophy } from "lucide-react";
import type { RoadmapProgress } from "@/types/index";

/* ── Node definitions ── */
interface RoadmapNode {
  id: number;
  titleAr: string;
  titleEn: string;
  xpRequired: number;
  icon: string;
  color: string;
}

const NODES: RoadmapNode[] = [
  { id: 1, titleAr: "المبتدئ",  titleEn: "Beginner",     xpRequired: 0,    icon: "🌱", color: "#4CAF50" },
  { id: 2, titleAr: "المتعلم",  titleEn: "Learner",      xpRequired: 100,  icon: "📚", color: "#2196F3" },
  { id: 3, titleAr: "المتقدم",  titleEn: "Advanced",     xpRequired: 300,  icon: "⭐", color: "#9C27B0" },
  { id: 4, titleAr: "الخبير",   titleEn: "Expert",       xpRequired: 600,  icon: "🎯", color: "#FF5722" },
  { id: 5, titleAr: "المحترف",  titleEn: "Professional", xpRequired: 1000, icon: "🏆", color: "#D4A017" },
  { id: 6, titleAr: "الأسطورة", titleEn: "Legend",       xpRequired: 1500, icon: "👑", color: "#8B0000" },
];

/* ── SVG path waypoints for the winding game path ── */
// Path winds: right → curve up → left → curve up → right → curve up
// Viewport: 340 wide, dynamically tall based on node count
const NODE_COUNT = NODES.length;
const ROW_HEIGHT = 140;
const SVG_WIDTH = 340;
const SVG_HEIGHT = ROW_HEIGHT * (NODE_COUNT - 1) + 80;

// Node positions along the winding path
const NODE_POSITIONS: { x: number; y: number }[] = [
  { x: 60,          y: SVG_HEIGHT - 40 },   // Node 1 — bottom left
  { x: SVG_WIDTH - 60, y: SVG_HEIGHT - 40 - ROW_HEIGHT },    // Node 2 — right
  { x: 60,          y: SVG_HEIGHT - 40 - ROW_HEIGHT * 2 },   // Node 3 — left
  { x: SVG_WIDTH - 60, y: SVG_HEIGHT - 40 - ROW_HEIGHT * 3 },// Node 4 — right
  { x: 60,          y: SVG_HEIGHT - 40 - ROW_HEIGHT * 4 },   // Node 5 — left
  { x: SVG_WIDTH - 60, y: SVG_HEIGHT - 40 - ROW_HEIGHT * 5 },// Node 6 — right (top)
];

/* Build smooth cubic bezier path string through all waypoints */
function buildPath(): string {
  const pts = NODE_POSITIONS;
  if (pts.length < 2) return "";

  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const midY = (p0.y + p1.y) / 2;
    d += ` C ${p0.x} ${midY}, ${p1.x} ${midY}, ${p1.x} ${p1.y}`;
  }
  return d;
}

const PATH_D = buildPath();

interface RoadmapPathProps {
  progress: RoadmapProgress;
}

export function RoadmapPath({ progress }: RoadmapPathProps) {
  const t = useTranslations("roadmap");
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.1 });

  const [pathLength, setPathLength] = useState(0);
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    if (pathRef.current) {
      setPathLength(pathRef.current.getTotalLength());
    }
  }, []);

  /* ── Compute which segment of the path is completed ── */
  const currentNodeIndex = NODES.reduce((acc, node, i) => {
    return progress.xp >= node.xpRequired ? i : acc;
  }, 0);

  /* Fraction of path completed = how far along the last completed node */
  const completedFraction = pathLength > 0
    ? (currentNodeIndex / (NODES.length - 1))
    : 0;
  const completedLength = completedFraction * pathLength;

  /* ── XP Progress to next level ── */
  const currentNode = NODES[currentNodeIndex];
  const nextNode = NODES[currentNodeIndex + 1] ?? null;
  const xpIntoCurrentLevel = progress.xp - currentNode.xpRequired;
  const xpNeededForNext = nextNode ? nextNode.xpRequired - currentNode.xpRequired : 0;
  const levelProgress = nextNode ? Math.min((xpIntoCurrentLevel / xpNeededForNext) * 100, 100) : 100;

  return (
    <div ref={containerRef} className="flex flex-col gap-6">

      {/* ── XP Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-[#5A0000] via-[#8B0000] to-[#C41E3A]" />
        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <pattern id="rp" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="20" cy="20" r="18" stroke="white" strokeWidth="0.5" fill="none" />
              <polygon points="20,2 22,18 20,20 18,18" fill="white" opacity="0.5" />
              <polygon points="20,38 22,22 20,20 18,22" fill="white" opacity="0.5" />
              <polygon points="2,20 18,18 20,20 18,22" fill="white" opacity="0.5" />
              <polygon points="38,20 22,18 20,20 22,22" fill="white" opacity="0.5" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#rp)" />
          </svg>
        </div>

        <div className="relative p-5">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-3xl font-black text-white">{progress.level}</div>
              <div className="text-xs text-white/70 font-medium mt-0.5">{t("level")}</div>
            </div>
            <div className="text-center border-x border-white/20">
              <div className="text-3xl font-black text-[#D4A017]">{progress.xp}</div>
              <div className="text-xs text-white/70 font-medium mt-0.5">{t("xp")}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black text-white">{progress.completed_count}</div>
              <div className="text-xs text-white/70 font-medium mt-0.5">{t("completed")}</div>
            </div>
          </div>

          {/* Progress bar to next level */}
          {nextNode && (
            <div>
              <div className="flex justify-between text-xs text-white/70 mb-1.5">
                <span>{currentNode.titleAr}</span>
                <span>{nextNode.titleAr}</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={isInView ? { width: `${levelProgress}%` } : {}}
                  transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-[#D4A017] to-[#E8B84B] rounded-full"
                />
              </div>
              <div className="text-right mt-1 text-xs text-white/60">
                {xpIntoCurrentLevel} / {xpNeededForNext} XP
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Winding Game Path ── */}
      <div className="relative overflow-x-hidden" style={{ minHeight: SVG_HEIGHT + 40 }}>
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          width="100%"
          style={{ maxWidth: SVG_WIDTH, margin: "0 auto", display: "block" }}
          aria-label="Roadmap path"
          role="img"
        >
          {/* ── Background path (gray dashed — full route) ── */}
          <path
            d={PATH_D}
            fill="none"
            stroke="#E8E0E0"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="4 10"
          />

          {/* ── Completed portion of path (solid crimson, animated) ── */}
          {pathLength > 0 && (
            <motion.path
              ref={undefined}
              d={PATH_D}
              fill="none"
              stroke="#8B0000"
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ strokeDasharray: `0 ${pathLength}` }}
              animate={isInView
                ? { strokeDasharray: `${completedLength} ${pathLength - completedLength}` }
                : { strokeDasharray: `0 ${pathLength}` }
              }
              transition={{ duration: 1.5, delay: 0.2, ease: "easeInOut" }}
              style={{ strokeDashoffset: 0 }}
            />
          )}

          {/* Hidden path for measuring total length */}
          <path
            ref={pathRef}
            d={PATH_D}
            fill="none"
            stroke="transparent"
            strokeWidth="1"
          />

          {/* ── Nodes ── */}
          {NODES.map((node, index) => {
            const pos = NODE_POSITIONS[index];
            const isCompleted = progress.xp >= node.xpRequired;
            const isCurrent = isCompleted && (index === NODES.length - 1 || progress.xp < NODES[index + 1].xpRequired);
            const isLocked = !isCompleted;

            const labelOnRight = index % 2 === 0; // alternate label sides

            return (
              <motion.g
                key={node.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={isInView ? { scale: 1, opacity: 1 } : {}}
                transition={{ delay: 0.2 + index * 0.15, type: "spring", stiffness: 260, damping: 20 }}
                style={{ transformOrigin: `${pos.x}px ${pos.y}px` }}
              >
                {/* Glow / pulse ring for current node */}
                {isCurrent && (
                  <>
                    <motion.circle
                      cx={pos.x}
                      cy={pos.y}
                      r="28"
                      fill="#D4A017"
                      opacity="0"
                      animate={{ r: [28, 42, 28], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <motion.circle
                      cx={pos.x}
                      cy={pos.y}
                      r="22"
                      fill="#D4A017"
                      opacity="0"
                      animate={{ r: [22, 34, 22], opacity: [0.4, 0, 0.4] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                    />
                  </>
                )}

                {/* Node circle background */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="22"
                  fill={
                    isLocked   ? "#F0E8E8" :
                    isCurrent  ? "#D4A017" :
                                 "#8B0000"
                  }
                  stroke={
                    isLocked   ? "#E8E0E0" :
                    isCurrent  ? "#B8860B" :
                                 "#5A0000"
                  }
                  strokeWidth="3"
                  filter={isCompleted && !isLocked ? "url(#nodeGlow)" : undefined}
                />

                {/* Node icon text */}
                <text
                  x={pos.x}
                  y={pos.y + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={isLocked ? "14" : "16"}
                  fill={isLocked ? "#9E8E8E" : "white"}
                  style={{ userSelect: "none" }}
                >
                  {isLocked ? "🔒" : isCurrent ? "📍" : node.icon}
                </text>

                {/* "YOU ARE HERE" badge for current */}
                {isCurrent && (
                  <g>
                    <rect
                      x={pos.x - 32}
                      y={pos.y - 42}
                      width="64"
                      height="16"
                      rx="8"
                      fill="#D4A017"
                    />
                    <text
                      x={pos.x}
                      y={pos.y - 34}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize="7"
                      fill="white"
                      fontWeight="700"
                      style={{ userSelect: "none" }}
                    >
                      أنت هنا
                    </text>
                  </g>
                )}

                {/* Label */}
                <text
                  x={labelOnRight ? pos.x + 30 : pos.x - 30}
                  y={pos.y - 4}
                  textAnchor={labelOnRight ? "start" : "end"}
                  dominantBaseline="middle"
                  fontSize="11"
                  fontWeight="700"
                  fill={isCompleted ? "#8B0000" : "#9E8E8E"}
                  style={{ userSelect: "none" }}
                >
                  {node.titleAr}
                </text>
                <text
                  x={labelOnRight ? pos.x + 30 : pos.x - 30}
                  y={pos.y + 10}
                  textAnchor={labelOnRight ? "start" : "end"}
                  dominantBaseline="middle"
                  fontSize="9"
                  fill={isCompleted ? "#C41E3A" : "#C8B8B8"}
                  style={{ userSelect: "none" }}
                >
                  {node.xpRequired} XP
                </text>
              </motion.g>
            );
          })}

          {/* Defs for glow filter */}
          <defs>
            <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
        </svg>
      </div>

      {/* ── Badges Section ── */}
      {progress.badges.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="bg-white rounded-2xl border border-[#F0E8E8] shadow-[0_4px_20px_rgba(139,0,0,0.07)] p-5"
        >
          <h3 className="font-bold text-[#1A0A0A] text-sm mb-4 flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#D4A017]/15 flex items-center justify-center">
              <Star className="h-3.5 w-3.5 text-[#D4A017] fill-[#D4A017]" />
            </div>
            {t("badges")}
            <span className="ms-auto text-xs text-[#9E8E8E] font-normal">
              {progress.badges.length} {t("badges")}
            </span>
          </h3>
          <div className="flex flex-wrap gap-2">
            {progress.badges.map((badge) => (
              <motion.div
                key={badge.id}
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-1.5 bg-gradient-to-r from-[#FFF9E6] to-[#FFF3CC] border border-[#D4A017]/30 rounded-full px-3 py-1.5 text-xs shadow-sm"
              >
                <span className="text-base">{badge.icon}</span>
                <span className="text-[#8B6914] font-bold">{badge.name}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Legend ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { color: "#8B0000", label: "مكتمل", dot: true },
          { color: "#D4A017", label: "أنت هنا", dot: true },
          { color: "#E8E0E0", label: "مقفل",  dot: true },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2 justify-center">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }} />
            <span className="text-xs text-[#9E8E8E] font-medium">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RoadmapPath;
