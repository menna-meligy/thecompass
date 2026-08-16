'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next/navigation';
import AdminPageWrapper from '@/components/admin/AdminPageWrapper';
import AvailabilityManager from '@/components/admin/AvailabilityManager';

interface TimeSlot {
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  booked: number;
}

interface Session {
  id: string;
  workshopId: string;
  type: string;
}

export default function AdminAvailabilityPage() {
  const locale = useLocale();
  const isArabic = locale === 'ar';

  const [sessions, setSessions] = useState<{ [key: string]: { session: Session; slots: TimeSlot[] } }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  async function fetchSessions() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/availability/sessions');
      if (!res.ok) throw new Error('Failed to fetch sessions');
      const data = await res.json();

      const sessionMap: { [key: string]: { session: Session; slots: TimeSlot[] } } = {};
      data.sessions.forEach((session: any) => {
        sessionMap[session.id] = {
          session: {
            id: session.id,
            workshopId: session.workshopId,
            type: session.type,
          },
          slots: session.timeSlots,
        };
      });

      setSessions(sessionMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  const handleAddSlot = async (sessionId: string, slot: TimeSlot) => {
    try {
      const res = await fetch('/api/admin/availability/manage-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          sessionId,
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          capacity: slot.capacity,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to add slot');
      }

      await fetchSessions();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleRemoveSlot = async (sessionId: string, date: string, startTime: string) => {
    try {
      const res = await fetch('/api/admin/availability/manage-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove',
          sessionId,
          date,
          startTime,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to remove slot');
      }

      await fetchSessions();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  if (loading) {
    return (
      <AdminPageWrapper>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: 'rgba(255,255,255,0.6)' }}>
            {isArabic ? 'جاري التحميل...' : 'Loading...'}
          </p>
        </div>
      </AdminPageWrapper>
    );
  }

  if (error) {
    return (
      <AdminPageWrapper>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: '#F87171' }}>
            {isArabic ? 'خطأ: ' : 'Error: '}
            {error}
          </p>
        </div>
      </AdminPageWrapper>
    );
  }

  return (
    <AdminPageWrapper>
      <div>
        <h1 style={{ color: 'white', fontWeight: 'bold', fontSize: '1.8rem', marginBottom: '24px' }}>
          {isArabic ? 'إدارة التوفر' : 'Manage Availability'}
        </h1>

        {Object.entries(sessions).length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,0.4)' }}>
            {isArabic ? 'لا توجد جلسات' : 'No sessions found'}
          </p>
        ) : (
          <div style={{ display: 'grid', gap: '32px' }}>
            {Object.entries(sessions).map(([sessionId, { session, slots }]) => (
              <div key={sessionId}>
                <h2 style={{ color: '#F59E0B', fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '16px' }}>
                  {session.type === 'group' ? 'Workshop' : 'Individual Session'} - {sessionId.substring(0, 8)}...
                </h2>
                <AvailabilityManager
                  workshopId={session.workshopId}
                  sessionId={sessionId}
                  existingSlots={slots}
                  onAddSlot={(slot) => handleAddSlot(sessionId, slot)}
                  onRemoveSlot={(date, startTime) => handleRemoveSlot(sessionId, date, startTime)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminPageWrapper>
  );
}
