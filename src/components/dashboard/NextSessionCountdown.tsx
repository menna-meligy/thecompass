"use client";

import { useEffect, useState } from "react";
import { Clock, Video, ArrowRight } from "lucide-react";
import { joinState, linkAppearsNote } from "@/lib/meeting";

interface Props {
  startsAt: string;
  title: string;
  locationOrLink?: string | null;
  locale: string;
}

function diff(target: number) {
  // `raw` keeps its sign so we can tell "about to start" from "long over";
  // `ms` stays clamped because the clock should never count below zero.
  const raw = target - Date.now();
  const ms = Math.max(0, raw);
  return {
    raw,
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
  // Once the door is open the clock stops being the point — swap it for the way
  // in. Derived from ticking state so the server and the first client render agree.
  const join = joinState(new Date(target), new Date(target - t.raw));
  const isOpen = isOnline && join === "open";

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

        {/* Countdown boxes — replaced by the join button once it's time */}
        <div className="flex items-center gap-2" dir="ltr">
          {isOpen ? (
            <a
              href={locationOrLink!}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#22C55E] hover:brightness-110 text-[#0f172a] font-black text-sm px-5 py-3 rounded-xl transition"
              dir={isAr ? "rtl" : "ltr"}
            >
              <Video className="h-4 w-4" />
              {isAr ? "ادخل الجلسة دلوقتي" : "Join your session now"}
              <ArrowRight className="h-4 w-4" style={{ transform: isAr ? "rotate(180deg)" : undefined }} />
            </a>
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

      {isOnline && join === "too_early" && (
        <p className="relative mt-4 text-xs leading-relaxed" style={{ color: "rgba(191,219,254,0.85)" }}>
          {linkAppearsNote(isAr)}
        </p>
      )}
    </div>
  );
}
