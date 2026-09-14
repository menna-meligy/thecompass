"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { ChevronLeft, ChevronRight, Clock, Loader2, Users } from "lucide-react";
import BookingFlow from "@/components/booking/BookingFlow";
import { createClient } from "@/lib/supabase/client";
import {
  isoDate,
  isPastDate,
  monthName,
  normaliseDate,
  slotStartsAtISO,
  weekdays,
} from "@/lib/schedule-dates";

/**
 * The one calendar the whole product books through — the Career Deciding
 * Session and all three workshops (1-on-1 and group). Point it at an offering
 * key and it shows exactly the times that offering is open for, then hands off
 * to the identical payment + receipt flow.
 *
 * A slot vanishes from here the instant someone's receipt is accepted, on every
 * open browser, because the list refreshes off a Postgres realtime subscription
 * with a polling fallback.
 */

interface Slot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  booked_count: number;
  seats_left: number;
}

interface Props {
  /** "career" | "<workshopId>:individual" | "<workshopId>:group" */
  offering: string;
  title: string;
  price: number;
  isAr: boolean;
  /** Shown above the grid; defaults to a generic "pick a time". */
  heading?: string;
}

const REFRESH_MS = 10_000;

export default function OfferingCalendar({ offering, title, price, isAr, heading }: Props) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const [cursor, setCursor] = useState(() => new Date());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [blockedDates, setBlockedDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/availability/centralized-slots?offering=${encodeURIComponent(offering)}`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const data = await res.json();
      setSlots(Array.isArray(data.slots) ? data.slots : []);
      setBlockedDates(new Set<string>(data.blockedDates ?? []));
    } catch {
      /* transient — the next poll retries */
    } finally {
      setLoading(false);
    }
  }, [offering]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  // Live sync: react to any slot change, and poll as a fallback for when the
  // realtime socket isn't available.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`slots-${offering}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "availability_slots" }, () => load())
      .subscribe();

    const timer = setInterval(load, REFRESH_MS);
    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [load, offering]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      setAuthChecked(true);
    });
  }, []);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = new Date(year, month, 1).getDay();

  const byDate = new Map<string, Slot[]>();
  for (const s of slots) {
    const key = normaliseDate(s.date);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(s);
  }

  function dayState(dateStr: string): "past" | "blocked" | "available" | "empty" {
    if (isPastDate(dateStr)) return "past";
    if (blockedDates.has(dateStr)) return "blocked";
    return (byDate.get(dateStr)?.length ?? 0) > 0 ? "available" : "empty";
  }

  function chooseSlot(slot: Slot) {
    if (!userId) {
      router.push(`/${locale}/auth?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    setSelectedSlot(slot);
  }

  // ── Payment + receipt, identical for every offering ──────────────────────
  if (selectedSlot && userId) {
    return (
      <div
        className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.12)] rounded-xl p-6"
        style={{ textAlign: isAr ? "right" : "left", direction: isAr ? "rtl" : "ltr" }}
      >
        <BookingFlow
          sessionId={selectedSlot.id}
          offering={offering}
          workshopTitle={title}
          price={price}
          userId={userId}
          sessionStartsAt={slotStartsAtISO(selectedSlot.date, selectedSlot.start_time)}
          sessionEndsAt={slotStartsAtISO(selectedSlot.date, selectedSlot.end_time)}
          onBack={() => {
            setSelectedSlot(null);
            load();
          }}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.12)] rounded-xl p-6">
        <div className="flex items-center justify-center gap-2 text-white/40 text-sm py-6">
          <Loader2 className="w-4 h-4 animate-spin" />
          {isAr ? "جاري تحميل المواعيد..." : "Loading times..."}
        </div>
      </div>
    );
  }

  const daySlots = selectedDate ? (byDate.get(selectedDate) ?? []) : [];

  return (
    <div
      className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.12)] rounded-xl p-6"
      style={{ textAlign: isAr ? "right" : "left", direction: isAr ? "rtl" : "ltr" }}
    >
      <h3 className="text-white font-bold text-lg mb-6">
        {heading ?? (isAr ? "📅 اختر موعداً" : "📅 Choose a time")}
      </h3>

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={() => setCursor(new Date(year, month - 1, 1))}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          aria-label={isAr ? "الشهر السابق" : "Previous month"}
        >
          <ChevronLeft className="w-5 h-5 text-white/60" style={{ transform: isAr ? "scaleX(-1)" : "none" }} />
        </button>
        <h2 className="text-white font-bold text-lg">
          {monthName(month, isAr)} {year}
        </h2>
        <button
          type="button"
          onClick={() => setCursor(new Date(year, month + 1, 1))}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          aria-label={isAr ? "الشهر التالي" : "Next month"}
        >
          <ChevronRight className="w-5 h-5 text-white/60" style={{ transform: isAr ? "scaleX(-1)" : "none" }} />
        </button>
      </div>

      {/* Legend */}
      <div className="mb-6 flex flex-wrap gap-4 text-sm">
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-white/70">{isAr ? "متاح" : "Available"}</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-white/70">{isAr ? "مقفول" : "Closed"}</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-white/20" />
          <span className="text-white/70">{isAr ? "مفيش مواعيد" : "No times"}</span>
        </span>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-2 mb-3">
        {weekdays(isAr).map((d) => (
          <div key={d} className="text-center text-white/50 text-xs font-semibold py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-2 mb-6">
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div key={`blank-${i}`} className="aspect-square" />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const dateStr = isoDate(year, month, day);
          const state = dayState(dateStr);
          const isSelected = selectedDate === dateStr;
          const count = byDate.get(dateStr)?.length ?? 0;

          return (
            <button
              key={day}
              type="button"
              onClick={() => state === "available" && setSelectedDate(dateStr)}
              disabled={state !== "available"}
              title={
                state === "blocked"
                  ? isAr ? "اليوم ده مقفول" : "This day is closed"
                  : count > 0
                    ? `${count} ${isAr ? "موعد" : "times"}`
                    : ""
              }
              className={`aspect-square rounded-lg p-2 transition-all flex flex-col items-center justify-center text-xs font-semibold ${
                isSelected
                  ? "ring-2 ring-amber-400 bg-green-500/30 border border-green-500/60 text-green-200"
                  : state === "available"
                    ? "bg-green-500/20 border border-green-500/40 text-green-300 hover:bg-green-500/30 cursor-pointer"
                    : state === "blocked"
                      ? "bg-red-500/15 border border-red-500/30 text-red-300/70 cursor-not-allowed"
                      : state === "past"
                        ? "bg-white/[0.03] border border-white/5 text-white/20 cursor-not-allowed"
                        : "bg-white/5 border border-white/10 text-white/35 cursor-not-allowed"
              }`}
            >
              <span>{day}</span>
              {state === "available" && count > 0 && (
                <span className="text-[0.6rem] font-normal opacity-70">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Times for the chosen day */}
      {selectedDate && (
        <div className="border-t border-white/10 pt-4">
          <h4 className="text-white font-bold mb-3">
            {isAr ? "المواعيد المتاحة" : "Available times"}
          </h4>
          {daySlots.length === 0 ? (
            <p className="text-white/40 text-sm">
              {isAr ? "المواعيد اتحجزت. اختار يوم تاني." : "These times were just taken. Please pick another day."}
            </p>
          ) : (
            <div className="space-y-2">
              {daySlots.map((slot) => (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => chooseSlot(slot)}
                  disabled={!authChecked}
                  className="w-full text-start p-3 rounded-lg bg-green-500/10 border border-green-500/30 hover:bg-green-500/20 transition text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2">
                      {authChecked ? (
                        <Clock className="w-4 h-4 text-green-400" />
                      ) : (
                        <Loader2 className="w-4 h-4 text-green-400 animate-spin" />
                      )}
                      <span className="font-semibold">
                        {slot.start_time} - {slot.end_time}
                      </span>
                    </span>
                    <span className="flex items-center gap-3">
                      {slot.capacity > 1 && (
                        <span className="flex items-center gap-1 text-white/50 text-xs">
                          <Users className="w-3.5 h-3.5" />
                          {slot.seats_left} {isAr ? "مكان" : "left"}
                        </span>
                      )}
                      <span className="text-green-400 text-sm font-bold">
                        {price.toLocaleString()} {isAr ? "ج.م" : "EGP"}
                      </span>
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {slots.length === 0 && (
        <p className="text-white/35 text-sm text-center mt-6">
          {isAr
            ? "مفيش مواعيد متاحة حالياً — تابعنا قريباً."
            : "No times are open right now — check back soon."}
        </p>
      )}
    </div>
  );
}
