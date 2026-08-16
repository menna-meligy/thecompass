"use client";

import { useState } from "react";
import { Plus, Trash2, Calendar, Clock } from "lucide-react";
import DatePickerCalendar from "@/components/availability/DatePickerCalendar";

interface TimeSlot {
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  booked: number;
}

interface AvailabilityManagerProps {
  workshopId: string;
  sessionId: string;
  existingSlots: TimeSlot[];
  onAddSlot: (slot: TimeSlot) => Promise<void>;
  onRemoveSlot: (date: string, startTime: string) => Promise<void>;
  isLoading?: boolean;
}

export default function AvailabilityManager({
  workshopId,
  sessionId,
  existingSlots,
  onAddSlot,
  onRemoveSlot,
  isLoading = false,
}: AvailabilityManagerProps) {
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [capacity, setCapacity] = useState(10);
  const [submitting, setSubmitting] = useState(false);

  const availableDates = Array.from(new Set(existingSlots.map((s) => s.date)));

  // A date is considered "occupied" only if ALL slots on that date are full
  const occupiedDates = availableDates.filter((date) => {
    const slotsOnDate = existingSlots.filter((s) => s.date === date);
    return slotsOnDate.length > 0 && slotsOnDate.every((s) => s.booked >= s.capacity);
  });

  const slotsByDate = (date: string) => existingSlots.filter((s) => s.date === date);

  const handleAddSlot = async () => {
    if (!selectedDate || !startTime || !endTime) {
      alert("Please fill in all fields");
      return;
    }

    const start = new Date(`${selectedDate}T${startTime}`);
    const end = new Date(`${selectedDate}T${endTime}`);

    if (end <= start) {
      alert("End time must be after start time");
      return;
    }

    // Check minimum duration (15 minutes)
    const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
    if (durationMinutes < 15) {
      alert("Minimum session duration is 15 minutes");
      return;
    }

    // Check for time slot conflicts
    const hasConflict = existingSlots.some((slot) => {
      if (slot.date !== selectedDate) return false;
      const slotStart = new Date(`${slot.date}T${slot.startTime}`);
      const slotEnd = new Date(`${slot.date}T${slot.endTime}`);
      return startTime < slot.endTime && endTime > slot.startTime;
    });

    if (hasConflict) {
      alert("This time slot overlaps with an existing slot");
      return;
    }

    // Check for duplicate
    const isDuplicate = existingSlots.some(
      (slot) => slot.date === selectedDate && slot.startTime === startTime && slot.endTime === endTime
    );

    if (isDuplicate) {
      alert("This time slot already exists");
      return;
    }

    setSubmitting(true);
    try {
      await onAddSlot({
        date: selectedDate,
        startTime,
        endTime,
        capacity,
        booked: 0,
      });
      // Reset only time/capacity, keep selected date for convenience
      setStartTime("09:00");
      setEndTime("10:00");
      setCapacity(10);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to add slot");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveSlot = async (date: string, time: string) => {
    if (!confirm("Are you sure you want to remove this time slot?")) return;

    setSubmitting(true);
    try {
      await onRemoveSlot(date, time);
    } catch (error) {
      alert("Failed to remove slot");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ background: "#0f172a", borderRadius: "12px", padding: "24px", color: "white" }}>
      {/* Calendar */}
      <div style={{ marginBottom: "32px" }}>
        <h3 style={{ fontWeight: "bold", fontSize: "1rem", marginBottom: "12px", color: "#F59E0B" }}>
          📅 Select Date
        </h3>
        <DatePickerCalendar
          availableDates={availableDates}
          occupiedDates={occupiedDates}
          onDateSelect={setSelectedDate}
          selectedDate={selectedDate}
        />
      </div>

      {/* Add time slot form */}
      <div
        style={{
          background: "rgba(30,41,59,0.6)",
          border: "1px solid rgba(245,158,11,0.2)",
          borderRadius: "8px",
          padding: "20px",
          marginBottom: "32px",
        }}
      >
        <h3 style={{ fontWeight: "bold", fontSize: "0.95rem", marginBottom: "16px", color: "#F59E0B" }}>
          ➕ Add Time Slot
        </h3>

        {selectedDate ? (
          <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)", marginBottom: "16px" }}>
            Selected date: <strong>{selectedDate}</strong>
          </p>
        ) : (
          <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.4)", marginBottom: "16px" }}>
            Select a date first
          </p>
        )}

        {selectedDate && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: "12px" }}>
            {/* Start time */}
            <div>
              <label style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)" }}>Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  background: "rgba(15,23,42,0.6)",
                  border: "1px solid rgba(245,158,11,0.2)",
                  borderRadius: "4px",
                  color: "white",
                  marginTop: "4px",
                }}
              />
            </div>

            {/* End time */}
            <div>
              <label style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)" }}>End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  background: "rgba(15,23,42,0.6)",
                  border: "1px solid rgba(245,158,11,0.2)",
                  borderRadius: "4px",
                  color: "white",
                  marginTop: "4px",
                }}
              />
            </div>

            {/* Capacity */}
            <div>
              <label style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)" }}>Capacity</label>
              <input
                type="number"
                min="1"
                max="100"
                value={capacity}
                onChange={(e) => setCapacity(parseInt(e.target.value))}
                style={{
                  width: "100%",
                  padding: "8px",
                  background: "rgba(15,23,42,0.6)",
                  border: "1px solid rgba(245,158,11,0.2)",
                  borderRadius: "4px",
                  color: "white",
                  marginTop: "4px",
                }}
              />
            </div>

            {/* Add button */}
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button
                onClick={handleAddSlot}
                disabled={submitting || !selectedDate}
                style={{
                  width: "100%",
                  padding: "8px 16px",
                  background: selectedDate && !submitting ? "#F59E0B" : "rgba(148,163,184,0.2)",
                  color: selectedDate && !submitting ? "#0f172a" : "rgba(255,255,255,0.4)",
                  border: "none",
                  borderRadius: "4px",
                  fontWeight: "bold",
                  cursor: selectedDate && !submitting ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px",
                  fontSize: "0.85rem",
                }}
              >
                <Plus className="h-4 w-4" />
                {submitting ? "Adding..." : "Add"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Existing slots */}
      <div>
        <h3 style={{ fontWeight: "bold", fontSize: "0.95rem", marginBottom: "16px", color: "#F59E0B" }}>
          📋 Current Schedule
        </h3>

        {existingSlots.length === 0 ? (
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.9rem", textAlign: "center", padding: "20px" }}>
            No time slots scheduled
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {existingSlots.map((slot) => {
              const isFull = slot.booked >= slot.capacity;
              return (
                <div
                  key={`${slot.date}-${slot.startTime}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px",
                    background: isFull ? "rgba(239,68,68,0.1)" : "rgba(30,41,59,0.6)",
                    border: `1px solid ${isFull ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.2)"}`,
                    borderRadius: "6px",
                  }}
                >
                  <div style={{ fontSize: "0.9rem" }}>
                    <div style={{ color: "white", fontWeight: "600" }}>
                      {slot.date} · {slot.startTime} - {slot.endTime}
                    </div>
                    <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8rem", marginTop: "4px" }}>
                      {slot.booked}/{slot.capacity} booked {isFull && "- FULL"}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveSlot(slot.date, slot.startTime)}
                    disabled={submitting}
                    style={{
                      padding: "6px 10px",
                      background: "rgba(239,68,68,0.1)",
                      border: "1px solid rgba(239,68,68,0.3)",
                      color: "#F87171",
                      borderRadius: "4px",
                      cursor: submitting ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "0.8rem",
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                    {submitting ? "..." : "Remove"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
