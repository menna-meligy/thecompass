"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import Link from "next/link";
import { useLocale } from "next-intl";

interface AvailabilitySlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  booked_count: number;
  admin_marked_status: "available" | "full" | "unavailable";
  assignments?: Array<{
    id: string;
    session_id?: string;
    workshop_id?: string;
  }>;
}

interface WorkshopAvailabilityCalendarProps {
  workshopId: string;
  isAr: boolean;
  sessionPrice?: number;
  workshopTitle?: string;
}

export default function WorkshopAvailabilityCalendar({
  workshopId,
  isAr,
  sessionPrice = 500,
  workshopTitle = "Workshop",
}: WorkshopAvailabilityCalendarProps) {
  const locale = useLocale();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    loadSlots();
  }, [workshopId]);

  const loadSlots = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/availability/centralized-slots");
      if (res.ok) {
        const allSlots = await res.json();
        // Show all slots for this workshop
        const workshopSlots = allSlots.filter((slot: AvailabilitySlot) =>
          slot.assignments?.some((a) => a.workshop_id === workshopId)
        );
        // If no workshop-specific slots, show all slots
        setSlots(workshopSlots.length > 0 ? workshopSlots : allSlots);
      }
    } catch (error) {
      console.error("Failed to load slots:", error);
    } finally {
      setLoading(false);
    }
  };

  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const slotsByDate = new Map<string, AvailabilitySlot[]>();
  slots.forEach((slot) => {
    const key = slot.date;
    if (!slotsByDate.has(key)) {
      slotsByDate.set(key, []);
    }
    slotsByDate.get(key)!.push(slot);
  });

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const getDayStatus = (dateStr: string) => {
    const daySlots = slotsByDate.get(dateStr);
    if (!daySlots || daySlots.length === 0) return "empty";

    const hasAvailable = daySlots.some((s) => s.admin_marked_status === "available");
    if (hasAvailable) return "available";

    return "unavailable";
  };

  const getTimeSlotsForDate = (dateStr: string) => {
    return slotsByDate.get(dateStr) || [];
  };

  const isDateInPast = (dateStr: string) => {
    const slotDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return slotDate < today;
  };

  const monthNames = isAr
    ? [
        "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
        "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
      ]
    : [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
      ];

  const weekDays = isAr
    ? ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const days = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const dateString = (day: number) => {
    const d = new Date(year, month, day);
    return d.toISOString().split("T")[0];
  };

  if (loading) {
    return (
      <div className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.12)] rounded-xl p-4">
        <div className="text-center text-white/40 text-sm">
          {isAr ? "جاري التحميل..." : "Loading..."}
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.12)] rounded-xl p-6"
      style={{ textAlign: isAr ? "right" : "left", direction: isAr ? "rtl" : "ltr" }}
    >
      <h3 className="text-white font-bold text-lg mb-4" style={{ marginBottom: "1.5rem" }}>
        {isAr ? "📅 اختر موعداً" : "📅 Choose a Time"}
      </h3>

      {/* Header with Month Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={handlePrevMonth}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          title={isAr ? "الشهر السابق" : "Previous month"}
        >
          <ChevronLeft
            className="w-5 h-5 text-white/60"
            style={{ transform: isAr ? "scaleX(-1)" : "none" }}
          />
        </button>

        <h2 className="text-white font-bold text-lg">
          {monthNames[month]} {year}
        </h2>

        <button
          onClick={handleNextMonth}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          title={isAr ? "الشهر التالي" : "Next month"}
        >
          <ChevronRight
            className="w-5 h-5 text-white/60"
            style={{ transform: isAr ? "scaleX(-1)" : "none" }}
          />
        </button>
      </div>

      {/* Legend */}
      <div className="mb-6 flex gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-white/70">
            {isAr ? "متاح" : "Available"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-white/70">
            {isAr ? "ممتلئ" : "Full/Unavailable"}
          </span>
        </div>
      </div>

      {/* Week Days Header */}
      <div className="grid grid-cols-7 gap-2 mb-4">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-white/50 text-xs font-semibold py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2 mb-6">
        {days.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="aspect-square"></div>;
          }

          const dStr = dateString(day);
          const status = getDayStatus(dStr);
          const daySlots = slotsByDate.get(dStr) || [];
          const isPast = isDateInPast(dStr);
          const isSelected = selectedDate === dStr;

          return (
            <button
              key={day}
              onClick={() => !isPast && status === "available" && setSelectedDate(dStr)}
              disabled={isPast || status !== "available"}
              className={`aspect-square rounded-lg p-2 transition-all flex items-center justify-center text-xs font-semibold cursor-pointer ${
                isSelected
                  ? "ring-2 ring-amber-400 bg-green-500/30 border border-green-500/60 text-green-300"
                  : status === "available"
                    ? "bg-green-500/20 border border-green-500/40 text-green-300 hover:bg-green-500/30"
                    : status === "unavailable"
                      ? "bg-red-500/20 border border-red-500/40 text-red-300 cursor-not-allowed"
                      : "bg-white/5 border border-white/10 text-white/60 cursor-not-allowed"
              }`}
              title={
                daySlots.length > 0
                  ? daySlots.map((s) => `${s.start_time}-${s.end_time}`).join(", ")
                  : ""
              }
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Time Slots for Selected Date */}
      {selectedDate && (
        <div className="border-t border-white/10 pt-4">
          <h3 className="text-white font-bold mb-3">
            {isAr ? "المواعيد المتاحة" : "Available Times"}
          </h3>
          <div className="space-y-2">
            {getTimeSlotsForDate(selectedDate).map((slot) => (
              <Link
                key={slot.id}
                href={`/${locale}/book/receipt?date=${selectedDate}&time=${encodeURIComponent(slot.start_time)}&endTime=${encodeURIComponent(slot.end_time)}&price=${sessionPrice}&title=${encodeURIComponent(workshopTitle)}`}
                className="block p-3 rounded-lg bg-green-500/10 border border-green-500/30 hover:bg-green-500/20 transition text-white"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-green-400" />
                    <span className="font-semibold">{slot.start_time} - {slot.end_time}</span>
                  </div>
                  <span className="text-green-400 text-sm font-bold">
                    {sessionPrice} {isAr ? "ج.م" : "EGP"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {slots.length === 0 && (
        <p className="text-white/30 text-xs text-center mt-6">
          {isAr ? "لا توجد جلسات متاحة حالياً" : "No available sessions currently"}
        </p>
      )}
    </div>
  );
}
