'use client';

import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';

interface CTAButtonProps {
  user: User | null;
  locale: string;
  isPrimary?: boolean;
  label: string;
}

export default function CTAButton({ user, locale, isPrimary = false, label }: CTAButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (user) {
      router.push(`/${locale}/dashboard/bookings`);
    } else {
      router.push(`/${locale}/auth`);
    }
  };

  if (isPrimary) {
    return (
      <button
        onClick={handleClick}
        className="inline-flex items-center justify-center px-10 py-4 bg-[#F59E0B] text-[#0f172a] font-black text-base hover:bg-[#FBBF24] transition-all duration-200 hover:-translate-y-0.5 shadow-[0_8px_24px_rgba(245,158,11,0.30)] hover:shadow-[0_14px_36px_rgba(245,158,11,0.45)]"
        style={{ borderRadius: "12px", minWidth: "196px" }}
      >
        {label}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center justify-center px-10 py-4 text-[#F59E0B] font-semibold text-base hover:bg-[rgba(245,158,11,0.10)] border border-[rgba(245,158,11,0.35)] hover:border-[#F59E0B] transition-all duration-200 hover:-translate-y-0.5"
      style={{ borderRadius: "12px", minWidth: "196px" }}
    >
      {label}
    </button>
  );
}
