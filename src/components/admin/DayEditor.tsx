"use client";

import { useMemo, useState } from "react";
import { Check, Clock, Lock, Trash2, Unlock, X, CalendarPlus, AlertTriangle } from "lucide-react";
import type { Offering } from "@/lib/offerings";
import { formatISODate } from "@/lib/schedule-dates";
import type { AdminSlot } from "./availability-types";

/**
 * What the coach does to a single day.
 *
 * The two outcomes are deliberately separate, self-contained actions with their
 * own buttons — they used to sit side by side under one shared time form, where
 * "mark unavailable" silently reused whatever times happened to be typed in:
 *
 *   🟢 Available day → add one or more bookable time windows
 *   🔴 Full day      → close the whole day; nothing on it is bookable
 */

type Mode = null | "available" | "close";

interface Props {
  date: string;
  slots: AdminSlot[];
  offerings: Offering[];
  isAr: boolean;
  onClose: () => void;
  onAddTime: (data: { date: string; start_time: string; end_time: string; offerings: string[] }) => Promise<void>;
  onCloseDay: (date: string) => Promise<void>;
  onReopenDay: (date: string) => Promise<void>;
  onDeleteSlot: (slotId: string) => Promise<void>;
  onCancelBooking: (bookingId: string) => Promise<void>;
}

export default function DayEditor({
  date,
  slots,
  offerings,
  isAr,
  onClose,
  onAddTime,
  onCloseDay,
  onReopenDay,
  onDeleteSlot,
  onCancelBooking,
}: Props) {
  const [mode, setMode] = useState<Mode>(null);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dayBlock = slots.find((s) => s.is_day_block);
  const times = useMemo(
    () => slots.filter((s) => !s.is_day_block).sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [slots],
  );

  const t = (ar: string, en: string) => (isAr ? ar : en);

  function toggle(key: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("حصلت مشكلة", "Something went wrong"));
    } finally {
      setBusy(false);
    }
  }

  async function submitTime() {
    setError(null);
    if (startTime >= endTime) {
      setError(t("وقت البداية لازم يكون قبل النهاية", "Start time must be before end time"));
      return;
    }
    if (picked.size === 0) {
      setError(t("اختار نوع جلسة واحد على الأقل", "Pick at least one session type"));
      return;
    }
    await run(async () => {
      await onAddTime({ date, start_time: startTime, end_time: endTime, offerings: Array.from(picked) });
      setPicked(new Set());
      setMode(null);
    });
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div
        className="bg-[#0d1526] rounded-2xl w-full max-w-lg border border-[rgba(245,158,11,0.18)] my-8"
        dir={isAr ? "rtl" : "ltr"}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-6 pb-4 border-b border-white/10">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#F59E0B] mb-1">
              {t("إدارة اليوم", "Manage day")}
            </p>
            <h2 className="text-white font-black text-lg">{formatISODate(date, isAr)}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors"
            aria-label={t("إغلاق", "Close")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-500/15 border border-red-500/40 rounded-lg text-red-300 text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* ── Closed day ──────────────────────────────────────────────── */}
          {dayBlock ? (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
              <p className="flex items-center gap-2 text-red-300 font-bold mb-1">
                <Lock className="w-4 h-4" />
                {t("اليوم ده مقفول بالكامل", "This day is fully closed")}
              </p>
              <p className="text-white/50 text-sm mb-4">
                {t(
                  "مش ظاهر كمتاح لأي عميل. افتحه تاني لو عايزة تحطي مواعيد.",
                  "No client can book anything on it. Re-open it to add times.",
                )}
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => run(() => onReopenDay(date))}
                className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-colors"
              >
                <Unlock className="w-4 h-4" />
                {t("افتح اليوم تاني", "Re-open this day")}
              </button>
            </div>
          ) : (
            <>
              {/* ── The two separate actions ──────────────────────────── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMode(mode === "available" ? null : "available")}
                  className={`p-4 rounded-xl border text-start transition-all ${
                    mode === "available"
                      ? "bg-green-500/20 border-green-500/60"
                      : "bg-green-500/8 border-green-500/25 hover:bg-green-500/15"
                  }`}
                >
                  <span className="flex items-center gap-2 text-green-300 font-black mb-1">
                    <CalendarPlus className="w-4 h-4" />
                    {t("🟢 يوم متاح", "🟢 Available day")}
                  </span>
                  <span className="block text-white/50 text-xs leading-relaxed">
                    {t("ضيفي مواعيد يقدر العملاء يحجزوها", "Add time windows clients can book")}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode(mode === "close" ? null : "close")}
                  className={`p-4 rounded-xl border text-start transition-all ${
                    mode === "close"
                      ? "bg-red-500/20 border-red-500/60"
                      : "bg-red-500/8 border-red-500/25 hover:bg-red-500/15"
                  }`}
                >
                  <span className="flex items-center gap-2 text-red-300 font-black mb-1">
                    <Lock className="w-4 h-4" />
                    {t("🔴 يوم كامل مقفول", "🔴 Full day closed")}
                  </span>
                  <span className="block text-white/50 text-xs leading-relaxed">
                    {t("اقفلي اليوم كله، مش هيظهر لحد", "Close the whole day — nobody can book it")}
                  </span>
                </button>
              </div>

              {/* ── Available day: the time form ──────────────────────── */}
              {mode === "available" && (
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="block text-white/60 text-sm font-medium mb-1.5">
                        {t("من", "From")}
                      </span>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#F59E0B]"
                      />
                    </label>
                    <label className="block">
                      <span className="block text-white/60 text-sm font-medium mb-1.5">
                        {t("إلى", "To")}
                      </span>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#F59E0B]"
                      />
                    </label>
                  </div>

                  <div>
                    <p className="text-white/60 text-sm font-medium mb-2">
                      {t("الموعد ده متاح لإيه؟", "This time is open for")}
                    </p>
                    <div className="space-y-1 max-h-52 overflow-y-auto bg-white/5 border border-white/15 rounded-lg p-2">
                      {offerings.map((o) => (
                        <label
                          key={o.key}
                          className="flex items-center gap-3 p-2 hover:bg-white/10 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={picked.has(o.key)}
                            onChange={() => toggle(o.key)}
                            className="w-4 h-4 accent-[#F59E0B]"
                          />
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm text-white truncate">
                              {isAr ? o.labelAr : o.labelEn}
                            </span>
                            <span className="block text-xs text-white/45">
                              {o.price.toLocaleString()} {t("ج.م", "EGP")}
                              {o.capacity > 1 && ` · ${o.capacity} ${t("أماكن", "seats")}`}
                            </span>
                          </span>
                          {picked.has(o.key) && <Check className="w-4 h-4 text-[#F59E0B]" />}
                        </label>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={submitTime}
                    disabled={busy}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-colors"
                  >
                    {busy ? "..." : t("أضف الموعد", "Add this time")}
                  </button>
                </div>
              )}

              {/* ── Full day: confirm ─────────────────────────────────── */}
              {mode === "close" && (
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                  <p className="text-white/70 text-sm mb-4 leading-relaxed">
                    {t(
                      "هيتشال اليوم ده من كل التقاويم وميقدرش أي عميل يحجز فيه. لو فيه حجوزات قايمة، ألغيها من قائمة مواعيد اليوم تحت الأول.",
                      "This day is removed from every calendar and nobody can book it. If any bookings are still live, cancel them from the list of times below first.",
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={() => run(async () => { await onCloseDay(date); setMode(null); })}
                    disabled={busy}
                    className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-colors"
                  >
                    <Lock className="w-4 h-4" />
                    {busy ? "..." : t("اقفل اليوم كله", "Close the whole day")}
                  </button>
                </div>
              )}
            </>
          )}

          {/* ── Existing times on this day ──────────────────────────────── */}
          {times.length > 0 && (
            <div>
              <p className="text-white/60 text-sm font-medium mb-2">
                {t("مواعيد اليوم", "Times on this day")}
              </p>
              <div className="space-y-2">
                {times.map((slot) => {
                  const held = slot.bookings.filter((b) => b.slot_reserved_at);
                  const full = slot.booked_count >= slot.capacity;
                  return (
                    <div
                      key={slot.id}
                      className="p-3 rounded-lg bg-white/[0.03] border border-white/10"
                    >
                      <div className="flex items-center justify-between gap-3 mb-1.5">
                        <span className="flex items-center gap-2 text-white font-semibold text-sm">
                          <Clock className="w-3.5 h-3.5 text-[#F59E0B]" />
                          {slot.start_time} – {slot.end_time}
                        </span>
                        <span className="flex items-center gap-2">
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              full
                                ? "bg-amber-400/15 text-amber-300"
                                : "bg-green-500/15 text-green-300"
                            }`}
                          >
                            {full
                              ? t("محجوز", "Booked")
                              : `${slot.capacity - slot.booked_count} ${t("متاح", "open")}`}
                          </span>
                          <button
                            type="button"
                            onClick={() => run(() => onDeleteSlot(slot.id))}
                            disabled={busy}
                            className="text-white/30 hover:text-red-400 transition-colors disabled:opacity-40"
                            aria-label={t("حذف", "Delete")}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </span>
                      </div>

                      <p className="text-white/40 text-xs">
                        {slot.committed_offering_type
                          ? t("اتحجز كـ: ", "Taken as: ") +
                            (slot.committed_offering_type === "career"
                              ? t("جلسة تحديد المسار", "Career session")
                              : `${
                                  (isAr
                                    ? slot.assignments.find((a) => a.workshop_id === slot.committed_workshop_id)?.workshop?.title_ar
                                    : slot.assignments.find((a) => a.workshop_id === slot.committed_workshop_id)?.workshop?.title_en) ?? "—"
                                } · ${
                                  slot.committed_offering_type === "group"
                                    ? t("مجموعة", "group")
                                    : t("فردي", "1-on-1")
                                }`)
                          : slot.assignments.length === 0
                          ? t("مش متعيّن لأي جلسة", "Not assigned to any session type")
                          : slot.assignments
                              .map((a) =>
                                a.offering_type === "career"
                                  ? t("جلسة تحديد المسار", "Career session")
                                  : `${(isAr ? a.workshop?.title_ar : a.workshop?.title_en) ?? "—"} · ${
                                      a.offering_type === "group"
                                        ? t("مجموعة", "group")
                                        : t("فردي", "1-on-1")
                                    }`,
                              )
                              .join(" • ")}
                      </p>

                      {held.length > 0 && (
                        <div className="mt-2 border-t border-white/10 pt-2 space-y-1.5">
                          <p className="text-[0.7rem] text-white/35">
                            {t(
                              "عشان تمسحي الموعد ده لازم تلغي حجوزاته الأول:",
                              "To delete this time, cancel its bookings first:",
                            )}
                          </p>
                          {held.map((b) => (
                            <div key={b.id} className="flex items-center gap-2 text-xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                              <span className="text-white/70 truncate flex-1 min-w-0">
                                {b.user?.full_name || b.user?.email || b.user_id.slice(0, 8)}
                                <span className="text-white/35">
                                  {" · "}
                                  {b.status === "confirmed"
                                    ? t("مؤكد", "confirmed")
                                    : t("إيصال للمراجعة", "receipt to review")}
                                </span>
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  if (
                                    !window.confirm(
                                      t(
                                        "هتلغي حجز العميل ده ويرجع الموعد متاح. متأكدة؟",
                                        "This cancels the client's booking and frees the time. Are you sure?",
                                      ),
                                    )
                                  )
                                    return;
                                  run(() => onCancelBooking(b.id));
                                }}
                                disabled={busy}
                                className="flex-shrink-0 px-2 py-1 rounded border border-red-500/30 text-red-300 hover:bg-red-500/15 transition-colors disabled:opacity-40"
                              >
                                {t("ألغِ الحجز", "Cancel booking")}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 pt-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-white/10 hover:bg-white/15 text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            {t("تمام", "Done")}
          </button>
        </div>
      </div>
    </div>
  );
}
