"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { LayoutDashboard, Calendar, Map, User, LogOut, Compass } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface Props { children: React.ReactNode; locale: string; }

export default function DashboardSidebarWrapper({ children, locale }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { href: `/${locale}/dashboard`, icon: LayoutDashboard, labelAr: "الرئيسية", labelEn: "Home", exact: true },
    { href: `/${locale}/dashboard/bookings`, icon: Calendar, labelAr: "حجوزاتي", labelEn: "Bookings", exact: false },
    { href: `/${locale}/dashboard/roadmap`, icon: Map, labelAr: "الخارطة", labelEn: "Roadmap", exact: false },
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
    <div className="flex min-h-screen bg-[#0f172a]">
      <aside className="w-20 md:w-72 flex-shrink-0 flex flex-col bg-[#0d1526] border-e border-[rgba(245,158,11,0.10)]">
        <div className="h-16 flex items-center justify-center md:justify-start md:px-5 border-b border-[rgba(245,158,11,0.08)]">
          <Link href={`/${locale}`} className="flex items-center gap-3 group">
            <img src="/logo.svg" alt="البوصلة" className="h-10 w-auto object-contain" />
            <span className="hidden md:block text-sm font-black text-white tracking-wide">
              {locale === "ar" ? "البوصلة" : "The Compass"}
            </span>
          </Link>
        </div>
        <nav className="flex-1 py-4 flex flex-col gap-1 px-2">
          {navItems.map(({ href, icon: Icon, labelAr, labelEn, exact }) => {
            const active = isActive(href, exact);
            return (
              <Link key={href} href={href} title={locale === "ar" ? labelAr : labelEn}
                className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                  active ? "bg-[rgba(245,158,11,0.12)] text-[#F59E0B] border-e-2 border-[#F59E0B]"
                          : "text-white/50 hover:text-white hover:bg-white/5"
                )}>
                <Icon className={cn("h-5 w-5 flex-shrink-0", active ? "text-[#F59E0B]" : "text-inherit")} />
                <span className="hidden md:block text-sm font-semibold truncate">
                  {locale === "ar" ? labelAr : labelEn}
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="p-2 border-t border-[rgba(245,158,11,0.08)]">
          <button onClick={handleLogout} title={locale === "ar" ? "خروج" : "Logout"}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200">
            <LogOut className="h-5 w-5 flex-shrink-0" />
            <span className="hidden md:block text-sm font-medium">{locale === "ar" ? "خروج" : "Logout"}</span>
          </button>
        </div>
      </aside>
      <main className="flex-1 bg-[#0f172a] overflow-auto">{children}</main>
    </div>
  );
}
