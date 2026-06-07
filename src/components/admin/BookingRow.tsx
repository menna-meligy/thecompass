"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { CheckCircle, XCircle, Eye } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import type { Booking } from "@/types/index";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

interface BookingRowProps {
  booking: Booking;
  onApprove: (bookingId: string) => Promise<void>;
  onReject: (bookingId: string) => Promise<void>;
  onMarkComplete: (bookingId: string) => Promise<void>;
}

export function BookingRow({ booking, onApprove, onReject, onMarkComplete }: BookingRowProps) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const [loading, setLoading] = useState<string | null>(null);

  const statusVariant: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
    pending: "warning",
    confirmed: "success",
    cancelled: "danger",
    completed: "info",
  };

  const paymentVariant: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
    pending: "warning",
    paid: "success",
    failed: "danger",
    pending_verification: "info",
    refunded: "default",
  };

  async function handleAction(action: () => Promise<void>, key: string) {
    setLoading(key);
    await action();
    setLoading(null);
  }

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="py-3 px-4 text-sm text-gray-900">
        {booking.user?.full_name || booking.user?.email || booking.user_id.slice(0, 8)}
      </td>
      <td className="py-3 px-4 text-sm text-gray-600">
        {booking.session?.workshop?.title_ar || booking.session_id.slice(0, 8)}
      </td>
      <td className="py-3 px-4">
        <Badge variant={statusVariant[booking.status] || "default"}>
          {booking.status}
        </Badge>
      </td>
      <td className="py-3 px-4">
        {booking.payment && (
          <div>
            <Badge variant={paymentVariant[booking.payment.status] || "default"}>
              {booking.payment.status}
            </Badge>
            <div className="text-xs text-gray-500 mt-1">
              {formatCurrency(booking.payment.amount, locale)}
            </div>
          </div>
        )}
      </td>
      <td className="py-3 px-4 text-sm text-gray-500">
        {formatDate(booking.created_at, locale)}
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          {booking.payment?.proof_url && (
            <a
              href={booking.payment.proof_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700"
            >
              <Eye className="h-4 w-4" />
            </a>
          )}
          {booking.payment?.status === "pending_verification" && (
            <>
              <Button
                size="sm"
                variant="primary"
                loading={loading === "approve"}
                onClick={() => handleAction(() => onApprove(booking.id), "approve")}
              >
                <CheckCircle className="h-3 w-3 me-1" />
                {t("approvePayment")}
              </Button>
              <Button
                size="sm"
                variant="danger"
                loading={loading === "reject"}
                onClick={() => handleAction(() => onReject(booking.id), "reject")}
              >
                <XCircle className="h-3 w-3 me-1" />
                {t("rejectPayment")}
              </Button>
            </>
          )}
          {booking.status === "confirmed" && (
            <Button
              size="sm"
              variant="outline"
              loading={loading === "complete"}
              onClick={() => handleAction(() => onMarkComplete(booking.id), "complete")}
            >
              {t("markComplete")}
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

export default BookingRow;
