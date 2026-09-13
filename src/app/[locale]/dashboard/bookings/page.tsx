import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatCurrency, getLocalizedField } from "@/lib/utils";
import type { Booking } from "@/types/index";
import {
  Calendar, Clock, CheckCircle2, FileText, Compass, BookOpen, ArrowRight, MapPin, AlertTriangle, MessageSquare
} from "lucide-react";
import PaymentCountdownTimer from "@/components/booking/PaymentCountdownTimer";
import dynamic from "next/dynamic";

const ClientReflectionsCard = dynamic(
  () => import("@/components/dashboard/ClientReflectionsCard")
);
const ClientSessionNotesForm = dynamic(
  () => import("@/components/dashboard/ClientSessionNotesForm")
);
const MentorNotesDisplay = dynamic(
  () => import("@/components/dashboard/MentorNotesDisplay")
);

const STATUS_STYLES: Record<string, { bg: string; color: string; border: string; label: string; labelAr: string }> = {
  pending:   { bg: "rgba(245,158,11,0.12)",  color: "#F59E0B", border: "rgba(245,158,11,0.35)",  label: "Pending",   labelAr: "قيد الانتظار" },
  confirmed: { bg: "rgba(34,197,94,0.12)",   color: "#22C55E", border: "rgba(34,197,94,0.35)",   label: "Confirmed", labelAr: "مؤكد" },
  cancelled: { bg: "rgba(239,68,68,0.12)",   color: "#EF4444", border: "rgba(239,68,68,0.35)",   label: "Cancelled", labelAr: "ملغي" },
  completed: { bg: "rgba(99,102,241,0.12)",  color: "#818CF8", border: "rgba(99,102,241,0.35)",  label: "Completed", labelAr: "مكتمل" },
};

const PAYMENT_STYLES: Record<string, { bg: string; color: string; label: string; labelAr: string }> = {
  pending_verification: { bg: "rgba(99,102,241,0.12)", color: "#818CF8", label: "Pending review",  labelAr: "قيد المراجعة" },
  paid:                 { bg: "rgba(34,197,94,0.12)",  color: "#22C55E", label: "Paid",             labelAr: "مدفوع" },
  failed:               { bg: "rgba(239,68,68,0.12)",  color: "#EF4444", label: "Failed",           labelAr: "فشل" },
  refunded:             { bg: "rgba(148,163,184,0.10)", color: "#94A3B8", label: "Refunded",        labelAr: "مسترد" },
  pending:              { bg: "rgba(245,158,11,0.10)", color: "#F59E0B", label: "Pending",           labelAr: "معلّق" },
};

export default async function BookingsPage() {
  const t = await getTranslations("dashboard");
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth`);

  const { data: bookings } = await supabase
    .from("bookings")
    .select("*, session:sessions(*, workshop:workshops(*)), payment:payments(*), payment_deadline")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // bookings→payments is one-to-many, so PostgREST returns `payment` as an array.
  // Collapse it to the most-recent single payment so the UI reads it as an object.
  const rows = ((bookings as unknown as Booking[]) ?? []).map((b) => {
    const pay = (b as unknown as { payment?: unknown }).payment;
    const single = Array.isArray(pay)
      ? [...(pay as { created_at?: string }[])].sort(
          (a, z) => new Date(z.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
        )[0]
      : pay;
    return { ...b, payment: (single ?? undefined) as Booking["payment"] };
  });

  const isAr = locale === "ar";

  return (
    <div className="min-h-screen bg-[#0f172a] px-4 py-10">
      <div style={{ maxWidth: "52rem", margin: "0 auto" }}>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-black text-white mb-1">{t("bookings")}</h1>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.875rem" }}>
            {isAr ? "حجوزاتك الحالية والسابقة" : "Your current and past bookings"}
          </p>
        </div>

        {/* ── Action Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          {/* Book 1:1 Session */}
          <Link
            href={`/${locale}/book/general`}
            style={{
              display: "flex", alignItems: "center", gap: "14px",
              padding: "18px 20px", borderRadius: "12px",
              background: "#F59E0B", textDecoration: "none",
              boxShadow: "0 4px 24px rgba(245,158,11,0.35)",
              transition: "all 0.2s",
            }}
            className="hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(245,158,11,0.45)]"
          >
            <div style={{
              width: "44px", height: "44px", borderRadius: "8px",
              background: "rgba(0,0,0,0.15)", display: "flex",
              alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <Compass className="h-6 w-6 text-[#0f172a]" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 900, fontSize: "0.95rem", color: "#0f172a", lineHeight: 1.2 }}>
                {t("bookGeneral")}
              </div>
              <div style={{ fontSize: "0.75rem", color: "rgba(0,0,0,0.55)", marginTop: "2px" }}>
                {t("generalSessionDesc")}
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-[#0f172a]" style={{ flexShrink: 0, transform: isAr ? "rotate(180deg)" : undefined }} />
          </Link>

          {/* Discover Workshops */}
          <Link
            href={`/${locale}/workshops`}
            style={{
              display: "flex", alignItems: "center", gap: "14px",
              padding: "18px 20px", borderRadius: "12px",
              background: "rgba(30,41,59,0.8)",
              border: "1.5px solid rgba(245,158,11,0.25)",
              textDecoration: "none", transition: "all 0.2s",
            }}
            className="hover:border-[rgba(245,158,11,0.5)] hover:-translate-y-0.5"
          >
            <div style={{
              width: "44px", height: "44px", borderRadius: "8px",
              background: "rgba(245,158,11,0.1)", display: "flex",
              alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <BookOpen className="h-6 w-6 text-[#F59E0B]" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "white", lineHeight: 1.2 }}>
                {t("discoverWorkshops")}
              </div>
              <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", marginTop: "2px" }}>
                {t("workshopSessionDesc")}
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-white/40" style={{ flexShrink: 0, transform: isAr ? "rotate(180deg)" : undefined }} />
          </Link>
        </div>

        {/* ── Booking History ── */}
        <div className="flex items-center gap-2 mb-5">
          <Calendar className="h-4 w-4 text-[#F59E0B]" />
          <h2 style={{ fontSize: "0.75rem", fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            {isAr ? "سجل الحجوزات" : "Booking History"}
          </h2>
        </div>

        {rows.length === 0 ? (
          <div style={{
            background: "rgba(30,41,59,0.4)", border: "1px solid rgba(245,158,11,0.10)",
            borderRadius: "12px", textAlign: "center", padding: "56px 24px",
          }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "14px" }}>📋</div>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.95rem", marginBottom: "8px", fontWeight: 600 }}>
              {isAr ? "مفيش حجوزات لحد دلوقتي" : "No bookings yet"}
            </p>
            <p style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.8rem", marginBottom: "20px" }}>
              {isAr ? "ابدأ رحلتك بحجز جلسة أو ورشة عمل" : "Start your journey by booking a session or workshop"}
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link
                href={`/${locale}/book/general`}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "6px",
                  padding: "9px 18px", borderRadius: "8px",
                  background: "#F59E0B", color: "#0f172a",
                  fontWeight: 800, fontSize: "0.85rem", textDecoration: "none",
                }}
              >
                <Compass className="h-4 w-4" />
                {isAr ? "احجز جلسة" : "Book a Session"}
              </Link>
              <Link
                href={`/${locale}/workshops`}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "6px",
                  padding: "9px 18px", borderRadius: "8px",
                  border: "1px solid rgba(245,158,11,0.3)", color: "#F59E0B",
                  fontWeight: 700, fontSize: "0.85rem", textDecoration: "none",
                  background: "transparent",
                }}
              >
                <BookOpen className="h-4 w-4" />
                {isAr ? "استكشف الورش" : "Explore Workshops"}
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map((booking) => {
              const workshopTitle = getLocalizedField(
                (booking.session?.workshop as unknown as Record<string, unknown>) || {},
                "title", locale
              );
              const statusStyle = STATUS_STYLES[booking.status] || STATUS_STYLES.pending;
              const paymentStyle = booking.payment ? PAYMENT_STYLES[booking.payment.status] || PAYMENT_STYLES.pending : null;
              const isPastBooking = booking.status === "completed";

              return (
                <div key={booking.id} className="space-y-3">
                  {/* Main booking card */}
                  <div
                    style={{
                      background: "rgba(30,41,59,0.6)",
                      border: "1px solid rgba(245,158,11,0.12)",
                      borderRadius: "12px",
                      padding: "20px 22px",
                      transition: "border-color 0.15s",
                    }}
                  >
                    {/* Top row: title + status */}
                    <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 800, color: "white", fontSize: "0.975rem", marginBottom: "4px", lineHeight: 1.3 }}>
                          {workshopTitle || (isAr ? "جلسة فردية" : "General Session")}
                        </p>

                        {/* Date + time */}
                        {booking.session?.starts_at && (
                          <div className="flex items-center gap-3 flex-wrap" style={{ marginTop: "6px" }}>
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5" style={{ color: "rgba(255,255,255,0.35)" }} />
                              <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>
                                {formatDate(booking.session.starts_at, locale)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" style={{ color: "rgba(255,255,255,0.35)" }} />
                              <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>
                                {new Date(booking.session.starts_at).toLocaleTimeString(
                                  locale === "ar" ? "ar-EG" : "en-US",
                                  { hour: "2-digit", minute: "2-digit" }
                                )}
                              </span>
                            </div>
                            {booking.session?.location_or_link && (
                              <div className="flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5" style={{ color: "rgba(255,255,255,0.35)" }} />
                                <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)", maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {booking.session.location_or_link}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Status badge */}
                      <div
                        style={{
                          display: "inline-flex", alignItems: "center", gap: "5px",
                          padding: "5px 11px", borderRadius: "20px",
                          background: statusStyle.bg, border: `1px solid ${statusStyle.border}`,
                          flexShrink: 0,
                        }}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" style={{ color: statusStyle.color }} />
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: statusStyle.color }}>
                          {isAr ? statusStyle.labelAr : statusStyle.label}
                        </span>
                      </div>
                    </div>

                    {/* Payment deadline timer for pending bookings */}
                    {booking.status === "pending" && (booking as any).payment_deadline && (
                      <>
                        <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", margin: "12px 0" }} />
                        <div style={{ marginBottom: "12px" }}>
                          <PaymentCountdownTimer paymentDeadline={(booking as any).payment_deadline} />
                        </div>
                      </>
                    )}

                    {/* Divider */}
                    <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", margin: "12px 0" }} />

                    {/* Bottom row: amount + payment status + receipt */}
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3 flex-wrap">
                        {booking.payment && (
                          <span style={{ color: "#F59E0B", fontWeight: 900, fontSize: "0.95rem" }}>
                            {formatCurrency(booking.payment.amount, locale)}
                          </span>
                        )}
                        {booking.payment && paymentStyle && (
                          <div
                            style={{
                              display: "inline-flex", alignItems: "center", gap: "4px",
                              padding: "3px 9px", borderRadius: "12px",
                              background: paymentStyle.bg,
                            }}
                          >
                            <span style={{ fontSize: "0.7rem", fontWeight: 700, color: paymentStyle.color }}>
                              {isAr ? paymentStyle.labelAr : paymentStyle.label}
                            </span>
                          </div>
                        )}
                      </div>

                      {booking.payment?.proof_url && (
                        <div className="flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5" style={{ color: "#22C55E" }} />
                          <span style={{ fontSize: "0.75rem", color: "#22C55E", fontWeight: 600 }}>
                            {isAr ? "تم رفع الإيصال ✓" : "Receipt uploaded ✓"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Reflection and notes section for completed bookings */}
                  {isPastBooking && (
                    <div className="space-y-2">
                      {/* Reflection card */}
                      <ClientReflectionsCard
                        bookingId={booking.id}
                        locale={locale as "ar" | "en"}
                      />

                      {/* Notes form */}
                      <ClientSessionNotesForm
                        bookingId={booking.id}
                        clientId={user.id}
                        locale={locale as "ar" | "en"}
                      />

                      {/* Mentor notes display */}
                      <MentorNotesDisplay
                        bookingId={booking.id}
                        clientId={user.id}
                        locale={locale as "ar" | "en"}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
