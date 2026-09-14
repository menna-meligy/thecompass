"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface Meeting {
  id: string;
  user_id: string;
  session_id: string;
  status: string;
  created_at: string;
  user?: { full_name?: string; email?: string };
  session?: {
    starts_at?: string;
    ends_at?: string;
    location_or_link?: string;
    workshop?: { title_ar?: string; title_en?: string };
  };
  payment?: {
    status?: string;
  };
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

const monthNames = {
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  ar: ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"],
};

const dayNames = {
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  ar: ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"],
};

export default function MeetingsCalendarPage() {
  const locale = useLocale();
  const isAr = locale === "ar";
  const supabase = createClient();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  useEffect(() => {
    loadMeetings();
  }, []);

  async function loadMeetings() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("bookings")
        .select(
          `
          id,
          user_id,
          session_id,
          status,
          created_at,
          user:profiles(full_name, email),
          session:sessions(starts_at, ends_at, location_or_link, workshop:workshops(title_ar, title_en)),
          payment:payments(status)
        `
        )
        .eq("status", "confirmed")
        .then((result) => {
          if (result.error) return result;
          // Filter for paid meetings
          const filtered = result.data?.filter(
            (m: any) => m.payment && m.payment.status === "paid"
          ) || [];
          return { data: filtered, error: null };
        });

      if (error) {
        console.error("Error loading meetings:", error);
      } else {
        setMeetings(data || []);
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  }

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const previousEmptyCells = Array.from({ length: firstDay }, (_, i) => i);

  const getMeetingsForDay = (day: number) => {
    return meetings.filter((meeting) => {
      if (!meeting.session?.starts_at) return false;
      const meetingDate = new Date(meeting.session.starts_at);
      return (
        meetingDate.getFullYear() === year &&
        meetingDate.getMonth() === month &&
        meetingDate.getDate() === day
      );
    });
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1));
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleTimeString(isAr ? "ar-EG" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-[#F59E0B] mb-1">
          {isAr ? "الجدولة" : "Scheduling"}
        </p>
        <h1 className="text-2xl font-black text-white">
          {isAr ? "الجلسات المؤكدة والمدفوعة" : "Confirmed & Paid Meetings"}
        </h1>
      </div>

      {/* Calendar */}
      <div className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.12)] rounded-2xl p-6">
        {/* Header with navigation */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-black text-white">
              {monthNames[isAr ? "ar" : "en"][month]} {year}
            </h2>
            <p className="text-xs text-white/40 mt-1">
              {isAr ? `${meetings.length} جلسة مؤكدة ومدفوعة` : `${meetings.length} confirmed & paid meetings`}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={goToPreviousMonth}
              className="p-2 rounded-lg bg-white/5 border border-white/10 hover:border-[#F59E0B]/20 hover:bg-white/10 transition-all text-white"
              aria-label={isAr ? "الشهر السابق" : "Previous month"}
            >
              {isAr ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
            <button
              onClick={goToNextMonth}
              className="p-2 rounded-lg bg-white/5 border border-white/10 hover:border-[#F59E0B]/20 hover:bg-white/10 transition-all text-white"
              aria-label={isAr ? "الشهر القادم" : "Next month"}
            >
              {isAr ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin">
              <Calendar className="h-8 w-8 text-[#F59E0B]" />
            </div>
            <p className="text-white/40 text-sm mt-2">
              {isAr ? "جاري التحميل..." : "Loading..."}
            </p>
          </div>
        )}

        {!loading && (
          <>
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {dayNames[isAr ? "ar" : "en"].map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-bold text-white/40 py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Previous month's empty cells */}
              {previousEmptyCells.map((i) => (
                <div
                  key={`empty-${i}`}
                  className="aspect-square rounded-lg bg-white/2"
                />
              ))}

              {/* Days of the month */}
              {days.map((day) => {
                const dayMeetings = getMeetingsForDay(day);
                return (
                  <div
                    key={day}
                    className={cn(
                      "aspect-square rounded-lg border transition-all overflow-hidden flex flex-col",
                      dayMeetings.length > 0
                        ? "bg-[rgba(34,197,94,0.08)] border-emerald-500/30 hover:border-emerald-500/50"
                        : "bg-white/3 border-white/10 hover:border-[#F59E0B]/20"
                    )}
                  >
                    <div className={cn(
                      "text-xs font-semibold p-1.5",
                      dayMeetings.length > 0 ? "text-emerald-400" : "text-white/60"
                    )}>
                      {day}
                    </div>
                    <div className="flex-1 p-1 overflow-y-auto space-y-0.5 text-[0.65rem]">
                      {dayMeetings.slice(0, 3).map((meeting) => (
                        <button
                          key={meeting.id}
                          onClick={() => setSelectedMeeting(meeting)}
                          className="w-full text-left bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 px-1.5 py-0.5 rounded truncate hover:bg-emerald-500/30 transition-colors"
                          title={meeting.user?.full_name || "Meeting"}
                        >
                          {meeting.user?.full_name || "Meeting"}
                        </button>
                      ))}
                      {dayMeetings.length > 3 && (
                        <div className="text-white/30 px-1.5 py-0.5">
                          +{dayMeetings.length - 3} {isAr ? "أخرى" : "more"}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Selected meeting detail modal */}
      {selectedMeeting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d1526] border border-[rgba(245,158,11,0.2)] rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-black text-white mb-4">
              {selectedMeeting.user?.full_name || (isAr ? "تفاصيل الجلسة" : "Meeting Details")}
            </h3>

            <div className="space-y-3 mb-6">
              <div>
                <p className="text-xs text-white/40 uppercase font-semibold tracking-wider mb-1">
                  {isAr ? "الورشة" : "Workshop"}
                </p>
                <p className="text-white font-semibold">
                  {isAr
                    ? selectedMeeting.session?.workshop?.title_ar
                    : selectedMeeting.session?.workshop?.title_en}
                </p>
              </div>

              <div>
                <p className="text-xs text-white/40 uppercase font-semibold tracking-wider mb-1">
                  {isAr ? "الموعد" : "Time"}
                </p>
                <p className="text-white font-semibold">
                  {selectedMeeting.session?.starts_at
                    ? new Date(selectedMeeting.session.starts_at).toLocaleString(
                      isAr ? "ar-EG" : "en-US",
                      {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )
                    : (isAr ? "لا يوجد" : "N/A")}
                </p>
              </div>

              <div>
                <p className="text-xs text-white/40 uppercase font-semibold tracking-wider mb-1">
                  {isAr ? "البريد الإلكتروني" : "Email"}
                </p>
                <p className="text-white font-semibold">{selectedMeeting.user?.email || (isAr ? "لا يوجد" : "N/A")}</p>
              </div>

              {selectedMeeting.session?.location_or_link && (
                <div>
                  <p className="text-xs text-white/40 uppercase font-semibold tracking-wider mb-1">
                    {isAr ? "الموقع أو الرابط" : "Location/Link"}
                  </p>
                  <p className="text-white font-semibold break-all">
                    {selectedMeeting.session.location_or_link}
                  </p>
                </div>
              )}

              <div className="pt-2 border-t border-white/10">
                <p className="text-xs text-emerald-400 font-semibold">
                  ✓ {isAr ? "مؤكد ومدفوع" : "Confirmed & Paid"}
                </p>
              </div>
            </div>

            <button
              onClick={() => setSelectedMeeting(null)}
              className="w-full bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[#F59E0B] font-semibold py-2 rounded-lg hover:bg-[#F59E0B]/15 transition-colors"
            >
              {isAr ? "إغلاق" : "Close"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
