"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import {
  Check,
  X,
  UserCheck,
  Clock,
  Eye,
  Search,
  Filter,
  Info,
  FileImage,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import PaymentCountdownTimer from "@/components/booking/PaymentCountdownTimer";
import BookingDetailModal from "@/components/admin/BookingDetailModal";
import ReceiptModal from "@/components/admin/ReceiptModal";

type BookingStatus = "all" | "pending" | "proof_submitted" | "confirmed" | "cancelled" | "attended" | "payment_pending";

interface BookingRow {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  payment_deadline?: string;
  user?: { full_name?: string; email?: string };
  session?: {
    starts_at?: string;
    location_or_link?: string;
    workshop?: { title_ar?: string; title_en?: string };
  };
  payment?: {
    id?: string;
    status?: string;
    amount?: number;
    method?: string;
    proof_url?: string;
    gateway_txn_id?: string;
    created_at?: string;
  };
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label_ar: string; label_en: string }> = {
  awaiting_receipt: { bg: "bg-white/5", text: "text-white/45", label_ar: "بانتظار الإيصال", label_en: "Awaiting receipt" },
  pending: { bg: "bg-amber-500/10", text: "text-amber-400", label_ar: "معلق", label_en: "Pending" },
  proof_submitted: { bg: "bg-blue-500/10", text: "text-blue-400", label_ar: "إيصال للمراجعة", label_en: "Receipt to review" },
  confirmed: { bg: "bg-emerald-500/10", text: "text-emerald-400", label_ar: "مؤكد", label_en: "Confirmed" },
  cancelled: { bg: "bg-red-500/10", text: "text-red-400", label_ar: "ملغي", label_en: "Cancelled" },
  attended: { bg: "bg-purple-500/10", text: "text-purple-400", label_ar: "حضر", label_en: "Attended" },
};

function receiptState(b: BookingRow): string {
  if (b.status === "pending") {
    const p = b.payment;
    const hasProof = !!p?.proof_url;
    if (hasProof && (p?.status === "pending_verification" || p?.status === "paid")) return "proof_submitted";
    return "awaiting_receipt";
  }
  return b.status;
}

const FILTER_TABS: { key: BookingStatus | "payment_pending"; labelAr: string; labelEn: string }[] = [
  { key: "all", labelAr: "الكل", labelEn: "All" },
  { key: "payment_pending", labelAr: "بانتظار الدفع", labelEn: "Awaiting payment" },
  { key: "proof_submitted", labelAr: "إيصال مرفوع", labelEn: "Proof sent" },
  { key: "pending", labelAr: "معلق", labelEn: "Pending" },
  { key: "confirmed", labelAr: "مؤكد", labelEn: "Confirmed" },
  { key: "attended", labelAr: "حضر", labelEn: "Attended" },
  { key: "cancelled", labelAr: "ملغي", labelEn: "Cancelled" },
];

export default function AdminBookingsPage() {
  const locale = useLocale();
  const isAr = locale === "ar";

  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<BookingStatus>("all");
  const [search, setSearch] = useState("");
  const [actioning, setActioning] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [selectedBookingData, setSelectedBookingData] = useState<BookingRow | null>(null);
  const [selectedReceiptBooking, setSelectedReceiptBooking] = useState<BookingRow | null>(null);
  const [selectedBulkAction, setSelectedBulkAction] = useState<string | null>(null);
  const [selectedBookingIds, setSelectedBookingIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const pageRef = useRef(1);

  const load = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: bookingsData, error } = await supabase
        .from("bookings")
        .select(
          "id, user_id, status, created_at, payment_deadline, user:profiles(full_name, email, phone), session:sessions(starts_at, ends_at, location_or_link, price, type, workshop:workshops(title_ar, title_en)), payment:payments(id, status, amount, method, proof_url, gateway_txn_id, created_at)"
        )
        .order("created_at", { ascending: false })
        .limit(pageSize)
        .range((pageRef.current - 1) * pageSize, pageRef.current * pageSize - 1);

      if (error) {
        console.error("Error loading bookings:", error);
        setBookings([]);
      } else {
        // Normalize payments
        const rows = ((bookingsData as unknown as BookingRow[]) || []).map((b) => {
          const pay = (b as unknown as { payment?: unknown }).payment;
          const single = Array.isArray(pay)
            ? [...(pay as { created_at?: string }[])].sort(
                (a, z) => new Date(z.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
              )[0]
            : pay;
          return { ...b, payment: single as BookingRow["payment"] };
        });

        setBookings(rows);
      }
    } catch (error) {
      console.error("Failed to load bookings:", error);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  async function action(bookingId: string, type: "confirm" | "cancel" | "attended") {
    if (type === "confirm") {
      const b = bookings.find((x) => x.id === bookingId);
      if (b && receiptState(b) !== "proof_submitted") {
        setNotice(isAr ? "لا يمكن تأكيد الحجز قبل رفع العميل للإيصال ومراجعته." : "Can't confirm before the client's receipt is uploaded and reviewed.");
        return;
      }
    }
    setNotice(null);
    setActioning(bookingId + type);
    const supabase = createClient();

    if (type === "confirm") {
      await supabase.from("payments").update({ status: "paid" }).eq("booking_id", bookingId);
      const { error: confErr } = await supabase.from("bookings").update({ status: "confirmed" }).eq("id", bookingId);
      if (confErr) {
        setNotice(isAr ? "تعذّر تأكيد الحجز — تأكد إن الإيصال متأكد." : "Couldn't confirm — make sure the receipt is confirmed.");
        setActioning(null);
        await load();
        return;
      }
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
    // Filter by booking status
    if (filter !== "all") {
      if (filter === "payment_pending") {
        if (b.status !== "pending") return false;
      } else {
        const ds = receiptState(b);
        const matchKey = ds === "awaiting_receipt" ? "pending" : ds;
        if (matchKey !== filter) return false;
      }
    }

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      const name = b.user?.full_name?.toLowerCase() || "";
      const email = b.user?.email?.toLowerCase() || "";
      const title = ((isAr ? b.session?.workshop?.title_ar : b.session?.workshop?.title_en) || "").toLowerCase();
      const bookingId = b.id.toLowerCase();
      if (!name.includes(q) && !email.includes(q) && !title.includes(q) && !bookingId.includes(q)) return false;
    }

    return true;
  });

  // Calculate pagination
  const totalFiltered = filtered.length;
  const maxPages = Math.ceil(totalFiltered / pageSize) || 1;
  const currentPage = Math.min(page, maxPages);
  const paginatedBookings = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Bulk actions
  const handleSelectAll = () => {
    if (selectedBookingIds.size === paginatedBookings.length) {
      setSelectedBookingIds(new Set());
    } else {
      setSelectedBookingIds(new Set(paginatedBookings.map((b) => b.id)));
    }
  };

  const toggleBookingSelection = (bookingId: string) => {
    const newSelection = new Set(selectedBookingIds);
    if (newSelection.has(bookingId)) {
      newSelection.delete(bookingId);
    } else {
      newSelection.add(bookingId);
    }
    setSelectedBookingIds(newSelection);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[#F59E0B] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-full mx-auto space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-[#F59E0B] mb-1">
          {isAr ? "الجدولة" : "Scheduling"}
        </p>
        <h1 className="text-2xl font-black text-white">{isAr ? "الحجوزات" : "Bookings"}</h1>
        <p className="text-sm text-white/50 mt-2">
          {isAr ? "إدارة جميع الحجوزات والدفعات" : "Manage all bookings and payments"}
        </p>
      </div>

      {notice && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-300 text-sm">
          <span className="flex-1">{notice}</span>
          <button onClick={() => setNotice(null)} className="text-amber-300/60 hover:text-amber-200" aria-label="dismiss">
            ✕
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 flex-wrap">
            {FILTER_TABS.map((tab) => {
              let count = 0;
              if (tab.key === "all") {
                count = bookings.length;
              } else if (tab.key === "payment_pending") {
                count = bookings.filter((b) => b.status === "pending" && b.payment_deadline).length;
              } else {
                count = bookings.filter((b) => b.status === tab.key).length;
              }
              return (
                <button
                  key={tab.key}
                  onClick={() => {
                    setFilter(tab.key as BookingStatus);
                    setPage(1);
                  }}
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
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={isAr ? "بحث..." : "Search..."}
              className="ps-9 pe-4 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/25 focus:outline-none focus:border-[rgba(245,158,11,0.3)] w-52"
            />
          </div>
        </div>

        {/* Results count and pagination info */}
        <div className="flex items-center justify-between text-xs text-white/50">
          <span>
            {isAr
              ? `عرض ${paginatedBookings.length} من ${totalFiltered} الحجوزات`
              : `Showing ${paginatedBookings.length} of ${totalFiltered} bookings`}
          </span>
          <span>
            {isAr ? `الصفحة` : `Page`} {currentPage} {isAr ? `من` : `of`} {maxPages}
          </span>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.12)] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-start py-3 px-4 text-[0.65rem] font-bold uppercase tracking-widest text-white/30">
                  <input
                    type="checkbox"
                    checked={selectedBookingIds.size === paginatedBookings.length && paginatedBookings.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4"
                  />
                </th>
                <th className="text-start py-3 px-4 text-[0.65rem] font-bold uppercase tracking-widest text-white/30">
                  {isAr ? "العميل" : "Client"}
                </th>
                <th className="text-start py-3 px-4 text-[0.65rem] font-bold uppercase tracking-widest text-white/30">
                  {isAr ? "الجلسة" : "Session"}
                </th>
                <th className="text-start py-3 px-4 text-[0.65rem] font-bold uppercase tracking-widest text-white/30">
                  {isAr ? "الموعد" : "Date"}
                </th>
                <th className="text-start py-3 px-4 text-[0.65rem] font-bold uppercase tracking-widest text-white/30">
                  {isAr ? "المبلغ" : "Amount"}
                </th>
                <th className="text-start py-3 px-4 text-[0.65rem] font-bold uppercase tracking-widest text-white/30">
                  {isAr ? "طريقة الدفع" : "Payment Method"}
                </th>
                <th className="text-start py-3 px-4 text-[0.65rem] font-bold uppercase tracking-widest text-white/30">
                  {isAr ? "حالة الدفع" : "Payment Status"}
                </th>
                <th className="text-start py-3 px-4 text-[0.65rem] font-bold uppercase tracking-widest text-white/30">
                  {isAr ? "الإيصال" : "Receipt"}
                </th>
                <th className="text-start py-3 px-4 text-[0.65rem] font-bold uppercase tracking-widest text-white/30">
                  {isAr ? "الحالة" : "Status"}
                </th>
                <th className="text-start py-3 px-4 text-[0.65rem] font-bold uppercase tracking-widest text-white/30">
                  {isAr ? "إجراءات" : "Actions"}
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedBookings.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-white/25 text-sm">
                    {isAr ? "لا توجد حجوزات" : "No bookings found"}
                  </td>
                </tr>
              ) : (
                paginatedBookings.map((booking) => {
                  const ds = receiptState(booking);
                  const statusCfg = STATUS_STYLES[ds] || STATUS_STYLES.pending;
                  const title = isAr ? booking.session?.workshop?.title_ar : booking.session?.workshop?.title_en;
                  const sessionDate = booking.session?.starts_at
                    ? new Date(booking.session.starts_at).toLocaleDateString(isAr ? "ar-EG" : "en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "-";
                  const isActioning = actioning?.startsWith(booking.id);
                  const receiptStatusIcon =
                    !booking.payment?.proof_url
                      ? null
                      : booking.payment?.status === "pending_verification"
                        ? "pending"
                        : booking.payment?.status === "paid"
                          ? "verified"
                          : booking.payment?.status === "failed"
                            ? "rejected"
                            : null;

                  return (
                    <tr key={booking.id} className="border-b border-white/3 hover:bg-white/2 transition-colors">
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedBookingIds.has(booking.id)}
                          onChange={() => toggleBookingSelection(booking.id)}
                          className="w-4 h-4"
                        />
                      </td>
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
                        <p className="text-white/60 text-sm">{booking.payment?.amount ? `${booking.payment.amount} ${isAr ? "ج" : "EGP"}` : "-"}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-white/60 text-xs capitalize">{booking.payment?.method || "-"}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={cn("inline-flex px-2 py-0.5 rounded text-xs font-semibold", {
                            "bg-amber-500/20 text-amber-300": booking.payment?.status === "pending",
                            "bg-blue-500/20 text-blue-300": booking.payment?.status === "pending_verification",
                            "bg-emerald-500/20 text-emerald-300": booking.payment?.status === "paid",
                            "bg-red-500/20 text-red-300": booking.payment?.status === "failed",
                          })}
                        >
                          {booking.payment?.status || "pending"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {!booking.payment?.proof_url ? (
                          <span className="text-white/30 text-xs">{isAr ? "بدون" : "None"}</span>
                        ) : (
                          <div className="flex items-center gap-1">
                            {receiptStatusIcon === "pending" && <Clock className="h-3.5 w-3.5 text-blue-400" />}
                            {receiptStatusIcon === "verified" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
                            {receiptStatusIcon === "rejected" && <AlertCircle className="h-3.5 w-3.5 text-red-400" />}
                            <span className="text-white/60 text-xs">{receiptStatusIcon}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={cn("inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold", statusCfg.bg, statusCfg.text)}>
                          {isAr ? statusCfg.label_ar : statusCfg.label_en}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedBookingId(booking.id);
                              setSelectedBookingData(booking);
                            }}
                            title={isAr ? "عرض التفاصيل" : "View details"}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors"
                          >
                            <Info className="h-3.5 w-3.5" />
                          </button>
                          {booking.payment?.proof_url && (
                            <button
                              onClick={() => setSelectedReceiptBooking(booking)}
                              title={isAr ? "عرض الإيصال" : "View receipt"}
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                            >
                              <FileImage className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {ds === "proof_submitted" && (
                            <button
                              onClick={() => action(booking.id, "confirm")}
                              disabled={!!isActioning}
                              title={isAr ? "تأكيد الإيصال والحجز" : "Confirm receipt & booking"}
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-40 transition-colors"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {ds === "awaiting_receipt" && <span className="text-white/30 text-[0.7rem] px-1.5">{isAr ? "بانتظار الإيصال" : "awaiting"}</span>}
                          {(ds === "awaiting_receipt" || ds === "proof_submitted" || ds === "confirmed") && (
                            <button
                              onClick={() => action(booking.id, "cancel")}
                              disabled={!!isActioning}
                              title={isAr ? "إلغاء" : "Cancel"}
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-40 transition-colors"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
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
                          {isActioning && <div className="w-4 h-4 border-2 border-[#F59E0B] border-t-transparent rounded-full animate-spin" />}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {maxPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/5">
            <button
              onClick={() => setPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-white/20 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              {isAr ? "السابق" : "Previous"}
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: maxPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={cn("px-2.5 py-1.5 rounded-lg text-sm font-semibold transition-colors", {
                    "bg-[rgba(245,158,11,0.15)] border border-[rgba(245,158,11,0.3)] text-[#F59E0B]": p === currentPage,
                    "bg-transparent border border-white/10 text-white/50 hover:text-white/70": p !== currentPage,
                  })}
                >
                  {p}
                </button>
              ))}
            </div>

            <button
              onClick={() => setPage(Math.min(maxPages, currentPage + 1))}
              disabled={currentPage === maxPages}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-white/20 disabled:opacity-40 transition-colors"
            >
              {isAr ? "التالي" : "Next"}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Mobile cards - condensed version */}
      <div className="sm:hidden space-y-3">
        {paginatedBookings.length === 0 ? (
          <div className="py-16 text-center text-white/25 text-sm">{isAr ? "لا توجد حجوزات" : "No bookings found"}</div>
        ) : (
          paginatedBookings.map((booking) => {
            const ds = receiptState(booking);
            const statusCfg = STATUS_STYLES[ds] || STATUS_STYLES.pending;
            const title = ((isAr ? booking.session?.workshop?.title_ar : booking.session?.workshop?.title_en) || "-");
            const sessionDate = booking.session?.starts_at
              ? new Date(booking.session.starts_at).toLocaleDateString(isAr ? "ar-EG" : "en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "-";
            const isActioning = actioning?.startsWith(booking.id);

            return (
              <div key={booking.id} className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.12)] rounded-2xl p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{booking.user?.full_name || "-"}</p>
                    <p className="text-white/35 text-xs truncate">{booking.user?.email || ""}</p>
                  </div>
                  <span className={cn("inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold flex-shrink-0", statusCfg.bg, statusCfg.text)}>
                    {isAr ? statusCfg.label_ar : statusCfg.label_en}
                  </span>
                </div>
                <p className="text-white/80 text-sm mb-2">{title}</p>
                <div className="flex items-center justify-between text-xs mb-3">
                  <span className="text-white/50">{sessionDate}</span>
                  <span className="text-white/70 font-semibold">
                    {booking.payment?.amount ? `${booking.payment.amount} ${isAr ? "ج" : "EGP"}` : "-"}
                  </span>
                </div>
                <div className="flex gap-1 flex-wrap">
                  <button
                    onClick={() => {
                      setSelectedBookingId(booking.id);
                      setSelectedBookingData(booking);
                    }}
                    className="flex-1 px-2 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors"
                  >
                    {isAr ? "التفاصيل" : "Details"}
                  </button>
                  {booking.payment?.proof_url && (
                    <button
                      onClick={() => setSelectedReceiptBooking(booking)}
                      className="flex-1 px-2 py-1.5 rounded-lg text-xs font-semibold bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                    >
                      {isAr ? "الإيصال" : "Receipt"}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Mobile Pagination */}
        {maxPages > 1 && (
          <div className="flex items-center justify-between gap-2 pt-4">
            <button
              onClick={() => setPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="flex-1 px-2 py-1.5 rounded-lg text-xs font-semibold bg-white/5 border border-white/10 text-white/60 disabled:opacity-40"
            >
              {isAr ? "السابق" : "Prev"}
            </button>
            <span className="text-xs text-white/50">
              {currentPage}/{maxPages}
            </span>
            <button
              onClick={() => setPage(Math.min(maxPages, currentPage + 1))}
              disabled={currentPage === maxPages}
              className="flex-1 px-2 py-1.5 rounded-lg text-xs font-semibold bg-white/5 border border-white/10 text-white/60 disabled:opacity-40"
            >
              {isAr ? "التالي" : "Next"}
            </button>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedBookingId && selectedBookingData && (
        <BookingDetailModal
          bookingId={selectedBookingId}
          isOpen={!!selectedBookingId}
          onClose={() => {
            setSelectedBookingId(null);
            setSelectedBookingData(null);
            load();
          }}
          isAr={isAr}
          bookingData={selectedBookingData}
        />
      )}

      {/* Receipt Modal */}
      {selectedReceiptBooking && (
        <ReceiptModal
          bookingId={selectedReceiptBooking.id}
          isOpen={!!selectedReceiptBooking}
          onClose={() => {
            setSelectedReceiptBooking(null);
            load();
          }}
          isAr={isAr}
          payment={selectedReceiptBooking.payment}
          userEmail={selectedReceiptBooking.user?.email}
          onApprovalChange={() => load()}
        />
      )}
    </div>
  );
}
