'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Upload, CheckCircle, Clock } from 'lucide-react';

interface BookingCheckoutProps {
  slotId: string;
  slotDate: string;
  slotTime: string;
  workshopTitle: string;
  userId: string;
  isAr: boolean;
}

type Step = 'confirm' | 'receipt' | 'waiting' | 'success';

export default function BookingCheckout({
  slotId,
  slotDate,
  slotTime,
  workshopTitle,
  userId,
  isAr,
}: BookingCheckoutProps) {
  const router = useRouter();
  const locale = useLocale();
  const [step, setStep] = useState<Step>('confirm');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingData, setBookingData] = useState<any>(null);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId,
          userId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create booking');
      }

      const data = await res.json();
      setBookingData(data.booking);
      setPaymentData(data.payment);
      setStep('receipt');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleReceiptUpload = async () => {
    if (!selectedFile) {
      setError(isAr ? 'الرجاء اختيار ملف' : 'Please select a file');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('paymentId', paymentData.id);
      formData.append('userId', userId);

      const res = await fetch('/api/bookings/upload-receipt', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to upload receipt');
      }

      setPaymentData(await res.json());
      setStep('waiting');
      startCountdown();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const startCountdown = () => {
    const sessionTime = new Date(`${slotDate}T${slotTime}`).getTime();
    const updateCountdown = () => {
      const now = new Date().getTime();
      const remaining = sessionTime - now;

      if (remaining <= 0) {
        setTimeLeft('0s');
        return;
      }

      const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
      const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white mb-2">
            {isAr ? '✓ تأكيد الحجز' : '✓ Confirm Booking'}
          </h1>
          <p className="text-white/50">
            {isAr ? 'أكمل هذه الخطوات لتأكيد حجزك' : 'Complete these steps to confirm your booking'}
          </p>
        </div>

        {/* Booking Details */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-amber-300 mb-4">
            {isAr ? 'تفاصيل الحجز' : 'Booking Details'}
          </h2>
          <div className="space-y-2 text-white/70">
            <p><span className="font-semibold">{isAr ? 'الورشة:' : 'Workshop:'}</span> {workshopTitle}</p>
            <p><span className="font-semibold">{isAr ? 'التاريخ:' : 'Date:'}</span> {slotDate}</p>
            <p><span className="font-semibold">{isAr ? 'الوقت:' : 'Time:'}</span> {slotTime}</p>
          </div>
        </div>

        {/* Step 1: Confirm */}
        {step === 'confirm' && (
          <div className="space-y-4">
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-emerald-400 mb-3">
                {isAr ? 'الخطوة 1: التأكيد' : 'Step 1: Confirmation'}
              </h3>
              <p className="text-white/70 mb-6">
                {isAr
                  ? 'اضغط زر التأكيد للمتابعة إلى رفع إثبات الدفع'
                  : 'Click confirm to proceed to payment proof upload'}
              </p>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="w-full px-4 py-3 bg-emerald-500 text-white font-semibold rounded-lg hover:bg-emerald-600 disabled:opacity-50"
              >
                {loading ? '...' : (isAr ? 'تأكيد' : 'Confirm')}
              </button>
            </div>
            {error && <div className="text-red-400 text-sm">{error}</div>}
          </div>
        )}

        {/* Step 2: Receipt Upload */}
        {step === 'receipt' && (
          <div className="space-y-4">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-400 mb-3">
                {isAr ? 'الخطوة 2: رفع إثبات الدفع' : 'Step 2: Upload Payment Proof'}
              </h3>
              <p className="text-white/70 mb-4">
                {isAr
                  ? 'يرجى رفع صورة من إثبات دفعك (الفاتورة أو الإيصال)'
                  : 'Please upload a screenshot of your payment proof (receipt or invoice)'}
              </p>

              <label className="block mb-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="hidden"
                  disabled={loading}
                />
                <div className="border-2 border-dashed border-blue-400/50 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition">
                  <Upload className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                  <p className="text-white/70">
                    {selectedFile
                      ? selectedFile.name
                      : (isAr ? 'اضغط لاختيار صورة' : 'Click to select image')}
                  </p>
                  <p className="text-white/40 text-sm mt-1">
                    {isAr ? '(JPG, PNG، حد أقصى 5MB)' : '(JPG, PNG, max 5MB)'}
                  </p>
                </div>
              </label>

              <button
                onClick={handleReceiptUpload}
                disabled={loading || !selectedFile}
                className="w-full px-4 py-3 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? '...' : (isAr ? 'رفع الملف' : 'Upload File')}
              </button>
            </div>
            {error && <div className="text-red-400 text-sm">{error}</div>}
          </div>
        )}

        {/* Step 3: Waiting for Admin Approval */}
        {step === 'waiting' && (
          <div className="space-y-4">
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-6 text-center">
              <Clock className="w-12 h-12 text-amber-400 mx-auto mb-4 animate-spin" />
              <h3 className="text-lg font-semibold text-amber-400 mb-2">
                {isAr ? 'جاري المراجعة' : 'Under Review'}
              </h3>
              <p className="text-white/70 mb-4">
                {isAr
                  ? 'جاري مراجعة إثبات الدفع من قبل الإدارة. سيتم إرسال رابط Google Meet عند الموافقة.'
                  : 'Your payment proof is being reviewed by our admin. You\'ll receive the Google Meet link once approved.'}
              </p>
              <p className="text-white/50 text-sm">
                {isAr ? 'حالة الدفع:' : 'Payment Status:'} <span className="text-amber-400">{paymentData?.status}</span>
              </p>
            </div>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 'success' && (
          <div className="space-y-4">
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-6 text-center">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-emerald-400 mb-2">
                {isAr ? '✓ تم تأكيد الحجز' : '✓ Booking Confirmed'}
              </h3>
              <p className="text-white/70 mb-4">
                {isAr
                  ? 'تم قبول دفعتك بنجاح. ستجد رابط Google Meet أدناه.'
                  : 'Your payment has been approved. Your Google Meet link is below.'}
              </p>

              {bookingData?.google_meet_link && (
                <div className="bg-white/5 rounded p-4 mb-6 text-left">
                  <p className="text-white/50 text-sm mb-2">
                    {isAr ? 'رابط الاجتماع:' : 'Meeting Link:'}
                  </p>
                  <a
                    href={bookingData.google_meet_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 break-all"
                  >
                    {bookingData.google_meet_link}
                  </a>
                </div>
              )}

              {timeLeft && (
                <div className="text-center mb-6">
                  <p className="text-white/50 text-sm mb-1">
                    {isAr ? 'الوقت المتبقي للجلسة:' : 'Time until session:'}
                  </p>
                  <p className="text-2xl font-bold text-amber-400">{timeLeft}</p>
                </div>
              )}

              <button
                onClick={() => router.push(`/${locale}/dashboard`)}
                className="w-full px-4 py-3 bg-emerald-500 text-white font-semibold rounded-lg hover:bg-emerald-600"
              >
                {isAr ? 'العودة إلى اللوحة الرئيسية' : 'Back to Dashboard'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
