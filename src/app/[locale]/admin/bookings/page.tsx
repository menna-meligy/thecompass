"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import {
  Calendar,
  Check,
  Clock,
  ExternalLink,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  Search,
  UserCheck,
  X,
} from "lucide-react";
import { formatISODate } from "@/lib/schedule-dates";

interface Booking {
  id: string;
  user_id: string;
  status: string;
  state: "awaiting_receipt" | "receipt_to_review" | "confirmed" | "attended" | "cancelled";
  created_at: string;
  payment_deadline: string | null;
  scheduled_at: string | null;
  seats: number;
  holds_slot: boolean;
  offering_type: string;
  title_ar: string;
  title_en: string;
  slot: { id: string; date: string; start_time: string; end_time: string } | null;
  user: { full_name: string | null; email: string | null; phone: string | null } | null;
  payment: {
    id: string;
    amount: number | null;
    method: string | null;
    status: string | null;
    proof_url: string | null;
    reference: string | null;
  } | null;
}

const TABS = [
  { key: "all", ar: "الكل", en: "All" },
  { key: "receipt_to_review", ar: "إيصال للمراجعة", en: "Receipt to review" },
  { key: "awaiting_receipt", ar: "بانتظار الدفع", en: "Awaiting payment" },
  { key: "confirmed", ar: "مؤكد", en: "Confirmed" },
  { key: "attended", ar: "حضر", en: "Attended" },
  { key: "cancelled", ar: "ملغي", en: "Cancelled" },
] as const;

const STATE_STYLE: Record<Booking["state"], string> = {
  awaiting_receipt: "bg-white/5 text-white/50",
  receipt_to_review: "bg-blue-500/15 text-blue-300",
  confirmed: "bg-emerald-500/15 text-emerald-300",
  attended: "bg-purple-500/15 text-purple-300",
  cancelled: "bg-red-500/15 text-red-300",
};

export default function AdminBookingsPage() {
  const locale = useLocale();
  const isAr = locale === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/admin/bookings?state=${tab}`, { cache: "no-store" });
      if (!res.ok) {
        setNotice(
          res.status === 403
            ? t("محتاجة حساب أدمن.", "You need an admin account.")
            : t("تعذّر تحميل الحجوزات.", "Couldn't load bookings."),
        );
        setBookings([]);
        return;
      }
      const data = await res.json();
      setBookings(data.bookings ?? []);
      setCounts(data.counts ?? {});
    } catch {
      setNotice(t("تعذّر الاتصال بالسيرفر.", "Couldn't reach the server."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab, isAr]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const STATE_LABEL: Record<Booking["state"], string> = {
    awaiting_receipt: t("بانتظار الإيصال", "Awaiting receipt"),
    receipt_to_review: t("إيصال للمراجعة", "Receipt to review"),
    confirmed: t("مؤكد", "Confirmed"),
    attended: t("حضر", "Attended"),
    cancelled: t("ملغي", "Cancelled"),
  };

  async function act(id: string, action: "confirm" | "cancel" | "attended") {
    setBusy(id + action);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/bookings/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: id, action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setNotice(data.message || data.error || t("العملية فشلت", "That didn't work"));
        return;
      }
      if (action === "confirm") {
        fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "payment_approved", booking_id: id }),
        }).catch(() => {});
      }
      await load();
    } finally {
      setBusy(null);
    }
  }

  const q = search.trim().toLowerCase();
  const rows = q
    ? bookings.filter((b) =>
        [b.user?.full_name, b.user?.email, b.user?.phone, b.title_ar, b.title_en, b.id]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q),
      )
    : bookings;

  return (
    <div className="max-w-6xl mx-auto space-y-6" dir={isAr ? "rtl" : "ltr"}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#F59E0B] mb-1">
            {t("الجدولة", "Scheduling")}
          </p>
          <h1 className="text-2xl font-black text-white">{t("الحجوزات", "Bookings")}</h1>
          <p className="text-sm text-white/50 mt-2">
            {t(
              "كل حجز، بميعاده الحقيقي وحالة الدفع.",
              "Every booking, with its real appointment time and payment state.",
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={refreshing}
          className="flex items-center gap-2 text-sm text-white/60 hover:text-white px-3 py-2 rounded-lg bg-white/5 border border-white/10 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          {t("تحديث", "Refresh")}
        </button>
      </div>

      {notice && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-300 text-sm">
          <span className="flex-1">{notice}</span>
          <button onClick={() => setNotice(null)} className="text-amber-300/60 hover:text-amber-200">
            ✕
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((x) => (
          <button
            key={x.key}
            type="button"
            onClick={() => setTab(x.key)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              tab === x.key
                ? "bg-[#F59E0B] text-[#0f172a]"
                : "bg-white/5 text-white/60 hover:text-white border border-white/10"
            }`}
          >
            {isAr ? x.ar : x.en}
            {x.key !== "all" && counts[x.key] ? ` (${counts[x.key]})` : ""}
          </button>
        ))}

        <div className="relative ms-auto">
          <Search className="w-4 h-4 text-white/30 absolute top-1/2 -translate-y-1/2 start-3" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("ابحث بالاسم أو الإيميل", "Search name or email")}
            className="bg-white/5 border border-white/10 rounded-lg ps-9 pe-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#F59E0B] w-60"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-white/50 py-10">
          <Loader2 className="w-4 h-4 animate-spin" />
          {t("جاري التحميل...", "Loading...")}
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.12)] rounded-2xl p-10 text-center text-white/60">
          {t("مفيش حجوزات هنا.", "No bookings here.")}
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((b) => (
            <div
              key={b.id}
              className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.12)] rounded-2xl p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <h3 className="text-white font-bold">{isAr ? b.title_ar : b.title_en}</h3>
                  <p className="text-white/50 text-sm mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {b.slot
                        ? `${formatISODate(b.slot.date, isAr)} · ${b.slot.start_time}–${b.slot.end_time}`
                        : t("بدون ميعاد", "No time set")}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {t("اتحجز", "Booked")}{" "}
                      {new Date(b.created_at).toLocaleDateString(isAr ? "ar-EG" : "en-GB")}
                    </span>
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${STATE_STYLE[b.state]}`}
                >
                  {STATE_LABEL[b.state]}
                </span>
              </div>

              <div className="grid sm:grid-cols-3 gap-4 text-sm border-t border-white/10 pt-3">
                <div className="min-w-0">
                  <p className="text-white/40 text-xs uppercase tracking-wider font-semibold mb-1">
                    {t("العميل", "Client")}
                  </p>
                  <p className="text-white font-semibold truncate">
                    {b.user?.full_name || t("بدون اسم", "No name")}
                  </p>
                  {b.user?.email && (
                    <p className="text-white/50 flex items-center gap-1.5 truncate">
                      <Mail className="w-3 h-3 flex-shrink-0" />
                      {b.user.email}
                    </p>
                  )}
                  {b.user?.phone && (
                    <p className="text-white/50 flex items-center gap-1.5">
                      <Phone className="w-3 h-3" />
                      {b.user.phone}
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-white/40 text-xs uppercase tracking-wider font-semibold mb-1">
                    {t("الدفع", "Payment")}
                  </p>
                  <p className="text-[#F59E0B] font-bold">
                    {b.payment?.amount?.toLocaleString() ?? "—"} {t("ج.م", "EGP")}
                  </p>
                  <p className="text-white/50">
                    {b.payment?.method === "vodafone_cash"
                      ? t("فودافون كاش", "Vodafone Cash")
                      : b.payment?.method === "instapay"
                        ? t("إنستاباي", "InstaPay")
                        : "—"}
                  </p>
                </div>

                <div>
                  <p className="text-white/40 text-xs uppercase tracking-wider font-semibold mb-1">
                    {t("الإيصال", "Receipt")}
                  </p>
                  {b.payment?.proof_url ? (
                    <a
                      href={b.payment.proof_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#F59E0B] hover:text-[#f5b342] flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      {t("افتح الصورة", "Open image")}
                    </a>
                  ) : (
                    <p className="text-white/40">{t("مترفعش", "Not uploaded")}</p>
                  )}
                  {b.payment?.reference && (
                    <p className="text-white/40 font-mono text-xs mt-0.5">{b.payment.reference}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-white/10">
                {b.state === "receipt_to_review" && (
                  <button
                    type="button"
                    onClick={() => act(b.id, "confirm")}
                    disabled={busy !== null}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-lg transition disabled:opacity-50"
                  >
                    {busy === b.id + "confirm" ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    {t("أكّد", "Confirm")}
                  </button>
                )}
                {b.state === "confirmed" && (
                  <button
                    type="button"
                    onClick={() => act(b.id, "attended")}
                    disabled={busy !== null}
                    className="flex items-center gap-1.5 px-4 py-2 bg-purple-500/80 hover:bg-purple-600 text-white text-sm font-bold rounded-lg transition disabled:opacity-50"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    {t("حضر", "Attended")}
                  </button>
                )}
                {b.state !== "cancelled" && b.state !== "attended" && (
                  <button
                    type="button"
                    onClick={() => act(b.id, "cancel")}
                    disabled={busy !== null}
                    className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-red-500/20 border border-white/10 text-white/70 hover:text-red-300 text-sm font-bold rounded-lg transition disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
                    {t("ألغِ وفضّي الموعد", "Cancel & free slot")}
                  </button>
                )}
                {b.state === "awaiting_receipt" && (
                  <span className="text-xs text-white/35 self-center">
                    {t(
                      "الموعد لسه متاح لغيره لحد ما يرفع الإيصال.",
                      "The slot stays open to others until they upload a receipt.",
                    )}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-sm text-white/40">
        {t("راجعي صور الإيصالات في ", "Review receipt images in ")}
        <Link href={`/${locale}/admin/receipts`} className="text-[#F59E0B] hover:underline">
          {t("الإيصالات", "Receipts")}
        </Link>
        .
      </p>
    </div>
  );
}
