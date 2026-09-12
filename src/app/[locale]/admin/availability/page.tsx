'use client';

import { useLocale } from 'next-intl';
import AdminPageWrapper from '@/components/admin/AdminPageWrapper';
import CentralizedAvailabilityManager from '@/components/admin/CentralizedAvailabilityManager';

export default function AdminAvailabilityPage() {
  const locale = useLocale();
  const isAr = locale === 'ar';

  return (
    <AdminPageWrapper>
      <div className="space-y-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#F59E0B] mb-1">
            {isAr ? 'إدارة الجدول' : 'Scheduling'}
          </p>
          <h1 className="text-2xl font-black text-white">
            {isAr ? 'مركز التوفر الموحد' : 'Centralized Availability'}
          </h1>
          <p className="text-white/50 text-sm mt-2">
            {isAr
              ? 'أنشئ مواقيت جديدة في تقويم واحد، ثم عينها للورش والجلسات المختلفة'
              : 'Create time slots in one calendar, then assign them to different workshops and sessions'
            }
          </p>
        </div>

        <CentralizedAvailabilityManager isAr={isAr} />
      </div>
    </AdminPageWrapper>
  );
}
