"use client";

import { useState, useEffect, useCallback } from "react";
import { useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Check, X, UserCheck, Clock, Eye, Search, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

type BookingStatus = "all" | "pending" | "proof_submitted" | "confirmed" | "cancelled" | "attended";

interface BookingRow {
  id: string;
  status: string;
  created_at: string;
  user?: { full_name?: string; email?: string };
  session?: {
    starts_at?: string;
    location_or_link?: string;
    workshop?: { title_ar?: string; title_en?: string };
  };
  payment?: { status?: string; amount?: number; proof_url?: string };
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label_ar: string; label_en: string }> = {
  pending:        { bg: "bg-amber-500/10",   text: "text-amber-400",  label_ar: "معلق",         label_en: "Pending" },
  proof_submitted:{ bg: "bg-blue-500/10",    text: "text-blue-400",   label_ar: "إيصال مرفوع",  label_en: "Proof sent" },
  confirmed:      { bg: "bg-emerald-500/10", text: "text-emerald-400",label_ar: "مؤكد",          label_en: "Confirmed" },
  cancelled:      { bg: "bg-red-500/10",     text: "text-red-400",    label_ar: "ملغي",          label_en: "Cancelled" },
  attended:       { bg: "bg-purple-500/10",  text: "text-purple-400", label_ar: "حضر",           label_en: "Attended" },
};

const FILTER_TABS: { key: BookingStatus; labelAr: string; labelEn: string }[] = [
  { key: "all",             labelAr: "الكل",          labelEn: "All" },
  { key: "proof_submitted", labelAr: "إيصال مرفوع",   labelEn: "Proof sent" },
  { key: "pending",         labelAr: "معلق",           labelEn: "Pending" },
  { key: "confirmed",       labelAr: "مؤكد",           labelEn: "Confirmed" },
  { key: "attended",        labelAr: "حضر",            labelEn: "Attended" },
  { key: "cancelled",       labelAr: "ملغي",           labelEn: "Cancelled" },
];

export default function AdminBookingsPage() {
  const locale = useLocale();
  const isAr = locale === "ar";

  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<BookingStatus>("all");
  const [search, setSearch] = useState("");
  const [actioning, setActioning] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("bookings")
      .select("id, status, created_at, user:profiles(full_name, email), session:sessions(starts_at, location_or_link, workshop:workshops(title_ar, title_en)), payment:payments(status, amount, proof_url)")
      .order("created_at", { ascending: false });
    setBookings((data as unknown as BookingRow[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function action(bookingId: string, type: "confirm" | "cancel" | "attended") {
    setActioning(bookingId + type);
    const supabase = createClient();

    if (type === "confirm") {
      await supabase.from("payments").update({ status: "paid" }).eq("booking_id", bookingId);
      await supabase.from("bookings").update({ status: "confirmed" }).eq("id", bookingId);
      await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "payment_approved", booking_id: bookingId }),
      }).catch(() => {});
    } else if (type === "cancel") {
      await supabase.from("payments").update({ status: "failed" }).eq("booking_id", bookingId);
      await supabase.from("bookings").update({ status: "cancelled" }).eq("id", bookingId);
    } else if (type === "attended") {
      await supabase.from("bookings").update({ status: "attended" }).eq("id", bookingId);
      await fetch("/api/admin/mark-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: bookingId }),
      }).catch(() => {});
    }

    setActioning(null);
    await load();
  }

  const filtered = bookings.filter((b) => {
    if (filter !== "all" && b.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      const name = b.user?.full_name?.toLowerCase() || "";
      const email = b.user?.email?.toLowerCase() || "";
      const title = (isAr ? b.session?.workshop?.title_ar : b.session?.workshop?.title_en)?.toLowerCase() || "";
      if (!name.includes(q) && !email.includes(q) && !title.includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[#F59E0B] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-[#F59E0B] mb-1">
          {isAr ? "الجدولة" : "Scheduling"}
        </p>
        <h1 className="text-2xl font-black text-white">{isAr ? "الحجوزات" : "Bookings"}</h1>
      </div>

      {/* Filter tabs + search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 flex-wrap">
          {FILTER_TABS.map((tab) => {
            const count = tab.key === "all" ? bookings.length : bookings.filter((b) => b.status === tab.key).length;
            return (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border",
                  filter === tab.key
                    ? "bg-[rgba(245,158,11,0.15)] border-[rgba(245,158,11,0.3)] text-[#F59E0B]"
                    : "bg-transparent border-white/5 text-white/40 hover:text-white/70 hover:border-white/10"
                )}
              >
                {isAr ? tab.labelAr : tab.labelEn}
                {count > 0 && <span className="ms-1.5 opacity-60">({count})</span>}
              </button>
            );
          })}
        </div>
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isAr ? "بحث..." : "Search..."}
            className="ps-9 pe-4 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/25 focus:outline-none focus:border-[rgba(245,158,11,0.3)] w-52"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.12)] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-start py-3 px-4 text-[0.65rem] font-bold uppercase tracking-widest text-white/30">{isAr ? "العميل" : "Client"}</th>
                <th className="text-start py-3 px-4 text-[0.65rem] font-bold uppercase tracking-widest text-white/30">{isAr ? "الجلسة" : "Session"}</th>
                <th className="text-start py-3 px-4 text-[0.65rem] font-bold uppercase tracking-widest text-white/30">{isAr ? "الموعد" : "Date"}</th>
                <th className="text-start py-3 px-4 text-[0.65rem] font-bold uppercase tracking-widest text-white/30">{isAr ? "الحالة" : "Status"}</th>
                <th className="text-start py-3 px-4 text-[0.65rem] font-bold uppercase tracking-widest text-white/30">{isAr ? "المبلغ" : "Amount"}</th>
                <th className="text-start py-3 px-4 text-[0.65rem] font-bold uppercase tracking-widest text-white/30">{isAr ? "إجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-white/25 text-sm">
                    {isAr ? "لا توجد حجوزات" : "No bookings found"}
                  </td>
                </tr>
              ) : filtered.map((booking) => {
                const statusCfg = STATUS_STYLES[booking.status] || STATUS_STYLES.pending;
                const title = isAr ? booking.session?.workshop?.title_ar : booking.session?.workshop?.title_en;
                const sessionDate = booking.session?.starts_at
                  ? new Date(booking.session.starts_at).toLocaleDateString(isAr ? "ar-EG" : "en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                  : "-";
                const isActioning = actioning?.startsWith(booking.id);

                return (
                  <tr key={booking.id} className="border-b border-white/3 hover:bg-white/2 transition-colors">
                    <td className="py-3 px-4">
                      <p className="text-white text-sm font-semibold">{booking.user?.full_name || "-"}</p>
                      <p className="text-white/35 text-xs">{booking.user?.email || ""}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-white/80 text-sm truncate max-w-[160px]">{title || "-"}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-white/50 text-xs">{sessionDate}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className={cn("inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold", statusCfg.bg, statusCfg.text)}>
                        {isAr ? statusCfg.label_ar : statusCfg.label_en}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-white/60 text-sm">
                        {booking.payment?.amount ? `${booking.payment.amount} ${isAr ? "ج" : "EGP"}` : "-"}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        {/* Proof view */}
                        {booking.payment?.proof_url && (
                          <a
                            href={booking.payment.proof_url}
                            target="_blank"
                            rel="noopener"
                            title={isAr ? "عرض الإيصال" : "View proof"}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </a>
                        )}
                        {/* Confirm */}
                        {(booking.status === "pending" || booking.status === "proof_submitted") && (
                          <button
                            onClick={() => action(booking.id, "confirm")}
                            disabled={!!isActioning}
                            title={isAr ? "تأكيد" : "Confirm"}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-40 transition-colors"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {/* Cancel */}
                        {(booking.status === "pending" || booking.status === "proof_submitted" || booking.status === "confirmed") && (
                          <button
                            onClick={() => action(booking.id, "cancel")}
                            disabled={!!isActioning}
                            title={isAr ? "إلغاء" : "Cancel"}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-40 transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {/* Mark attended */}
                        {booking.status === "confirmed" && (
                          <button
                            onClick={() => action(booking.id, "attended")}
                            disabled={!!isActioning}
                            title={isAr ? "سجّل الحضور" : "Mark attended"}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 disabled:opacity-40 transition-colors"
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {isActioning && (
                          <div className="w-4 h-4 border-2 border-[#F59E0B] border-t-transparent rounded-full animate-spin" />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
