"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { isoDate, isPastDate, monthName, normaliseDate, weekdays } from "@/lib/schedule-dates";
import type { AdminSlot } from "./availability-types";

interface Props {
  slots: AdminSlot[];
  onDateClick: (date: string) => void;
  isAr: boolean;
}

/**
 * Month view of the coach's availability. Each day shows, at a glance: is it
 * closed, how many times are open, and how many of those are already taken.
 *
 * Date keys are built from local calendar fields — never `toISOString()`, which
 * shifts a Cairo midnight back into the previous day and used to make every
 * slot render one square early.
 */
export default function CalendarGrid({ slots, onDateClick, isAr }: Props) {
  const [cursor, setCursor] = useState(() => new Date());

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = new Date(year, month, 1).getDay();

  const byDate = new Map<string, AdminSlot[]>();
  for (const s of slots) {
    const key = normaliseDate(s.date);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(s);
  }

  return (
    <div className="bg-[#0d1526] rounded-2xl p-6 border border-[rgba(245,158,11,0.18)]">
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={() => setCursor(new Date(year, month - 1, 1))}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          aria-label={isAr ? "الشهر السابق" : "Previous month"}
        >
          <ChevronLeft className="w-5 h-5 text-white/60" />
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
          <ChevronRight className="w-5 h-5 text-white/60" />
        </button>
      </div>

      <div className="mb-6 flex flex-wrap gap-5 text-sm">
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-white/70">{isAr ? "فيه مواعيد متاحة" : "Times open"}</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-amber-400" />
          <span className="text-white/70">{isAr ? "محجوز بالكامل" : "Fully booked"}</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-white/70">{isAr ? "يوم مقفول" : "Day closed"}</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-white/20" />
          <span className="text-white/70">{isAr ? "مفيش مواعيد" : "Nothing set"}</span>
        </span>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-3">
        {weekdays(isAr).map((d) => (
          <div key={d} className="text-center text-white/50 text-xs font-semibold py-2">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div key={`blank-${i}`} className="aspect-square" />
        ))}

        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const dateStr = isoDate(year, month, day);
          const daySlots = byDate.get(dateStr) ?? [];
          const closed = daySlots.some((s) => s.is_day_block);
          const times = daySlots.filter((s) => !s.is_day_block);
          const openTimes = times.filter((s) => s.booked_count < s.capacity).length;
          const takenTimes = times.length - openTimes;
          const past = isPastDate(dateStr);

          const tone = closed
            ? "bg-red-500/10 border-red-500/30 text-red-300"
            : times.length === 0
              ? "bg-white/5 border-white/10 text-white/45"
              : openTimes === 0
                ? "bg-amber-400/10 border-amber-400/30 text-amber-300"
                : "bg-green-500/10 border-green-500/30 text-green-300";

          return (
            <button
              key={day}
              type="button"
              onClick={() => onDateClick(dateStr)}
              className={`aspect-square rounded-lg p-1.5 border transition-all flex flex-col items-center justify-center gap-0.5 hover:brightness-125 ${tone} ${
                past ? "opacity-45" : ""
              }`}
              title={
                closed
                  ? isAr ? "يوم مقفول" : "Day closed"
                  : times.length
                    ? times.map((s) => `${s.start_time}-${s.end_time}`).join(", ")
                    : isAr ? "اضغط لإضافة مواعيد" : "Click to add times"
              }
            >
              <span className="text-xs font-bold">{day}</span>
              {closed ? (
                <span className="text-[0.58rem] leading-none">{isAr ? "مقفول" : "closed"}</span>
              ) : times.length > 0 ? (
                <span className="text-[0.58rem] leading-none">
                  {openTimes}
                  {takenTimes > 0 && <span className="opacity-60"> / {times.length}</span>}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
