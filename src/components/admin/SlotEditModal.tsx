"use client";

import { useState } from "react";
import { X } from "lucide-react";

export interface SessionTypeOption {
  id: string;
  label: string;
  labelAr: string;
  sessionId?: string;
  workshopId?: string;
  type: "individual" | "group";
  price: number;
}

interface SlotEditModalProps {
  date: string;
  onClose: () => void;
  onCreateSlot: (data: {
    date: string;
    startTime: string;
    endTime: string;
    sessionTypeId: string;
  }) => Promise<void>;
  onMarkUnavailable: (date: string) => Promise<void>;
  sessionTypes: SessionTypeOption[];
  isAr: boolean;
  loading?: boolean;
}

export default function SlotEditModal({
  date,
  onClose,
  onCreateSlot,
  onMarkUnavailable,
  sessionTypes,
  isAr,
  loading = false,
}: SlotEditModalProps) {
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [selectedSessionType, setSelectedSessionType] = useState<string>(
    sessionTypes[0]?.id || ""
  );
  const [error, setError] = useState<string | null>(null);

  const displayDate = new Date(date).toLocaleDateString(
    isAr ? "ar-EG" : "en-US",
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );

  const handleCreateSlot = async () => {
    setError(null);

    // Validation
    if (!startTime || !endTime) {
      setError(isAr ? "الوقت مطلوب" : "Time is required");
      return;
    }

    if (startTime >= endTime) {
      setError(
        isAr
          ? "وقت البداية يجب أن يكون قبل وقت النهاية"
          : "Start time must be before end time"
      );
      return;
    }

    if (!selectedSessionType) {
      setError(isAr ? "نوع الجلسة مطلوب" : "Session type is required");
      return;
    }

    try {
      await onCreateSlot({
        date,
        startTime,
        endTime,
        sessionTypeId: selectedSessionType,
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isAr
            ? "حدث خطأ"
            : "An error occurred"
      );
    }
  };

  const handleMarkUnavailable = async () => {
    setError(null);
    try {
      await onMarkUnavailable(date);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isAr
            ? "حدث خطأ"
            : "An error occurred"
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#0d1526] rounded-2xl p-8 max-w-md w-full mx-4 border border-[rgba(245,158,11,0.18)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-bold text-xl">
            {isAr ? "إنشاء حجز" : "Create Slot"}
          </h2>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Date Display */}
        <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
          <p className="text-white/60 text-sm mb-1">
            {isAr ? "التاريخ" : "Date"}
          </p>
          <p className="text-white font-semibold">{displayDate}</p>
        </div>

        {/* Start Time */}
        <div className="mb-4">
          <label className="block text-white/70 text-sm font-medium mb-2">
            {isAr ? "وقت البداية" : "Start Time"}
          </label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-[#F59E0B]"
          />
        </div>

        {/* End Time */}
        <div className="mb-4">
          <label className="block text-white/70 text-sm font-medium mb-2">
            {isAr ? "وقت النهاية" : "End Time"}
          </label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-[#F59E0B]"
          />
        </div>

        {/* Session Type Dropdown */}
        <div className="mb-6">
          <label className="block text-white/70 text-sm font-medium mb-2">
            {isAr ? "نوع الجلسة" : "Session Type"}
          </label>
          <select
            value={selectedSessionType}
            onChange={(e) => setSelectedSessionType(e.target.value)}
            className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#F59E0B]"
          >
            <option value="">{isAr ? "اختر نوع الجلسة" : "Select session type"}</option>
            {sessionTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {isAr ? type.labelAr : type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            onClick={handleCreateSlot}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? "..." : isAr ? "✅ إنشاء حجز" : "✅ Create Slot"}
          </button>

          <button
            onClick={handleMarkUnavailable}
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? "..." : isAr ? "🔴 تعليم كممتلئ" : "🔴 Mark Unavailable"}
          </button>

          <button
            onClick={onClose}
            disabled={loading}
            className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            {isAr ? "إلغاء" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}
