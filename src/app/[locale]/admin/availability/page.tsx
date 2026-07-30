"use client";

import { useState, useEffect, useCallback } from "react";
import { useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Plus, Trash2, Save, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const DAYS_AR = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const DAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface Rule {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  session_duration_minutes: number;
  buffer_minutes: number;
  is_active: boolean;
}

interface Exception {
  id?: string;
  exception_date: string;
  exception_type: "blocked" | "extra";
  start_time?: string;
  end_time?: string;
  reason?: string;
}

interface Settings {
  max_advance_days: number;
  min_advance_hours: number;
  max_bookings_per_day: number;
  auto_confirm: boolean;
}

const DEFAULT_RULE: Omit<Rule, "id"> = {
  day_of_week: 1,
  start_time: "09:00",
  end_time: "17:00",
  session_duration_minutes: 60,
  buffer_minutes: 15,
  is_active: true,
};

const DEFAULT_SETTINGS: Settings = {
  max_advance_days: 60,
  min_advance_hours: 24,
  max_bookings_per_day: 5,
  auto_confirm: false,
};

type Tab = "weekly" | "exceptions" | "settings";

export default function AvailabilityPage() {
  const locale = useLocale();
  const isAr = locale === "ar";

  const [tab, setTab] = useState<Tab>("weekly");
  const [rules, setRules] = useState<Rule[]>([]);
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const supabase = createClient();

  const load = useCallback(async () => {
    const [{ data: r }, { data: e }, { data: s }] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from("availability_rules").select("*").order("day_of_week").order("start_time"),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from("availability_exceptions").select("*").order("exception_date"),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from("availability_settings").select("*").eq("id", 1).maybeSingle(),
    ]);
    if (r) setRules(r as Rule[]);
    if (e) setExceptions(e as Exception[]);
    if (s) setSettings(s as Settings);
    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  async function saveRules() {
    setSaving(true);
    for (const rule of rules) {
      if (rule.id) {
        await db.from("availability_rules").upsert(rule, { onConflict: "id" });
      } else {
        await db.from("availability_rules").insert(rule);
      }
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    await load();
  }

  async function deleteRule(id: string) {
    await db.from("availability_rules").delete().eq("id", id);
    setRules((prev) => prev.filter((r) => r.id !== id));
  }

  async function saveExceptions() {
    setSaving(true);
    for (const ex of exceptions) {
      if (ex.id) {
        await db.from("availability_exceptions").upsert(ex, { onConflict: "id" });
      } else {
        await db.from("availability_exceptions").insert(ex);
      }
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    await load();
  }

  async function deleteException(id: string) {
    await db.from("availability_exceptions").delete().eq("id", id);
    setExceptions((prev) => prev.filter((e) => e.id !== id));
  }

  async function saveSettings() {
    setSaving(true);
    await db.from("availability_settings").upsert({ id: 1, ...settings }, { onConflict: "id" });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function updateRule(idx: number, field: keyof Rule, value: Rule[keyof Rule]) {
    setRules((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  }

  function updateException(idx: number, field: keyof Exception, value: Exception[keyof Exception]) {
    setExceptions((prev) => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[#F59E0B] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const TABS: { key: Tab; labelAr: string; labelEn: string }[] = [
    { key: "weekly",     labelAr: "النموذج الأسبوعي", labelEn: "Weekly Template" },
    { key: "exceptions", labelAr: "الاستثناءات",       labelEn: "Exceptions" },
    { key: "settings",   labelAr: "إعدادات الحجز",     labelEn: "Booking Rules" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-[#F59E0B] mb-1">
          {isAr ? "الجدولة" : "Scheduling"}
        </p>
        <h1 className="text-2xl font-black text-white">{isAr ? "التوفر" : "Availability"}</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/5 pb-0">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "px-4 py-2.5 text-sm font-semibold transition-all border-b-2 -mb-px",
              tab === t.key
                ? "text-[#F59E0B] border-[#F59E0B]"
                : "text-white/40 border-transparent hover:text-white/60"
            )}
          >
            {isAr ? t.labelAr : t.labelEn}
          </button>
        ))}
      </div>

      {/* Weekly Template */}
      {tab === "weekly" && (
        <div className="space-y-4">
          <p className="text-sm text-white/40">
            {isAr ? "حدد الأيام والأوقات المتاحة بشكل أسبوعي متكرر." : "Define repeating weekly time blocks when you're available."}
          </p>
          {rules.map((rule, idx) => (
            <div key={rule.id || idx} className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.12)] rounded-2xl p-5">
              <div className="flex items-start gap-4 flex-wrap">
                {/* Day */}
                <div className="flex flex-col gap-1 min-w-[120px]">
                  <label className="text-[0.65rem] font-bold uppercase tracking-widest text-white/30">{isAr ? "اليوم" : "Day"}</label>
                  <select
                    value={rule.day_of_week}
                    onChange={(e) => updateRule(idx, "day_of_week", parseInt(e.target.value))}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[rgba(245,158,11,0.4)]"
                  >
                    {DAYS_AR.map((d, i) => (
                      <option key={i} value={i}>{isAr ? d : DAYS_EN[i]}</option>
                    ))}
                  </select>
                </div>
                {/* Start time */}
                <div className="flex flex-col gap-1">
                  <label className="text-[0.65rem] font-bold uppercase tracking-widest text-white/30">{isAr ? "من" : "From"}</label>
                  <input
                    type="time"
                    value={rule.start_time}
                    onChange={(e) => updateRule(idx, "start_time", e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[rgba(245,158,11,0.4)]"
                  />
                </div>
                {/* End time */}
                <div className="flex flex-col gap-1">
                  <label className="text-[0.65rem] font-bold uppercase tracking-widest text-white/30">{isAr ? "إلى" : "To"}</label>
                  <input
                    type="time"
                    value={rule.end_time}
                    onChange={(e) => updateRule(idx, "end_time", e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[rgba(245,158,11,0.4)]"
                  />
                </div>
                {/* Duration */}
                <div className="flex flex-col gap-1">
                  <label className="text-[0.65rem] font-bold uppercase tracking-widest text-white/30">{isAr ? "مدة الجلسة (دقيقة)" : "Session (min)"}</label>
                  <input
                    type="number"
                    value={rule.session_duration_minutes}
                    onChange={(e) => updateRule(idx, "session_duration_minutes", parseInt(e.target.value))}
                    min={15} step={15}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[rgba(245,158,11,0.4)] w-28"
                  />
                </div>
                {/* Buffer */}
                <div className="flex flex-col gap-1">
                  <label className="text-[0.65rem] font-bold uppercase tracking-widest text-white/30">{isAr ? "استراحة (دقيقة)" : "Buffer (min)"}</label>
                  <input
                    type="number"
                    value={rule.buffer_minutes}
                    onChange={(e) => updateRule(idx, "buffer_minutes", parseInt(e.target.value))}
                    min={0} step={5}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[rgba(245,158,11,0.4)] w-28"
                  />
                </div>
                {/* Active + delete */}
                <div className="flex flex-col gap-1 justify-end pt-5">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rule.is_active}
                        onChange={(e) => updateRule(idx, "is_active", e.target.checked)}
                        className="accent-[#F59E0B] w-4 h-4"
                      />
                      <span className="text-sm text-white/50">{isAr ? "نشط" : "Active"}</span>
                    </label>
                    {rule.id && (
                      <button
                        onClick={() => deleteRule(rule.id!)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="flex items-center gap-3">
            <button
              onClick={() => setRules((prev) => [...prev, { ...DEFAULT_RULE }])}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-white/15 text-white/40 hover:text-white/70 hover:border-white/25 transition-all text-sm"
            >
              <Plus className="h-4 w-4" />
              {isAr ? "إضافة يوم" : "Add day"}
            </button>
            <button
              onClick={saveRules}
              disabled={saving}
              className={cn(
                "flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all",
                saved ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                      : "bg-[rgba(245,158,11,0.15)] text-[#F59E0B] border border-[rgba(245,158,11,0.25)] hover:bg-[rgba(245,158,11,0.25)]"
              )}
            >
              <Save className="h-4 w-4" />
              {saving ? (isAr ? "جاري الحفظ..." : "Saving...") : saved ? (isAr ? "تم الحفظ ✓" : "Saved ✓") : (isAr ? "حفظ" : "Save")}
            </button>
          </div>
        </div>
      )}

      {/* Exceptions */}
      {tab === "exceptions" && (
        <div className="space-y-4">
          <p className="text-sm text-white/40">
            {isAr ? "أضف إجازات أو أوقات إضافية خارج النموذج الأسبوعي." : "Block holidays or add one-off extra availability."}
          </p>
          {exceptions.map((ex, idx) => (
            <div key={ex.id || idx} className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.12)] rounded-2xl p-5">
              <div className="flex items-start gap-4 flex-wrap">
                <div className="flex flex-col gap-1">
                  <label className="text-[0.65rem] font-bold uppercase tracking-widest text-white/30">{isAr ? "التاريخ" : "Date"}</label>
                  <input
                    type="date"
                    value={ex.exception_date}
                    onChange={(e) => updateException(idx, "exception_date", e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[rgba(245,158,11,0.4)]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[0.65rem] font-bold uppercase tracking-widest text-white/30">{isAr ? "النوع" : "Type"}</label>
                  <select
                    value={ex.exception_type}
                    onChange={(e) => updateException(idx, "exception_type", e.target.value as "blocked" | "extra")}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[rgba(245,158,11,0.4)]"
                  >
                    <option value="blocked">{isAr ? "محجوب (إجازة)" : "Blocked (holiday)"}</option>
                    <option value="extra">{isAr ? "إضافي (وقت إضافي)" : "Extra (one-off slot)"}</option>
                  </select>
                </div>
                {ex.exception_type === "extra" && (
                  <>
                    <div className="flex flex-col gap-1">
                      <label className="text-[0.65rem] font-bold uppercase tracking-widest text-white/30">{isAr ? "من" : "From"}</label>
                      <input
                        type="time"
                        value={ex.start_time || ""}
                        onChange={(e) => updateException(idx, "start_time", e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[rgba(245,158,11,0.4)]"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[0.65rem] font-bold uppercase tracking-widest text-white/30">{isAr ? "إلى" : "To"}</label>
                      <input
                        type="time"
                        value={ex.end_time || ""}
                        onChange={(e) => updateException(idx, "end_time", e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[rgba(245,158,11,0.4)]"
                      />
                    </div>
                  </>
                )}
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-[0.65rem] font-bold uppercase tracking-widest text-white/30">{isAr ? "السبب (اختياري)" : "Reason (optional)"}</label>
                  <input
                    type="text"
                    value={ex.reason || ""}
                    onChange={(e) => updateException(idx, "reason", e.target.value)}
                    placeholder={isAr ? "مثلاً: إجازة رسمية" : "e.g. National holiday"}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[rgba(245,158,11,0.4)]"
                  />
                </div>
                {ex.id && (
                  <div className="flex flex-col justify-end pt-5">
                    <button
                      onClick={() => deleteException(ex.id!)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          <div className="flex items-center gap-3">
            <button
              onClick={() => setExceptions((prev) => [...prev, { exception_date: "", exception_type: "blocked" }])}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-white/15 text-white/40 hover:text-white/70 hover:border-white/25 transition-all text-sm"
            >
              <Plus className="h-4 w-4" />
              {isAr ? "إضافة استثناء" : "Add exception"}
            </button>
            <button
              onClick={saveExceptions}
              disabled={saving}
              className={cn(
                "flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all",
                saved ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                      : "bg-[rgba(245,158,11,0.15)] text-[#F59E0B] border border-[rgba(245,158,11,0.25)] hover:bg-[rgba(245,158,11,0.25)]"
              )}
            >
              <Save className="h-4 w-4" />
              {saving ? (isAr ? "جاري الحفظ..." : "Saving...") : saved ? (isAr ? "تم الحفظ ✓" : "Saved ✓") : (isAr ? "حفظ" : "Save")}
            </button>
          </div>
        </div>
      )}

      {/* Booking settings */}
      {tab === "settings" && (
        <div className="space-y-6">
          <p className="text-sm text-white/40">
            {isAr ? "تحكم في قواعد الحجز والموافقة التلقائية." : "Control booking rules and auto-confirm behavior."}
          </p>
          <div className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.12)] rounded-2xl p-6 space-y-5">
            {/* Max advance days */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">{isAr ? "الحد الأقصى للحجز المسبق" : "Max advance booking"}</p>
                <p className="text-xs text-white/35">{isAr ? "عدد الأيام التي يمكن الحجز فيها مسبقاً" : "How many days ahead clients can book"}</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={settings.max_advance_days}
                  onChange={(e) => setSettings((s) => ({ ...s, max_advance_days: parseInt(e.target.value) }))}
                  min={1} max={365}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-20 text-center focus:outline-none focus:border-[rgba(245,158,11,0.4)]"
                />
                <span className="text-white/40 text-sm">{isAr ? "يوم" : "days"}</span>
              </div>
            </div>
            {/* Min advance hours */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">{isAr ? "الإشعار المسبق الأدنى" : "Minimum notice"}</p>
                <p className="text-xs text-white/35">{isAr ? "عدد الساعات قبل الجلسة للحجز" : "Hours before session to allow booking"}</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={settings.min_advance_hours}
                  onChange={(e) => setSettings((s) => ({ ...s, min_advance_hours: parseInt(e.target.value) }))}
                  min={0} max={72}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-20 text-center focus:outline-none focus:border-[rgba(245,158,11,0.4)]"
                />
                <span className="text-white/40 text-sm">{isAr ? "ساعة" : "hours"}</span>
              </div>
            </div>
            {/* Max per day */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">{isAr ? "أقصى حجوزات يومياً" : "Max bookings per day"}</p>
                <p className="text-xs text-white/35">{isAr ? "الحد الأقصى لعدد الجلسات في اليوم" : "Maximum sessions per day"}</p>
              </div>
              <input
                type="number"
                value={settings.max_bookings_per_day}
                onChange={(e) => setSettings((s) => ({ ...s, max_bookings_per_day: parseInt(e.target.value) }))}
                min={1} max={20}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-20 text-center focus:outline-none focus:border-[rgba(245,158,11,0.4)]"
              />
            </div>
            {/* Auto-confirm */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">{isAr ? "تأكيد تلقائي" : "Auto-confirm"}</p>
                <p className="text-xs text-white/35">{isAr ? "تأكيد الحجز تلقائياً عند رفع الإيصال" : "Auto-confirm bookings when proof is submitted"}</p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.auto_confirm}
                  onChange={(e) => setSettings((s) => ({ ...s, auto_confirm: e.target.checked }))}
                  className="accent-[#F59E0B] w-4 h-4"
                />
                <span className="text-sm text-white/50">{settings.auto_confirm ? (isAr ? "مفعّل" : "Enabled") : (isAr ? "معطّل" : "Disabled")}</span>
              </label>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-amber-400/70">
              <AlertTriangle className="h-3.5 w-3.5" />
              {isAr ? "يجب تشغيل migration SQL أولاً في Supabase" : "Availability tables migration must be run in Supabase first"}
            </div>
            <button
              onClick={saveSettings}
              disabled={saving}
              className={cn(
                "ms-auto flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all",
                saved ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                      : "bg-[rgba(245,158,11,0.15)] text-[#F59E0B] border border-[rgba(245,158,11,0.25)] hover:bg-[rgba(245,158,11,0.25)]"
              )}
            >
              <Save className="h-4 w-4" />
              {saving ? (isAr ? "جاري الحفظ..." : "Saving...") : saved ? (isAr ? "تم الحفظ ✓" : "Saved ✓") : (isAr ? "حفظ" : "Save")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
