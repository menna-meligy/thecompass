import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatCurrency, getLocalizedField } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import type { Booking } from "@/types/index";
import { Calendar, BookOpen, Compass, ArrowRight } from "lucide-react";

export default async function BookingsPage() {
  const t = await getTranslations("dashboard");
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth`);

  const { data: bookings } = await supabase
    .from("bookings")
    .select("*, session:sessions(*, workshop:workshops(*)), payment:payments(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const statusVariant: Record<string, "default"|"success"|"warning"|"danger"|"info"> = {
    pending: "warning", confirmed: "success", cancelled: "danger", completed: "info",
  };

  const isAr = locale === "ar";

  return (
    <div className="min-h-screen bg-[#0f172a] px-4 py-10">
      <div style={{ maxWidth: "48rem", margin: "0 auto" }}>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-black text-white mb-1">{t("bookings")}</h1>
          <p className="text-white/40 text-sm">{isAr ? "حجوزاتك الحالية والسابقة" : "Your current and past bookings"}</p>
        </div>

        {/* ── Action Buttons ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          {/* General Session */}
          <Link
            href={`/${locale}/book/general`}
            style={{
              display:"flex", alignItems:"center", gap:"14px",
              padding:"18px 20px", borderRadius:"10px",
              background:"#F59E0B", textDecoration:"none",
              boxShadow:"0 4px 24px rgba(245,158,11,0.35)",
              transition:"all 0.2s",
            }}
            className="hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(245,158,11,0.45)]"
          >
            <div style={{ width:"44px", height:"44px", borderRadius:"8px", background:"rgba(0,0,0,0.15)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <Compass className="h-6 w-6 text-[#0f172a]" />
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:900, fontSize:"0.95rem", color:"#0f172a", lineHeight:1.2 }}>{t("bookGeneral")}</div>
              <div style={{ fontSize:"0.75rem", color:"rgba(0,0,0,0.55)", marginTop:"2px" }}>{t("generalSessionDesc")}</div>
            </div>
            <ArrowRight className="h-4 w-4 text-[#0f172a]" style={{ flexShrink:0, transform: isAr ? "rotate(180deg)" : undefined }} />
          </Link>

          {/* Discover Workshops */}
          <Link
            href={`/${locale}/workshops`}
            style={{
              display:"flex", alignItems:"center", gap:"14px",
              padding:"18px 20px", borderRadius:"10px",
              background:"rgba(30,41,59,0.8)",
              border:"1.5px solid rgba(245,158,11,0.25)",
              textDecoration:"none", transition:"all 0.2s",
            }}
            className="hover:border-[rgba(245,158,11,0.5)] hover:-translate-y-0.5"
          >
            <div style={{ width:"44px", height:"44px", borderRadius:"8px", background:"rgba(245,158,11,0.1)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <BookOpen className="h-6 w-6 text-[#F59E0B]" />
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:800, fontSize:"0.95rem", color:"white", lineHeight:1.2 }}>{t("discoverWorkshops")}</div>
              <div style={{ fontSize:"0.75rem", color:"rgba(255,255,255,0.4)", marginTop:"2px" }}>{t("workshopSessionDesc")}</div>
            </div>
            <ArrowRight className="h-4 w-4 text-white/40" style={{ flexShrink:0, transform: isAr ? "rotate(180deg)" : undefined }} />
          </Link>
        </div>

        {/* ── Booking History ── */}
        <div className="flex items-center gap-2 mb-5">
          <Calendar className="h-4 w-4 text-[#F59E0B]" />
          <h2 className="text-sm font-bold text-white/60 uppercase tracking-wider">{isAr ? "سجل الحجوزات" : "Booking History"}</h2>
        </div>

        {!bookings || bookings.length === 0 ? (
          <div style={{ background:"rgba(30,41,59,0.4)", border:"1px solid rgba(245,158,11,0.10)", borderRadius:"10px", textAlign:"center", padding:"48px 24px" }}>
            <div style={{ fontSize:"2rem", marginBottom:"12px" }}>📋</div>
            <p style={{ color:"rgba(255,255,255,0.4)", fontSize:"0.9rem", marginBottom:"16px" }}>{t("noBookings")}</p>
            <Link href={`/${locale}/workshops`} style={{ color:"#F59E0B", fontSize:"0.85rem", fontWeight:600 }}>
              {t("exploreWorkshops")} →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {(bookings as unknown as Booking[]).map((booking) => {
              const workshopTitle = getLocalizedField(
                (booking.session?.workshop as unknown as Record<string, unknown>) || {},
                "title", locale
              );
              return (
                <div key={booking.id} style={{ background:"rgba(30,41,59,0.6)", border:"1px solid rgba(245,158,11,0.12)", borderRadius:"10px", padding:"18px 20px" }}>
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div>
                      <p className="font-bold text-white text-sm mb-1">{workshopTitle || (isAr ? "جلسة فردية" : "General Session")}</p>
                      {booking.session?.starts_at && (
                        <p className="text-white/40 text-xs">{formatDate(booking.session.starts_at, locale)}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {booking.payment && (
                        <span style={{ color:"#F59E0B", fontWeight:800, fontSize:"0.85rem" }}>
                          {formatCurrency(booking.payment.amount, locale)}
                        </span>
                      )}
                      <Badge variant={statusVariant[booking.status] || "default"}>
                        {booking.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
