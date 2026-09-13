"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { Check, X, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface PendingReceipt {
  id: string;
  user_id: string;
  slot_date: string;
  slot_time: string;
  workshop_title: string;
  price: number;
  receipt_url: string;
  status: "pending" | "approved" | "rejected";
  uploaded_at: string;
  approved_at: string | null;
}

interface ReceiptWithUser extends PendingReceipt {
  user_email?: string;
  user_name?: string;
}

export default function AdminReceiptsPage() {
  const router = useRouter();
  const locale = useLocale();
  const isAr = locale === "ar";
  const supabase = createClient();

  const [receipts, setReceipts] = useState<PendingReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);

  useEffect(() => {
    async function loadReceipts() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push(`/${locale}/auth`);
        return;
      }

      const res = await fetch("/api/admin/receipts/pending");
      if (res.ok) {
        const data = await res.json();
        setReceipts(data);
      }
      setLoading(false);
    }

    loadReceipts();
  }, [router, locale, supabase.auth]);

  const handleApprove = async (receiptId: string, approved: boolean) => {
    setApproving(receiptId);
    try {
      const res = await fetch(`/api/admin/receipts/${receiptId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved }),
      });

      if (res.ok) {
        setReceipts((prev) =>
          prev.map((r) =>
            r.id === receiptId
              ? {
                  ...r,
                  status: approved ? "approved" : "rejected",
                  approved_at: new Date().toISOString(),
                }
              : r
          )
        );
      }
    } catch (error) {
      console.error("Failed to update receipt:", error);
    } finally {
      setApproving(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] p-4 md:p-6 flex items-center justify-center">
        <div className="text-white/70">
          {isAr ? "جاري التحميل..." : "Loading..."}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-black text-white mb-2">
          {isAr ? "الإيصالات المعلقة" : "Pending Receipts"}
        </h1>
        <p className="text-white/50 mb-8">
          {isAr
            ? `${receipts.length} إيصال بانتظار المراجعة`
            : `${receipts.length} receipts pending review`}
        </p>

        {receipts.length === 0 ? (
          <div className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.12)] rounded-2xl p-8 text-center">
            <p className="text-white/70">
              {isAr ? "لا توجد إيصالات معلقة" : "No pending receipts"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {receipts.map((receipt) => (
              <div
                key={receipt.id}
                className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.12)] rounded-2xl p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-1">
                      {receipt.workshop_title}
                    </h3>
                    <p className="text-white/50 text-sm mb-1">
                      {isAr ? "التاريخ: " : "Date: "}
                      {receipt.slot_date} @ {receipt.slot_time}
                    </p>
                    <p className="text-white/50 text-sm mb-2">
                      {isAr ? "معرف المستخدم: " : "User ID: "}
                      <span className="text-white/40 text-xs break-all">{receipt.user_id}</span>
                    </p>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ml-4 ${
                      receipt.status === "pending"
                        ? "bg-amber-500/20 text-amber-400"
                        : receipt.status === "approved"
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {receipt.status === "pending"
                      ? isAr
                        ? "معلق"
                        : "Pending"
                      : receipt.status === "approved"
                        ? isAr
                          ? "موافق"
                          : "Approved"
                        : isAr
                          ? "مرفوض"
                          : "Rejected"}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-white/70 text-sm mb-2">
                      {isAr ? "السعر المرفوع" : "Upload Price"}
                    </p>
                    <p className="text-white font-bold text-lg">
                      {receipt.price} {isAr ? "ج.م" : "EGP"}
                    </p>
                  </div>
                  <div>
                    <p className="text-white/70 text-sm mb-2">
                      {isAr ? "وقت الرفع" : "Upload Time"}
                    </p>
                    <p className="text-white text-sm">
                      {new Date(receipt.uploaded_at).toLocaleString(
                        isAr ? "ar-EG" : "en-GB"
                      )}
                    </p>
                  </div>
                </div>

                {/* Receipt File Link */}
                <div className="mb-4 p-3 bg-white/5 border border-white/10 rounded-lg">
                  <p className="text-white/70 text-xs mb-2">
                    {isAr ? "الملف المرفوع" : "Receipt File"}
                  </p>
                  <a
                    href={`/api/download-receipt?path=${encodeURIComponent(receipt.receipt_url)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#F59E0B] hover:text-[#f5b342] text-sm break-all"
                  >
                    {receipt.receipt_url}
                  </a>
                </div>

                {receipt.status === "pending" && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApprove(receipt.id, true)}
                      disabled={approving === receipt.id}
                      className="flex-1 py-2 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition disabled:opacity-50"
                    >
                      <Check className="w-4 h-4 inline mr-2" />
                      {isAr ? "وافق" : "Approve"}
                    </button>
                    <button
                      onClick={() => handleApprove(receipt.id, false)}
                      disabled={approving === receipt.id}
                      className="flex-1 py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition disabled:opacity-50"
                    >
                      <X className="w-4 h-4 inline mr-2" />
                      {isAr ? "رفض" : "Reject"}
                    </button>
                  </div>
                )}

                {receipt.status !== "pending" && receipt.approved_at && (
                  <div className={`p-3 rounded-lg text-sm ${
                    receipt.status === "approved"
                      ? "bg-green-500/10 border border-green-500/30"
                      : "bg-red-500/10 border border-red-500/30"
                  }`}>
                    <Clock className="w-4 h-4 inline mr-2" />
                    <span className={receipt.status === "approved" ? "text-green-300" : "text-red-300"}>
                      {receipt.status === "approved"
                        ? isAr ? "تم الموافقة في " : "Approved on "
                        : isAr ? "تم الرفض في " : "Rejected on "}
                      {new Date(receipt.approved_at).toLocaleString(
                        isAr ? "ar-EG" : "en-GB"
                      )}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
