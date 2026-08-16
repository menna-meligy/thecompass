'use client';

import { useState, useEffect } from 'react';
import { useRouter, useLocale } from 'next/navigation';
import SessionBrowser from '@/components/booking/SessionBrowser';

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

interface Session {
  id: string;
  workshopId: string;
  type: string;
  price: number;
  capacity: number;
  location: string;
  timeSlots: TimeSlot[];
}

export default function AvailabilityBookingPage() {
  const router = useRouter();
  const locale = useLocale();
  const isArabic = locale === 'ar';

  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [workshopSessions, setWorkshopSessions] = useState<{ [key: string]: TimeSlot[] }>({});
  const [individualSessions, setIndividualSessions] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAvailableSessions();
  }, []);

  async function fetchAvailableSessions() {
    try {
      setLoading(true);
      setError(null);

      // Fetch group sessions (workshops)
      const groupRes = await fetch('/api/availability/sessions?type=group');
      if (!groupRes.ok) throw new Error('Failed to fetch workshops');
      const groupData = await groupRes.json();

      // Fetch individual sessions
      const individualRes = await fetch('/api/availability/sessions?type=individual');
      if (!individualRes.ok) throw new Error('Failed to fetch individual sessions');
      const individualData = await individualRes.json();

      // Get unique workshops
      const uniqueWorkshops: Workshop[] = [];
      const workshopMap: { [key: string]: TimeSlot[] } = {};

      groupData.sessions.forEach((session: Session) => {
        if (!uniqueWorkshops.find((w) => w.id === session.workshopId)) {
          uniqueWorkshops.push({
            id: session.workshopId,
            titleAr: 'Workshop',
            titleEn: 'Workshop',
          });
        }
        if (!workshopMap[session.workshopId]) {
          workshopMap[session.workshopId] = [];
        }
        workshopMap[session.workshopId].push(...session.timeSlots);
      });

      // Combine all individual time slots
      const allIndividualSlots: TimeSlot[] = [];
      individualData.sessions.forEach((session: Session) => {
        allIndividualSlots.push(...session.timeSlots);
      });

      setWorkshops(uniqueWorkshops);
      setWorkshopSessions(workshopMap);
      setIndividualSessions(allIndividualSlots);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  const handleSelectSession = (sessionId: string, date: string, timeSlotId: string) => {
    // Redirect to booking with session info
    router.push(`/${locale}/book/${sessionId}?timeSlot=${timeSlotId}&date=${date}`);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.6)' }}>
          {isArabic ? 'جاري التحميل...' : 'Loading...'}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#F87171' }}>
          {isArabic ? 'خطأ: ' : 'Error: '}
          {error}
        </p>
      </div>
    );
  }

  return (
    <div style={{ background: '#0f172a', minHeight: '100vh', padding: '24px' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <h1 style={{ color: 'white', fontWeight: 'bold', fontSize: '1.8rem', marginBottom: '24px' }}>
          {isArabic ? 'اختر جلسة' : 'Select a Session'}
        </h1>

        <SessionBrowser
          workshops={workshops}
          workshopSessions={workshopSessions}
          individualSessions={individualSessions}
          onSelectSession={handleSelectSession}
          isArabic={isArabic}
          isLoading={loading}
        />
      </div>
    </div>
  );
}
