"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import BookingRow from "@/components/admin/BookingRow";
import type { Booking } from "@/types/index";

export default function AdminBookingsPage() {
  const t = useTranslations("admin");
  const locale = useLocale();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadBookings() {
    const supabase = createClient();
    const { data } = await supabase
      .from("bookings")
      .select(
        "*, user:profiles(*), session:sessions(*, workshop:workshops(*)), payment:payments(*)"
      )
      .order("created_at", { ascending: false });
    setBookings((data as unknown as Booking[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    loadBookings();
  }, []);

  async function handleApprove(bookingId: string) {
    const supabase = createClient();
    await supabase
      .from("payments")
      .update({ status: "paid" })
      .eq("booking_id", bookingId);
    await supabase
      .from("bookings")
      .update({ status: "confirmed" })
      .eq("id", bookingId);

    // Send email
    await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "payment_approved", booking_id: bookingId }),
    });

    await loadBookings();
  }

  async function handleReject(bookingId: string) {
    const supabase = createClient();
    await supabase
      .from("payments")
      .update({ status: "failed" })
      .eq("booking_id", bookingId);
    await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingId);
    await loadBookings();
  }

  async function handleMarkComplete(bookingId: string) {
    const res = await fetch("/api/admin/mark-complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_id: bookingId }),
    });
    if (res.ok) await loadBookings();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="flex items-center gap-3 text-white/40">
          <div className="w-5 h-5 border-2 border-[#F59E0B] border-t-transparent rounded-full animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-white">{t("bookings")}</h1>
        <div className="mt-2 h-px w-12 bg-[#F59E0B]" />
      </div>

      <div className="bg-[rgba(30,41,59,0.6)] border border-[rgba(245,158,11,0.12)] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="bg-[#0d1526]">
                <th className="text-start py-4 px-4 text-[#F59E0B] text-xs font-bold uppercase tracking-wider">
                  {t("user")}
                </th>
                <th className="text-start py-4 px-4 text-[#F59E0B] text-xs font-bold uppercase tracking-wider">
                  {t("session")}
                </th>
                <th className="text-start py-4 px-4 text-[#F59E0B] text-xs font-bold uppercase tracking-wider">
                  {t("status")}
                </th>
                <th className="text-start py-4 px-4 text-[#F59E0B] text-xs font-bold uppercase tracking-wider">
                  {t("payment")}
                </th>
                <th className="text-start py-4 px-4 text-[#F59E0B] text-xs font-bold uppercase tracking-wider">
                  {locale === "ar" ? "التاريخ" : "Date"}
                </th>
                <th className="text-start py-4 px-4 text-[#F59E0B] text-xs font-bold uppercase tracking-wider">
                  {t("actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-white/30">
                    {t("noData")}
                  </td>
                </tr>
              ) : (
                bookings.map((booking) => (
                  <BookingRow
                    key={booking.id}
                    booking={booking}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onMarkComplete={handleMarkComplete}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
