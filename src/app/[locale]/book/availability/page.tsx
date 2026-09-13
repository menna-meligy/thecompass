'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Calendar, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import BookingFlow from '@/components/booking/BookingFlow';
import SessionSelector from '@/components/booking/SessionSelector';
import SessionIntroduction from '@/components/booking/SessionIntroduction';
import WorkshopAvailabilityCalendar from '@/components/workshops/WorkshopAvailabilityCalendar';
import type { SessionOption } from '@/components/booking/SessionSelector';
import { createClient } from '@/lib/supabase/client';

interface Workshop {
  id: string;
  title_ar: string;
  title_en: string;
}

interface AvailabilitySlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  booked_count: number;
  admin_marked_status?: 'available' | 'full' | 'unavailable';
  assignments?: Array<{
    id: string;
    workshop_id?: string;
    session_id?: string;
    workshop?: Workshop;
  }>;
}

export default function AvailabilityBookingPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('booking');
  const isAr = locale === 'ar';
  const supabase = createClient();

  // State
  const [step, setStep] = useState<'calendar' | 'booking'>('calendar');
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
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
    fetchData();

    // Set up real-time subscription to availability_slots changes
    const channel = supabase
      .channel('availability_slots_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'availability_slots'
      }, () => {
        // Refresh slots when any changes occur
        fetchData();
      })
      .subscribe();

    // Also poll periodically as fallback
    const interval = setInterval(fetchData, 5000);

    return () => {
      clearInterval(interval);
      channel.unsubscribe();
    };
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      setError(null);
      const [slotsRes, workshopsRes] = await Promise.all([
        fetch('/api/availability/centralized-slots'),
        fetch('/api/admin/availability/workshops'),
      ]);

      if (slotsRes.ok) setSlots(await slotsRes.json());
      if (workshopsRes.ok) setWorkshops(await workshopsRes.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const formatDateToISO = (day: number) => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    return `${year}-${month}-${dayStr}`;
  };

  // Individual training session
  const sessionTitle = isAr ? 'جلسة تدريب فردي مع المنتور' : 'Individual Training Session with Mentor';
  const sessionPrice = 500;

  // Get current time in Egyptian timezone (UTC+2/+3)
  const getEgyptianNow = () => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(new Date());
    const date = `${parts.find(p => p.type === 'year')?.value}-${parts.find(p => p.type === 'month')?.value}-${parts.find(p => p.type === 'day')?.value}`;
    const time = `${parts.find(p => p.type === 'hour')?.value}:${parts.find(p => p.type === 'minute')?.value}`;
    return { date, time };
  };

  const getSlotsForDate = (date: string) => {
    return slots.filter((s) => {
      // Check date first
      if (s.date !== date) return false;

      // Check if slot is available (not marked as unavailable)
      if (s.admin_marked_status === 'unavailable') return false;

      // Don't show fully booked slots
      if (s.booked_count >= s.capacity) return false;

      return true;
    });
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

  // Step 1: Calendar & Slot Selection (with intro)
  if (step === 'calendar') {
    const monthName = new Intl.DateTimeFormat(isAr ? 'ar-EG' : 'en-US', { month: 'long', year: 'numeric' }).format(currentDate);
    const dayNames = isAr ? ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const days = Array.from({ length: daysInMonth(currentDate) }, (_, i) => i + 1);
    const emptyDays = Array.from({ length: firstDayOfMonth(currentDate) }, (_, i) => i);

    return (
      <div className="min-h-screen bg-[#0f172a] p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-10">
            <h1 className="text-4xl font-black text-white mb-6">🧭 تعرّف على نفسك</h1>

            {/* Benefits - Egyptian Arabic */}
            {isAr && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
                <div className="p-4 bg-white/5 border border-white/10 rounded-lg hover:border-amber-500/30 transition">
                  <p className="text-amber-300 font-bold mb-2">افهم نفسك</p>
                  <p className="text-white/70 text-sm">اكتشف نقاط قوتك وضعفك وإيه اللي بيحفزك فعلاً</p>
                </div>
                <div className="p-4 bg-white/5 border border-white/10 rounded-lg hover:border-amber-500/30 transition">
                  <p className="text-amber-300 font-bold mb-2">خطّط مسارك</p>
                  <p className="text-white/70 text-sm">حدّد أهدافك والطريقة اللي توصلك ليها</p>
                </div>
                <div className="p-4 bg-white/5 border border-white/10 rounded-lg hover:border-amber-500/30 transition">
                  <p className="text-amber-300 font-bold mb-2">اتحرك بثقة</p>
                  <p className="text-white/70 text-sm">من الفهم للتحرك الفعلي في كل جلسة</p>
                </div>
              </div>
            )}
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-black text-white mb-2">📅 اختر موعداً</h2>
            <p className="text-white/50 text-sm">{sessionTitle}</p>
          </div>

          {/* Availability Calendar Component */}
          <div className="mb-8">
            <WorkshopAvailabilityCalendar workshopId="career-deciding" isAr={isAr} />
          </div>

          <div className="bg-white/5 border border-white/10 rounded-lg p-3 md:p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))} className="p-2 hover:bg-white/10 rounded"><ChevronLeft className="w-5 h-5 text-amber-400" /></button>
              <h2 className="text-lg font-bold text-white">{monthName}</h2>
              <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))} className="p-2 hover:bg-white/10 rounded"><ChevronRight className="w-5 h-5 text-amber-400" /></button>
            </div>

            <div className="grid grid-cols-7 gap-2 mb-4">
              {dayNames.map((day) => <div key={day} className="text-center text-white/50 text-xs font-semibold py-2">{day}</div>)}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {emptyDays.map((_, i) => <div key={`empty-${i}`}></div>)}
              {days.map((day) => {
                const inPast = isDateInPast(day);
                const dateStr = formatDateToISO(day);
                const daySlots = getSlotsForDate(dateStr);
                const available = daySlots.length > 0;

                // Check if any slot is marked unavailable
                const hasUnavailable = daySlots.some(s => s.admin_marked_status === 'unavailable');

                return (
                  <button
                    key={day}
                    onClick={() => !inPast && available && setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
                    disabled={inPast || !available}
                    className={`p-2 md:p-3 rounded border text-xs md:text-sm transition ${
                      inPast ? 'bg-white/5 border-white/10 text-white/20 cursor-not-allowed' :
                      hasUnavailable || available ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 font-bold cursor-pointer' :
                      'bg-white/5 border-white/10 text-white/70 cursor-pointer'
                    }`}
                  >
                    <div className="font-semibold">{day}</div>
                    {available && <div className="text-xs mt-1">✓ {isAr ? 'متاح' : 'Available'}</div>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg md:text-xl font-bold text-amber-300">{isAr ? `المواعيد - ${currentDate.toLocaleDateString('ar-EG')}` : `Slots - ${currentDate.toLocaleDateString()}`}</h2>
            {getSlotsForDate(formatDateToISO(currentDate.getDate())).length === 0 ? (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-center">
                <p className="text-red-400 font-semibold">{isAr ? '🔴 ممتلئ' : '🔴 Fully Booked'}</p>
              </div>
            ) : (
              getSlotsForDate(formatDateToISO(currentDate.getDate())).map((slot) => {
                const isUnavailable = slot.admin_marked_status === 'unavailable';
                const isAvailable = slot.admin_marked_status === 'available';
                return (
                  <button
                    key={slot.id}
                    onClick={() => {
                      if (!isUnavailable) {
                        setSelectedSlot(slot);
                        setStep('booking');
                      }
                    }}
                    disabled={isUnavailable}
                    className={`w-full p-4 rounded-lg border transition cursor-pointer text-left ${
                      isUnavailable
                        ? 'bg-red-500/10 border-red-500/30 opacity-50 cursor-not-allowed'
                        : 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-amber-300" /><span className="font-semibold text-white">{slot.start_time} - {slot.end_time}</span></div>
                      <span className={`text-xs font-semibold ${isUnavailable ? 'text-red-400' : 'text-emerald-400'}`}>
                        {isUnavailable ? (isAr ? '🔴 ممتلئ' : '🔴 Full') : (isAr ? '✓ متاح' : '✓ Available')}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Booking
  if (step === 'booking' && selectedSlot && userId) {
    const sessionStartDateTime = `${selectedSlot.date}T${selectedSlot.start_time}`;

    return (
      <div className="min-h-screen bg-[#0f172a] p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          {/* Booking flow */}
          <BookingFlow
            sessionId={selectedSlot.id}
            workshopTitle={sessionTitle}
            price={sessionPrice}
            userId={userId}
            sessionStartsAt={sessionStartDateTime}
            sessionEndsAt={`${selectedSlot.date}T${selectedSlot.end_time}`}
            capacity={1}
            onBack={() => setStep('calendar')}
          />
        </div>
      </div>
    );
  }

  return null;
}
