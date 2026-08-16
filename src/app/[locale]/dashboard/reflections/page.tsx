import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { formatDate, getLocalizedField } from "@/lib/utils";
import { Calendar, MessageSquare, AlertCircle, Archive } from "lucide-react";
import type { SessionReflection } from "@/lib/skills/types";

interface ReflectionWithDetails extends SessionReflection {
  session?: {
    starts_at: string;
    workshop?: {
      title_ar: string;
      title_en: string;
    };
  };
  mentor?: {
    full_name: string | null;
  };
}

export default async function ClientReflectionsPage() {
  const t = await getTranslations("dashboard");
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth`);

  const isAr = locale === "ar";

  // Fetch all reflections for this client
  const { data: reflections, error } = await supabase
    .from("session_reflections")
    .select(
      `
      id,
      booking_id,
      client_id,
      mentor_id,
      private_notes,
      encouragement_ar,
      encouragement_en,
      submitted_at
    `
    )
    .eq("client_id", user.id)
    .order("submitted_at", { ascending: false });

  if (error) {
    console.error("Error fetching reflections:", error);
  }

  const typed = (reflections || []) as unknown as ReflectionWithDetails[];

  return (
    <div className="min-h-screen bg-[#0f172a] px-4 py-10">
      <div style={{ maxWidth: "52rem", margin: "0 auto" }}>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-black text-white mb-1">
            {isAr ? "💭 رسائل التشجيع" : "💭 Feedback Hub"}
          </h1>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.875rem" }}>
            {isAr
              ? "كل الرسائل التشجيعية من المرشد عن جلساتك"
              : "All mentor feedback messages about your sessions"}
          </p>
        </div>

        {/* Empty state */}
        {typed.length === 0 ? (
          <div
            style={{
              background: "rgba(30,41,59,0.4)",
              border: "1px solid rgba(245,158,11,0.10)",
              borderRadius: "12px",
              textAlign: "center",
              padding: "56px 24px",
            }}
          >
            <div style={{ fontSize: "2.5rem", marginBottom: "14px" }}>💭</div>
            <p
              style={{
                color: "rgba(255,255,255,0.4)",
                fontSize: "0.95rem",
                marginBottom: "8px",
                fontWeight: 600,
              }}
            >
              {isAr ? "لسه ما فيش رسائل" : "No feedback yet"}
            </p>
            <p
              style={{
                color: "rgba(255,255,255,0.25)",
                fontSize: "0.8rem",
                marginBottom: "20px",
              }}
            >
              {isAr
                ? "بعد ما تحضر جلسة، المرشد هيكتب رسالة تشجيعية ليك هنا"
                : "After you attend a session, your mentor will share feedback here"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {typed.map((reflection) => {
              const sessionTitle = isAr ? "جلسة" : "Session";
              const encouragement = isAr
                ? reflection.encouragement_ar
                : reflection.encouragement_en;

              return (
                <div
                  key={reflection.id}
                  style={{
                    background: "rgba(30,41,59,0.6)",
                    border: "1px solid rgba(245,158,11,0.12)",
                    borderRadius: "12px",
                    padding: "20px 22px",
                    transition: "all 0.15s",
                  }}
                  className="hover:border-[rgba(245,158,11,0.25)] hover:bg-[rgba(30,41,59,0.8)]"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontWeight: 800,
                          color: "white",
                          fontSize: "0.975rem",
                          marginBottom: "4px",
                          lineHeight: 1.3,
                        }}
                      >
                        {sessionTitle}
                      </p>

                      {/* Date info */}
                      <div className="flex items-center gap-3 flex-wrap" style={{ marginTop: "6px" }}>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" style={{ color: "rgba(255,255,255,0.35)" }} />
                          <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>
                            {formatDate(reflection.submitted_at, locale)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status badge */}
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        padding: "5px 11px",
                        borderRadius: "20px",
                        background: "rgba(245,158,11,0.12)",
                        border: "1px solid rgba(245,158,11,0.25)",
                        flexShrink: 0,
                      }}
                    >
                      <MessageSquare className="h-3.5 w-3.5" style={{ color: "#F59E0B" }} />
                      <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#F59E0B" }}>
                        {isAr ? "رسالة" : "Feedback"}
                      </span>
                    </div>
                  </div>

                  {/* Divider */}
                  <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", margin: "12px 0" }} />

                  {/* Message content */}
                  {encouragement && (
                    <div style={{ marginTop: "12px", marginBottom: "12px" }}>
                      <p
                        style={{
                          fontSize: "0.9rem",
                          color: "rgba(255,255,255,0.8)",
                          lineHeight: 1.6,
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                        }}
                        dir={isAr ? "rtl" : "ltr"}
                      >
                        {encouragement}
                      </p>
                    </div>
                  )}

                  {/* Footer with timestamp */}
                  <div className="flex items-center justify-end gap-2">
                    <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.25)" }}>
                      {new Date(reflection.submitted_at).toLocaleDateString(
                        isAr ? "ar-EG" : "en-US",
                        { year: "numeric", month: "short", day: "numeric" }
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
