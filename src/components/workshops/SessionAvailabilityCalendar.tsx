"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface AvailabilitySlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  booked_count: number;
  admin_marked_status: "available" | "full" | "unavailable";
  assignments: Array<{
    id: string;
    session_id?: string;
    workshop_id?: string;
  }>;
}

interface SessionAvailabilityCalendarProps {
  sessionId: string;
  isAr: boolean;
}

export default function SessionAvailabilityCalendar({
  sessionId,
  isAr,
}: SessionAvailabilityCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSlots();
  }, [sessionId]);

  const loadSlots = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/availability/centralized-slots");
      if (res.ok) {
        const allSlots = await res.json();
        // Filter slots for this session
        const sessionSlots = allSlots.filter((slot: AvailabilitySlot) =>
          slot.assignments?.some((a) => a.session_id === sessionId)
        );
        setSlots(sessionSlots);
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

  // Build slot status map by date
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

    // Check if all slots are unavailable/full
    const hasAvailable = daySlots.some((s) => s.admin_marked_status === "available");
    if (hasAvailable) return "available";

    return "unavailable";
  };

  const monthNames = isAr
    ? [
        "يناير",
        "فبراير",
        "مارس",
        "أبريل",
        "مايو",
        "يونيو",
        "يوليو",
        "أغسطس",
        "سبتمبر",
        "أكتوبر",
        "نوفمبر",
        "ديسمبر",
      ]
    : [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
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
      className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.12)] rounded-xl p-4 text-sm"
      style={{ textAlign: isAr ? "right" : "left", direction: isAr ? "rtl" : "ltr" }}
    >
      {/* Header with Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePrevMonth}
          className="p-1 hover:bg-white/10 rounded-lg transition-colors"
          title={isAr ? "الشهر السابق" : "Previous month"}
        >
          <ChevronLeft
            className="w-4 h-4 text-white/60"
            style={{ transform: isAr ? "scaleX(-1)" : "none" }}
          />
        </button>

        <h3 className="text-white font-bold text-sm">
          {monthNames[month]} {year}
        </h3>

        <button
          onClick={handleNextMonth}
          className="p-1 hover:bg-white/10 rounded-lg transition-colors"
          title={isAr ? "الشهر التالي" : "Next month"}
        >
          <ChevronRight
            className="w-4 h-4 text-white/60"
            style={{ transform: isAr ? "scaleX(-1)" : "none" }}
          />
        </button>
      </div>

      {/* Legend */}
      <div className="mb-3 flex gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span className="text-white/60">{isAr ? "متاح" : "Available"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-red-500"></div>
          <span className="text-white/60">{isAr ? "ممتلئ" : "Full"}</span>
        </div>
      </div>

      {/* Week Days Header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-white/40 text-xs font-semibold py-1">
            {day.substring(0, 2)}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="aspect-square"></div>;
          }

          const dStr = dateString(day);
          const status = getDayStatus(dStr);
          const daySlots = slotsByDate.get(dStr) || [];

          return (
            <div
              key={day}
              className={`aspect-square rounded-lg p-1 transition-all flex items-center justify-center text-xs font-semibold ${
                status === "available"
                  ? "bg-green-500/20 border border-green-500/40 text-green-300"
                  : status === "unavailable"
                    ? "bg-red-500/20 border border-red-500/40 text-red-300"
                    : "bg-white/5 border border-white/10 text-white/60"
              }`}
              title={
                daySlots.length > 0
                  ? daySlots.map((s) => `${s.start_time}-${s.end_time}`).join(", ")
                  : ""
              }
            >
              {day}
            </div>
          );
        })}
      </div>

      {slots.length === 0 && (
        <p className="text-white/30 text-xs text-center mt-4">
          {isAr ? "لا توجد جلسات متاحة" : "No available sessions"}
        </p>
      )}
    </div>
  );
}
