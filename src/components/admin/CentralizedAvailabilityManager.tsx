"use client";

import { useState, useEffect } from "react";
import CalendarGrid from "./CalendarGrid";
import SlotEditModal from "./SlotEditModal";
import type { SessionTypeOption } from "./SlotEditModal";

interface AvailabilitySlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  admin_marked_status: "available" | "full" | "unavailable";
  booked_count: number;
  assignments?: Array<{
    id: string;
    session_id?: string;
    workshop_id?: string;
  }>;
}

interface Workshop {
  id: string;
  title_ar: string;
  title_en: string;
}

interface Session {
  id: string;
  type: string;
  workshop_id?: string;
  workshop?: Workshop;
}

interface CentralizedAvailabilityManagerProps {
  isAr: boolean;
}

export default function CentralizedAvailabilityManager({
  isAr,
}: CentralizedAvailabilityManagerProps) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalDate, setModalDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      setError(isAr ? "خطأ في تحميل البيانات" : "Error loading data");
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Build session type options from workshops and career session
  const sessionTypeOptions: SessionTypeOption[] = [
    {
      id: "career-deciding",
      label: "Career Deciding Session",
      labelAr: "جلسة تحديد المسار الوظيفي",
      sessionId: "career-deciding-session",
      type: "individual",
      price: 500,
    },
  ];

  // Add workshop options (individual + group for each)
  workshops.forEach((workshop) => {
    sessionTypeOptions.push(
      {
        id: `${workshop.id}-individual`,
        label: `${workshop.title_en} - Individual`,
        labelAr: `${workshop.title_ar} - فردي`,
        workshopId: workshop.id,
        type: "individual",
        price: 500,
      },
      {
        id: `${workshop.id}-group`,
        label: `${workshop.title_en} - Group`,
        labelAr: `${workshop.title_ar} - مجموعة`,
        workshopId: workshop.id,
        type: "group",
        price: 1200,
      }
    );
  });

  const handleCreateSlot = async (data: {
    date: string;
    startTime: string;
    endTime: string;
    sessionTypeIds: string[];
  }) => {
    setSaving(true);
    try {
      // Create slot with all selected session type assignments
      const assignments = data.sessionTypeIds
        .map((typeId) => sessionTypeOptions.find((o) => o.id === typeId))
        .filter(Boolean);

      if (assignments.length === 0) throw new Error("No session types selected");

      const res = await fetch("/api/admin/availability/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: data.date,
          start_time: data.startTime,
          end_time: data.endTime,
          admin_marked_status: "available",
          assignments: assignments.map((opt) => ({
            session_id: opt?.sessionId || null,
            workshop_id: opt?.workshopId || null,
          })),
        }),
      });

      if (!res.ok) throw new Error("Failed to create slot");
      await loadData();
      setModalDate(null);
    } catch (err) {
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleMarkUnavailable = async (date: string) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/availability/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          start_time: "00:00",
          end_time: "23:59",
          admin_marked_status: "unavailable",
        }),
      });

      if (!res.ok) throw new Error("Failed to mark day unavailable");
      await loadData();
      setModalDate(null);
    } catch (err) {
      throw err;
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-white/50">{isAr ? "جاري التحميل..." : "Loading..."}</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">
          {isAr ? "📅 إدارة المواقيت المتاحة" : "📅 Manage Availability"}
        </h2>
        <p className="text-white/50 text-sm">
          {isAr
            ? "انقر على أي يوم لإنشاء حجز أو تعليم اليوم كممتلئ"
            : "Click any day to create a slot or mark as unavailable"}
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Calendar Grid */}
      <CalendarGrid
        slots={slots}
        onDateClick={setModalDate}
        isAr={isAr}
      />

      {/* Modal */}
      {modalDate && (
        <SlotEditModal
          date={modalDate}
          onClose={() => setModalDate(null)}
          onCreateSlot={handleCreateSlot}
          onMarkUnavailable={handleMarkUnavailable}
          sessionTypes={sessionTypeOptions}
          isAr={isAr}
          loading={saving}
        />
      )}
    </div>
  );
}
