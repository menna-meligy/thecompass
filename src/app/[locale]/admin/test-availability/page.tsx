"use client";

import { useState } from "react";
import AvailabilityManager from "@/components/admin/AvailabilityManager";

interface TimeSlot {
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  booked: number;
}

export default function TestAvailabilityPage() {
  const [slots, setSlots] = useState<TimeSlot[]>([
    {
      date: "2026-08-20",
      startTime: "09:00",
      endTime: "10:00",
      capacity: 5,
      booked: 3,
    },
    {
      date: "2026-08-20",
      startTime: "10:30",
      endTime: "11:30",
      capacity: 5,
      booked: 5,
    },
    {
      date: "2026-08-21",
      startTime: "14:00",
      endTime: "15:00",
      capacity: 10,
      booked: 2,
    },
  ]);

  const handleAddSlot = async (slot: TimeSlot) => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    setSlots((prev) => [...prev, slot]);
    console.log("Slot added:", slot);
  };

  const handleRemoveSlot = async (date: string, startTime: string) => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    setSlots((prev) =>
      prev.filter((s) => !(s.date === date && s.startTime === startTime))
    );
    console.log("Slot removed:", date, startTime);
  };

  return (
    <div style={{ padding: "40px", background: "#0a0e27", minHeight: "100vh" }}>
      <h1 style={{ color: "white", marginBottom: "40px" }}>
        AvailabilityManager Test
      </h1>
      <AvailabilityManager
        workshopId="test-workshop-1"
        sessionId="test-session-1"
        existingSlots={slots}
        onAddSlot={handleAddSlot}
        onRemoveSlot={handleRemoveSlot}
      />
      <div style={{ marginTop: "40px", color: "white" }}>
        <h3>Current Slots (JSON):</h3>
        <pre style={{ background: "#1e293b", padding: "20px", borderRadius: "8px", overflow: "auto" }}>
          {JSON.stringify(slots, null, 2)}
        </pre>
      </div>
    </div>
  );
}
