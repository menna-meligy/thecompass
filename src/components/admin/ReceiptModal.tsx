"use client";

import { useState, useEffect } from "react";
import { X, Loader2, CheckCircle2, AlertCircle, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaymentData {
  id?: string;
  amount?: number;
  currency?: string;
  method?: string;
  status?: string;
  proof_url?: string;
  gateway_txn_id?: string;
  created_at?: string;
}

interface ReceiptModalProps {
  bookingId: string;
  isOpen: boolean;
  onClose: () => void;
  isAr: boolean;
  payment?: PaymentData;
  userEmail?: string;
  onApprovalChange?: () => void;
}

export default function ReceiptModal({
  bookingId,
  isOpen,
  onClose,
  isAr,
  payment,
  userEmail,
  onApprovalChange,
}: ReceiptModalProps) {
  const [zoom, setZoom] = useState(1);
  const [isApproving, setIsApproving] = useState(false);
  const [approvingType, setApprovingType] = useState<"approve" | "reject" | null>(
    null
  );
  const [notesAr, setNotesAr] = useState("");
  const [notesEn, setNotesEn] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setNotesAr("");
      setNotesEn("");
    }
  }, [isOpen]);

  const handleApprove = async () => {
    setIsApproving(true);
    setError(null);
    setApprovingType("approve");

    try {
      const res = await fetch("/api/admin/payment-approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: bookingId,
          approved: true,
          notes_ar: notesAr || null,
          notes_en: notesEn || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to approve payment");
      }

      setSuccess(true);
      onApprovalChange?.();
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsApproving(false);
      setApprovingType(null);
    }
  };

  const handleReject = async () => {
    setIsApproving(true);
    setError(null);
    setApprovingType("reject");

    try {
      const res = await fetch("/api/admin/payment-approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: bookingId,
          approved: false,
          notes_ar: notesAr || null,
          notes_en: notesEn || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to reject payment");
      }

      setSuccess(true);
      onApprovalChange?.();
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsApproving(false);
      setApprovingType(null);
    }
  };

  if (!isOpen || !payment) return null;

  const isAlreadyApproved = payment.status === "paid";
  const receiptStatus =
    payment.status === "pending_verification"
      ? "pending"
      : payment.status === "paid"
        ? "approved"
        : payment.status === "failed"
          ? "rejected"
          : "pending";

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f172a] rounded-2xl border border-white/10 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 sticky top-0 bg-[#0f172a] z-10">
          <div>
            <h2 className="text-lg font-bold text-white">
              {isAr ? "مراجعة الإيصال" : "Review Receipt"}
            </h2>
            <p className="text-xs text-white/40 mt-1">
              {isAr ? "معرّف الحجز" : "Booking ID"}: {bookingId}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isApproving}
            className="text-white/50 hover:text-white transition-colors disabled:opacity-40"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Payment Info Summary */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <p className="text-xs text-white/50 mb-1">
                {isAr ? "المبلغ" : "Amount"}
              </p>
              <p className="text-lg font-bold text-white">
                {payment.amount} {payment.currency || "EGP"}
              </p>
            </div>
            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <p className="text-xs text-white/50 mb-1">
                {isAr ? "طريقة الدفع" : "Payment Method"}
              </p>
              <p className="text-sm font-semibold text-white capitalize">
                {payment.method || "-"}
              </p>
            </div>
            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <p className="text-xs text-white/50 mb-1">
                {isAr ? "الحالة" : "Status"}
              </p>
              <div className="flex items-center gap-1">
                <div
                  className={cn("h-2 w-2 rounded-full", {
                    "bg-amber-400": receiptStatus === "pending",
                    "bg-emerald-400": receiptStatus === "approved",
                    "bg-red-400": receiptStatus === "rejected",
                  })}
                />
                <span className="text-sm font-semibold text-white capitalize">
                  {receiptStatus}
                </span>
              </div>
            </div>
            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <p className="text-xs text-white/50 mb-1">
                {isAr ? "التاريخ" : "Date"}
              </p>
              <p className="text-sm font-semibold text-white">
                {payment.created_at
                  ? new Date(payment.created_at).toLocaleDateString(
                      isAr ? "ar-EG" : "en-US",
                      { month: "short", day: "numeric", year: "numeric" }
                    )
                  : "-"}
              </p>
            </div>
          </div>

          {/* Receipt Image */}
          {payment.proof_url && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">
                  {isAr ? "صورة الإيصال" : "Receipt Image"}
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                    title={isAr ? "تصغير" : "Zoom out"}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </button>
                  <span className="text-xs text-white/50 w-12 text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    onClick={() => setZoom(Math.min(2, zoom + 0.1))}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                    title={isAr ? "تكبير" : "Zoom in"}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="border border-white/10 rounded-lg overflow-auto bg-black/20 max-h-96 flex items-center justify-center">
                <img
                  src={payment.proof_url}
                  alt="Receipt"
                  className="max-w-full h-auto"
                  style={{ transform: `scale(${zoom})` }}
                />
              </div>

              <a
                href={payment.proof_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex text-xs text-blue-400 hover:text-blue-300 underline"
              >
                {isAr ? "فتح في نافذة جديدة" : "Open in new window"}
              </a>
            </div>
          )}

          {/* Verification Details */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white">
              {isAr ? "تفاصيل التحقق" : "Verification Details"}
            </h3>

            {payment.gateway_txn_id && (
              <div className="bg-blue-500/5 rounded-lg p-3 border border-blue-500/20 space-y-2">
                <div>
                  <p className="text-xs text-blue-300 mb-1">
                    {isAr ? "رقم المرجع" : "Reference Number"}
                  </p>
                  <p className="text-sm text-white font-mono break-all">
                    {payment.gateway_txn_id}
                  </p>
                </div>
              </div>
            )}

            {isAlreadyApproved && (
              <div className="bg-emerald-500/5 rounded-lg p-3 border border-emerald-500/20 space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-emerald-300 font-semibold">
                      {isAr
                        ? "تمت الموافقة على هذا الإيصال"
                        : "This receipt has been approved"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Admin Notes */}
          {!isAlreadyApproved && (
            <div className="space-y-3 pt-4 border-t border-white/5">
              <h3 className="text-sm font-semibold text-white">
                {isAr ? "ملاحظات المراجعة" : "Review Notes"}
              </h3>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-200">{error}</p>
                </div>
              )}

              {success && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-emerald-200">
                    {approvingType === "approve"
                      ? isAr
                        ? "تمت الموافقة بنجاح"
                        : "Approved successfully"
                      : isAr
                        ? "تم الرفض"
                        : "Rejected"}
                  </p>
                </div>
              )}

              {!success && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-white/50 block mb-2">
                      {isAr
                        ? "ملاحظاتك (عربي)"
                        : "Your notes (Arabic)"}
                    </label>
                    <textarea
                      value={notesAr}
                      onChange={(e) => setNotesAr(e.target.value)}
                      placeholder={isAr ? "أضف ملاحظاتك هنا..." : "Add your notes here..."}
                      className="w-full px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-amber-500/30"
                      rows={2}
                      disabled={isApproving}
                    />
                  </div>

                  <div>
                    <label className="text-xs text-white/50 block mb-2">
                      {isAr
                        ? "ملاحظاتك (إنجليزي)"
                        : "Your notes (English)"}
                    </label>
                    <textarea
                      value={notesEn}
                      onChange={(e) => setNotesEn(e.target.value)}
                      placeholder={isAr ? "Add your notes here..." : "Add your notes here..."}
                      className="w-full px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-amber-500/30"
                      rows={2}
                      disabled={isApproving}
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleApprove}
                      disabled={isApproving}
                      className="flex-1 px-3 py-2.5 rounded-lg text-sm font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
                    >
                      {isApproving && approvingType === "approve" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      {isAr ? "وافق على الإيصال" : "Approve Receipt"}
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={isApproving}
                      className="flex-1 px-3 py-2.5 rounded-lg text-sm font-semibold bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
                    >
                      {isApproving && approvingType === "reject" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                      {isAr ? "رفض" : "Reject"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Already Approved - Show Notes */}
          {isAlreadyApproved && (
            <div className="space-y-3 pt-4 border-t border-white/5">
              <h3 className="text-sm font-semibold text-white">
                {isAr ? "ملاحظات الموافقة" : "Approval Notes"}
              </h3>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
