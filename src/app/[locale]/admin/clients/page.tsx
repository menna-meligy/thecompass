import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Users, ArrowRight, Calendar } from "lucide-react";
import { PageHeader } from "@/components/admin/AdminPageWrapper";

const STATUS_STYLES: Record<string, { bg: string; color: string; label_ar: string; label_en: string }> = {
  pending:         { bg: "rgba(245,158,11,0.15)",  color: "#F59E0B",  label_ar: "معلق",          label_en: "Pending" },
  proof_submitted: { bg: "rgba(59,130,246,0.15)",  color: "#60A5FA",  label_ar: "إيصال مرفوع",  label_en: "Proof sent" },
  confirmed:       { bg: "rgba(34,197,94,0.15)",   color: "#22C55E",  label_ar: "مؤكد",          label_en: "Confirmed" },
  cancelled:       { bg: "rgba(239,68,68,0.15)",   color: "#EF4444",  label_ar: "ملغي",          label_en: "Cancelled" },
  completed:       { bg: "rgba(99,102,241,0.15)",  color: "#818CF8",  label_ar: "مكتمل",         label_en: "Completed" },
  attended:        { bg: "rgba(139,92,246,0.15)",  color: "#A78BFA",  label_ar: "حضر",           label_en: "Attended" },
};

interface BookingRel {
  id: string;
  status: string;
  created_at: string;
  session?: {
    workshop?: { title_ar?: string; title_en?: string };
  };
}

interface ClientRow {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  bookings: BookingRel[];
}

function formatRelDate(dateStr: string, locale: string) {
  try {
    return new Date(dateStr).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
      year: "numeric", month: "short", day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default async function AdminClientsPage() {
  const locale = await getLocale();
  const supabase = await createClient();
  const isAr = locale === "ar";

  const { data: clients } = await supabase
    .from("profiles")
    .select("*, bookings(id, status, created_at, session:sessions(*, workshop:workshops(*)))")
    .eq("role", "user")
    .order("created_at", { ascending: false });

  const rows = (clients as unknown as ClientRow[]) || [];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        supra={isAr ? "الأشخاص" : "People"}
        title={isAr ? "العملاء" : "Clients"}
        subtitle={isAr ? "جميع العملاء المسجلين وتقدمهم" : "All registered clients and their progress"}
      />

      {/* Table */}
      <div style={{
        background: "rgba(30,41,59,0.6)",
        border: "1px solid rgba(245,158,11,0.12)",
        borderRadius: "12px",
        overflow: "hidden",
      }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px]">
            <thead>
              <tr style={{ background: "rgba(13,21,38,0.8)" }}>
                <th className="text-start py-4 px-5 text-[#F59E0B] text-xs font-bold uppercase tracking-wider">
                  {isAr ? "العميل" : "Client"}
                </th>
                <th className="text-start py-4 px-5 text-[#F59E0B] text-xs font-bold uppercase tracking-wider">
                  {isAr ? "الحجوزات" : "Bookings"}
                </th>
                <th className="text-start py-4 px-5 text-[#F59E0B] text-xs font-bold uppercase tracking-wider">
                  {isAr ? "آخر حجز" : "Last Booking"}
                </th>
                <th className="text-start py-4 px-5 text-[#F59E0B] text-xs font-bold uppercase tracking-wider">
                  {isAr ? "الحالة" : "Status"}
                </th>
                <th className="text-start py-4 px-5 text-[#F59E0B] text-xs font-bold uppercase tracking-wider">
                  {isAr ? "الإجراء" : "Action"}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "48px 24px", textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: "0.9rem" }}>
                    {isAr ? "لا يوجد عملاء بعد" : "No clients yet"}
                  </td>
                </tr>
              ) : (
                rows.map((client) => {
                  const bookingCount = client.bookings?.length || 0;
                  const sortedBookings = [...(client.bookings || [])].sort(
                    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                  );
                  const lastBooking = sortedBookings[0];
                  const statusStyle = lastBooking
                    ? STATUS_STYLES[lastBooking.status] || STATUS_STYLES.pending
                    : null;
                  const initials = (client.full_name || client.email || "?").charAt(0).toUpperCase();
                  const displayName = client.full_name || client.email;

                  return (
                    <tr
                      key={client.id}
                      style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
                      className="hover:bg-[rgba(245,158,11,0.03)] transition-colors"
                    >
                      {/* Avatar + name */}
                      <td style={{ padding: "14px 20px" }}>
                        <div className="flex items-center gap-3">
                          <div style={{
                            width: "36px", height: "36px", borderRadius: "50%",
                            background: "linear-gradient(135deg, #F59E0B, #D97706)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontWeight: 900, fontSize: "0.95rem", color: "#0f172a", flexShrink: 0,
                          }}>
                            {initials}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ color: "white", fontWeight: 700, fontSize: "0.875rem", lineHeight: 1.3 }}>
                              {displayName}
                            </p>
                            {client.full_name && (
                              <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.75rem" }}>
                                {client.email}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Booking count */}
                      <td style={{ padding: "14px 20px" }}>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" style={{ color: "rgba(245,158,11,0.5)" }} />
                          <span style={{
                            display: "inline-flex", alignItems: "center", justifyContent: "center",
                            minWidth: "28px", padding: "2px 8px",
                            background: bookingCount > 0 ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.05)",
                            color: bookingCount > 0 ? "#F59E0B" : "rgba(255,255,255,0.3)",
                            borderRadius: "10px", fontSize: "0.8rem", fontWeight: 700,
                          }}>
                            {bookingCount}
                          </span>
                        </div>
                      </td>

                      {/* Last booking date */}
                      <td style={{ padding: "14px 20px" }}>
                        {lastBooking ? (
                          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.82rem" }}>
                            {formatRelDate(lastBooking.created_at, locale)}
                          </span>
                        ) : (
                          <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.82rem" }}>-</span>
                        )}
                      </td>

                      {/* Status badge */}
                      <td style={{ padding: "14px 20px" }}>
                        {statusStyle && lastBooking ? (
                          <span style={{
                            display: "inline-flex", alignItems: "center",
                            padding: "3px 10px", borderRadius: "12px",
                            background: statusStyle.bg,
                            color: statusStyle.color,
                            fontSize: "0.75rem", fontWeight: 700,
                          }}>
                            {isAr ? statusStyle.label_ar : statusStyle.label_en}
                          </span>
                        ) : (
                          <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.82rem" }}>-</span>
                        )}
                      </td>

                      {/* Action */}
                      <td style={{ padding: "14px 20px" }}>
                        <Link
                          href={`/${locale}/admin/clients/${client.id}`}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: "5px",
                            padding: "6px 14px", borderRadius: "8px",
                            background: "rgba(245,158,11,0.1)",
                            border: "1px solid rgba(245,158,11,0.25)",
                            color: "#F59E0B", fontSize: "0.8rem", fontWeight: 700,
                            textDecoration: "none", transition: "all 0.15s",
                          }}
                          className="hover:bg-[rgba(245,158,11,0.2)]"
                        >
                          {isAr ? "عرض المسار" : "View Roadmap"}
                          <ArrowRight className="h-3.5 w-3.5" style={{ transform: isAr ? "rotate(180deg)" : undefined }} />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
