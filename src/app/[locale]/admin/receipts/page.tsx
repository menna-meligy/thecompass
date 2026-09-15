"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "next-intl";
import {
  Check,
  X,
  Clock,
  Loader2,
  RefreshCw,
  ExternalLink,
  Phone,
  Mail,
  Calendar,
} from "lucide-react";
import { formatISODate } from "@/lib/schedule-dates";

interface Receipt {
  id: string;
  booking_id: string;
  state: "pending" | "needs_review" | "approved" | "rejected";
  booking_status: string;
  payment_status: string;
  offering_type: string;
  title_ar: string;
  title_en: string;
  slot_date: string | null;
  slot_start: string | null;
  slot_end: string | null;
  amount: number | null;
  currency: string;
  method: string | null;
  reference: string | null;
  proof_url: string | null;
  validation_errors: string[];
  ocr_amount: number | null;
  attempts: number;
  holds_slot: boolean;
  uploaded_at: string;
  approved_at: string | null;
  user_name: string | null;
  user_email: string | null;
  user_phone: string | null;
}

const TABS = [
  { key: "open", ar: "محتاجة قرار", en: "Needs a decision" },
  { key: "needs_review", ar: "الفحص التلقائي رفضها", en: "Auto-check refused" },
  { key: "pending", ar: "الفحص التلقائي قبلها", en: "Auto-check passed" },
  { key: "approved", ar: "متأكدة", en: "Approved" },
  { key: "rejected", ar: "مرفوضة", en: "Rejected" },
  { key: "all", ar: "الكل", en: "All" },
] as const;

/** Why the automatic check refused a receipt, in plain language. */
const REASONS: Record<string, { ar: string; en: string }> = {
  amount_mismatch: { ar: "المبلغ المقروء مش مطابق للسعر المطلوب", en: "Amount read doesn't match the expected price" },
  amount_unreadable: { ar: "مقدرناش نقرا المبلغ", en: "Couldn't read the amount" },
  date_too_old: { ar: "تاريخ التحويل مش النهاردة", en: "Transfer date isn't today" },
  date_future: { ar: "تاريخ التحويل في المستقبل", en: "Transfer date is in the future" },
  date_unreadable: { ar: "مقدرناش نقرا التاريخ", en: "Couldn't read the date" },
  reference_missing: { ar: "مفيش رقم عملية واضح", en: "No clear transaction reference" },
  duplicate_reference: { ar: "رقم العملية مستخدم في حجز تاني", en: "Reference already used on another booking" },
  duplicate_proof: { ar: "الصورة دي مستخدمة قبل كده", en: "This image was used before" },
  slot_taken: { ar: "الموعد اتاخد قبلها", en: "The slot was taken first" },
};

export default function AdminReceiptsPage() {
  const locale = useLocale();
  const isAr = locale === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);

  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("open");
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/admin/receipts/pending?status=${tab}`, { cache: "no-store" });
      if (!res.ok) {
        setError(
          res.status === 403
            ? t("محتاجة حساب أدمن.", "You need an admin account.")
            : t("تعذّر تحميل الإيصالات.", "Couldn't load receipts."),
        );
        setReceipts([]);
        return;
      }
      setError(null);
      setReceipts(await res.json());
    } catch {
      setError(t("تعذّر الاتصال بالسيرفر.", "Couldn't reach the server."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab, isAr]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  async function decide(bookingId: string, action: "confirm" | "reject") {
    setBusy(bookingId + action);
    setError(null);
    try {
      const res = await fetch("/api/admin/bookings/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: bookingId, action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || data.error || t("العملية فشلت", "That didn't work"));
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (action === "confirm" && data?.email && data.email.ok === false) {
        setError(
          t(
            "الحجز اتأكد، بس الإيميل مبعتش للعميل — كلّميه بنفسك. (الإيميل محتاج دومين متفعّل في Resend)",
            "Confirmed, but the client was NOT emailed — tell them yourself. (Email needs a verified domain in Resend.)",
          ),
        );
      }
      await load();
    } finally {
      setBusy(null);
    }
  }

  const stateStyle: Record<string, string> = {
    pending: "bg-amber-500/15 text-amber-300",
    needs_review: "bg-orange-500/20 text-orange-300",
    approved: "bg-emerald-500/15 text-emerald-300",
    rejected: "bg-red-500/15 text-red-300",
  };
  const stateLabel: Record<string, string> = {
    pending: t("بانتظار المراجعة", "To review"),
    needs_review: t("محتاجة عينك", "Needs your eyes"),
    approved: t("متأكد", "Approved"),
    rejected: t("مرفوض", "Rejected"),
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6" dir={isAr ? "rtl" : "ltr"}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#F59E0B] mb-1">
            {t("الدفعات", "Payments")}
          </p>
          <h1 className="text-2xl font-black text-white">{t("إيصالات العملاء", "Client receipts")}</h1>
          <p className="text-sm text-white/50 mt-2">
            {t(
              "كل إيصال رفعه عميل — حتى اللي الفحص التلقائي رفضه، لأن الفحص بيقرا صورة موبايل وبيغلط. الموعد محجوز من ساعة الرفع، والموافقة هنا بتأكد الحجز.",
              "Every receipt a client uploaded — including the ones the automatic check refused, because that check reads a phone photo and gets it wrong. The slot is held from the moment it lands; approving here confirms the booking.",
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

      <div className="flex flex-wrap gap-2">
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
          </button>
        ))}
      </div>

      {error && (
        <div className="p-4 bg-red-500/15 border border-red-500/40 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-white/50 py-10">
          <Loader2 className="w-4 h-4 animate-spin" />
          {t("جاري التحميل...", "Loading...")}
        </div>
      ) : receipts.length === 0 ? (
        <div className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.12)] rounded-2xl p-10 text-center">
          <p className="text-white/60">{t("مفيش إيصالات هنا.", "No receipts here.")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {receipts.map((r) => (
            <div
              key={r.id}
              className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.12)] rounded-2xl p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div className="min-w-0">
                  <h3 className="text-white font-bold">{isAr ? r.title_ar : r.title_en}</h3>
                  <p className="text-white/50 text-sm mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                    {r.slot_date && (
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatISODate(r.slot_date, isAr)} · {r.slot_start}–{r.slot_end}
                      </span>
                    )}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${stateStyle[r.state]}`}
                >
                  {stateLabel[r.state]}
                </span>
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                {/* Client + payment facts */}
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-white/40 text-xs uppercase tracking-wider font-semibold mb-1">
                      {t("العميل", "Client")}
                    </p>
                    <p className="text-white font-semibold">
                      {r.user_name || t("بدون اسم", "No name")}
                    </p>
                    {r.user_email && (
                      <p className="text-white/50 flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3.5 h-3.5" />
                        {r.user_email}
                      </p>
                    )}
                    {r.user_phone && (
                      <p className="text-white/50 flex items-center gap-1.5 mt-0.5">
                        <Phone className="w-3.5 h-3.5" />
                        {r.user_phone}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-white/40 text-xs uppercase tracking-wider font-semibold mb-1">
                        {t("المبلغ", "Amount")}
                      </p>
                      <p className="text-[#F59E0B] font-black text-lg">
                        {r.amount?.toLocaleString()} {t("ج.م", "EGP")}
                      </p>
                    </div>
                    <div>
                      <p className="text-white/40 text-xs uppercase tracking-wider font-semibold mb-1">
                        {t("الطريقة", "Method")}
                      </p>
                      <p className="text-white">
                        {r.method === "vodafone_cash"
                          ? t("فودافون كاش", "Vodafone Cash")
                          : t("إنستاباي", "InstaPay")}
                      </p>
                    </div>
                  </div>

                  {r.reference && (
                    <div>
                      <p className="text-white/40 text-xs uppercase tracking-wider font-semibold mb-1">
                        {t("رقم العملية", "Reference")}
                      </p>
                      <p className="text-white font-mono">{r.reference}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-white/40 text-xs uppercase tracking-wider font-semibold mb-1">
                      {t("وقت الرفع", "Uploaded")}
                    </p>
                    <p className="text-white/70">
                      {new Date(r.uploaded_at).toLocaleString(isAr ? "ar-EG" : "en-GB")}
                    </p>
                  </div>
                </div>

                {/* The actual receipt */}
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-wider font-semibold mb-2">
                    {t("الإيصال", "Receipt")}
                  </p>
                  {r.proof_url ? (
                    <a
                      href={r.proof_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-xl overflow-hidden border border-white/10 bg-black/30 hover:border-[#F59E0B]/40 transition-colors"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={r.proof_url}
                        alt={t("إيصال الدفع", "Payment receipt")}
                        className="w-full max-h-72 object-contain bg-black/40"
                      />
                      <span className="flex items-center justify-center gap-1.5 text-xs text-[#F59E0B] py-2">
                        <ExternalLink className="w-3.5 h-3.5" />
                        {t("افتح بالحجم الكامل", "Open full size")}
                      </span>
                    </a>
                  ) : (
                    <p className="text-white/40 text-sm">{t("مفيش صورة", "No image")}</p>
                  )}
                </div>
              </div>

              {r.state === "needs_review" && (
                <div className="mt-4 p-3 rounded-xl bg-orange-500/10 border border-orange-500/30">
                  <p className="text-orange-300 text-sm font-bold mb-1.5">
                    {t("الفحص التلقائي رفض الإيصال ده:", "The automatic check refused this receipt:")}
                  </p>
                  <ul className="list-disc ps-5 space-y-0.5 text-sm text-white/70">
                    {(r.validation_errors.length ? r.validation_errors : ["unknown"]).map((e) => (
                      <li key={e}>{REASONS[e] ? (isAr ? REASONS[e].ar : REASONS[e].en) : e}</li>
                    ))}
                  </ul>
                  {r.ocr_amount != null && (
                    <p className="text-sm text-white/80 mt-2">
                      {t("الفحص قرا: ", "The check read: ")}
                      <span className="font-bold">{r.ocr_amount.toLocaleString()} {t("ج.م", "EGP")}</span>
                      {t("  ·  المطلوب: ", "  ·  expected: ")}
                      <span className="font-bold">{r.amount?.toLocaleString()} {t("ج.م", "EGP")}</span>
                    </p>
                  )}
                  <p className="text-white/45 text-xs mt-2">
                    {t(
                      "بصّي على الصورة بنفسك — الفحص بيغلط في قراية الأرقام. لو التحويل سليم اضغطي أكّد الحجز.",
                      "Look at the image yourself — the check misreads digits. If the transfer is genuine, just confirm.",
                    )}
                  </p>
                </div>
              )}

              {(r.attempts > 1 || !r.holds_slot) && (
                <p className="mt-3 text-xs text-white/40">
                  {r.attempts > 1 &&
                    t(`حاول ${r.attempts} مرات. `, `${r.attempts} upload attempts. `)}
                  {!r.holds_slot &&
                    t("الموعد مش محجوزله.", "The slot is NOT being held for them.")}
                </p>
              )}

              {r.state === "pending" || r.state === "needs_review" ? (
                <div className="flex flex-wrap gap-3 mt-5 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => decide(r.booking_id, "confirm")}
                    disabled={busy !== null}
                    className="flex-1 min-w-[10rem] flex items-center justify-center gap-2 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg transition disabled:opacity-50"
                  >
                    {busy === r.booking_id + "confirm" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    {t("أكّد الحجز", "Approve & confirm")}
                  </button>
                  <button
                    type="button"
                    onClick={() => decide(r.booking_id, "reject")}
                    disabled={busy !== null}
                    className="flex-1 min-w-[10rem] flex items-center justify-center gap-2 py-2.5 bg-red-500/90 hover:bg-red-600 text-white font-bold rounded-lg transition disabled:opacity-50"
                  >
                    {busy === r.booking_id + "reject" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                    {t("ارفض وفضّي الموعد", "Reject & free the slot")}
                  </button>
                </div>
              ) : (
                <div
                  className={`mt-5 pt-4 border-t border-white/10 text-sm flex items-center gap-2 ${
                    r.state === "approved" ? "text-emerald-300" : "text-red-300"
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  {r.state === "approved"
                    ? t("تم التأكيد", "Confirmed")
                    : t("مرفوض — الموعد رجع متاح", "Rejected — the slot is free again")}
                  {r.approved_at &&
                    ` · ${new Date(r.approved_at).toLocaleString(isAr ? "ar-EG" : "en-GB")}`}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
