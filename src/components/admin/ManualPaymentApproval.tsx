"use client";

import { useState } from "react";
import { CheckCircle2, AlertCircle, Loader2, X } from "lucide-react";

interface ManualPaymentApprovalProps {
  bookingId: string;
  isAr: boolean;
  onApprovalChange?: (approved: boolean) => void;
  defaultApproved?: boolean;
}

export default function ManualPaymentApproval({
  bookingId,
  isAr,
  onApprovalChange,
  defaultApproved = false,
}: ManualPaymentApprovalProps) {
  const [isApproving, setIsApproving] = useState(defaultApproved);
  const [isLoading, setIsLoading] = useState(false);
  const [notesAr, setNotesAr] = useState("");
  const [notesEn, setNotesEn] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleApprove = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

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

      setIsApproving(true);
      setSuccess(true);
      onApprovalChange?.(true);

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

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

      setIsApproving(false);
      onApprovalChange?.(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-xs font-semibold text-amber-300">
          {isAr ? "الموافقة اليدوية على الدفع" : "Manual Payment Approval"}
        </h4>
        {isApproving && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-300">
            <CheckCircle2 className="h-3 w-3" />
            {isAr ? "موافق عليه" : "Approved"}
          </span>
        )}
      </div>

      {error && (
        <div className="mb-2 flex items-start gap-2 p-2 rounded bg-red-500/10 border border-red-500/20">
          <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-200">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-2 p-2 rounded bg-emerald-500/10 border border-emerald-500/20">
          <p className="text-xs text-emerald-200">
            {isAr ? "تمت الموافقة بنجاح" : "Approved successfully"}
          </p>
        </div>
      )}

      {!isApproving && (
        <div className="space-y-2">
          <div>
            <label className="text-xs text-white/50 block mb-1">
              {isAr ? "ملاحظاتك (عربي)" : "Your notes (Arabic)"}
            </label>
            <textarea
              value={notesAr}
              onChange={(e) => setNotesAr(e.target.value)}
              placeholder={isAr ? "أضف ملاحظاتك هنا..." : "Add your notes here..."}
              className="w-full px-2 py-1.5 text-xs rounded bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-amber-500/30"
              rows={2}
            />
          </div>

          <div>
            <label className="text-xs text-white/50 block mb-1">
              {isAr ? "ملاحظاتك (إنجليزي)" : "Your notes (English)"}
            </label>
            <textarea
              value={notesEn}
              onChange={(e) => setNotesEn(e.target.value)}
              placeholder={isAr ? "Add your notes here..." : "Add your notes here..."}
              className="w-full px-2 py-1.5 text-xs rounded bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-amber-500/30"
              rows={2}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleApprove}
              disabled={isLoading}
              className="flex-1 px-2 py-1.5 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3 w-3" />
              )}
              {isAr ? "وافق" : "Approve"}
            </button>
            <button
              onClick={handleReject}
              disabled={isLoading}
              className="flex-1 px-2 py-1.5 rounded text-xs font-semibold bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <X className="h-3 w-3" />
              )}
              {isAr ? "رفض" : "Reject"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
