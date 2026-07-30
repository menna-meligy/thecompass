import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Calendar, MapPin, Clock, ArrowRight, Compass, AlertCircle } from "lucide-react";
import { getLocalizedField } from "@/lib/utils";

export default async function GeneralSessionPage() {
  const locale = await getLocale();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth`);
  const isAr = locale === "ar";

  const now = new Date().toISOString();
  const { data: sessions } = await supabase
    .from("sessions")
    .select("*, workshop:workshops(*)")
    .eq("status", "published")
    .eq("type", "individual")
    .gt("starts_at", now)
    .order("starts_at", { ascending: true });

  const available = sessions || [];

  return (
    <div className="bg-[#0f172a] min-h-screen">
      <div style={{ maxWidth: "48rem", margin: "0 auto", padding: "2.5rem 1.5rem" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", marginBottom: "32px" }}>
          <div style={{ width: "52px", height: "52px", borderRadius: "12px", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Compass className="h-6 w-6 text-[#F59E0B]" />
          </div>
          <div>
            <span style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(245,158,11,0.6)", display: "block", marginBottom: "4px" }}>
              {isAr ? "جلسات فردية" : "1-on-1 Sessions"}
            </span>
            <h1 style={{ color: "white", fontWeight: 900, fontSize: "1.35rem", lineHeight: 1.2, marginBottom: "6px" }}>
              {isAr ? "اختر موعدك" : "Choose Your Session"}
            </h1>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.82rem", lineHeight: 1.6 }}>
              {isAr
                ? "المواعيد المتاحة للحجز: اختر الوقت المناسب وأكمل خطوات الدفع"
                : "Available coaching slots: pick a time and follow the payment steps"}
            </p>
          </div>
        </div>

        {/* Slot list */}
        {available.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 20px", background: "rgba(30,41,59,0.5)", border: "1px solid rgba(245,158,11,0.08)", borderRadius: "12px" }}>
            <AlertCircle className="h-10 w-10 mx-auto mb-4" style={{ color: "rgba(245,158,11,0.35)" }} />
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.9rem", fontWeight: 600, marginBottom: "6px" }}>
              {isAr ? "لا توجد مواعيد متاحة حالياً" : "No slots available right now"}
            </p>
            <p style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.8rem" }}>
              {isAr
                ? "تابع المنصة، سيتم إضافة مواعيد جديدة قريباً"
                : "Check back soon. New slots will be added shortly"}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {available.map((session) => {
              const title = getLocalizedField(
                (session.workshop as unknown as Record<string, unknown>) || {},
                "title",
                locale
              );
              const startsAt = new Date(session.starts_at);
              const endsAt = session.ends_at ? new Date(session.ends_at) : null;
              const dateStr = startsAt.toLocaleDateString(isAr ? "ar-EG" : "en-US", {
                weekday: "long", year: "numeric", month: "long", day: "numeric",
              });
              const timeStr = startsAt.toLocaleTimeString(isAr ? "ar-EG" : "en-US", {
                hour: "2-digit", minute: "2-digit",
              });
              const endTimeStr = endsAt
                ? endsAt.toLocaleTimeString(isAr ? "ar-EG" : "en-US", { hour: "2-digit", minute: "2-digit" })
                : null;
              const isOnline = session.location_or_link?.startsWith("http");

              return (
                <Link
                  key={session.id}
                  href={`/${locale}/book/${session.id}`}
                  className="group block rounded-xl p-5 transition-all duration-150 hover:border-[rgba(245,158,11,0.35)] hover:bg-[rgba(30,41,59,0.9)]"
                  style={{ background: "rgba(30,41,59,0.6)", border: "1px solid rgba(245,158,11,0.12)", textDecoration: "none" }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {title && (
                        <p style={{ color: "rgba(245,158,11,0.65)", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>
                          {title}
                        </p>
                      )}
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "rgba(255,255,255,0.75)", fontSize: "0.87rem" }}>
                          <Calendar className="h-3.5 w-3.5 text-[#F59E0B] flex-shrink-0" />
                          <span>{dateStr}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "rgba(255,255,255,0.55)", fontSize: "0.82rem" }}>
                          <Clock className="h-3.5 w-3.5 text-[#F59E0B] flex-shrink-0" />
                          <span>{timeStr}{endTimeStr ? ` - ${endTimeStr}` : ""}</span>
                        </div>
                        {session.location_or_link && (
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "rgba(255,255,255,0.45)", fontSize: "0.8rem" }}>
                            <MapPin className="h-3.5 w-3.5 text-[#F59E0B] flex-shrink-0" />
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {isOnline ? (isAr ? "عبر الإنترنت" : "Online") : session.location_or_link}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "10px", flexShrink: 0 }}>
                      <div style={{ fontWeight: 900, fontSize: "1.1rem", color: "#F59E0B" }}>
                        {session.price === 0
                          ? (isAr ? "مجاني" : "Free")
                          : `${session.price} ${isAr ? "ج" : "EGP"}`}
                      </div>
                      <div
                        className="flex items-center gap-1 transition-all duration-150 group-hover:gap-1.5"
                        style={{ padding: "7px 14px", borderRadius: "6px", background: "#F59E0B", color: "#0f172a", fontWeight: 800, fontSize: "0.82rem" }}
                      >
                        {isAr ? "احجز" : "Book"}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
