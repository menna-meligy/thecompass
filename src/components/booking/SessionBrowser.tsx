"use client";

import { useState } from "react";
import DatePickerCalendar from "@/components/availability/DatePickerCalendar";
import SessionTabs from "@/components/availability/SessionTabs";
import { Clock, MapPin, Users } from "lucide-react";

interface TimeSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  booked: number;
}

interface Workshop {
  id: string;
  titleAr: string;
  titleEn: string;
}

interface SessionBrowserProps {
  workshops: Workshop[];
  workshopSessions: { [key: string]: TimeSlot[] };
  individualSessions: TimeSlot[];
  onSelectSession: (sessionId: string, date: string, timeSlotId: string) => void;
  isArabic?: boolean;
  isLoading?: boolean;
}

function SessionGrid({
  sessions,
  selectedDate,
  onSelect,
  title,
  isArabic = false,
}: {
  sessions: TimeSlot[];
  selectedDate: string;
  onSelect: (slot: TimeSlot) => void;
  title: string;
  isArabic?: boolean;
}) {
  const filtered = selectedDate ? sessions.filter((s) => s.date === selectedDate) : sessions;
  const isFull = (slot: TimeSlot) => slot.booked >= slot.capacity;

  return (
    <div>
      <h4
        style={{
          fontWeight: "bold",
          fontSize: "0.95rem",
          marginBottom: "16px",
          color: selectedDate ? "#F59E0B" : "rgba(255,255,255,0.5)",
        }}
      >
        {selectedDate ? `${title} - ${selectedDate}` : `${title}`}
      </h4>

      {!selectedDate ? (
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.9rem", textAlign: "center", padding: "32px" }}>
          {isArabic ? "اختر تاريخ أولاً" : "Select a date first"}
        </p>
      ) : filtered.length === 0 ? (
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.9rem", textAlign: "center", padding: "32px" }}>
          {isArabic ? "مفيش جلسات في التاريخ ده" : "No sessions available on this date"}
        </p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
          {filtered.map((slot) => (
            <div
              key={slot.id}
              style={{
                background: "rgba(30,41,59,0.6)",
                border: `1px solid ${isFull(slot) ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.2)"}`,
                borderRadius: "8px",
                padding: "16px",
                transition: "all 0.2s",
              }}
            >
              {/* Time */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <Clock className="h-4 w-4" style={{ color: "#F59E0B" }} />
                <span style={{ color: "white", fontWeight: "600" }}>
                  {slot.startTime} - {slot.endTime}
                </span>
              </div>

              {/* Capacity */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <Users className="h-4 w-4" style={{ color: "rgba(255,255,255,0.4)" }} />
                <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.9rem" }}>
                  {slot.booked}/{slot.capacity} {isArabic ? "حجوزات" : "booked"}
                </span>
              </div>

              {/* Status badge */}
              {isFull(slot) ? (
                <div
                  style={{
                    padding: "6px 12px",
                    background: "rgba(239,68,68,0.1)",
                    border: "1px solid rgba(239,68,68,0.3)",
                    borderRadius: "4px",
                    color: "#F87171",
                    fontSize: "0.8rem",
                    fontWeight: "600",
                    marginBottom: "12px",
                    textAlign: "center",
                  }}
                >
                  {isArabic ? "ممتلئ" : "Full"}
                </div>
              ) : (
                <div
                  style={{
                    padding: "6px 12px",
                    background: "rgba(34,197,94,0.1)",
                    border: "1px solid rgba(34,197,94,0.3)",
                    borderRadius: "4px",
                    color: "#22C55E",
                    fontSize: "0.8rem",
                    fontWeight: "600",
                    marginBottom: "12px",
                    textAlign: "center",
                  }}
                >
                  {isArabic ? "متاح" : "Available"}
                </div>
              )}

              {/* Select button */}
              <button
                onClick={() => onSelect(slot)}
                disabled={isFull(slot)}
                style={{
                  width: "100%",
                  padding: "10px",
                  background: isFull(slot) ? "rgba(148,163,184,0.2)" : "#F59E0B",
                  color: isFull(slot) ? "rgba(255,255,255,0.4)" : "#0f172a",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: "bold",
                  cursor: isFull(slot) ? "not-allowed" : "pointer",
                  fontSize: "0.9rem",
                }}
              >
                {isArabic ? "اختر" : "Select"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SessionBrowser({
  workshops,
  workshopSessions,
  individualSessions,
  onSelectSession,
  isArabic = false,
  isLoading = false,
}: SessionBrowserProps) {
  const [workshopSelectedDate, setWorkshopSelectedDate] = useState<string>("");
  const [individualSelectedDate, setIndividualSelectedDate] = useState<string>("");

  const allWorkshopSessions = Object.values(workshopSessions).flat();
  const workshopAvailableDates = Array.from(new Set(allWorkshopSessions.map((s) => s.date)));
  const workshopOccupiedDates = allWorkshopSessions
    .filter((s) => s.booked >= s.capacity)
    .map((s) => s.date)
    .filter((date, idx, arr) => arr.indexOf(date) === idx);

  const individualAvailableDates = Array.from(new Set(individualSessions.map((s) => s.date)));
  const individualOccupiedDates = individualSessions
    .filter((s) => s.booked >= s.capacity)
    .map((s) => s.date)
    .filter((date, idx, arr) => arr.indexOf(date) === idx);

  const handleSelectWorkshopSlot = (slot: TimeSlot) => {
    // Find workshop for this slot
    const workshopId = Object.keys(workshopSessions).find((id) =>
      workshopSessions[id].some((s) => s.id === slot.id)
    );
    if (workshopId) {
      onSelectSession(workshopId, slot.date, slot.id);
    }
  };

  const handleSelectIndividualSlot = (slot: TimeSlot) => {
    onSelectSession("individual", slot.date, slot.id);
  };

  const workshopContent = (
    <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
      {/* Calendar */}
      <div style={{ flex: "1 1 340px", minWidth: "280px" }}>
        <DatePickerCalendar
          availableDates={workshopAvailableDates}
          occupiedDates={workshopOccupiedDates}
          onDateSelect={setWorkshopSelectedDate}
          selectedDate={workshopSelectedDate}
          isArabic={isArabic}
        />
      </div>

      {/* Sessions */}
      <div style={{ flex: "2 1 300px", minWidth: "280px" }}>
        {workshopSelectedDate ? (
          <div style={{ display: "grid", gap: "24px" }}>
            {workshops.map((workshop) => (
              <SessionGrid
                key={workshop.id}
                sessions={workshopSessions[workshop.id] || []}
                selectedDate={workshopSelectedDate}
                onSelect={handleSelectWorkshopSlot}
                title={isArabic ? workshop.titleAr : workshop.titleEn}
                isArabic={isArabic}
              />
            ))}
          </div>
        ) : (
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "1rem", textAlign: "center", padding: "48px" }}>
            {isArabic ? "اختر تاريخ لمشاهدة الجلسات المتاحة" : "Select a date to see available workshops"}
          </p>
        )}
      </div>
    </div>
  );

  const individualContent = (
    <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
      {/* Calendar */}
      <div style={{ flex: "1 1 340px", minWidth: "280px" }}>
        <DatePickerCalendar
          availableDates={individualAvailableDates}
          occupiedDates={individualOccupiedDates}
          onDateSelect={setIndividualSelectedDate}
          selectedDate={individualSelectedDate}
          isArabic={isArabic}
        />
      </div>

      {/* Sessions */}
      <div style={{ flex: "2 1 300px", minWidth: "280px" }}>
        <SessionGrid
          sessions={individualSessions}
          selectedDate={individualSelectedDate}
          onSelect={handleSelectIndividualSlot}
          title={isArabic ? "جلسات فردية" : "Individual Sessions"}
          isArabic={isArabic}
        />
      </div>
    </div>
  );

  return (
    <SessionTabs
      workshopContent={workshopContent}
      individualContent={individualContent}
      isArabic={isArabic}
    />
  );
}
