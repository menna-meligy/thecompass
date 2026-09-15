"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { ChevronLeft, ChevronRight, Loader2, Mail, Phone, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatISODate,
  isoDate,
  monthName,
  normaliseDate,
  weekdays,
} from "@/lib/schedule-dates";

/**
 * The coach's schedule ahead of time.
 *
 * Shows confirmed sessions and the ones whose receipt is still being reviewed —
 * both already hold their slot, so both are real commitments on the calendar.
 * (This used to read `sessions.starts_at`; that table is empty in production, so
 * the calendar was permanently blank no matter how many bookings existed.)
 */

interface Meeting {
  id: string;
  state: "confirmed" | "receipt_to_review" | "attended";
  title_ar: string;
  title_en: string;
  slot: { date: string; start_time: string; end_time: string } | null;
  user: { full_name: string | null; email: string | null; phone: string | null } | null;
  payment: { amount: number | null; status: string | null } | null;
  google_meet_link: string | null;
}

export default function MeetingsCalendarPage() {
  const locale = useLocale();
  const isAr = locale === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);

  const [cursor, setCursor] = useState(() => new Date());
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<Meeting | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/bookings?state=all", { cache: "no-store" });
      if (!res.ok) {
        setError(
          res.status === 403
            ? t("محتاجة حساب أدمن.", "You need an admin account.")
            : t("تعذّر تحميل الجدول.", "Couldn't load the schedule."),
        );
        return;
      }
      setError(null);
      const data = await res.json();
      setMeetings(
        (data.bookings ?? []).filter((b: any) =>
          ["confirmed", "attended", "receipt_to_review"].includes(b.state),
        ),
      );
    } catch {
      setError(t("تعذّر الاتصال بالسيرفر.", "Couldn't reach the server."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAr]);

  useEffect(() => {
    load();
  }, [load]);

  const byDate = useMemo(() => {
    const map = new Map<string, Meeting[]>();
    for (const m of meetings) {
      if (!m.slot?.date) continue;
      const key = normaliseDate(m.slot.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    for (const list of map.values()) {
      list.sort((a, z) => (a.slot?.start_time ?? "").localeCompare(z.slot?.start_time ?? ""));
    }
    return map;
  }, [meetings]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = new Date(year, month, 1).getDay();

  const monthCount = Array.from({ length: daysInMonth }, (_, i) =>
    byDate.get(isoDate(year, month, i + 1))?.length ?? 0,
  ).reduce((a, b) => a + b, 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6" dir={isAr ? "rtl" : "ltr"}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#F59E0B] mb-1">
            {t("الجدولة", "Scheduling")}
          </p>
          <h1 className="text-2xl font-black text-white">{t("جدول جلساتك", "Your schedule")}</h1>
          <p className="text-sm text-white/50 mt-2">
            {t(
              "الجلسات المؤكدة واللي إيصالها تحت المراجعة، الاتنين حاجزين ميعادهم فعلاً.",
              "Confirmed sessions plus the ones whose receipt is still under review, both already hold their slot.",
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={refreshing}
          className="flex items-center gap-2 text-sm text-white/60 hover:text-white px-3 py-2 rounded-lg bg-white/5 border border-white/10 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          {t("تحديث", "Refresh")}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/15 border border-red-500/40 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.12)] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-black text-white">
              {monthName(month, isAr)} {year}
            </h2>
            <p className="text-xs text-white/40 mt-1">
              {monthCount} {t("جلسة الشهر ده", monthCount === 1 ? "session this month" : "sessions this month")}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCursor(new Date(year, month - 1, 1))}
              className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-white"
              aria-label={t("الشهر السابق", "Previous month")}
            >
              {isAr ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => setCursor(new Date(year, month + 1, 1))}
              className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-white"
              aria-label={t("الشهر القادم", "Next month")}
            >
              {isAr ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="mb-5 flex flex-wrap gap-5 text-sm">
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-white/70">{t("مؤكد", "Confirmed")}</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-400" />
            <span className="text-white/70">{t("إيصال تحت المراجعة", "Receipt under review")}</span>
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 text-white/50 py-14">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t("جاري التحميل...", "Loading...")}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekdays(isAr).map((d) => (
                <div key={d} className="text-center text-xs font-bold text-white/40 py-2">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: leadingBlanks }).map((_, i) => (
                <div key={`blank-${i}`} className="aspect-square rounded-lg bg-white/[0.02]" />
              ))}

              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                const dateStr = isoDate(year, month, day);
                const dayMeetings = byDate.get(dateStr) ?? [];
                return (
                  <div
                    key={day}
                    className={cn(
                      "aspect-square rounded-lg border transition-all overflow-hidden flex flex-col",
                      dayMeetings.length > 0
                        ? "bg-[rgba(34,197,94,0.08)] border-emerald-500/30"
                        : "bg-white/[0.03] border-white/10",
                    )}
                  >
                    <div
                      className={cn(
                        "text-xs font-semibold px-1.5 pt-1.5",
                        dayMeetings.length > 0 ? "text-emerald-400" : "text-white/50",
                      )}
                    >
                      {day}
                    </div>
                    <div className="flex-1 p-1 overflow-y-auto space-y-0.5 text-[0.62rem]">
                      {dayMeetings.slice(0, 3).map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setSelected(m)}
                          className={cn(
                            "w-full text-start px-1.5 py-0.5 rounded truncate border transition-colors",
                            m.state === "receipt_to_review"
                              ? "bg-blue-500/20 border-blue-500/30 text-blue-200 hover:bg-blue-500/30"
                              : "bg-emerald-500/20 border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/30",
                          )}
                          title={`${m.slot?.start_time} · ${m.user?.full_name ?? ""}`}
                        >
                          {m.slot?.start_time} {m.user?.full_name || m.user?.email || ""}
                        </button>
                      ))}
                      {dayMeetings.length > 3 && (
                        <div className="text-white/35 px-1.5">
                          +{dayMeetings.length - 3} {t("أخرى", "more")}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Upcoming list — easier to read than squinting at the grid */}
      {!loading && meetings.length > 0 && (
        <div className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.12)] rounded-2xl p-6">
          <h2 className="text-white font-black mb-4">{t("الجاي", "Coming up")}</h2>
          <div className="space-y-2">
            {meetings
              .filter((m) => m.slot && normaliseDate(m.slot.date) >= isoDate(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()))
              .sort((a, z) =>
                `${a.slot?.date}${a.slot?.start_time}`.localeCompare(`${z.slot?.date}${z.slot?.start_time}`),
              )
              .slice(0, 12)
              .map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelected(m)}
                  className="w-full text-start flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/10 hover:border-[#F59E0B]/30 transition-colors"
                >
                  <span className="text-white text-sm">
                    <span className="font-bold">{formatISODate(m.slot!.date, isAr)}</span>
                    <span className="text-white/50">
                      {" "}
                      · {m.slot!.start_time}–{m.slot!.end_time}
                    </span>
                  </span>
                  <span className="text-white/70 text-sm truncate">
                    {m.user?.full_name || m.user?.email}
                  </span>
                  <span className="text-white/45 text-xs truncate">
                    {isAr ? m.title_ar : m.title_en}
                  </span>
                  <span
                    className={cn(
                      "text-xs font-bold px-2 py-0.5 rounded-full",
                      m.state === "receipt_to_review"
                        ? "bg-blue-500/15 text-blue-300"
                        : "bg-emerald-500/15 text-emerald-300",
                    )}
                  >
                    {m.state === "receipt_to_review" ? t("تحت المراجعة", "Under review") : t("مؤكد", "Confirmed")}
                  </span>
                </button>
              ))}
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d1526] border border-[rgba(245,158,11,0.2)] rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-start justify-between gap-4 mb-4">
              <h3 className="text-lg font-black text-white">
                {selected.user?.full_name || t("تفاصيل الجلسة", "Session details")}
              </h3>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-white/40 hover:text-white"
                aria-label={t("إغلاق", "Close")}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 mb-6 text-sm">
              <Field label={t("الجلسة", "Session")}>
                {isAr ? selected.title_ar : selected.title_en}
              </Field>
              <Field label={t("الموعد", "Time")}>
                {selected.slot
                  ? `${formatISODate(selected.slot.date, isAr)} · ${selected.slot.start_time}–${selected.slot.end_time}`
                  : t("لا يوجد", "N/A")}
              </Field>
              {selected.user?.email && (
                <Field label={t("الإيميل", "Email")}>
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-white/40" />
                    {selected.user.email}
                  </span>
                </Field>
              )}
              {selected.user?.phone && (
                <Field label={t("الموبايل", "Phone")}>
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-white/40" />
                    {selected.user.phone}
                  </span>
                </Field>
              )}
              {selected.google_meet_link && (
                <Field label={t("الرابط", "Link")}>
                  <a
                    href={selected.google_meet_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#F59E0B] hover:underline break-all"
                  >
                    {selected.google_meet_link}
                  </a>
                </Field>
              )}
              <div className="pt-2 border-t border-white/10">
                <p
                  className={cn(
                    "text-xs font-semibold",
                    selected.state === "receipt_to_review" ? "text-blue-300" : "text-emerald-400",
                  )}
                >
                  {selected.state === "receipt_to_review"
                    ? t("● الإيصال لسه تحت المراجعة، الموعد محجوز", "● Receipt still under review, slot is held")
                    : t("✓ مؤكد ومدفوع", "✓ Confirmed & paid")}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelected(null)}
              className="w-full bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[#F59E0B] font-semibold py-2 rounded-lg hover:bg-[#F59E0B]/15 transition-colors"
            >
              {t("إغلاق", "Close")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-white/40 uppercase font-semibold tracking-wider mb-1">{label}</p>
      <div className="text-white font-semibold">{children}</div>
    </div>
  );
}
