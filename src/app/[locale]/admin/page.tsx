import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Users, Calendar, TrendingUp, BookOpen, Clock, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { offeringTitle, isOfferingType } from "@/lib/offerings";
import { cairoNow, shortTime } from "@/lib/schedule-dates";
import Link from "next/link";

function KpiCard({ icon, label, value, sub, trend }: {
  icon: React.ReactNode; label: string; value: string | number;
  sub?: string; trend?: { value: string; up: boolean };
}) {
  return (
    <div className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.12)] rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-lg bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.15)] flex items-center justify-center text-[#F59E0B]">
          {icon}
        </div>
        {trend && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${trend.up ? "text-emerald-400 bg-emerald-500/10" : "text-red-400 bg-red-500/10"}`}>
            {trend.up ? "↑" : "↓"} {trend.value}
          </span>
        )}
      </div>
      <p className="text-2xl font-black text-white leading-none mb-1">{value}</p>
      <p className="text-xs text-white/40 font-medium">{label}</p>
      {sub && <p className="text-xs text-white/25 mt-0.5">{sub}</p>}
    </div>
  );
}

export default async function AdminDashboardPage() {
  const locale = await getLocale();
  const isAr = locale === "ar";
  const supabase = await createClient();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const todayISO = cairoNow().date;

  const [
    { count: totalBookings },
    { count: todayBookings },
    { data: payments },
    { data: monthPayments },
    { count: activeWorkshops },
    { count: totalUsers },
    { data: pendingList },
    { data: todayAgenda },
  ] = await Promise.all([
    supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "confirmed"),
    supabase.from("bookings").select("*", { count: "exact", head: true })
      .eq("status", "confirmed").gte("created_at", todayStart).lt("created_at", todayEnd),
    supabase.from("payments").select("amount").eq("status", "paid"),
    supabase.from("payments").select("amount").eq("status", "paid").gte("created_at", monthStart),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from("workshops").select("*", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "user"),
    // Receipts uploaded and awaiting the coach's decision.
    supabase.from("bookings")
      .select("id, created_at, status, offering_type, user:profiles(full_name), workshop:workshops(title_ar, title_en), payment:payments(status, proof_url)")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(20),
    // Today's real appointments, from the slot the client actually booked.
    supabase.from("bookings")
      .select("id, status, offering_type, user:profiles(full_name), workshop:workshops(title_ar, title_en), slot:availability_slots!inner(date, start_time, end_time)")
      .not("slot_reserved_at", "is", null)
      .neq("status", "cancelled")
      .eq("slot.date", todayISO)
      .order("created_at"),
  ]);

  // "Needs attention" means a receipt is sitting there unreviewed — a pending
  // booking with no receipt yet is the client's move, not the coach's.
  const needsReview = ((pendingList ?? []) as Array<{ payment?: unknown }>).filter((b) => {
    const pays = Array.isArray(b.payment) ? b.payment : b.payment ? [b.payment] : [];
    return pays.some((p: { proof_url?: string | null }) => !!p?.proof_url);
  }).slice(0, 5);

  const totalRevenue = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
  const monthRevenue = monthPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Page title */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-[#F59E0B] mb-1">
          {isAr ? "نظرة عامة" : "Overview"}
        </p>
        <h1 className="text-2xl font-black text-white">
          {isAr ? "لوحة التحكم" : "Dashboard"}
        </h1>
      </div>

      {/* KPI Grid — 6 cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard icon={<CheckCircle2 className="h-4 w-4" />} label={isAr ? "حجوزات مؤكدة" : "Confirmed bookings"} value={totalBookings || 0} />
        <KpiCard icon={<Clock className="h-4 w-4" />} label={isAr ? "إيصالات تحتاج مراجعة" : "Receipts to review"} value={needsReview.length}
          sub={needsReview.length ? (isAr ? "العميل رفع الإيصال" : "client uploaded a receipt") : undefined}
        />
        <KpiCard icon={<Calendar className="h-4 w-4" />} label={isAr ? "حجوزات اليوم" : "Today's bookings"} value={todayBookings || 0} />
        <KpiCard icon={<TrendingUp className="h-4 w-4" />} label={isAr ? "الإيرادات الكلية" : "Total revenue"} value={formatCurrency(totalRevenue, locale)} />
        <KpiCard icon={<TrendingUp className="h-4 w-4" />} label={isAr ? "إيرادات هذا الشهر" : "This month"} value={formatCurrency(monthRevenue, locale)} />
        <KpiCard icon={<Users className="h-4 w-4" />} label={isAr ? "إجمالي العملاء" : "Total clients"} value={totalUsers || 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's agenda */}
        <div className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.12)] rounded-2xl p-6">
          <h2 className="text-sm font-bold text-[#F59E0B] uppercase tracking-wider mb-4">
            {isAr ? "أجندة اليوم" : "Today's Agenda"}
          </h2>
          {!todayAgenda || todayAgenda.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-8 w-8 text-white/10 mx-auto mb-2" />
              <p className="text-white/30 text-sm">{isAr ? "مفيش جلسات النهاردة" : "No sessions today"}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(todayAgenda as Array<{
                id: string;
                offering_type?: string | null;
                user?: { full_name?: string };
                workshop?: { title_ar: string; title_en: string } | null;
                slot?: { start_time?: string } | null;
              }>).map((booking) => {
                const offeringType = isOfferingType(booking.offering_type) ? booking.offering_type : "career";
                const title = offeringTitle(offeringType, booking.workshop, isAr);
                return (
                  <div key={booking.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/5">
                    <div className="w-12 text-center">
                      <p className="text-[#F59E0B] text-sm font-black">{shortTime(booking.slot?.start_time)}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold truncate">
                        {booking.user?.full_name || (isAr ? "عميل" : "Client")}
                      </p>
                      <p className="text-white/40 text-xs truncate">{title}</p>
                    </div>
                    <Link
                      href={`/${locale}/admin/meetings`}
                      className="text-xs text-white/30 hover:text-[#F59E0B] transition-colors"
                    >
                      {isAr ? "عرض" : "View"}
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Needs attention */}
        <div className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.12)] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-[#F59E0B] uppercase tracking-wider">
              {isAr ? "تحتاج انتباه" : "Needs Attention"}
            </h2>
            {needsReview.length ? (
              <span className="text-xs bg-amber-500/15 text-amber-400 border border-amber-500/20 rounded-full px-2 py-0.5 font-semibold">
                {needsReview.length}
              </span>
            ) : null}
          </div>
          {needsReview.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-8 w-8 text-emerald-500/30 mx-auto mb-2" />
              <p className="text-white/30 text-sm">{isAr ? "كل حاجة تمام تمام" : "All clear!"}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(needsReview as Array<{
                id: string;
                status: string;
                created_at: string;
                offering_type?: string | null;
                user?: { full_name?: string };
                workshop?: { title_ar: string; title_en: string } | null;
              }>).map((booking) => {
                const name = booking.user?.full_name || (isAr ? "عميل" : "Client");
                const offeringType = isOfferingType(booking.offering_type) ? booking.offering_type : "career";
                const workshopTitle = offeringTitle(offeringType, booking.workshop, isAr);
                const isPendingProof = true;
                return (
                  <div key={booking.id} className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${isPendingProof ? "bg-blue-500/15" : "bg-amber-500/15"}`}>
                      {isPendingProof
                        ? <AlertCircle className="h-3.5 w-3.5 text-blue-400" />
                        : <Clock className="h-3.5 w-3.5 text-amber-400" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-semibold truncate">{name}</p>
                      <p className="text-white/40 text-xs truncate">{workshopTitle || (isAr ? "جلسة" : "Session")}</p>
                    </div>
                    <Link
                      href={`/${locale}/admin/receipts`}
                      className="text-xs font-semibold text-[#F59E0B] hover:text-amber-300 transition-colors flex-shrink-0"
                    >
                      {isAr ? "مراجعة" : "Review"}
                    </Link>
                  </div>
                );
              })}
              {needsReview.length >= 5 && (
                <Link
                  href={`/${locale}/admin/receipts`}
                  className="block text-center text-xs text-white/30 hover:text-[#F59E0B] py-2 transition-colors"
                >
                  {isAr ? "عرض كل الإيصالات" : "View all receipts"}
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: `/${locale}/admin/workshops/new`, labelAr: "جلسة جديدة", labelEn: "New session", icon: <BookOpen className="h-4 w-4" /> },
          { href: `/${locale}/admin/bookings`, labelAr: "كل الحجوزات", labelEn: "All bookings", icon: <Calendar className="h-4 w-4" /> },
          { href: `/${locale}/admin/clients`, labelAr: "العملاء", labelEn: "Clients", icon: <Users className="h-4 w-4" /> },
          { href: `/${locale}/admin/availability`, labelAr: "إدارة التوفر", labelEn: "Availability", icon: <Clock className="h-4 w-4" /> },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center gap-2.5 p-4 rounded-xl bg-[rgba(13,21,38,0.5)] border border-white/5 hover:border-[rgba(245,158,11,0.2)] hover:bg-[rgba(245,158,11,0.05)] transition-all group"
          >
            <span className="text-white/30 group-hover:text-[#F59E0B] transition-colors">{link.icon}</span>
            <span className="text-sm font-semibold text-white/60 group-hover:text-white/90 transition-colors">
              {isAr ? link.labelAr : link.labelEn}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
