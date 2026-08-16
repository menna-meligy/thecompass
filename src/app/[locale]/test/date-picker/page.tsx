"use client";

import { useState } from "react";
import DatePickerCalendar from "@/components/availability/DatePickerCalendar";

export default function DatePickerTestPage() {
  const [selectedDate, setSelectedDate] = useState<string | undefined>();

  // Mock data: some dates available, some occupied
  const today = new Date();
  const availableDates: string[] = [];
  const occupiedDates: string[] = [];

  // Generate mock data for next 60 days
  for (let i = 0; i < 60; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];

    // Make every other date available, some occupied
    if (i % 2 === 0) {
      availableDates.push(dateStr);
    } else if (i % 3 === 0) {
      occupiedDates.push(dateStr);
    }
  }

  return (
    <div className="min-h-screen bg-[#0f172a] p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">DatePickerCalendar Test</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Component */}
          <div className="lg:col-span-2">
            <DatePickerCalendar
              availableDates={availableDates}
              occupiedDates={occupiedDates}
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
            />
          </div>

          {/* Info panel */}
          <div className="bg-[#1e293b] border border-white/10 rounded-lg p-6 text-white">
            <h2 className="text-lg font-bold mb-4">Test Info</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-white/50">Selected Date:</p>
                <p className="font-mono text-[#F59E0B]">{selectedDate || "None"}</p>
              </div>
              <div>
                <p className="text-white/50">Available Dates:</p>
                <p className="font-mono text-green-400">{availableDates.length}</p>
              </div>
              <div>
                <p className="text-white/50">Occupied Dates:</p>
                <p className="font-mono text-red-400">{occupiedDates.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
