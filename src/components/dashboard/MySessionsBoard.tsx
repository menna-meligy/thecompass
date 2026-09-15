"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Calendar, ChevronLeft, ChevronRight, Clock, History, Video } from "lucide-react";
import {
  formatISODate,
  isoDate,
  monthName,
  normaliseDate,
  shortTime,
  slotStartsAtISO,
  weekdays,
} from "@/lib/schedule-dates";

/**
 * What the client's sessions actually look like, at a glance.
 *
 * Before this, a booking list told you a session existed but not when it was
 * coming, and past sessions sat in the same undifferentiated pile. This gives
 * three things: the next confirmed session counting down, a month grid so the
 * shape of the schedule is visible, and a separate history of what's done.
 */

export interface MySession {
  id: string;
  title: string;
  /** "YYYY-MM-DD" */
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  /** confirmed = admin approved; awaiting_review = receipt with the team. */
  state: "confirmed" | "awaiting_review" | "awaiting_payment" | "attended" | "cancelled";
  meetLink: string | null;
}

interface Props {
  sessions: MySession[];
  locale: string;
}

const TONE: Record<MySession["state"], { dot: string; chip: string }> = {
  confirmed: { dot: "bg-emerald-400", chip: "bg-emerald-500/15 text-emerald-300" },
  awaiting_review: { dot: "bg-blue-400", chip: "bg-blue-500/15 text-blue-300" },
  awaiting_payment: { dot: "bg-amber-400", chip: "bg-amber-500/15 text-amber-300" },
  attended: { dot: "bg-purple-400", chip: "bg-purple-500/15 text-purple-300" },
  cancelled: { dot: "bg-red-400", chip: "bg-red-500/15 text-red-300" },
};

function countdown(target: number) {
  const ms = Math.max(0, target - Date.now());
  return {
    ms,
    d: Math.floor(ms / 86_400_000),
    h: Math.floor((ms % 86_400_000) / 3_600_000),
    m: Math.floor((ms % 3_600_000) / 60_000),
    s: Math.floor((ms % 60_000) / 1000),
  };
}

export default function MySessionsBoard({ sessions, locale }: Props) {
  const isAr = locale === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);

  const LABEL: Record<MySession["state"], string> = {
    confirmed: t("مؤكدة", "Confirmed"),
    awaiting_review: t("الإيصال تحت المراجعة", "Receipt under review"),
    awaiting_payment: t("بانتظار الدفع", "Awaiting payment"),
    attended: t("تمت", "Attended"),
    cancelled: t("ملغية", "Cancelled"),
  };

  const [cursor, setCursor] = useState(() => new Date());

  const dated = useMemo(
    () => sessions.filter((s) => s.date).map((s) => ({ ...s, date: normaliseDate(s.date!) })),
    [sessions],
  );

  const todayKey = isoDate(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  const upcoming = useMemo(
    () =>
      dated
        .filter((s) => s.date >= todayKey && s.state !== "cancelled" && s.state !== "attended")
        .sort((a, z) => `${a.date}${a.start_time}`.localeCompare(`${z.date}${z.start_time}`)),
    [dated, todayKey],
  );

  const history = useMemo(
    () =>
      dated
        .filter((s) => s.date < todayKey || s.state === "attended" || s.state === "cancelled")
        .sort((a, z) => `${z.date}${z.start_time}`.localeCompare(`${a.date}${a.start_time}`)),
    [dated, todayKey],
  );

  // The next session that's actually confirmed — that's the one worth a clock.
  const next = upcoming.find((s) => s.state === "confirmed") ?? null;
  const nextStart = next?.date && next.start_time ? new Date(slotStartsAtISO(next.date, next.start_time)).getTime() : null;

  const [tick, setTick] = useState(() => (nextStart ? countdown(nextStart) : null));
  useEffect(() => {
    if (!nextStart) {
      setTick(null);
      return;
    }
    setTick(countdown(nextStart));
    const id = setInterval(() => setTick(countdown(nextStart)), 1000);
    return () => clearInterval(id);
  }, [nextStart]);

  const byDate = useMemo(() => {
    const m = new Map<string, MySession[]>();
    for (const s of dated) {
      if (!m.has(s.date)) m.set(s.date, []);
      m.get(s.date)!.push(s);
    }
    return m;
  }, [dated]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = new Date(year, month, 1).getDay();

  if (sessions.length === 0) return null;

  return (
    <div className="space-y-6 mb-10" dir={isAr ? "rtl" : "ltr"}>
      {/* ── Next confirmed session, counting down ─────────────────────────── */}
      {next && tick && (
        <div
          className="relative rounded-2xl p-6 overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(34,197,94,0.14), rgba(13,21,38,0.85))",
            border: "1px solid rgba(34,197,94,0.3)",
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -top-14 -end-14 w-48 h-48 rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, #22C55E, transparent 70%)" }}
          />
          <div className="relative">
            <span className="inline-flex items-center gap-2 text-emerald-300 text-xs font-black uppercase tracking-widest mb-2">
              <Clock className="h-3.5 w-3.5" />
              {t("جلستك الجاية، مؤكدة", "Your next session, confirmed")}
            </span>
            <p className="text-white font-black text-lg leading-tight mb-1">{next.title}</p>
            <p className="text-white/70 text-sm mb-4">
              {formatISODate(next.date!, isAr)} · {shortTime(next.start_time)}–{shortTime(next.end_time)}
            </p>

            <div className="flex flex-wrap gap-2">
              {[
                { v: tick.d, l: t("يوم", "days") },
                { v: tick.h, l: t("ساعة", "hrs") },
                { v: tick.m, l: t("دقيقة", "min") },
                { v: tick.s, l: t("ثانية", "sec") },
              ].map((u) => (
                <span
                  key={u.l}
                  className="rounded-xl px-3 py-2 text-center"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", minWidth: "68px" }}
                >
                  <span className="block text-white font-black text-lg leading-none">
                    {String(u.v).padStart(2, "0")}
                  </span>
                  <span className="block text-white/45 text-[0.65rem] mt-1">{u.l}</span>
                </span>
              ))}
            </div>

            {next.meetLink && tick.ms <= 15 * 60_000 && (
              <a
                href={next.meetLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-4 px-4 py-2.5 rounded-lg bg-emerald-500 text-[#0f172a] font-bold text-sm"
              >
                <Video className="h-4 w-4" />
                {t("ادخل الجلسة", "Join the session")}
              </a>
            )}
          </div>
        </div>
      )}

      {/* ── Month grid ────────────────────────────────────────────────────── */}
      <div className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.12)] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="flex items-center gap-2 text-white font-black">
            <Calendar className="h-4 w-4 text-[#F59E0B]" />
            {t("جلساتي", "My sessions")}
          </span>
          <span className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setCursor(new Date(year, month - 1, 1))}
              className="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white/70"
              aria-label={t("الشهر السابق", "Previous month")}
            >
              {isAr ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
            </button>
            <span className="px-3 py-1.5 text-sm text-white font-bold">
              {monthName(month, isAr)} {year}
            </span>
            <button
              type="button"
              onClick={() => setCursor(new Date(year, month + 1, 1))}
              className="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white/70"
              aria-label={t("الشهر القادم", "Next month")}
            >
              {isAr ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          </span>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {weekdays(isAr).map((d) => (
            <div key={d} className="text-center text-[0.65rem] font-bold text-white/35 py-1">
              {d.slice(0, 3)}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <div key={`b-${i}`} className="aspect-square" />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const key = isoDate(year, month, day);
            const items = byDate.get(key) ?? [];
            const isToday = key === todayKey;
            const main = items.find((s) => s.state === "confirmed") ?? items[0];

            return (
              <div
                key={day}
                title={items.map((s) => `${shortTime(s.start_time)} ${s.title}`).join("\n")}
                className={`aspect-square rounded-lg border flex flex-col items-center justify-center gap-1 ${
                  items.length
                    ? "bg-white/[0.05] border-white/15"
                    : "bg-white/[0.02] border-white/[0.06]"
                } ${isToday ? "ring-1 ring-[#F59E0B]/60" : ""}`}
              >
                <span className={`text-xs ${items.length ? "text-white font-bold" : "text-white/30"}`}>
                  {day}
                </span>
                {main && <span className={`w-1.5 h-1.5 rounded-full ${TONE[main.state].dot}`} />}
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-white/10 text-[0.7rem]">
          {(["confirmed", "awaiting_review", "awaiting_payment", "attended"] as const).map((k) => (
            <span key={k} className="flex items-center gap-1.5 text-white/50">
              <span className={`w-2 h-2 rounded-full ${TONE[k].dot}`} />
              {LABEL[k]}
            </span>
          ))}
        </div>
      </div>

      {/* ── Upcoming list ─────────────────────────────────────────────────── */}
      {upcoming.length > 0 && (
        <div>
          <h3 className="text-white font-black mb-3">{t("الجاي", "Coming up")}</h3>
          <div className="space-y-2">
            {upcoming.map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/10"
              >
                <span className="text-white text-sm font-bold">
                  {formatISODate(s.date!, isAr)}
                  <span className="text-white/45 font-normal">
                    {" "}· {shortTime(s.start_time)}–{shortTime(s.end_time)}
                  </span>
                </span>
                <span className="text-white/70 text-sm truncate flex-1 min-w-0">{s.title}</span>
                <span className={`text-[0.7rem] font-bold px-2.5 py-1 rounded-full ${TONE[s.state].chip}`}>
                  {LABEL[s.state]}
                </span>
                {s.state === "awaiting_payment" && (
                  <Link
                    href={`/${locale}/book/resume/${s.id}`}
                    className="text-[0.72rem] font-bold px-3 py-1.5 rounded-lg bg-[#F59E0B] text-[#0f172a]"
                  >
                    {t("أكمل الدفع", "Complete payment")}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── History ───────────────────────────────────────────────────────── */}
      {history.length > 0 && (
        <div>
          <h3 className="flex items-center gap-2 text-white font-black mb-3">
            <History className="h-4 w-4 text-white/40" />
            {t("جلسات سابقة", "Past sessions")}
          </h3>
          <div className="space-y-2">
            {history.map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.07]"
              >
                <span className="text-white/60 text-sm">
                  {formatISODate(s.date!, isAr)}
                  <span className="text-white/35">
                    {" "}· {shortTime(s.start_time)}–{shortTime(s.end_time)}
                  </span>
                </span>
                <span className="text-white/50 text-sm truncate flex-1 min-w-0">{s.title}</span>
                <span className={`text-[0.7rem] font-bold px-2.5 py-1 rounded-full ${TONE[s.state].chip}`}>
                  {LABEL[s.state]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
