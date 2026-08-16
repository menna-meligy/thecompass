"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DatePickerCalendarProps {
  availableDates: string[]; // ISO dates that have availability
  occupiedDates: string[]; // ISO dates that are full
  onDateSelect: (date: string) => void;
  selectedDate?: string;
  minDate?: string;
  isArabic?: boolean;
}

export default function DatePickerCalendar({
  availableDates,
  occupiedDates,
  onDateSelect,
  selectedDate,
  minDate,
  isArabic = false,
}: DatePickerCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const firstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const monthName = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(currentDate);

  const days = useMemo(() => {
    const result = [];
    const dayCount = daysInMonth(currentDate);
    const firstDay = firstDayOfMonth(currentDate);

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      result.push(null);
    }

    // Days of the month
    for (let i = 1; i <= dayCount; i++) {
      result.push(i);
    }

    return result;
  }, [currentDate]);

  const formatDateToISO = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const isDateAvailable = (day: number): boolean => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateString = formatDateToISO(date);
    return availableDates.includes(dateString);
  };

  const isDateOccupied = (day: number): boolean => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateString = formatDateToISO(date);
    return occupiedDates.includes(dateString);
  };

  const isDateInPast = (day: number): boolean => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const isDateSelected = (day: number): boolean => {
    if (!selectedDate) return false;
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateString = formatDateToISO(date);
    return dateString === selectedDate;
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const handleDateClick = (day: number) => {
    if (!isDateInPast(day) && !isDateOccupied(day)) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dateString = formatDateToISO(date);
      onDateSelect(dateString);
    }
  };

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div style={{ background: "#0f172a", padding: "24px", borderRadius: "12px", color: "white" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <button
          onClick={handlePrevMonth}
          style={{
            background: "rgba(245,158,11,0.1)",
            border: "1px solid rgba(245,158,11,0.25)",
            color: "#F59E0B",
            padding: "8px",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h3 style={{ fontWeight: "bold", fontSize: "1.1rem" }}>{monthName}</h3>
        <button
          onClick={handleNextMonth}
          style={{
            background: "rgba(245,158,11,0.1)",
            border: "1px solid rgba(245,158,11,0.25)",
            color: "#F59E0B",
            padding: "8px",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Day names */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", marginBottom: "8px" }}>
        {dayNames.map((day) => (
          <div key={day} style={{ textAlign: "center", fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
        {days.map((day, index) => {
          if (!day) {
            return <div key={`empty-${index}`} />;
          }

          const available = isDateAvailable(day);
          const occupied = isDateOccupied(day);
          const inPast = isDateInPast(day);
          const selected = isDateSelected(day);

          let bgColor = "rgba(30,41,59,0.6)";
          let borderColor = "rgba(148,163,184,0.2)";
          let textColor = "rgba(255,255,255,0.5)";
          let cursor = "not-allowed";

          if (inPast) {
            textColor = "rgba(255,255,255,0.2)";
          } else if (selected) {
            bgColor = "#F59E0B";
            borderColor = "#F59E0B";
            textColor = "#0f172a";
            cursor = "pointer";
          } else if (occupied) {
            bgColor = "rgba(239,68,68,0.1)";
            borderColor = "rgba(239,68,68,0.3)";
            textColor = "rgba(239,68,68,0.6)";
            cursor = "not-allowed";
          } else if (available) {
            bgColor = "rgba(34,197,94,0.1)";
            borderColor = "rgba(34,197,94,0.4)";
            textColor = "#22C55E";
            cursor = "pointer";
          }

          return (
            <button
              key={day}
              onClick={() => handleDateClick(day)}
              disabled={inPast || occupied || !available}
              style={{
                padding: "12px 8px",
                borderRadius: "6px",
                background: bgColor,
                border: `1px solid ${borderColor}`,
                color: textColor,
                fontWeight: "600",
                cursor,
                fontSize: "0.9rem",
                transition: "all 0.2s",
              }}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "20px", fontSize: "0.8rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "3px",
              background: "rgba(34,197,94,0.3)",
              border: "1px solid rgba(34,197,94,0.4)",
            }}
          />
          <span style={{ color: "rgba(255,255,255,0.6)" }}>Available</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "3px",
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
            }}
          />
          <span style={{ color: "rgba(255,255,255,0.6)" }}>Full</span>
        </div>
      </div>
    </div>
  );
}
