'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Calendar, Clock, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import BookingFlow from '@/components/booking/BookingFlow';
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
  const [step, setStep] = useState<'workshop' | 'calendar' | 'capacity' | 'booking'>('workshop');
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [selectedWorkshop, setSelectedWorkshop] = useState<Workshop | null>(null);
  const [selectedCapacity, setSelectedCapacity] = useState(1);
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
    // Poll for updates every 3 seconds to see real-time admin changes
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
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

  const getSlotsForWorkshop = (date: string, workshopId: string) => {
    const now = new Date();
    return slots.filter(
      (s) => {
        if (s.date !== date || s.booked_count >= s.capacity) return false;
        if (!s.assignments?.some((a) => a.workshop_id === workshopId)) return false;
        // Filter out past times: if the date is today, check that the end time hasn't passed
        if (s.date === formatDateToISO(now.getDate())) {
          const slotEndDateTime = new Date(`${s.date}T${s.end_time}`);
          if (slotEndDateTime < now) return false;
        }
        return true;
      }
    );
  };

  const getIndividualSessions = (date: string) => {
    const now = new Date();
    return slots.filter(
      (s) => {
        if (s.date !== date || s.booked_count >= s.capacity) return false;
        if (!s.assignments?.some((a) => a.session_id && !a.workshop_id)) return false;
        // Filter out past times: if the date is today, check that the end time hasn't passed
        if (s.date === formatDateToISO(now.getDate())) {
          const slotEndDateTime = new Date(`${s.date}T${s.end_time}`);
          if (slotEndDateTime < now) return false;
        }
        return true;
      }
    );
  };

  const isDateAvailable = (day: number) => {
    const dateStr = formatDateToISO(day);
    if (selectedWorkshop) {
      return getSlotsForWorkshop(dateStr, selectedWorkshop.id).length > 0;
    }
    return getIndividualSessions(dateStr).length > 0;
  };

  const isDateInPast = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  // Step 1: Workshop Selection
  if (step === 'workshop') {
    return (
      <div className="min-h-screen bg-[#0f172a] p-4 md:p-6">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-black text-white mb-2">{isAr ? '📅 اختر برنامجك' : '📅 Choose Your Program'}</h1>
            <p className="text-white/50">{isAr ? 'اختر ورشة عمل أو جلسة فردية' : 'Select a workshop or individual session'}</p>
          </div>

          {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6"><p className="text-red-400">{error}</p></div>}

          {loading ? (
            <div className="text-center text-white/50">{t('loading')}</div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={() => {
                  setSelectedWorkshop(null);
                  setSelectedCapacity(1);
                  setStep('calendar');
                }}
                className="w-full p-6 rounded-lg border-2 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 transition text-left"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-1">{isAr ? 'جلسة فردية' : 'Individual Session'}</h3>
                    <p className="text-emerald-400 font-semibold">500 EGP</p>
                    <p className="text-white/60 text-sm mt-2">{isAr ? '1 على 1 جلسة تدريب شخصية' : 'One-on-one personal coaching'}</p>
                  </div>
                  <div className="ml-4 text-3xl">👤</div>
                </div>
              </button>

              {workshops.map((workshop) => (
                <button
                  key={workshop.id}
                  onClick={() => {
                    setSelectedWorkshop(workshop);
                    setSelectedCapacity(1);
                    setStep('capacity');
                  }}
                  className="w-full p-6 rounded-lg border-2 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 transition text-left"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-1">{isAr ? workshop.title_ar : workshop.title_en}</h3>
                      <p className="text-amber-400 font-semibold">1200 EGP</p>
                      <p className="text-white/60 text-sm mt-2">{isAr ? 'ورشة عمل تفاعلية' : 'Interactive workshop'}</p>
                    </div>
                    <div className="ml-4 text-3xl">👥</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Step 1.5: Capacity Selection
  if (step === 'capacity' && selectedWorkshop) {
    return (
      <div className="min-h-screen bg-[#0f172a] p-4 md:p-6">
        <div className="max-w-2xl mx-auto">
          <button onClick={() => { setSelectedWorkshop(null); setStep('workshop'); }} className="flex items-center gap-2 text-amber-300 hover:text-amber-200 mb-6"><ChevronLeft className="w-5 h-5" /><span>{isAr ? 'رجوع' : 'Back'}</span></button>

          <div className="mb-8">
            <h1 className="text-3xl font-black text-white mb-2">{isAr ? 'عدد الأشخاص' : 'Number of People'}</h1>
            <p className="text-white/50">{isAr ? `${selectedWorkshop.title_ar} - اختر عدد المقاعد` : `${selectedWorkshop.title_en} - Select seats`}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            {[1, 2, 3, 4, 5].map((num) => (
              <button
                key={num}
                onClick={() => {
                  setSelectedCapacity(num);
                  setStep('calendar');
                }}
                className={`p-6 rounded-lg border-2 font-bold text-lg transition ${
                  selectedCapacity === num
                    ? 'bg-amber-500/30 border-amber-500 text-amber-300'
                    : 'border-white/10 hover:border-amber-500/50 hover:bg-white/5 text-white'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Calendar & Slot Selection
  if (step === 'calendar') {
    const monthName = new Intl.DateTimeFormat(isAr ? 'ar-EG' : 'en-US', { month: 'long', year: 'numeric' }).format(currentDate);
    const dayNames = isAr ? ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const days = Array.from({ length: daysInMonth(currentDate) }, (_, i) => i + 1);
    const emptyDays = Array.from({ length: firstDayOfMonth(currentDate) }, (_, i) => i);
    const getSlotsForDate = (dateStr: string) => selectedWorkshop ? getSlotsForWorkshop(dateStr, selectedWorkshop.id) : getIndividualSessions(dateStr);

    return (
      <div className="min-h-screen bg-[#0f172a] p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <button onClick={() => { setSelectedWorkshop(null); setStep('workshop'); }} className="flex items-center gap-2 text-amber-300 hover:text-amber-200 mb-6"><ChevronLeft className="w-5 h-5" /><span>{isAr ? 'رجوع' : 'Back'}</span></button>

          <div className="mb-8">
            <h1 className="text-2xl font-black text-white mb-1">{isAr ? '📅 اختر موعداً' : '📅 Select a Time'}</h1>
            <p className="text-white/50 text-sm">{selectedWorkshop ? `${isAr ? selectedWorkshop.title_ar : selectedWorkshop.title_en} • ${selectedCapacity} ${isAr ? 'أشخاص' : 'people'}` : isAr ? 'جلسة فردية' : 'Individual Session'}</p>
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
                const available = isDateAvailable(day);
                const daySlots = getSlotsForDate(formatDateToISO(day));
                return (
                  <button
                    key={day}
                    onClick={() => !inPast && available && setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
                    disabled={inPast || !available}
                    className={`p-2 md:p-3 rounded border text-xs md:text-sm transition ${
                      inPast ? 'bg-white/5 border-white/10 text-white/20 cursor-not-allowed' :
                      available ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 font-bold cursor-pointer' :
                      'bg-white/5 border-white/10 text-white/70 cursor-pointer'
                    }`}
                  >
                    <div className="font-semibold">{day}</div>
                    {available && <div className="text-xs mt-1">{daySlots.length} {isAr ? 'موعد' : 'slot'}</div>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg md:text-xl font-bold text-amber-300">{isAr ? `المواعيد - ${currentDate.toLocaleDateString('ar-EG')}` : `Slots - ${currentDate.toLocaleDateString()}`}</h2>
            {getSlotsForDate(formatDateToISO(currentDate.getDate())).length === 0 ? (
              <p className="text-white/40">{isAr ? 'لا توجد مواعيد' : 'No slots'}</p>
            ) : (
              getSlotsForDate(formatDateToISO(currentDate.getDate())).map((slot) => (
                <button
                  key={slot.id}
                  onClick={() => {
                    setSelectedSlot(slot);
                    setStep('booking');
                  }}
                  className="w-full p-4 rounded-lg border bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20 transition cursor-pointer text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-amber-300" /><span className="font-semibold text-white">{slot.start_time} - {slot.end_time}</span></div>
                    <span className="text-xs font-semibold text-emerald-400">{isAr ? 'متاح' : 'Available'}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Booking
  if (step === 'booking' && selectedSlot && userId) {
    const isWorkshop = !!selectedWorkshop;
    const title = isWorkshop ? (isAr ? selectedWorkshop?.title_ar : selectedWorkshop?.title_en) : (isAr ? 'جلسة فردية' : 'Individual Session');
    const price = isWorkshop ? 1200 : 500;

    return (
      <BookingFlow
        sessionId={selectedSlot.id}
        workshopTitle={title || 'Session'}
        price={price}
        userId={userId}
        sessionStartsAt={`${selectedSlot.date}T${selectedSlot.start_time}`}
        sessionEndsAt={`${selectedSlot.date}T${selectedSlot.end_time}`}
        capacity={selectedCapacity}
        onBack={() => setStep('calendar')}
      />
    );
  }

  return null;
}
