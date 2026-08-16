"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Calendar, Map, User, LogOut, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface Props { children: React.ReactNode; locale: string; }

export default function DashboardSidebarWrapper({ children, locale }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAr = locale === "ar";

  const navItems = [
    { href: `/${locale}/dashboard`, icon: LayoutDashboard, labelAr: "الرئيسية", labelEn: "Home", exact: true },
    { href: `/${locale}/dashboard/bookings`, icon: Calendar, labelAr: "حجوزاتي", labelEn: "Bookings", exact: false },
    { href: `/${locale}/dashboard/roadmap`, icon: Map, labelAr: "الخريطة", labelEn: "Roadmap", exact: false },
    { href: `/${locale}/dashboard/profile`, icon: User, labelAr: "الملف", labelEn: "Profile", exact: false },
  ];

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(`/${locale}`);
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#0f172a] md:flex">
      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-40 h-14 flex items-center gap-3 px-4 bg-[#0d1526] border-b border-[rgba(245,158,11,0.10)]">
        <button onClick={() => setMobileOpen(true)} aria-label={isAr ? "افتح القائمة" : "Open menu"} className="flex items-center justify-center w-9 h-9 rounded-lg text-[#F59E0B] hover:bg-white/5">
          <Menu className="h-5 w-5" />
        </button>
        <Link href={`/${locale}`} className="flex items-center gap-2">
          <img src="/logo.svg" alt="البوصلة" className="h-8 w-auto object-contain" />
          <span className="text-sm font-black text-white tracking-wide">{isAr ? "البوصلة" : "The Compass"}</span>
        </Link>
      </header>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 bg-black/60 z-40" onClick={() => setMobileOpen(false)} aria-hidden="true" />
      )}

      <aside
        style={{ insetInlineStart: 0 }}
        className={cn(
          "w-72 flex-shrink-0 flex-col bg-[#0d1526] border-e border-[rgba(245,158,11,0.10)] md:flex md:static",
          mobileOpen ? "flex fixed inset-y-0 z-50" : "hidden",
        )}
      >
        <div className="h-16 flex items-center justify-between px-5 border-b border-[rgba(245,158,11,0.08)]">
          <Link href={`/${locale}`} className="flex items-center gap-3 group">
            <img src="/logo.svg" alt="البوصلة" className="h-10 w-auto object-contain" />
            <span className="text-sm font-black text-white tracking-wide">{isAr ? "البوصلة" : "The Compass"}</span>
          </Link>
          <button onClick={() => setMobileOpen(false)} aria-label={isAr ? "إغلاق" : "Close"} className="md:hidden text-white/40 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 py-4 flex flex-col gap-1 px-2" onClick={() => setMobileOpen(false)}>
          {navItems.map(({ href, icon: Icon, labelAr, labelEn, exact }) => {
            const active = isActive(href, exact);
            return (
              <Link key={href} href={href} title={isAr ? labelAr : labelEn}
                className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                  active ? "bg-[rgba(245,158,11,0.12)] text-[#F59E0B] border-e-2 border-[#F59E0B]"
                          : "text-white/50 hover:text-white hover:bg-white/5"
                )}>
                <Icon className={cn("h-5 w-5 flex-shrink-0", active ? "text-[#F59E0B]" : "text-inherit")} />
                <span className="text-sm font-semibold truncate">{isAr ? labelAr : labelEn}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-2 border-t border-[rgba(245,158,11,0.08)]">
          <button onClick={handleLogout} title={isAr ? "خروج" : "Logout"}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200">
            <LogOut className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-medium">{isAr ? "خروج" : "Logout"}</span>
          </button>
        </div>
      </aside>
      <main className="flex-1 bg-[#0f172a] overflow-auto">{children}</main>
    </div>
  );
}
