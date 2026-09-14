"use client";

import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Bell, Plus, LogOut, ChevronRight, Search } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface Crumb { label: string; href?: string }

function useBreadcrumbs(locale: string): Crumb[] {
  const pathname = usePathname();
  const isAr = locale === "ar";
  const segments = pathname.replace(`/${locale}/admin`, "").split("/").filter(Boolean);

  const LABELS: Record<string, { ar: string; en: string }> = {
    admin: { ar: "لوحة التحكم", en: "Dashboard" },
    availability: { ar: "التوفر", en: "Availability" },
    bookings: { ar: "الحجوزات", en: "Bookings" },
    workshops: { ar: "الجلسات", en: "Sessions" },
    vlogs: { ar: "المقاطع", en: "Vlogs" },
    materials: { ar: "المواد", en: "Materials" },
    announcements: { ar: "الإعلانات", en: "Announcements" },
    clients: { ar: "العملاء", en: "Clients" },
    discounts: { ar: "الخصومات", en: "Discounts" },
    settings: { ar: "الإعدادات", en: "Settings" },
    new: { ar: "جديد", en: "New" },
    edit: { ar: "تعديل", en: "Edit" },
  };

  const crumbs: Crumb[] = [
    { label: isAr ? "لوحة التحكم" : "Dashboard", href: `/${locale}/admin` },
  ];

  let path = `/${locale}/admin`;
  segments.forEach((seg, i) => {
    path += `/${seg}`;
    const entry = LABELS[seg];
    const label = entry ? (isAr ? entry.ar : entry.en) : seg;
    crumbs.push({ label, href: i < segments.length - 1 ? path : undefined });
  });

  return crumbs;
}

const QUICK_CREATE_ITEMS = [
  // These point at the list pages, which is where the create UI actually lives —
  // the ".../new" routes they used to link to have never existed and 404'd.
  { labelAr: "موعد جديد", labelEn: "New availability", href: (l: string) => `/${l}/admin/availability` },
  { labelAr: "ورشة جديدة", labelEn: "New workshop", href: (l: string) => `/${l}/admin/workshops` },
  { labelAr: "إعلان جديد", labelEn: "New announcement", href: (l: string) => `/${l}/admin/announcements` },
  { labelAr: "خصم جديد", labelEn: "New discount", href: (l: string) => `/${l}/admin/discounts` },
];

export function AdminTopBar() {
  const locale = useLocale();
  const router = useRouter();
  const crumbs = useBreadcrumbs(locale);
  const isAr = locale === "ar";

  const [showCreate, setShowCreate] = useState(false);
  const createRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (createRef.current && !createRef.current.contains(e.target as Node)) {
        setShowCreate(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(`/${locale}/auth`);
    router.refresh();
  }

  return (
    <header className="h-14 flex items-center justify-between px-6 max-md:ps-16 border-b border-[rgba(245,158,11,0.08)] bg-[#0a0f1a]/80 backdrop-blur-sm flex-shrink-0">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-sm">
        {crumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-white/20" />}
            {crumb.href ? (
              <Link href={crumb.href} className="text-white/40 hover:text-white/70 transition-colors font-medium">
                {crumb.label}
              </Link>
            ) : (
              <span className="text-white/80 font-semibold">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Quick-create */}
        <div className="relative" ref={createRef}>
          <button
            onClick={() => setShowCreate((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
              "bg-[rgba(245,158,11,0.12)] text-[#F59E0B] hover:bg-[rgba(245,158,11,0.2)] border border-[rgba(245,158,11,0.2)]"
            )}
          >
            <Plus className="h-3.5 w-3.5" />
            {isAr ? "إنشاء" : "Create"}
          </button>
          {showCreate && (
            <div className="absolute top-full end-0 mt-2 w-44 rounded-xl border border-[rgba(245,158,11,0.12)] bg-[#0d1526] shadow-xl z-50 overflow-hidden">
              {QUICK_CREATE_ITEMS.map((item) => (
                <Link
                  key={item.labelEn}
                  href={item.href(locale)}
                  onClick={() => setShowCreate(false)}
                  className="block px-4 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                >
                  {isAr ? item.labelAr : item.labelEn}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Notifications placeholder */}
        <button className="relative w-8 h-8 flex items-center justify-center rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-all">
          <Bell className="h-4 w-4" />
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          title={isAr ? "تسجيل الخروج" : "Logout"}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

export default AdminTopBar;
