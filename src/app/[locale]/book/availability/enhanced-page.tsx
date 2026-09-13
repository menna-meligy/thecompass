'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Calendar, Clock, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import BookingFlow from '@/components/booking/BookingFlow';
import { createClient } from '@/lib/supabase/client';

interface AvailabilitySlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  booked_count: number;
  assignments?: Array<{
    id: string;
    workshop_id?: string;
    workshop?: { id: string; title_ar: string; title_en: string };
  }>;
}

export default function EnhancedAvailabilityBookingPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('booking');
  const isAr = locale === 'ar';
  const supabase = createClient();

  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    async function initUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push(`/${locale}/auth`);
        return;
      }
      setUserId(user.id);
    }
    initUser();
  }, [router, locale, supabase.auth]);

  useEffect(() => {
    fetchSlots();
  }, []);

  async function fetchSlots() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/availability/centralized-slots');
      if (!res.ok) throw new Error('Failed to fetch slots');
      const data = await res.json();
      setSlots(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  // Calendar logic
  const daysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const firstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDateToISO = (day: number) => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    return `${year}-${month}-${dayStr}`;
  };

  const getSlotsForDate = (date: string) => {
    return slots.filter(
      (s) => s.date === date && s.booked_count < s.capacity
    );
  };

  const isDateAvailable = (day: number) => {
    const dateStr = formatDateToISO(day);
    return getSlotsForDate(dateStr).length > 0;
  };

  const isDateInPast = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  // If slot is selected, show booking flow
  if (selectedSlot && userId) {
    const assignment = selectedSlot.assignments?.[0];
    const isWorkshop = !!assignment?.workshop_id;
    const title = assignment?.workshop?.title_ar || assignment?.workshop?.title_en || 'Session';
    // Individual sessions: 500 EGP, Workshops: 1200 EGP
    const price = isWorkshop ? 1200 : 500;

    return (
      <BookingFlow
        sessionId={selectedSlot.id}
        workshopTitle={title}
        price={price}
        userId={userId}
        sessionStartsAt={`${selectedSlot.date}T${selectedSlot.start_time}`}
        sessionEndsAt={`${selectedSlot.date}T${selectedSlot.end_time}`}
      />
    );
  }

  // Calendar view
  const monthName = new Intl.DateTimeFormat(isAr ? 'ar-EG' : 'en-US', {
    month: 'long',
    year: 'numeric',
  }).format(currentDate);

  const dayNames = isAr
    ? ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const days = Array.from({ length: daysInMonth(currentDate) }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDayOfMonth(currentDate) }, (_, i) => i);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <p className="text-white/60">{t('loading')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-black text-white mb-1">
            {isAr ? 'حجوزاتي' : 'My Bookings'}
          </h1>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.875rem" }}>
            {isAr ? 'حجوزاتك الحالية والسابقة' : 'Your current and past bookings'}
          </p>
        </div>

        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-amber-300 hover:text-amber-200 mb-4 transition"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>{isAr ? 'رجوع' : 'Back'}</span>
        </button>
        <h1 className="text-3xl font-black text-white mb-2">
          {isAr ? '📅 اختر موعداً' : '📅 Select a Time Slot'}
        </h1>
        <p className="text-white/50 mb-8">
          {isAr
            ? 'اختر التاريخ والموعد المناسب لك'
            : 'Choose a date and time that works for you'}
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Calendar */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-3 md:p-6 mb-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <button
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
              className="p-1 md:p-2 hover:bg-white/10 rounded"
            >
              <ChevronLeft className="w-4 md:w-5 h-4 md:h-5 text-amber-400" />
            </button>
            <h2 className="text-base md:text-lg font-bold text-white">{monthName}</h2>
            <button
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
              className="p-2 hover:bg-white/10 rounded"
            >
              <ChevronRight className="w-5 h-5 text-amber-400" />
            </button>
          </div>

          {/* Day names */}
          <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2 md:mb-4">
            {dayNames.map((day) => (
              <div key={day} className="text-center text-white/50 text-xs font-semibold py-1 md:py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1 md:gap-2">
            {emptyDays.map((_, i) => (
              <div key={`empty-${i}`}></div>
            ))}
            {days.map((day) => {
              const inPast = isDateInPast(day);
              const available = isDateAvailable(day);
              const dateStr = formatDateToISO(day);
              const daySlots = getSlotsForDate(dateStr);

              let bgColor = 'bg-white/5';
              let textColor = 'text-white/70';
              let borderColor = 'border-white/10';
              let cursor = 'cursor-pointer';

              if (inPast) {
                bgColor = 'bg-white/5';
                textColor = 'text-white/20';
                cursor = 'cursor-not-allowed';
              } else if (available) {
                bgColor = 'bg-emerald-500/20';
                borderColor = 'border-emerald-500/50';
                textColor = 'text-emerald-400 font-bold';
              }

              return (
                <button
                  key={day}
                  onClick={() => !inPast && available && setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
                  disabled={inPast || !available}
                  className={`p-2 md:p-3 rounded border text-xs md:text-sm ${bgColor} ${borderColor} ${textColor} ${cursor} transition`}
                >
                  <div className="font-semibold text-sm md:text-base">{day}</div>
                  {available && (
                    <div className="text-xs mt-0.5 md:mt-1">
                      {daySlots.length} {isAr ? 'موعد' : 'slot'}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Slots for selected date */}
        {currentDate && (
          <div className="space-y-2 md:space-y-3">
            <h2 className="text-lg md:text-xl font-bold text-amber-300">
              {isAr
                ? `المواعيد المتاحة - ${currentDate.toLocaleDateString('ar-EG')}`
                : `Available Slots - ${currentDate.toLocaleDateString()}`}
            </h2>
            {getSlotsForDate(formatDateToISO(currentDate.getDate())).length === 0 ? (
              <p className="text-white/40 text-sm md:text-base">
                {isAr ? 'لا توجد مواعيد متاحة' : 'No available slots'}
              </p>
            ) : (
              getSlotsForDate(formatDateToISO(currentDate.getDate())).map((slot) => {
                const assignment = slot.assignments?.[0];
                const title = assignment?.workshop?.title_ar || assignment?.workshop?.title_en || 'Session';

                return (
                  <button
                    key={slot.id}
                    onClick={() => setSelectedSlot(slot)}
                    className="w-full p-3 md:p-4 rounded-lg border bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20 transition cursor-pointer text-left"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
                          <Clock className="w-4 h-4 text-amber-300 flex-shrink-0" />
                          <span className="font-semibold text-white text-sm md:text-base">
                            {slot.start_time} - {slot.end_time}
                          </span>
                        </div>
                        <p className="text-white/70 text-xs md:text-sm">{title}</p>
                      </div>
                      <div className="flex items-center justify-between md:flex-col md:text-right gap-2 md:gap-1">
                        <div className="flex items-center gap-1 text-white/70 text-xs md:text-sm">
                          <Users className="w-3 h-3 md:w-4 md:h-4" />
                          <span>
                            {slot.booked_count}/{slot.capacity}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-emerald-400">
                          {isAr ? 'متاح' : 'Available'}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
