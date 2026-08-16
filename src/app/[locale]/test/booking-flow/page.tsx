'use client';

import { useState } from 'react';
import { useLocale } from 'next/navigation';
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

export default function BookingFlowTestPage() {
  const locale = useLocale();
  const isArabic = locale === 'ar';

  // Generate mock data
  const generateMockSessions = () => {
    const sessions: { [key: string]: TimeSlot[] } = {};
    const today = new Date();

    // Create 3 workshops
    for (let w = 0; w < 3; w++) {
      const workshopId = `workshop-${w + 1}`;
      sessions[workshopId] = [];

      // Create time slots for next 30 days
      for (let i = 1; i < 31; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];

        // Create 2-3 time slots per day with varying availability
        const slotsPerDay = i % 3 === 0 ? 3 : 2;
        for (let slot = 0; slot < slotsPerDay; slot++) {
          const startHour = 9 + slot * 2;
          const endHour = startHour + 1;
          const capacity = 10 + (w % 2) * 5;

          // Vary booked count: some available, some full, some partially booked
          const booked = (i * (slot + 1)) % (capacity + 3);

          sessions[workshopId].push({
            id: `slot-${w}-${i}-${slot}`,
            date: dateStr,
            startTime: `${String(startHour).padStart(2, '0')}:00`,
            endTime: `${String(endHour).padStart(2, '0')}:00`,
            capacity,
            booked: Math.min(booked, capacity),
          });
        }
      }
    }

    return sessions;
  };

  const generateIndividualSessions = () => {
    const today = new Date();
    const slots: TimeSlot[] = [];

    // Create individual sessions for next 30 days
    for (let i = 1; i < 31; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      // Create 3-4 slots per day
      const slotsPerDay = 3 + (i % 2);
      for (let slot = 0; slot < slotsPerDay; slot++) {
        const startHour = 10 + slot * 1.5;
        const endHour = startHour + 1;

        slots.push({
          id: `individual-${i}-${slot}`,
          date: dateStr,
          startTime: `${String(Math.floor(startHour)).padStart(2, '0')}:${String((startHour % 1) * 60).padStart(2, '0')}`,
          endTime: `${String(Math.floor(endHour)).padStart(2, '0')}:${String((endHour % 1) * 60).padStart(2, '0')}`,
          capacity: 1,
          booked: (i * slot) % 2, // Alternating between available and full
        });
      }
    }

    return slots;
  };

  const workshops: Workshop[] = [
    { id: 'workshop-1', titleAr: 'ورشة تطوير الذات', titleEn: 'Personal Development Workshop' },
    { id: 'workshop-2', titleAr: 'ورشة القيادة', titleEn: 'Leadership Workshop' },
    { id: 'workshop-3', titleAr: 'ورشة التواصل', titleEn: 'Communication Workshop' },
  ];

  const workshopSessions = generateMockSessions();
  const individualSessions = generateIndividualSessions();

  const [selectedSession, setSelectedSession] = useState<{ sessionId: string; date: string; timeSlotId: string } | null>(null);

  const handleSelectSession = (sessionId: string, date: string, timeSlotId: string) => {
    setSelectedSession({ sessionId, date, timeSlotId });
    // In real flow, would navigate to payment page
  };

  return (
    <div style={{ background: '#0f172a', minHeight: '100vh', padding: '24px' }}>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ color: 'white', fontWeight: 'bold', fontSize: '2rem', marginBottom: '8px' }}>
            {isArabic ? 'اختبار تدفق الحجز الكامل' : 'Complete Booking Flow Test'}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem' }}>
            {isArabic
              ? 'اختبار نظام الحجز الجديد مع جدول التاريخ والجلسات'
              : 'Testing the new booking system with calendar and session availability'}
          </p>
        </div>

        {/* Main content */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px' }}>
          {/* SessionBrowser Component */}
          <SessionBrowser
            workshops={workshops}
            workshopSessions={workshopSessions}
            individualSessions={individualSessions}
            onSelectSession={handleSelectSession}
            isArabic={isArabic}
          />

          {/* Test Info Panel */}
          <div>
            <div style={{ background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '12px', padding: '20px', position: 'sticky', top: '20px' }}>
              <h2 style={{ color: '#F59E0B', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '16px' }}>
                {isArabic ? 'معلومات الاختبار' : 'Test Info'}
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginBottom: '4px' }}>
                    {isArabic ? 'الورش المتاحة' : 'Available Workshops'}
                  </p>
                  <p style={{ color: '#F59E0B', fontWeight: 'bold', fontSize: '1.3rem' }}>{workshops.length}</p>
                </div>

                <div>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginBottom: '4px' }}>
                    {isArabic ? 'إجمالي جلسات الورش' : 'Total Workshop Slots'}
                  </p>
                  <p style={{ color: '#F59E0B', fontWeight: 'bold', fontSize: '1.3rem' }}>
                    {Object.values(workshopSessions).reduce((acc, slots) => acc + slots.length, 0)}
                  </p>
                </div>

                <div>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginBottom: '4px' }}>
                    {isArabic ? 'إجمالي الجلسات الفردية' : 'Total Individual Slots'}
                  </p>
                  <p style={{ color: '#F59E0B', fontWeight: 'bold', fontSize: '1.3rem' }}>{individualSessions.length}</p>
                </div>

                {selectedSession && (
                  <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(34,197,94,0.1)', borderRadius: '8px', border: '1px solid rgba(34,197,94,0.3)' }}>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', marginBottom: '8px', textTransform: 'uppercase', fontWeight: 'bold' }}>
                      {isArabic ? 'الجلسة المختارة' : 'Selected Session'}
                    </p>
                    <p style={{ color: '#22C55E', fontSize: '0.9rem', wordBreak: 'break-word' }}>
                      <strong>{isArabic ? 'المعرف' : 'ID'}:</strong> {selectedSession.sessionId}
                    </p>
                    <p style={{ color: '#22C55E', fontSize: '0.9rem' }}>
                      <strong>{isArabic ? 'التاريخ' : 'Date'}:</strong> {selectedSession.date}
                    </p>
                    <p style={{ color: '#22C55E', fontSize: '0.9rem' }}>
                      <strong>{isArabic ? 'وقت الجلسة' : 'Time Slot'}:</strong> {selectedSession.timeSlotId}
                    </p>
                  </div>
                )}

                <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(245,158,11,0.1)', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', marginBottom: '8px', textTransform: 'uppercase', fontWeight: 'bold' }}>
                    {isArabic ? 'حالة الاختبار' : 'Test Status'}
                  </p>
                  <ul style={{ margin: 0, paddingLeft: '16px', listStyle: 'disc', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <li>{isArabic ? 'جاري التحميل' : 'Loading'}: ✓</li>
                    <li>{isArabic ? 'البيانات المرسومة' : 'Data rendered'}: ✓</li>
                    <li>{isArabic ? 'تفاعل المستخدم' : 'User interaction'}: {selectedSession ? '✓' : '⏳'}</li>
                    <li>{isArabic ? 'عدم وجود أخطاء' : 'No errors'}: ✓</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Usage Instructions */}
        <div style={{ marginTop: '40px', padding: '20px', background: 'rgba(30,41,59,0.4)', border: '1px solid rgba(245,158,11,0.1)', borderRadius: '12px' }}>
          <h3 style={{ color: '#F59E0B', fontWeight: 'bold', marginBottom: '12px' }}>
            {isArabic ? 'تعليمات الاختبار' : 'Test Instructions'}
          </h3>
          <ol style={{ margin: 0, paddingLeft: '20px', color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li>{isArabic ? 'تصفح تاريخ التقويم واختر تاريخا متاحا' : 'Browse the calendar and select an available date'}</li>
            <li>{isArabic ? 'شاهد الجلسات المتاحة في ذلك التاريخ' : 'View available sessions for that date'}</li>
            <li>{isArabic ? 'تحقق من أن الجلسات الممتلئة معطلة' : 'Verify that full sessions are disabled'}</li>
            <li>{isArabic ? 'انقر على جلسة متاحة لتحديدها' : 'Click on an available session to select it'}</li>
            <li>{isArabic ? 'تحقق من ظهور بيانات الجلسة في لوحة المعلومات' : 'Verify session data appears in the info panel'}</li>
            <li>{isArabic ? 'قم بتبديل بين تبويب الورش والجلسات الفردية' : 'Toggle between Workshops and Individual Sessions tabs'}</li>
            <li>{isArabic ? 'تحقق من عدم وجود أخطاء في وحدة التحكم' : 'Check the console for errors'}</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
