"use client";

import { useState, useEffect } from "react";
import { Calendar, Clock, Users, ChevronRight } from "lucide-react";

interface Slot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  booked_count: number;
  assignments?: Array<{
    workshop_id?: string;
    session_id?: string;
    workshop?: { title_ar: string; title_en: string };
    session?: { workshop?: { title_ar: string; title_en: string } };
  }>;
}

interface CentralizedSlotBrowserProps {
  isAr: boolean;
  onSelectSlot: (slotId: string, date: string, workshopId?: string) => void;
}

export default function CentralizedSlotBrowser({
  isAr,
  onSelectSlot,
}: CentralizedSlotBrowserProps) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<"all" | "available">("available");

  useEffect(() => {
    loadSlots();
  }, []);

  const loadSlots = async () => {
    try {
      const res = await fetch("/api/availability/centralized-slots");
      if (res.ok) {
        const data = await res.json();
        setSlots(data);
      }
    } catch (err) {
      console.error("Failed to load slots:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredSlots = slots.filter((slot) => {
    if (selectedFilter === "available") {
      return slot.booked_count < slot.capacity;
    }
    return true;
  });

  const groupedByDate: { [key: string]: Slot[] } = {};
  filteredSlots.forEach((slot) => {
    if (!groupedByDate[slot.date]) {
      groupedByDate[slot.date] = [];
    }
    groupedByDate[slot.date].push(slot);
  });

  const sortedDates = Object.keys(groupedByDate).sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-white/50">{isAr ? "جاري التحميل..." : "Loading..."}</div>
      </div>
    );
  }

  if (filteredSlots.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-12 w-12 text-white/20 mx-auto mb-3" />
        <p className="text-white/40">
          {isAr ? "لا توجد مواقيت متاحة" : "No available slots"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setSelectedFilter("available")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            selectedFilter === "available"
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
              : "bg-white/5 text-white/60 border border-white/10 hover:border-white/20"
          }`}
        >
          {isAr ? "المتاحة فقط" : "Available only"}
        </button>
        <button
          onClick={() => setSelectedFilter("all")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            selectedFilter === "all"
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
              : "bg-white/5 text-white/60 border border-white/10 hover:border-white/20"
          }`}
        >
          {isAr ? "الكل" : "All"}
        </button>
      </div>

      {/* Slots by Date */}
      <div className="space-y-4">
        {sortedDates.map((date) => (
          <div key={date}>
            <h3 className="text-amber-300 font-semibold mb-3 text-sm">
              {new Date(date).toLocaleDateString(isAr ? "ar-EG" : "en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {groupedByDate[date].map((slot) => {
                const isFull = slot.booked_count >= slot.capacity;
                const workshopTitle = slot.assignments?.[0]?.workshop?.title_en ||
                  slot.assignments?.[0]?.session?.workshop?.title_en ||
                  "General Session";

                return (
                  <div
                    key={slot.id}
                    onClick={() => !isFull && onSelectSlot(slot.id, date, slot.assignments?.[0]?.workshop_id)}
                    className={`p-4 rounded-lg border transition-all cursor-pointer ${
                      isFull
                        ? "bg-red-500/5 border-red-500/20 opacity-60 cursor-not-allowed"
                        : "bg-[rgba(30,41,59,0.6)] border-amber-500/20 hover:border-amber-500/40 hover:bg-[rgba(30,41,59,0.8)]"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-amber-400" />
                        <span className="text-white font-semibold">
                          {slot.start_time} - {slot.end_time}
                        </span>
                      </div>
                      {!isFull && <ChevronRight className="h-5 w-5 text-amber-400" />}
                    </div>

                    <p className="text-white/70 text-sm mb-3">{workshopTitle}</p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs text-white/50">
                        <Users className="h-3 w-3" />
                        <span>
                          {slot.booked_count}/{slot.capacity}
                        </span>
                      </div>
                      {isFull && (
                        <span className="text-xs font-semibold text-red-400">
                          {isAr ? "ممتلئ" : "Full"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
