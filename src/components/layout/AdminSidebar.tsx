"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  LayoutDashboard,
  BookOpen,
  Calendar,
  Video,
  Tag,
  Bell,
  FileText,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

function GoldCompassWatermark() {
  return (
    <svg
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      className="absolute inset-0 w-full h-full pointer-events-none select-none"
      aria-hidden="true"
    >
      {/* Outer ring */}
      <circle cx="100" cy="100" r="85" fill="none" stroke="#C9A84C" strokeWidth="1.5" opacity="0.12" />
      <circle cx="100" cy="100" r="75" fill="none" stroke="#C9A84C" strokeWidth="0.5" opacity="0.08" />

      {/* Cardinal tick marks */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const isMajor = deg % 90 === 0;
        const r1 = 75;
        const r2 = isMajor ? 62 : 68;
        return (
          <line
            key={deg}
            x1={100 + r1 * Math.sin(rad)}
            y1={100 - r1 * Math.cos(rad)}
            x2={100 + r2 * Math.sin(rad)}
            y2={100 - r2 * Math.cos(rad)}
            stroke="#C9A84C"
            strokeWidth={isMajor ? 1.5 : 0.8}
            opacity="0.15"
          />
        );
      })}

      {/* North arrow (pointing up) */}
      <polygon points="100,28 95,100 100,88 105,100" fill="#C9A84C" opacity="0.18" />
      {/* South arrow (pointing down) */}
      <polygon points="100,172 95,100 100,112 105,100" fill="#C9A84C" opacity="0.10" />
      {/* East arrow */}
      <polygon points="172,100 100,95 112,100 100,105" fill="#C9A84C" opacity="0.10" />
      {/* West arrow */}
      <polygon points="28,100 100,95 88,100 100,105" fill="#C9A84C" opacity="0.10" />

      {/* Center dot */}
      <circle cx="100" cy="100" r="5" fill="#C9A84C" opacity="0.18" />
      <circle cx="100" cy="100" r="2.5" fill="#C9A84C" opacity="0.25" />
    </svg>
  );
}

function StarDots() {
  const stars = [
    { x: 12, y: 18, r: 1 },
    { x: 48, y: 8, r: 0.8 },
    { x: 200, y: 35, r: 1 },
    { x: 220, y: 90, r: 0.7 },
    { x: 30, y: 160, r: 1 },
    { x: 195, y: 200, r: 0.9 },
    { x: 60, y: 260, r: 0.7 },
    { x: 210, y: 310, r: 1 },
    { x: 20, y: 380, r: 0.8 },
    { x: 185, y: 430, r: 1 },
    { x: 55, y: 500, r: 0.7 },
    { x: 200, y: 560, r: 0.9 },
    { x: 15, y: 620, r: 1 },
    { x: 170, y: 680, r: 0.8 },
    { x: 40, y: 730, r: 0.7 },
  ];

  return (
    <svg
      viewBox="0 0 256 768"
      xmlns="http://www.w3.org/2000/svg"
      className="absolute inset-0 w-full h-full pointer-events-none select-none"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      {stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#C9A84C" opacity="0.20" />
      ))}
    </svg>
  );
}

function GoldCompassIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="#F59E0B" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="1.5" fill="#F59E0B" />
      <polygon points="12,4 10.5,12 12,10 13.5,12" fill="#F59E0B" />
      <polygon points="12,20 10.5,12 12,14 13.5,12" fill="#F59E0B" opacity="0.5" />
    </svg>
  );
}

export function AdminSidebar() {
  const t = useTranslations("admin");
  const locale = useLocale();
  const pathname = usePathname();

  const links = [
    { href: `/${locale}/admin`, label: t("title"), icon: LayoutDashboard, exact: true },
    { href: `/${locale}/admin/workshops`, label: t("workshops"), icon: BookOpen },
    { href: `/${locale}/admin/bookings`, label: t("bookings"), icon: Calendar },
    { href: `/${locale}/admin/vlogs`, label: t("vlogs"), icon: Video },
    { href: `/${locale}/admin/discounts`, label: t("discounts"), icon: Tag },
    { href: `/${locale}/admin/announcements`, label: t("announcements"), icon: Bell },
    { href: `/${locale}/admin/materials`, label: t("materials"), icon: FileText },
  ];

  return (
    <aside
      className="w-64 min-h-screen flex-shrink-0 flex flex-col relative overflow-hidden bg-gradient-to-b from-[#0a0f1a] to-[#0d1526] border-e border-[rgba(245,158,11,0.08)]"
    >
      {/* Star dots background layer */}
      <StarDots />

      {/* Compass watermark — centered in the sidebar */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <div className="w-56 h-56 opacity-100">
          <GoldCompassWatermark />
        </div>
      </div>

      {/* Content sits above the background layers */}
      <div className="relative z-10 flex flex-col flex-1">
        {/* Logo */}
        <div className="p-5 border-b border-[rgba(245,158,11,0.08)]">
          <Link href={`/${locale}`} className="flex items-center gap-3">
            <img src="/logo.png" alt="البوصلة" className="h-10 w-auto" />
            <div>
              <div className="font-bold text-white text-base leading-tight">البوصلة</div>
              <div className="flex items-center gap-1 text-white/50 text-xs">
                <GoldCompassIcon className="h-3 w-3" />
                <span>Admin Panel</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {links.map(({ href, label, icon: Icon, exact }) => {
            const isActive = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all overflow-hidden",
                  isActive
                    ? "bg-[rgba(245,158,11,0.12)] text-[#F59E0B] border-e-2 border-[#F59E0B]"
                    : "text-white/40 hover:text-white/80 hover:bg-white/5"
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Back to site */}
        <div className="p-4 border-t border-[rgba(245,158,11,0.08)]">
          <Link
            href={`/${locale}`}
            className="flex items-center gap-2 text-white/40 hover:text-[#F59E0B] text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {locale === "ar" ? "العودة للموقع" : "Back to site"}
          </Link>
        </div>
      </div>
    </aside>
  );
}

export default AdminSidebar;
