"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Calendar, Clock, Copy, Link2 } from "lucide-react";
import DatePickerCalendar from "@/components/availability/DatePickerCalendar";

interface AvailabilitySlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  booked_count: number;
  assignments?: Array<{
    id: string;
    session_id?: string;
    workshop_id?: string;
    session?: { workshop?: { title_ar: string; title_en: string } };
    workshop?: { title_ar: string; title_en: string };
  }>;
}

interface Workshop {
  id: string;
  title_ar: string;
  title_en: string;
}

interface Session {
  id: string;
  workshop_id: string;
  type: string;
  workshop?: Workshop;
}

interface CentralizedAvailabilityManagerProps {
  isAr: boolean;
}

export default function CentralizedAvailabilityManager({
  isAr,
}: CentralizedAvailabilityManagerProps) {
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [capacity, setCapacity] = useState(10);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedWorkshopId, setSelectedWorkshopId] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [slotsRes, workshopsRes, sessionsRes] = await Promise.all([
        fetch("/api/admin/availability/slots"),
        fetch("/api/admin/availability/workshops"),
        fetch("/api/admin/availability/sessions"),
      ]);

      if (slotsRes.ok) setSlots(await slotsRes.json());
      if (workshopsRes.ok) setWorkshops(await workshopsRes.json());
      if (sessionsRes.ok) setSessions(await sessionsRes.json());
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSlot = async () => {
    if (!selectedDate || !startTime || !endTime) {
      alert(isAr ? "ملء جميع الحقول مطلوب" : "All fields required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/availability/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          start_time: startTime,
          end_time: endTime,
          capacity: parseInt(capacity.toString()),
        }),
      });

      if (!res.ok) throw new Error("Failed to create slot");
      await loadData();
      setStartTime("09:00");
      setEndTime("10:00");
      setCapacity(10);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error creating slot");
    } finally {
      setSaving(false);
    }
  };

  const handleAssignSlot = async () => {
    if (!selectedSlotId || (!selectedWorkshopId && !selectedSessionId)) {
      alert(isAr ? "اختر موقعاً وورشة أو جلسة" : "Select a slot and workshop/session");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/availability/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot_id: selectedSlotId,
          workshop_id: selectedWorkshopId || null,
          session_id: selectedSessionId || null,
        }),
      });

      if (!res.ok) throw new Error("Failed to assign slot");
      await loadData();
      setSelectedSlotId("");
      setSelectedWorkshopId("");
      setSelectedSessionId("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error assigning slot");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm(isAr ? "تأكيد الحذف؟" : "Confirm deletion?")) return;

    try {
      const res = await fetch(`/api/admin/availability/slots/${slotId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete slot");
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error deleting slot");
    }
  };

  const availableDates = Array.from(new Set(slots.map((s) => s.date)));
  const slotsByDate = selectedDate
    ? slots.filter((s) => s.date === selectedDate)
    : [];

  if (loading) return <div className="text-white/50">جاري التحميل...</div>;

  return (
    <div className="space-y-8 bg-[#0f172a] rounded-xl p-6">
      {/* Master Calendar Section */}
      <div>
        <h3 className="text-lg font-bold text-amber-300 mb-4">
          {isAr ? "📅 إنشاء مواقيت جديدة" : "📅 Create New Time Slots"}
        </h3>

        <DatePickerCalendar
          availableDates={availableDates}
          occupiedDates={[]}
          onDateSelect={setSelectedDate}
          selectedDate={selectedDate}
        />

        {selectedDate && (
          <div className="mt-6 p-4 bg-[rgba(30,41,59,0.6)] border border-amber-500/20 rounded-lg space-y-4">
            <p className="text-amber-300 font-semibold">
              {isAr ? "التاريخ المختار: " : "Selected date: "}
              <span className="text-white">{selectedDate}</span>
            </p>

            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-white/50 block mb-1">
                  {isAr ? "البداية" : "Start"}
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-2 py-2 bg-white/5 border border-white/10 rounded text-white text-sm"
                />
              </div>

              <div>
                <label className="text-xs text-white/50 block mb-1">
                  {isAr ? "النهاية" : "End"}
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-2 py-2 bg-white/5 border border-white/10 rounded text-white text-sm"
                />
              </div>

              <div>
                <label className="text-xs text-white/50 block mb-1">
                  {isAr ? "الطاقة" : "Capacity"}
                </label>
                <input
                  type="number"
                  min="1"
                  value={capacity}
                  onChange={(e) => setCapacity(parseInt(e.target.value))}
                  className="w-full px-2 py-2 bg-white/5 border border-white/10 rounded text-white text-sm"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleCreateSlot}
                  disabled={saving}
                  className="w-full px-3 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded font-semibold text-sm hover:bg-emerald-500/30 disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  <Plus className="h-4 w-4" />
                  {saving ? "..." : isAr ? "إضافة" : "Add"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Slot Management Section */}
      <div>
        <h3 className="text-lg font-bold text-amber-300 mb-4">
          {isAr ? "🔗 تعيين المواقيت للورش" : "🔗 Assign Slots to Workshops"}
        </h3>

        {slots.length === 0 ? (
          <p className="text-white/40 text-sm">{isAr ? "لا توجد مواقيت" : "No slots created yet"}</p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {slots.map((slot) => (
              <div key={slot.id} className="p-3 bg-[rgba(30,41,59,0.6)] border border-white/10 rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <p className="text-white font-semibold">
                      {slot.date} · {slot.start_time} - {slot.end_time}
                    </p>
                    <p className="text-white/50 text-xs mt-1">
                      {slot.booked_count}/{slot.capacity} {isAr ? "محجوز" : "booked"}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteSlot(slot.id)}
                    className="p-1 text-red-400 hover:bg-red-500/10 rounded"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Assignments */}
                <div className="text-xs text-white/60 space-y-1 mb-2">
                  {slot.assignments?.length ? (
                    slot.assignments.map((a) => (
                      <div key={a.id} className="flex items-center gap-2 text-amber-300/70">
                        <Link2 className="h-3 w-3" />
                        <span>
                          {a.workshop?.title_en || a.session?.workshop?.title_en || "Assigned"}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-white/30">{isAr ? "لم يتم التعيين بعد" : "Not assigned yet"}</p>
                  )}
                </div>

                {/* Quick assign form */}
                {selectedSlotId === slot.id && (
                  <div className="border-t border-white/5 pt-2 mt-2 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={selectedWorkshopId}
                        onChange={(e) => {
                          setSelectedWorkshopId(e.target.value);
                          setSelectedSessionId("");
                        }}
                        className="px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-xs"
                      >
                        <option value="">{isAr ? "ورشة" : "Workshop"}</option>
                        {workshops.length === 0 ? (
                          <option disabled>{isAr ? "لا توجد ورش" : "No workshops"}</option>
                        ) : (
                          workshops.map((w) => (
                            <option key={w.id} value={w.id}>
                              {isAr ? w.title_ar : w.title_en}
                            </option>
                          ))
                        )}
                      </select>
                      <select
                        value={selectedSessionId}
                        onChange={(e) => {
                          setSelectedSessionId(e.target.value);
                          setSelectedWorkshopId("");
                        }}
                        className="px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-xs"
                      >
                        <option value="">{isAr ? "جلسة فردية" : "Individual Session"}</option>
                        {sessions.length === 0 ? (
                          <option disabled>{isAr ? "لا توجد جلسات" : "No sessions"}</option>
                        ) : (
                          sessions.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.workshop?.title_en || "Session"}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                    <button
                      onClick={handleAssignSlot}
                      disabled={saving || (!selectedWorkshopId && !selectedSessionId)}
                      className="w-full px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs hover:bg-blue-500/30 disabled:opacity-50"
                    >
                      {saving ? "..." : isAr ? "تعيين" : "Assign"}
                    </button>
                  </div>
                )}

                <button
                  onClick={() =>
                    setSelectedSlotId(selectedSlotId === slot.id ? "" : slot.id)
                  }
                  className="w-full mt-2 px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-xs hover:bg-white/10"
                >
                  {selectedSlotId === slot.id
                    ? isAr
                      ? "إغلاق"
                      : "Close"
                    : isAr
                    ? "تعيين"
                    : "Assign"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
