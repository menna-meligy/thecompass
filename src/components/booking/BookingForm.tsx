"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Session, TimeSlot, PaymentMethod } from "@/types/index";
import TimeSlotPicker from "@/components/workshops/TimeSlotPicker";
import PaymentSelector from "@/components/booking/PaymentSelector";
import ProofUpload from "@/components/booking/ProofUpload";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { formatCurrency } from "@/lib/utils";

interface BookingFormProps {
  session: Session;
  slots: TimeSlot[];
  userId: string;
}

export function BookingForm({ session, slots, userId }: BookingFormProps) {
  const t = useTranslations("booking");
  const locale = useLocale();
  const router = useRouter();

  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [discountCode, setDiscountCode] = useState("");
  const [discount, setDiscount] = useState<{ type: string; value: number } | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finalPrice = discount
    ? discount.type === "percent"
      ? session.price * (1 - discount.value / 100)
      : Math.max(0, session.price - discount.value)
    : session.price;

  async function applyDiscount() {
    if (!discountCode.trim()) return;
    setDiscountError(null);

    const res = await fetch("/api/payments/verify-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: discountCode }),
    });

    const data = await res.json();
    if (data.error) {
      setDiscountError(t("invalidCode"));
    } else {
      setDiscount({ type: data.type, value: data.value });
    }
  }

  async function handleBooking() {
    if (!paymentMethod) return;
    setLoading(true);
    setError(null);

    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: session.id,
        time_slot_id: selectedSlot,
        payment_method: paymentMethod,
        amount: finalPrice,
        discount_code: discountCode || null,
      }),
    });

    const data = await res.json();

    if (data.error) {
      setError(data.error);
      setLoading(false);
      return;
    }

    if (paymentMethod === "paymob" && data.payment_url) {
      window.location.href = data.payment_url;
      return;
    }

    // Manual payment - need proof upload
    setBookingId(data.booking_id);
    setLoading(false);
  }

  async function submitProof() {
    if (!bookingId || !proofUrl) return;
    setLoading(true);

    const supabase = createClient();
    await supabase
      .from("payments")
      .update({ proof_url: proofUrl, status: "pending_verification" })
      .eq("booking_id", bookingId);

    router.push(`/${locale}/book/confirmation?booking=${bookingId}`);
  }

  // Show proof upload step if booking created and manual payment
  if (bookingId && paymentMethod !== "paymob") {
    return (
      <div className="space-y-6">
        <div className="p-4 bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.20)] rounded-xl text-green-400 text-sm">
          {locale === "ar"
            ? "تم إنشاء الحجز! يرجى رفع إيصال الدفع لإكمال العملية"
            : "Booking created! Please upload payment proof to complete"}
        </div>
        <ProofUpload
          bookingId={bookingId}
          onUpload={setProofUrl}
          expectedAmount={finalPrice}
        />
        {proofUrl && (
          <Button onClick={submitProof} loading={loading} className="w-full" size="lg">
            {t("confirm")}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time slot picker (for group sessions) */}
      {slots.length > 0 && (
        <div className="bg-[rgba(30,41,59,0.6)] border border-[rgba(245,158,11,0.12)] rounded-2xl p-4">
          <p className="text-white font-bold text-sm mb-3">
            {locale === "ar" ? "اختر الموعد" : "Select a Time Slot"}
          </p>
          <TimeSlotPicker
            slots={slots}
            selectedSlot={selectedSlot}
            onSelect={setSelectedSlot}
          />
        </div>
      )}

      {/* Payment method */}
      <div className="bg-[rgba(30,41,59,0.6)] border border-[rgba(245,158,11,0.12)] rounded-2xl p-4">
        <p className="text-white font-bold text-sm mb-3">
          {locale === "ar" ? "طريقة الدفع" : "Payment Method"}
        </p>
        <PaymentSelector selected={paymentMethod} onSelect={setPaymentMethod} />
      </div>

      {/* Discount code */}
      <div className="bg-[rgba(30,41,59,0.6)] border border-[rgba(245,158,11,0.12)] rounded-2xl p-4 space-y-2">
        <p className="text-white font-bold text-sm mb-1">
          {locale === "ar" ? "كود خصم" : "Discount Code"}
        </p>
        <div className="flex gap-2">
          <Input
            placeholder={t("discountCode")}
            value={discountCode}
            onChange={(e) => setDiscountCode(e.target.value)}
            className="flex-1"
          />
          <Button variant="outline" onClick={applyDiscount} type="button">
            {t("applyCode")}
          </Button>
        </div>
        {discountError && (
          <p className="text-xs text-red-400">{discountError}</p>
        )}
        {discount && (
          <p className="text-xs text-[#F59E0B]">✓ {t("discountApplied")}</p>
        )}
      </div>

      {/* Total */}
      <div className="bg-[rgba(30,41,59,0.6)] border border-[rgba(245,158,11,0.12)] rounded-2xl p-4 flex justify-between items-center">
        <span className="text-white/60 font-medium">{t("total")}</span>
        <span className="text-xl font-black text-[#F59E0B]">
          {formatCurrency(finalPrice, locale)}
        </span>
      </div>

      {error && (
        <div className="p-3 bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.20)] rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      <Button
        onClick={handleBooking}
        loading={loading}
        disabled={!paymentMethod}
        className="w-full"
        size="lg"
      >
        {t("confirm")}
      </Button>
    </div>
  );
}

export default BookingForm;
