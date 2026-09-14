"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import CalendarGrid from "./CalendarGrid";
import DayEditor from "./DayEditor";
import type { AdminSlot } from "./availability-types";
import { allOfferings, type WorkshopLite } from "@/lib/offerings";
import { normaliseDate } from "@/lib/schedule-dates";

/**
 * The coach's availability screen: one month calendar, click a day, then either
 * open bookable times on it or close it entirely. What's set here is exactly
 * what clients see on every booking calendar.
 */
export default function CentralizedAvailabilityManager({ isAr }: { isAr: boolean }) {
  const [slots, setSlots] = useState<AdminSlot[]>([]);
  const [workshops, setWorkshops] = useState<WorkshopLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [openDate, setOpenDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const t = (ar: string, en: string) => (isAr ? ar : en);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const [slotsRes, workshopsRes] = await Promise.all([
        fetch("/api/admin/availability/slots", { cache: "no-store" }),
        fetch("/api/admin/availability/workshops", { cache: "no-store" }),
      ]);

      if (!slotsRes.ok) {
        setError(
          slotsRes.status === 403
            ? t("محتاجة صلاحية أدمن للصفحة دي.", "You need an admin account for this page.")
            : t("تعذّر تحميل المواعيد.", "Couldn't load availability."),
        );
        return;
      }

      setError(null);
      setSlots(await slotsRes.json());
      if (workshopsRes.ok) setWorkshops(await workshopsRes.json());
    } catch {
      setError(t("تعذّر الاتصال بالسيرفر.", "Couldn't reach the server."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAr]);

  useEffect(() => {
    load();
  }, [load]);

  const offerings = useMemo(() => allOfferings(workshops), [workshops]);

  const slotsForOpenDay = useMemo(
    () => (openDate ? slots.filter((s) => normaliseDate(s.date) === openDate) : []),
    [slots, openDate],
  );

  async function post(body: Record<string, unknown>) {
    const res = await fetch("/api/admin/availability/slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || data.error || t("العملية فشلت", "That didn't work"));
    }
    await load();
  }

  const handleAddTime = async (data: {
    date: string;
    start_time: string;
    end_time: string;
    offerings: string[];
  }) => post({ mode: "available", ...data });

  const handleCloseDay = (date: string) => post({ mode: "day_block", date });

  const handleReopenDay = (date: string) => post({ mode: "unblock_day", date });

  const handleDeleteSlot = async (slotId: string) => {
    const res = await fetch(`/api/admin/availability/slots/${slotId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || data.error || t("تعذّر الحذف", "Couldn't delete"));
    }
    await load();
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-white/50">
        <Loader2 className="w-4 h-4 animate-spin" />
        {t("جاري التحميل...", "Loading...")}
      </div>
    );
  }

  const upcoming = slots.filter((s) => !s.is_day_block && s.booked_count > 0).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">
            {t("📅 مواعيدك", "📅 Your availability")}
          </h2>
          <p className="text-white/50 text-sm">
            {t(
              "اضغطي على أي يوم: تفتحيه بمواعيد للحجز، أو تقفليه بالكامل.",
              "Click any day to open bookable times on it — or close the whole day.",
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={refreshing}
          className="flex items-center gap-2 text-sm text-white/60 hover:text-white px-3 py-2 rounded-lg bg-white/5 border border-white/10 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          {t("تحديث", "Refresh")}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/15 border border-red-500/40 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {upcoming > 0 && (
        <p className="text-sm text-white/45">
          {t(
            `${upcoming} موعد متحجوز حالياً — ظاهرين في "الجلسات المؤكدة".`,
            `${upcoming} time${upcoming === 1 ? "" : "s"} currently taken — they appear under "Confirmed Meetings".`,
          )}
        </p>
      )}

      <CalendarGrid slots={slots} onDateClick={setOpenDate} isAr={isAr} />

      {openDate && (
        <DayEditor
          date={openDate}
          slots={slotsForOpenDay}
          offerings={offerings}
          isAr={isAr}
          onClose={() => setOpenDate(null)}
          onAddTime={handleAddTime}
          onCloseDay={handleCloseDay}
          onReopenDay={handleReopenDay}
          onDeleteSlot={handleDeleteSlot}
        />
      )}
    </div>
  );
}
