'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Calendar, Clock, Users } from 'lucide-react';

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

export default function AvailabilityBookingPage() {
  const router = useRouter();
  const locale = useLocale();
  const isAr = locale === 'ar';

  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');

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

  const uniqueDates = Array.from(new Set(slots.map((s) => s.date))).sort();
  const slotsForDate = selectedDate ? slots.filter((s) => s.date === selectedDate) : [];

  const handleSelectSlot = (slot: AvailabilitySlot) => {
    const assignment = slot.assignments?.[0];
    if (assignment?.workshop_id) {
      router.push(`/${locale}/workshops/${assignment.workshop_id}?date=${slot.date}&time=${slot.start_time}&slotId=${slot.id}`);
    } else if (assignment?.session_id) {
      router.push(`/${locale}/sessions/${assignment.session_id}?date=${slot.date}&time=${slot.start_time}&slotId=${slot.id}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <p className="text-white/60">{isAr ? 'جاري التحميل...' : 'Loading...'}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <p className="text-red-400">{isAr ? 'خطأ: ' : 'Error: '}{error}</p>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <p className="text-white/40">{isAr ? 'لا توجد مواعيد متاحة' : 'No available slots'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-black text-white mb-2">
          {isAr ? '📅 اختر موعداً' : '📅 Select a Time Slot'}
        </h1>
        <p className="text-white/50 mb-8">{isAr ? 'اختر التاريخ والموعد المناسب لك' : 'Choose a date and time that works for you'}</p>

        {/* Date selector */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-8">
          {uniqueDates.map((date) => (
            <button
              key={date}
              onClick={() => setSelectedDate(date)}
              className={`p-3 rounded-lg font-semibold text-sm transition ${
                selectedDate === date
                  ? 'bg-amber-500 text-black'
                  : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'
              }`}
            >
              {date}
            </button>
          ))}
        </div>

        {/* Slots for selected date */}
        {selectedDate && (
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-amber-300 mb-4">
              {isAr ? `المواعيد المتاحة - ${selectedDate}` : `Available Slots - ${selectedDate}`}
            </h2>
            {slotsForDate.length === 0 ? (
              <p className="text-white/40">{isAr ? 'لا توجد مواعيد في هذا التاريخ' : 'No slots available on this date'}</p>
            ) : (
              slotsForDate.map((slot) => {
                const available = slot.booked_count < slot.capacity;
                const assignment = slot.assignments?.[0];
                const title = assignment?.workshop?.title_ar || assignment?.workshop?.title_en ||
                             assignment?.session?.workshop?.title_ar || assignment?.session?.workshop?.title_en ||
                             (isAr ? 'جلسة' : 'Session');
                return (
                  <button
                    key={slot.id}
                    onClick={() => handleSelectSlot(slot)}
                    disabled={!available}
                    className={`w-full p-4 rounded-lg border transition ${
                      available
                        ? 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20 cursor-pointer'
                        : 'bg-red-500/10 border-red-500/30 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-3 mb-2">
                          <Clock className="w-4 h-4 text-amber-300" />
                          <span className="font-semibold text-white">
                            {slot.start_time} - {slot.end_time}
                          </span>
                        </div>
                        <p className="text-white/70 text-sm">{isAr ? 'ورشة: ' : 'Workshop: '}{title}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-white/70 text-sm mb-1">
                          <Users className="w-4 h-4" />
                          <span>{slot.booked_count}/{slot.capacity}</span>
                        </div>
                        <span className={`text-xs font-semibold ${available ? 'text-emerald-400' : 'text-red-400'}`}>
                          {available ? (isAr ? 'متاح' : 'Available') : (isAr ? 'ممتلئ' : 'Full')}
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
