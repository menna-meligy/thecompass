"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import {
  LayoutDashboard,
  BookOpen,
  CalendarDays,
  Video,
  Tag,
  Bell,
  FileText,
  Users,
  Settings,
  Clock,
  ExternalLink,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

function GoldCompassWatermark() {
  return (
    <svg
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      className="absolute inset-0 w-full h-full pointer-events-none select-none"
      aria-hidden="true"
    >
      <circle cx="100" cy="100" r="85" fill="none" stroke="#C9A84C" strokeWidth="1.5" opacity="0.12" />
      <circle cx="100" cy="100" r="75" fill="none" stroke="#C9A84C" strokeWidth="0.5" opacity="0.08" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const isMajor = deg % 90 === 0;
        const r1 = 75, r2 = isMajor ? 62 : 68;
        return (
          <line key={deg}
            x1={100 + r1 * Math.sin(rad)} y1={100 - r1 * Math.cos(rad)}
            x2={100 + r2 * Math.sin(rad)} y2={100 - r2 * Math.cos(rad)}
            stroke="#C9A84C" strokeWidth={isMajor ? 1.5 : 0.8} opacity="0.15"
          />
        );
      })}
      <polygon points="100,28 95,100 100,88 105,100" fill="#C9A84C" opacity="0.18" />
      <polygon points="100,172 95,100 100,112 105,100" fill="#C9A84C" opacity="0.10" />
      <polygon points="172,100 100,95 112,100 100,105" fill="#C9A84C" opacity="0.10" />
      <polygon points="28,100 100,95 88,100 100,105" fill="#C9A84C" opacity="0.10" />
      <circle cx="100" cy="100" r="5" fill="#C9A84C" opacity="0.18" />
      <circle cx="100" cy="100" r="2.5" fill="#C9A84C" opacity="0.25" />
    </svg>
  );
}

function GoldCompassIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className} fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="#F59E0B" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="1.5" fill="#F59E0B" />
      <polygon points="12,4 10.5,12 12,10 13.5,12" fill="#F59E0B" />
      <polygon points="12,20 10.5,12 12,14 13.5,12" fill="#F59E0B" opacity="0.5" />
    </svg>
  );
}

interface NavItem {
  href: string;
  labelAr: string;
  labelEn: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

interface NavGroup {
  groupAr: string;
  groupEn: string;
  items: NavItem[];
}

function NavLink({ item, locale }: { item: NavItem; locale: string }) {
  const pathname = usePathname();
  const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all overflow-hidden",
        isActive
          ? "bg-[rgba(245,158,11,0.12)] text-[#F59E0B] border-e-2 border-[#F59E0B]"
          : "text-white/40 hover:text-white/80 hover:bg-white/5"
      )}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      {locale === "ar" ? item.labelAr : item.labelEn}
    </Link>
  );
}

function NavGroupSection({ group, locale, defaultOpen = true }: { group: NavGroup; locale: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-widest text-white/25 hover:text-white/40 transition-colors"
      >
        <span>{locale === "ar" ? group.groupAr : group.groupEn}</span>
        <ChevronDown className={cn("h-3 w-3 transition-transform", open ? "" : "-rotate-90")} />
      </button>
      {open && (
        <div className="space-y-0.5">
          {group.items.map((item) => (
            <NavLink key={item.href} item={item} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminSidebar() {
  const locale = useLocale();
  const [mobileOpen, setMobileOpen] = useState(false);

  const groups: NavGroup[] = [
    {
      groupAr: "نظرة عامة",
      groupEn: "Overview",
      items: [
        { href: `/${locale}/admin`, labelAr: "لوحة التحكم", labelEn: "Dashboard", icon: LayoutDashboard, exact: true },
      ],
    },
    {
      groupAr: "الجدولة",
      groupEn: "Scheduling",
      items: [
        { href: `/${locale}/admin/availability`, labelAr: "التوفر", labelEn: "Availability", icon: Clock },
        { href: `/${locale}/admin/bookings`, labelAr: "الحجوزات", labelEn: "Bookings", icon: CalendarDays },
      ],
    },
    {
      groupAr: "البرامج",
      groupEn: "Programs",
      items: [
        { href: `/${locale}/admin/workshops`, labelAr: "الجلسات والورش", labelEn: "Sessions & Workshops", icon: BookOpen },
        { href: `/${locale}/admin/reflections`, labelAr: "رسائل التشجيع", labelEn: "Reflections", icon: FileText },
      ],
    },
    {
      groupAr: "المحتوى",
      groupEn: "Content",
      items: [
        { href: `/${locale}/admin/vlogs`, labelAr: "المقاطع", labelEn: "Vlogs", icon: Video },
        { href: `/${locale}/admin/materials`, labelAr: "المواد", labelEn: "Materials", icon: FileText },
        { href: `/${locale}/admin/announcements`, labelAr: "الإعلانات", labelEn: "Announcements", icon: Bell },
      ],
    },
    {
      groupAr: "الأشخاص",
      groupEn: "People",
      items: [
        { href: `/${locale}/admin/clients`, labelAr: "العملاء", labelEn: "Clients", icon: Users },
      ],
    },
    {
      groupAr: "النمو",
      groupEn: "Growth",
      items: [
        { href: `/${locale}/admin/discounts`, labelAr: "الخصومات", labelEn: "Discounts", icon: Tag },
      ],
    },
    {
      groupAr: "الإعدادات",
      groupEn: "Settings",
      items: [
        { href: `/${locale}/admin/settings`, labelAr: "الإعدادات", labelEn: "Settings", icon: Settings },
      ],
    },
  ];

  return (
    <>
      {/* Mobile hamburger — opens the drawer */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label={locale === "ar" ? "افتح القائمة" : "Open menu"}
        className="md:hidden fixed top-3 z-[60] flex items-center justify-center w-10 h-10 rounded-lg bg-[#0d1526] border border-[rgba(245,158,11,0.25)] text-[#F59E0B] shadow-lg"
        style={{ insetInlineStart: "12px" }}
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

    <aside
      style={{ insetInlineStart: 0 }}
      className={cn(
        "w-64 min-h-screen flex-shrink-0 flex-col relative overflow-hidden bg-gradient-to-b from-[#0a0f1a] to-[#0d1526] border-e border-[rgba(245,158,11,0.08)] md:flex md:static",
        mobileOpen ? "flex fixed inset-y-0 z-50" : "hidden",
      )}>
      {/* Star dots */}
      <svg viewBox="0 0 256 768" xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0 w-full h-full pointer-events-none select-none"
        preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {[{x:12,y:18,r:1},{x:48,y:8,r:0.8},{x:200,y:35,r:1},{x:220,y:90,r:0.7},{x:30,y:160,r:1},{x:195,y:200,r:0.9},
          {x:60,y:260,r:0.7},{x:210,y:310,r:1},{x:20,y:380,r:0.8},{x:185,y:430,r:1},{x:55,y:500,r:0.7},
          {x:200,y:560,r:0.9},{x:15,y:620,r:1},{x:170,y:680,r:0.8},{x:40,y:730,r:0.7}].map((s,i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#C9A84C" opacity="0.20" />
        ))}
      </svg>

      {/* Compass watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <div className="w-56 h-56">
          <GoldCompassWatermark />
        </div>
      </div>

      <div className="relative z-10 flex flex-col flex-1">
        {/* Wordmark */}
        <div className="p-5 border-b border-[rgba(245,158,11,0.08)]">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="البوصلة" className="h-9 w-auto" />
            <div>
              <div className="font-black text-white text-base leading-tight tracking-wide">البوصلة</div>
              <div className="flex items-center gap-1 text-white/40 text-[0.65rem] font-semibold tracking-widest uppercase">
                <GoldCompassIcon className="h-3 w-3" />
                <span>{locale === "ar" ? "الإدارة" : "Console"}</span>
              </div>
            </div>
            <button
              onClick={() => setMobileOpen(false)}
              aria-label={locale === "ar" ? "إغلاق" : "Close"}
              className="md:hidden ms-auto text-white/40 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 p-3 overflow-y-auto space-y-1" style={{ scrollbarWidth: "none" }} onClick={() => setMobileOpen(false)}>
          {groups.map((group) => (
            <NavGroupSection key={group.groupEn} group={group} locale={locale} defaultOpen />
          ))}
        </nav>

        {/* View site */}
        <div className="p-4 border-t border-[rgba(245,158,11,0.08)]">
          <Link
            href={`/${locale}`}
            target="_blank"
            rel="noopener"
            className="flex items-center gap-2 text-white/30 hover:text-[#F59E0B] text-xs font-medium transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {locale === "ar" ? "عرض الموقع ↗" : "View site ↗"}
          </Link>
        </div>
      </div>
    </aside>
    </>
  );
}

export default AdminSidebar;
