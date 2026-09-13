"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CalendarSlot {
  id: string;
  date: string;
  admin_marked_status: "available" | "full" | "unavailable";
  start_time: string;
  end_time: string;
}

interface CalendarGridProps {
  slots: CalendarSlot[];
  onDateClick: (date: string) => void;
  isAr: boolean;
}

export default function CalendarGrid({
  slots,
  onDateClick,
  isAr,
}: CalendarGridProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  // Build slot status map by date
  const slotsByDate = new Map<string, CalendarSlot[]>();
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

    // Check if any slot is unavailable
    if (daySlots.some((s) => s.admin_marked_status === "unavailable")) {
      return "unavailable";
    }

    // Otherwise available
    return "available";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-500";
      case "full":
      case "unavailable":
        return "bg-red-500";
      default:
        return "bg-gray-400";
    }
  };

  const getStatusLabel = (status: string) => {
    if (isAr) {
      switch (status) {
        case "available":
          return "متاح";
        case "full":
        case "unavailable":
          return "ممتلئ";
        default:
          return "";
      }
    } else {
      switch (status) {
        case "available":
          return "Available";
        case "full":
        case "unavailable":
          return "Full";
        default:
          return "";
      }
    }
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

  return (
    <div className="bg-[#0d1526] rounded-2xl p-6 border border-[rgba(245,158,11,0.18)]">
      {/* Header with Month Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={handlePrevMonth}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          title={isAr ? "الشهر السابق" : "Previous month"}
        >
          <ChevronLeft className="w-5 h-5 text-white/60" />
        </button>

        <h2 className="text-white font-bold text-lg">
          {monthNames[month]} {year}
        </h2>

        <button
          onClick={handleNextMonth}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          title={isAr ? "الشهر التالي" : "Next month"}
        >
          <ChevronRight className="w-5 h-5 text-white/60" />
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
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-400"></div>
          <span className="text-white/70">
            {isAr ? "بدون حجوزات" : "No slots"}
          </span>
        </div>
      </div>

      {/* Week Days Header */}
      <div className="grid grid-cols-7 gap-2 mb-4">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-white/50 text-xs font-semibold py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="aspect-square"></div>;
          }

          const dStr = dateString(day);
          const status = getDayStatus(dStr);
          const daySlots = slotsByDate.get(dStr) || [];

          return (
            <button
              key={day}
              onClick={() => onDateClick(dStr)}
              className={`aspect-square rounded-lg p-2 transition-all relative group ${
                status === "available"
                  ? "bg-white/5 hover:bg-white/10 border border-white/10"
                  : status === "full" || status === "unavailable"
                    ? "bg-red-500/10 hover:bg-red-500/20 border border-red-500/30"
                    : "bg-white/5 hover:bg-white/10 border border-white/10"
              }`}
            >
              <div className="h-full flex flex-col items-center justify-center">
                <span className="text-white font-semibold text-sm">{day}</span>

                {/* Status Indicator */}
                {daySlots.length > 0 && (
                  <div className={`mt-1 w-2 h-2 rounded-full ${getStatusColor(status)}`}></div>
                )}
              </div>

              {/* Tooltip on hover */}
              {daySlots.length > 0 && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#0a0f1a] rounded-lg p-2 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-white/20">
                  {daySlots.map((s) => `${s.start_time}-${s.end_time}`).join(", ")}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Info Text */}
      <p className="text-white/40 text-xs mt-6 text-center">
        {isAr
          ? "انقر على أي يوم لإنشاء حجز أو تعليم اليوم كممتلئ"
          : "Click any day to create a slot or mark as unavailable"}
      </p>
    </div>
  );
}
