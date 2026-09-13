'use client';

import { useState, useEffect } from 'react';
import { Check, X, Eye } from 'lucide-react';

interface Payment {
  id: string;
  booking_id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: string;
  receipt_image_url?: string;
  created_at: string;
  admin_notes_en?: string;
  admin_notes_ar?: string;
  booking?: {
    id: string;
    user_id: string;
    slot_id: string;
    scheduled_at: string;
  };
  user?: {
    full_name: string;
    email: string;
  };
}

interface PaymentApprovalPanelProps {
  isAr: boolean;
  adminId: string;
}

export default function PaymentApprovalPanel({
  isAr,
  adminId,
}: PaymentApprovalPanelProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [notesAr, setNotesAr] = useState('');
  const [notesEn, setNotesEn] = useState('');
  const [approving, setApproving] = useState(false);
  const [imageModal, setImageModal] = useState<string | null>(null);

  useEffect(() => {
    loadPendingPayments();
  }, []);

  const loadPendingPayments = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/payments/pending');
      if (res.ok) {
        const data = await res.json();
        setPayments(data);
      }
    } catch (err) {
      console.error('Failed to load payments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (approved: boolean) => {
    if (!selectedPayment) return;

    setApproving(true);
    try {
      const res = await fetch('/api/admin/bookings/approve-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: selectedPayment.id,
          approved,
          notesAr: notesAr || null,
          notesEn: notesEn || null,
          adminId,
        }),
      });

      if (res.ok) {
        await loadPendingPayments();
        setSelectedPayment(null);
        setNotesAr('');
        setNotesEn('');
      }
    } catch (err) {
      console.error('Approval error:', err);
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return <div className="text-white/50">{isAr ? 'جاري التحميل...' : 'Loading...'}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">
          {isAr ? '💳 المدفوعات المعلقة' : '💳 Pending Payments'}
        </h2>

        {payments.length === 0 ? (
          <p className="text-white/40">{isAr ? 'لا توجد مدفوعات معلقة' : 'No pending payments'}</p>
        ) : (
          <div className="grid gap-3 max-h-96 overflow-y-auto">
            {payments
              .filter((p) => p.status === 'pending_verification')
              .map((payment) => (
                <button
                  key={payment.id}
                  onClick={() => {
                    setSelectedPayment(payment);
                    setNotesAr('');
                    setNotesEn('');
                  }}
                  className={`p-4 rounded-lg border text-left transition ${
                    selectedPayment?.id === payment.id
                      ? 'bg-amber-500/20 border-amber-500/50'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-white">{payment.user?.full_name}</p>
                      <p className="text-white/50 text-sm">{payment.user?.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-amber-400">
                        {payment.amount} {payment.currency}
                      </p>
                      <p className="text-white/50 text-xs">{payment.created_at.split('T')[0]}</p>
                    </div>
                  </div>
                  {payment.receipt_image_url && (
                    <p className="text-blue-400 text-xs">
                      {isAr ? '📷 صورة مرفقة' : '📷 Receipt attached'}
                    </p>
                  )}
                </button>
              ))}
          </div>
        )}
      </div>

      {/* Review Panel */}
      {selectedPayment && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-bold text-amber-300">
            {isAr ? 'مراجعة الدفع' : 'Payment Review'}
          </h3>

          {/* Receipt Image Preview */}
          {selectedPayment.receipt_image_url && (
            <div>
              <p className="text-white/50 text-sm mb-2">
                {isAr ? 'إثبات الدفع:' : 'Receipt:'}
              </p>
              <button
                onClick={() => setImageModal(selectedPayment.receipt_image_url || null)}
                className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm"
              >
                <Eye className="w-4 h-4" />
                {isAr ? 'عرض الصورة' : 'View Image'}
              </button>
            </div>
          )}

          {/* Image Modal */}
          {imageModal && (
            <div
              className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
              onClick={() => setImageModal(null)}
            >
              <img
                src={imageModal}
                alt="Receipt"
                className="max-w-2xl max-h-96 rounded-lg"
              />
            </div>
          )}

          {/* Notes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-white/50 text-xs block mb-1">
                {isAr ? 'ملاحظات عربي' : 'Notes (Arabic)'}
              </label>
              <textarea
                value={notesAr}
                onChange={(e) => setNotesAr(e.target.value)}
                placeholder={isAr ? 'أضف ملاحظات...' : 'Add notes...'}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm resize-none"
                rows={3}
              />
            </div>
            <div>
              <label className="text-white/50 text-xs block mb-1">
                {isAr ? 'ملاحظات إنجليزي' : 'Notes (English)'}
              </label>
              <textarea
                value={notesEn}
                onChange={(e) => setNotesEn(e.target.value)}
                placeholder={isAr ? 'أضف ملاحظات...' : 'Add notes...'}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm resize-none"
                rows={3}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => handleApprove(true)}
              disabled={approving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded font-semibold hover:bg-emerald-500/30 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {approving ? '...' : (isAr ? 'الموافقة' : 'Approve')}
            </button>
            <button
              onClick={() => handleApprove(false)}
              disabled={approving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500/20 text-red-400 border border-red-500/30 rounded font-semibold hover:bg-red-500/30 disabled:opacity-50"
            >
              <X className="w-4 h-4" />
              {approving ? '...' : (isAr ? 'رفض' : 'Reject')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
