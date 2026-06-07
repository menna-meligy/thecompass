import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime, formatCurrency, getLocalizedField } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import type { Booking, RoadmapProgress } from "@/types/index";
import { Calendar, BookOpen, ChevronRight, ClipboardList, Map, User, Compass } from "lucide-react";

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const locale = await getLocale();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/${locale}/auth`);

  const [{ data: profile }, { data: bookings }, { data: roadmap }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase
        .from("bookings")
        .select("*, session:sessions(*, workshop:workshops(*)), payment:payments(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("roadmap_progress")
        .select("*")
        .eq("user_id", user.id)
        .single(),
    ]);

  const now = new Date();
  const upcoming = (bookings as Booking[] | null)?.filter(
    (b) => b.session?.starts_at && new Date(b.session.starts_at) > now && b.status !== "cancelled"
  ) || [];
  const past = (bookings as Booking[] | null)?.filter(
    (b) => b.session?.starts_at && new Date(b.session.starts_at) <= now
  ) || [];

  const quickLinks = [
    { href: `/${locale}/dashboard/bookings`, label: t("bookings"), icon: ClipboardList },
    { href: `/${locale}/dashboard/roadmap`, label: t("roadmapPreview"), icon: Map },
    { href: `/${locale}/dashboard/profile`, label: t("profile"), icon: User },
    { href: `/${locale}/workshops`, label: locale === "ar" ? "استكشف" : "Explore", icon: Compass },
  ];

  // Level progress ring
  const progress = roadmap as RoadmapProgress | null;
  const xpPerLevel = 100;
  const levelProgress = progress ? (progress.xp % xpPerLevel) / xpPerLevel : 0;
  const circumference = 2 * Math.PI * 26; // r=26
  const strokeDash = circumference * levelProgress;

  return (
    <div style={{maxWidth:"64rem",margin:"0 auto",padding:"0 1.5rem"}} className=" py-12">
      {/* Welcome */}
      <div className="mb-10">
        <div className="w-10 h-0.5 bg-[#F59E0B] rounded-full mb-4" />
        <h1 className="text-4xl font-bold text-white tracking-tight">
          {t("welcome")}, {profile?.full_name?.split(" ")[0] || ""}!
        </h1>
        <p className="text-white/40 mt-2 text-sm">
          {locale === "ar" ? "مرحباً بك في لوحة التحكم الخاصة بك" : "Welcome back to your dashboard"}
        </p>
      </div>

      {/* Roadmap preview */}
      {progress && (
        <div className="relative rounded-2xl p-6 mb-8 text-white overflow-hidden bg-gradient-to-r from-[#7f1d1d] via-[#991B1B] to-[#7f1d1d]">
          {/* Dot pattern */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
          {/* Gold glow blob */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-10 -right-10 w-48 h-48 rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, #F59E0B, transparent 70%)" }}
          />

          <div className="relative flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-6">
              {/* SVG progress ring */}
              <div className="relative flex-shrink-0">
                <svg width="64" height="64" className="-rotate-90">
                  <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="4" />
                  <circle
                    cx="32" cy="32" r="26"
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={`${strokeDash} ${circumference}`}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-lg font-extrabold text-[#F59E0B]">
                  {progress.level}
                </span>
              </div>

              <div className="flex items-center gap-8">
                <div className="flex flex-col">
                  <span className="text-3xl font-extrabold leading-none text-[#F59E0B]">
                    {progress.xp}
                  </span>
                  <span className="text-white/50 text-xs mt-1 uppercase tracking-wider">
                    {t("xp")}
                  </span>
                </div>
                <div className="w-px h-10 bg-white/20" />
                <div className="flex flex-col">
                  <span className="text-3xl font-extrabold leading-none text-white">
                    {progress.completed_count}
                  </span>
                  <span className="text-white/50 text-xs mt-1 uppercase tracking-wider">
                    {locale === "ar" ? "مكتمل" : "Completed"}
                  </span>
                </div>
              </div>
            </div>

            <Link
              href={`/${locale}/dashboard/roadmap`}
              className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors backdrop-blur-sm border border-white/15"
            >
              {t("viewRoadmap")}
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        {/* Upcoming Sessions */}
        <div>
          <h2 className="font-bold text-white mb-4 flex items-center gap-2 text-base">
            <Calendar className="h-5 w-5 text-[#F59E0B]" />
            {t("upcomingSessions")}
          </h2>
          {upcoming.length === 0 ? (
            <div className="bg-[rgba(30,41,59,0.6)] border border-[rgba(245,158,11,0.12)] rounded-xl p-6 text-center text-white/40 text-sm">
              {t("noUpcoming")}
              <div className="mt-3">
                <Link href={`/${locale}/workshops`} className="text-[#F59E0B] font-medium text-sm">
                  {locale === "ar" ? "استكشف الورش" : "Explore workshops"}
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.slice(0, 3).map((booking) => (
                <div
                  key={booking.id}
                  className="bg-[rgba(30,41,59,0.6)] border border-[rgba(245,158,11,0.12)] rounded-xl p-4 border-s-2"
                  style={{ borderInlineStartColor: "#F59E0B" }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-white text-sm">
                        {getLocalizedField(
                          (booking.session?.workshop as unknown as Record<string, unknown>) || {},
                          "title",
                          locale
                        )}
                      </p>
                      <p className="text-xs text-white/40 mt-1">
                        {booking.session?.starts_at
                          ? formatDateTime(booking.session.starts_at, locale)
                          : ""}
                      </p>
                    </div>
                    <Badge variant={booking.status === "confirmed" ? "success" : "warning"}>
                      {booking.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Past Sessions */}
        <div>
          <h2 className="font-bold text-white mb-4 flex items-center gap-2 text-base">
            <BookOpen className="h-5 w-5 text-[#F59E0B]" />
            {t("pastSessions")}
          </h2>
          {past.length === 0 ? (
            <div className="bg-[rgba(30,41,59,0.6)] border border-[rgba(245,158,11,0.12)] rounded-xl p-6 text-center text-white/40 text-sm">
              {t("noPast")}
            </div>
          ) : (
            <div className="space-y-3">
              {past.slice(0, 3).map((booking) => (
                <div
                  key={booking.id}
                  className="bg-[rgba(30,41,59,0.6)] border border-[rgba(245,158,11,0.12)] rounded-xl p-4 border-s-2"
                  style={{ borderInlineStartColor: "#F59E0B" }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-white text-sm">
                        {getLocalizedField(
                          (booking.session?.workshop as unknown as Record<string, unknown>) || {},
                          "title",
                          locale
                        )}
                      </p>
                      <p className="text-xs text-white/40 mt-1">
                        {booking.session?.starts_at
                          ? formatDateTime(booking.session.starts_at, locale)
                          : ""}
                      </p>
                    </div>
                    <Link
                      href={`/${locale}/dashboard/materials/${booking.id}`}
                      className="text-xs text-[#F59E0B] font-medium"
                    >
                      {locale === "ar" ? "المواد" : "Materials"}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="bg-[rgba(30,41,59,0.6)] border border-[rgba(245,158,11,0.12)] rounded-xl p-5 text-center hover:border-[rgba(245,158,11,0.3)] hover:bg-[rgba(30,41,59,0.9)] transition-all group flex flex-col items-center gap-3"
            >
              <div className="w-10 h-10 rounded-full bg-[rgba(245,158,11,0.15)] flex items-center justify-center group-hover:bg-[rgba(245,158,11,0.25)] transition-colors">
                <Icon className="h-5 w-5 text-[#F59E0B]" />
              </div>
              <div className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">{link.label}</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
