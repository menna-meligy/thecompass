"use client";

import { useState } from "react";
import SessionBrowser from "@/components/booking/SessionBrowser";

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

// Generate mock data
const generateMockSessions = (): { workshops: Workshop[]; workshopSessions: { [key: string]: TimeSlot[] }; individualSessions: TimeSlot[] } => {
  const today = new Date();
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return d.toISOString().split("T")[0];
  });

  const workshops: Workshop[] = [
    { id: "w1", titleEn: "Mindfulness Workshop", titleAr: "ورشة اليقظة الذهنية" },
    { id: "w2", titleEn: "Goal Setting", titleAr: "ورشة تحديد الأهداف" },
  ];

  const timeSlots = ["09:00", "11:00", "14:00", "16:00"];
  const endTimes = ["10:00", "12:00", "15:00", "17:00"];

  const generateSlots = (count: number, withFull: boolean = false) => {
    return timeSlots.map((start, idx) => {
      const slotDates = dates.slice(0, withFull ? 2 : 3);
      return slotDates.map((date) => ({
        id: `slot-${Math.random()}`,
        date,
        startTime: start,
        endTime: endTimes[idx],
        capacity: 10,
        booked: withFull && slotDates.indexOf(date) === 0 ? 10 : Math.floor(Math.random() * 8) + 2,
      }));
    }).flat();
  };

  const workshopSessions: { [key: string]: TimeSlot[] } = {
    w1: generateSlots(1, false),
    w2: generateSlots(1, true),
  };

  const individualSessions = generateSlots(1, false);

  return { workshops, workshopSessions, individualSessions };
};

export default function TestSessionBrowserPage() {
  const [isArabic, setIsArabic] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const { workshops, workshopSessions, individualSessions } = generateMockSessions();

  const handleSelectSession = (sessionId: string, date: string, timeSlotId: string) => {
    setSelectedSession(`Selected: ${sessionId} on ${date}, slot: ${timeSlotId}`);
    alert(`Booked ${sessionId} on ${date}`);
  };

  return (
    <div style={{ background: "#0f172a", minHeight: "100vh", padding: "40px 20px" }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto", color: "white" }}>
        {/* Header */}
        <div style={{ marginBottom: "40px" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "10px" }}>
            {isArabic ? "اختبار متصفح الجلسات" : "Session Browser Test"}
          </h1>
          <p style={{ color: "rgba(255,255,255,0.6)", marginBottom: "20px" }}>
            {isArabic
              ? "اختبر جميع ميزات مكون SessionBrowser"
              : "Test all features of the SessionBrowser component"}
          </p>

          {/* Language Toggle */}
          <button
            onClick={() => setIsArabic(!isArabic)}
            style={{
              padding: "10px 20px",
              background: "#F59E0B",
              color: "#0f172a",
              border: "none",
              borderRadius: "6px",
              fontWeight: "bold",
              cursor: "pointer",
              marginRight: "10px",
            }}
          >
            {isArabic ? "🇬🇧 English" : "🇪🇬 العربية"}
          </button>

          {/* Selection Info */}
          {selectedSession && (
            <div
              style={{
                marginTop: "20px",
                padding: "12px 16px",
                background: "rgba(34,197,94,0.1)",
                border: "1px solid rgba(34,197,94,0.3)",
                borderRadius: "6px",
                color: "#22C55E",
              }}
            >
              {selectedSession}
            </div>
          )}
        </div>

        {/* Component */}
        <SessionBrowser
          workshops={workshops}
          workshopSessions={workshopSessions}
          individualSessions={individualSessions}
          onSelectSession={handleSelectSession}
          isArabic={isArabic}
          isLoading={false}
        />

        {/* Test Checklist */}
        <div
          style={{
            marginTop: "60px",
            padding: "24px",
            background: "rgba(30,41,59,0.6)",
            borderRadius: "12px",
            border: "1px solid rgba(245,158,11,0.2)",
          }}
        >
          <h2 style={{ fontSize: "1.2rem", fontWeight: "bold", marginBottom: "16px" }}>
            {isArabic ? "قائمة الاختبار" : "Test Checklist"}
          </h2>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {[
              { en: "Tab switching works (Workshop/Individual)", ar: "تبديل التبويبات يعمل" },
              { en: "Active tab highlighted in gold (#F59E0B)", ar: "التبويب النشط مميز بلون ذهبي" },
              { en: "Calendar shows available dates", ar: "التقويم يعرض التواريخ المتاحة" },
              { en: "Sessions grid appears after date selection", ar: "شبكة الجلسات تظهر بعد اختيار التاريخ" },
              { en: "Time slots display correctly", ar: "فترات الوقت تظهر بشكل صحيح" },
              { en: "Capacity info shows (booked/total)", ar: "معلومات السعة تظهر" },
              { en: "Available badge (green) shows", ar: "شارة متاح (أخضر) تظهر" },
              { en: "Full badge (red) shows", ar: "شارة ممتلئ (أحمر) تظهر" },
              { en: "Full sessions have disabled button", ar: "الجلسات الممتلئة لديها زر معطل" },
              { en: "Available sessions have enabled button", ar: "الجلسات المتاحة لديها زر مفعل" },
              { en: "Date prompt shown when no date selected", ar: "رسالة الخطأ تظهر عند عدم اختيار تاريخ" },
              { en: "Arabic labels translate correctly", ar: "تترجم التسميات العربية بشكل صحيح" },
              { en: "Layout stacks properly on mobile", ar: "التخطيط يتكدس بشكل صحيح على الهاتف" },
            ].map((item, idx) => (
              <li key={idx} style={{ padding: "8px 0", color: "rgba(255,255,255,0.7)" }}>
                ✓ {isArabic ? item.ar : item.en}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
