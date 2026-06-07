import { getTranslations, getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Users, Calendar, DollarSign, BookOpen, FileText, Compass } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const t = await getTranslations("admin");
  const locale = await getLocale();
  const supabase = await createClient();

  const [
    { count: totalBookings },
    { data: payments },
    { count: activeWorkshops },
    { count: totalUsers },
  ] = await Promise.all([
    supabase.from("bookings").select("*", { count: "exact", head: true }),
    supabase.from("payments").select("amount").eq("status", "paid"),
    supabase.from("workshops").select("*", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "user"),
  ]);

  const totalRevenue = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;

  const quickLinks = [
    {
      href: `/${locale}/admin/workshops`,
      label: "Workshops",
      icon: <BookOpen className="h-6 w-6" />,
      description: "Manage workshop sessions",
    },
    {
      href: `/${locale}/admin/bookings`,
      label: "Bookings",
      icon: <Calendar className="h-6 w-6" />,
      description: "View and manage bookings",
    },
    {
      href: `/${locale}/admin/vlogs`,
      label: "Vlogs",
      icon: <FileText className="h-6 w-6" />,
      description: "Publish and edit vlogs",
    },
  ];

  const stats = [
    {
      title: t("stats.totalBookings"),
      value: totalBookings || 0,
      icon: <Calendar className="h-6 w-6 text-[#F59E0B]" />,
    },
    {
      title: t("stats.totalRevenue"),
      value: formatCurrency(totalRevenue, locale),
      icon: <DollarSign className="h-6 w-6 text-[#F59E0B]" />,
    },
    {
      title: t("stats.activeWorkshops"),
      value: activeWorkshops || 0,
      icon: <BookOpen className="h-6 w-6 text-[#F59E0B]" />,
    },
    {
      title: t("stats.totalUsers"),
      value: totalUsers || 0,
      icon: <Users className="h-6 w-6 text-[#F59E0B]" />,
    },
  ];

  return (
    <div className="min-h-screen bg-[#0f172a]">
      {/* Header */}
      <div className="bg-[rgba(30,41,59,0.5)] border-b border-[rgba(245,158,11,0.10)] p-6 mb-8 relative overflow-hidden">
        <div className="pointer-events-none absolute -right-8 -top-8 opacity-5">
          <Compass className="h-64 w-64 text-white" strokeWidth={0.5} />
        </div>
        <div className="relative z-10">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-[#F59E0B]">
            البوصلة
          </p>
          <h1 className="text-3xl font-black text-white">{t("title")}</h1>
          <p className="mt-2 text-white/50 text-sm">
            Welcome back — here&apos;s your platform at a glance.
          </p>
          <div className="mt-4 h-px w-16 bg-[#F59E0B]" />
        </div>
      </div>

      {/* Stats grid */}
      <div className="px-6 mb-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.title}
              className="bg-[rgba(30,41,59,0.6)] border border-[rgba(245,158,11,0.15)] rounded-2xl p-6"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-11 h-11 rounded-full bg-[rgba(245,158,11,0.12)] border border-[rgba(245,158,11,0.2)] flex items-center justify-center">
                  {stat.icon}
                </div>
              </div>
              <p className="text-3xl font-black text-white mb-1">{stat.value}</p>
              <p className="text-sm text-white/50">{stat.title}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Access */}
      <div className="px-6 pb-12">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-[#F59E0B]">
          Quick Access
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group flex items-center gap-4 rounded-xl bg-[rgba(30,41,59,0.6)] border border-[rgba(245,158,11,0.12)] px-6 py-5 transition-all hover:border-[rgba(245,158,11,0.35)] hover:bg-[rgba(30,41,59,0.9)]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[rgba(245,158,11,0.10)] text-[#F59E0B] transition-colors group-hover:bg-[rgba(245,158,11,0.20)]">
                {link.icon}
              </div>
              <div>
                <p className="font-semibold text-white">{link.label}</p>
                <p className="text-sm text-white/40">{link.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
