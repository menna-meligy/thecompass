"use client";

import { useState, useEffect } from "react";
import { X, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import ManualPaymentApproval from "./ManualPaymentApproval";
import ClientNotesDisplay from "./ClientNotesDisplay";

interface BookingDetailModalProps {
  bookingId: string;
  isOpen: boolean;
  onClose: () => void;
  isAr: boolean;
  bookingData?: {
    user?: { full_name?: string; email?: string };
    session?: {
      starts_at?: string;
      location_or_link?: string;
      workshop?: { title_ar?: string; title_en?: string };
    };
    payment?: { amount?: number; proof_url?: string; method?: string; status?: string };
    status?: string;
  };
}

export default function BookingDetailModal({
  bookingId,
  isOpen,
  onClose,
  isAr,
  bookingData,
}: BookingDetailModalProps) {
  const [clientNotes, setClientNotes] = useState<Array<{
    id: string;
    content_ar?: string | null;
    content_en?: string | null;
    is_public: boolean;
    created_at: string;
  }> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    extractedDate?: string;
    extractedAmount?: string;
    dateMatches?: boolean;
    amountMatches?: boolean;
    message?: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen && bookingId) {
      loadClientNotes();
    }
  }, [isOpen, bookingId]);

  const loadClientNotes = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/client-notes?booking_id=${bookingId}`);
      if (!res.ok) throw new Error("Failed to load client notes");
      const data = await res.json();
      setClientNotes(data.notes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const verifyReceipt = async () => {
    if (!bookingData?.payment?.proof_url) return;

    setVerifying(true);
    try {
      const Tesseract = await import("tesseract.js");
      const result = await Tesseract.default.recognize(bookingData.payment.proof_url, "ara+eng");
      const text = result.data.text;

      const today = new Date();
      const todayStr = today.toLocaleDateString("ar-EG");
      const todayEnStr = today.toLocaleDateString("en-US");

      // Extract date patterns
      const datePatterns = [
        /(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/g,
        /(يناير|فبراير|مارس|أبريل|مايو|يونيو|يوليو|أغسطس|سبتمبر|أكتوبر|نوفمبر|ديسمبر)/g,
      ];

      let extractedDate = "";
      for (const pattern of datePatterns) {
        const match = text.match(pattern);
        if (match) {
          extractedDate = match[0];
          break;
        }
      }

      // Extract amount patterns (EGP, ج.م.ع, or just numbers)
      const amountPatterns = [
        /(?:EGP|ج\.م\.ع|جنيه)?\s*(\d+[.,]\d{2}|\d+)\s*(?:EGP|ج\.م\.ع|جنيه)?/g,
      ];

      let extractedAmount = "";
      for (const pattern of amountPatterns) {
        const matches = text.match(pattern);
        if (matches && matches.length > 0) {
          extractedAmount = matches[matches.length - 1];
          break;
        }
      }

      const dateMatches =
        text.includes(todayStr) ||
        text.includes(todayEnStr) ||
        text.includes(today.getDate().toString());

      const bookingAmount = bookingData.payment?.amount?.toString();
      const amountMatches = extractedAmount.includes(bookingAmount || "");

      const message =
        dateMatches && amountMatches
          ? isAr
            ? "تمام التمام! التاريخ والمبلغ صحيح. إذا كانت هناك مشكلة، سيتواصل معك الفريق قريباً"
            : "Perfect! Date and amount match. If there's any issue, our team will contact you soon."
          : !dateMatches
            ? isAr
              ? "التاريخ على الإيصال ليس اليوم. يرجى التحقق من الإيصال."
              : "The date on the receipt is not today. Please verify the receipt."
            : !amountMatches
              ? isAr
                ? "المبلغ على الإيصال لا يطابق مبلغ الحجز. يرجى التحقق."
                : "The amount on the receipt does not match the booking amount. Please verify."
              : isAr
                ? "إذا كانت هناك مشكلة، سيتواصل معك الفريق قريباً"
                : "If there's any issue, our team will contact you soon.";

      setVerificationResult({
        extractedDate,
        extractedAmount,
        dateMatches,
        amountMatches,
        message,
      });
    } catch (err) {
      console.error("Verification error:", err);
      setVerificationResult({
        message: isAr
          ? "لم نتمكن من التحقق من الإيصال تلقائياً. سيقوم الفريق بالمراجعة يدوياً."
          : "We couldn't verify the receipt automatically. Our team will review it manually.",
      });
    } finally {
      setVerifying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f172a] rounded-xl border border-white/10 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 sticky top-0 bg-[#0f172a]">
          <h2 className="text-lg font-bold text-white">
            {isAr ? "تفاصيل الحجز" : "Booking Details"}
          </h2>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Booking Information */}
          {bookingData && (
            <div>
              <h3 className="text-sm font-semibold text-amber-300 mb-3">
                {isAr ? "معلومات الحجز" : "Booking Information"}
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-white/50">{isAr ? "العميل" : "Client"}:</span>
                  <span className="text-white ms-2 font-semibold">
                    {bookingData.user?.full_name || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-white/50">{isAr ? "البريد الإلكتروني" : "Email"}:</span>
                  <span className="text-white/70 ms-2">{bookingData.user?.email || "-"}</span>
                </div>
                <div>
                  <span className="text-white/50">{isAr ? "الجلسة" : "Session"}:</span>
                  <span className="text-white ms-2">
                    {isAr
                      ? bookingData.session?.workshop?.title_ar
                      : bookingData.session?.workshop?.title_en ||
                        (isAr ? "جلسة" : "Session")}
                  </span>
                </div>
                <div>
                  <span className="text-white/50">{isAr ? "المبلغ" : "Amount"}:</span>
                  <span className="text-white ms-2">
                    {bookingData.payment?.amount ? `${bookingData.payment.amount} EGP` : "-"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Receipt Status */}
          <div>
            <h3 className="text-sm font-semibold text-blue-300 mb-3">
              {isAr ? "حالة الإيصال" : "Receipt Status"}
            </h3>
            {bookingData?.payment?.proof_url ? (
              <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 space-y-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    <span className="text-sm font-semibold text-emerald-300">
                      {isAr ? "✓ تم رفع الإيصال" : "✓ Receipt Uploaded"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded font-semibold ${
                      bookingData.payment.status === "paid"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : bookingData.payment.status === "pending_verification"
                          ? "bg-blue-500/20 text-blue-300"
                          : "bg-red-500/20 text-red-300"
                    }`}>
                      {bookingData.payment.status === "paid"
                        ? (isAr ? "موافق عليه ✓" : "Approved ✓")
                        : bookingData.payment.status === "pending_verification"
                          ? (isAr ? "قيد المراجعة" : "Pending Review")
                          : (isAr ? "مرفوض" : "Rejected")}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">
                      {isAr ? "طريقة الدفع" : "Payment Method"}:
                    </span>
                    <span className="font-semibold text-white capitalize">
                      {bookingData.payment.method || "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">
                      {isAr ? "المبلغ" : "Amount"}:
                    </span>
                    <span className="font-semibold text-white">
                      {bookingData.payment.amount ? `${bookingData.payment.amount} EGP` : "-"}
                    </span>
                  </div>
                </div>

                {/* Receipt Image */}
                <div className="border border-blue-500/20 rounded-md overflow-hidden">
                  <img
                    src={bookingData.payment.proof_url}
                    alt="Receipt"
                    className="w-full max-h-80 object-contain bg-black/30"
                  />
                </div>

                {/* Verify Button */}
                <button
                  onClick={verifyReceipt}
                  disabled={verifying}
                  className="w-full px-3 py-2 rounded text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {verifying ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {isAr ? "جاري التحقق من التاريخ والمبلغ..." : "Verifying date and amount..."}
                    </>
                  ) : (
                    <>
                      {isAr ? "🔍 تحقق من التاريخ والمبلغ" : "🔍 Verify Date & Amount"}
                    </>
                  )}
                </button>

                {/* Verification Result */}
                {verificationResult && (
                  <div className={`p-3 rounded-md border-l-4 ${
                    verificationResult.dateMatches && verificationResult.amountMatches
                      ? "border-l-emerald-500 bg-emerald-500/10 text-emerald-200"
                      : "border-l-amber-500 bg-amber-500/10 text-amber-200"
                  }`}>
                    <div className="flex items-start gap-2 mb-2">
                      {verificationResult.dateMatches && verificationResult.amountMatches ? (
                        <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      )}
                      <p className="text-xs leading-relaxed">{verificationResult.message}</p>
                    </div>
                    {verificationResult.extractedDate && (
                      <p className="text-xs text-white/60 ms-6">
                        {isAr ? "التاريخ المستخرج" : "Extracted Date"}: {verificationResult.extractedDate}
                      </p>
                    )}
                    {verificationResult.extractedAmount && (
                      <p className="text-xs text-white/60 ms-6">
                        {isAr ? "المبلغ المستخرج" : "Extracted Amount"}: {verificationResult.extractedAmount}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
                <p className="text-sm text-amber-300">
                  {isAr ? "لم يتم رفع إيصال بعد" : "No receipt uploaded yet"}
                </p>
              </div>
            )}
          </div>

          {/* Client Notes */}
          <div>
            <h3 className="text-sm font-semibold text-blue-300 mb-3">
              {isAr ? "ملاحظات العميل" : "Client Notes"}
            </h3>
            {loading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
              </div>
            ) : error ? (
              <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-red-200 text-xs">
                {error}
              </div>
            ) : clientNotes && clientNotes.length > 0 ? (
              <div className="space-y-3">
                {clientNotes.map((note) => (
                  <div key={note.id} className="p-3 rounded bg-blue-500/5 border border-blue-500/20">
                    <p className="text-xs text-blue-200 whitespace-pre-wrap break-words">
                      {isAr ? note.content_ar : note.content_en}
                    </p>
                    <p className="text-xs text-blue-300/50 mt-2">
                      {new Date(note.created_at).toLocaleDateString(
                        isAr ? "ar-EG" : "en-US",
                        { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
                      )}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-white/40">
                {isAr ? "لا توجد ملاحظات" : "No notes"}
              </p>
            )}
          </div>

          {/* Manual Payment Approval */}
          <div>
            <h3 className="text-sm font-semibold text-amber-300 mb-3">
              {isAr ? "إدارة الدفع" : "Payment Management"}
            </h3>
            <ManualPaymentApproval
              bookingId={bookingId}
              isAr={isAr}
              onApprovalChange={() => {
                // Reload data after approval
                loadClientNotes();
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
