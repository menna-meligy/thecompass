"use client";

import { useEffect, useState } from "react";
import { Clock, Video } from "lucide-react";

interface Props {
  startsAt: string;
  title: string;
  locationOrLink?: string | null;
  locale: string;
}

function diff(target: number) {
  const ms = Math.max(0, target - Date.now());
  return {
    ms,
    d: Math.floor(ms / 86_400_000),
    h: Math.floor((ms % 86_400_000) / 3_600_000),
    m: Math.floor((ms % 3_600_000) / 60_000),
    s: Math.floor((ms % 60_000) / 1000),
  };
}

export default function NextSessionCountdown({ startsAt, title, locationOrLink, locale }: Props) {
  const isAr = locale === "ar";
  const target = new Date(startsAt).getTime();
  const [t, setT] = useState(() => diff(target));

  useEffect(() => {
    const id = setInterval(() => setT(diff(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  const isOnline = typeof locationOrLink === "string" && locationOrLink.startsWith("http");
  const joinable = t.ms <= 15 * 60_000 && t.ms >= 0; // join opens 15 min before
  const started = t.ms === 0;

  const units: { v: number; ar: string; en: string }[] = [
    { v: t.d, ar: "يوم", en: "days" },
    { v: t.h, ar: "ساعة", en: "hrs" },
    { v: t.m, ar: "دقيقة", en: "min" },
    { v: t.s, ar: "ثانية", en: "sec" },
  ];

  return (
    <div
      className="relative rounded-2xl p-6 mb-8 overflow-hidden"
      style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.12), rgba(13,21,38,0.8))", border: "1px solid rgba(245,158,11,0.28)" }}
    >
      <div aria-hidden className="pointer-events-none absolute -top-12 -end-12 w-44 h-44 rounded-full opacity-20" style={{ background: "radial-gradient(circle, #F59E0B, transparent 70%)" }} />
      <div className="relative flex items-center justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-[#F59E0B]" />
            <span className="text-[#F59E0B] text-xs font-bold uppercase tracking-widest">
              {isAr ? "جلستك الجاية" : "Your next session"}
            </span>
          </div>
          <p className="text-white font-black text-lg leading-tight truncate">{title}</p>
        </div>

        {/* Countdown boxes */}
        <div className="flex items-center gap-2" dir="ltr">
          {started ? (
            <span className="text-[#86EFAC] font-bold text-sm">{isAr ? "بدأت دلوقتي!" : "Live now!"}</span>
          ) : (
            units.map((u, i) => (
              <div key={i} className="flex flex-col items-center">
                <div style={{ minWidth: "48px", padding: "8px 6px", borderRadius: "10px", background: "rgba(15,23,42,0.7)", border: "1px solid rgba(245,158,11,0.18)" }}>
                  <span className="text-white font-black text-xl tabular-nums">{String(u.v).padStart(2, "0")}</span>
                </div>
                <span className="text-white/40 text-[0.62rem] mt-1">{isAr ? u.ar : u.en}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {isOnline && (joinable || started) && (
        <a
          href={locationOrLink!}
          target="_blank"
          rel="noopener noreferrer"
          className="relative mt-4 inline-flex items-center gap-2 bg-[#F59E0B] hover:bg-[#FBBF24] text-[#0f172a] font-bold text-sm px-5 py-2.5 rounded-xl transition-colors"
        >
          <Video className="h-4 w-4" />
          {isAr ? "انضم للجلسة" : "Join session"}
        </a>
      )}
    </div>
  );
}
