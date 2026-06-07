import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatCurrency, getLocalizedField } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import type { Booking } from "@/types/index";

export default async function BookingsPage() {
  const t = await getTranslations("dashboard");
  const locale = await getLocale();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/${locale}/auth`);

  const { data: bookings } = await supabase
    .from("bookings")
    .select("*, session:sessions(*, workshop:workshops(*)), payment:payments(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const statusVariant: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
    pending: "warning",
    confirmed: "success",
    cancelled: "danger",
    completed: "info",
  };

  return (
    <div className="min-h-screen bg-[#0f172a] px-4 py-10">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-8">{t("bookings")}</h1>

        {!bookings || bookings.length === 0 ? (
          <div className="bg-[rgba(30,41,59,0.6)] border border-[rgba(245,158,11,0.12)] rounded-xl text-center py-16 px-6">
            <p className="mb-4 text-white/40">لا توجد حجوزات</p>
            <Link
              href={`/${locale}/workshops`}
              className="text-[#F59E0B] font-medium text-sm"
            >
              استكشف الورش →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {(bookings as unknown as Booking[]).map((booking) => (
              <div
                key={booking.id}
                className="bg-[rgba(30,41,59,0.6)] border border-[rgba(245,158,11,0.12)] rounded-xl p-5"
              >
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div>
                    <p className="font-semibold text-white">
                      {getLocalizedField(
                        (booking.session?.workshop as unknown as Record<string, unknown>) || {},
                        "title",
                        locale
                      )}
                    </p>
                    <p className="text-sm text-white/50 mt-1">
                      {formatDate(booking.created_at, locale)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={statusVariant[booking.status] || "default"}>
                      {booking.status}
                    </Badge>
                    {booking.payment && (
                      <div className="text-sm font-medium text-[#F59E0B]">
                        {formatCurrency(booking.payment.amount, locale)}
                      </div>
                    )}
                  </div>
                </div>

                {booking.status === "completed" && (
                  <div className="mt-3 pt-3 border-t border-[rgba(148,163,184,0.10)]">
                    <Link
                      href={`/${locale}/dashboard/materials/${booking.id}`}
                      className="text-sm text-[#F59E0B] font-medium"
                    >
                      {locale === "ar" ? "عرض المواد التعليمية →" : "View session materials →"}
                    </Link>
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
