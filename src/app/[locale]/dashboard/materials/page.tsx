import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { FileText, Download, BookOpen, ExternalLink } from "lucide-react";

interface Material {
  id: string;
  title_ar: string;
  title_en: string;
  content_ar: string | null;
  content_en: string | null;
  file_url: string | null;
  created_at: string;
  booking_id: string;
}

export default async function MaterialsPage() {
  const locale = await getLocale();
  const isAr = locale === "ar";
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth`);

  // Fetch materials linked to this user's bookings
  const { data: materials } = await supabase
    .from("session_materials")
    .select(`
      id, title_ar, title_en, content_ar, content_en, file_url, created_at, booking_id,
      booking:bookings!booking_id(
        session:sessions(workshop:workshops(title_ar, title_en))
      )
    `)
    .eq("booking.user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-[#0f172a] px-4 py-10">
      <div style={{ maxWidth: "52rem", margin: "0 auto" }}>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-black text-white mb-1">
            {isAr ? "المواد التعليمية" : "Materials"}
          </h1>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.875rem" }}>
            {isAr ? "ملفات وموارد جلساتك وورشك" : "Files and resources from your sessions and workshops"}
          </p>
        </div>

        {!materials || materials.length === 0 ? (
          <div style={{
            background: "rgba(30,41,59,0.4)", border: "1px solid rgba(245,158,11,0.10)",
            borderRadius: "12px", textAlign: "center", padding: "56px 24px",
          }}>
            <div style={{
              width: "56px", height: "56px", borderRadius: "12px",
              background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
            }}>
              <BookOpen style={{ width: "24px", height: "24px", color: "#F59E0B" }} />
            </div>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.95rem", fontWeight: 600, marginBottom: "6px" }}>
              {isAr ? "لا توجد مواد بعد" : "No materials yet"}
            </p>
            <p style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.8rem" }}>
              {isAr
                ? "ستظهر هنا المواد التي يشاركها معك المدرب بعد جلساتك"
                : "Materials shared by your coach after sessions will appear here"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {(materials as (Material & { booking?: { session?: { workshop?: { title_ar?: string; title_en?: string } } } })[]).map((m) => {
              const workshopTitle = isAr
                ? m.booking?.session?.workshop?.title_ar
                : m.booking?.session?.workshop?.title_en;
              const title = isAr ? m.title_ar : m.title_en;
              const content = isAr ? m.content_ar : m.content_en;

              return (
                <div
                  key={m.id}
                  style={{
                    background: "rgba(30,41,59,0.5)",
                    border: "1px solid rgba(245,158,11,0.10)",
                    borderRadius: "12px",
                    padding: "18px 20px",
                    transition: "border-color 0.2s",
                  }}
                  className="hover:border-[rgba(245,158,11,0.25)]"
                >
                  <div className="flex items-start gap-4">
                    <div style={{
                      width: "40px", height: "40px", flexShrink: 0,
                      borderRadius: "8px", background: "rgba(245,158,11,0.08)",
                      border: "1px solid rgba(245,158,11,0.15)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <FileText style={{ width: "18px", height: "18px", color: "#F59E0B" }} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, color: "white", fontSize: "0.95rem", marginBottom: "4px" }}>
                        {title}
                      </p>
                      {workshopTitle && (
                        <p style={{ fontSize: "0.75rem", color: "rgba(245,158,11,0.7)", marginBottom: "6px" }}>
                          {workshopTitle}
                        </p>
                      )}
                      {content && (
                        <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>
                          {content}
                        </p>
                      )}
                    </div>

                    {m.file_url && (
                      <a
                        href={m.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          flexShrink: 0, display: "flex", alignItems: "center", gap: "6px",
                          padding: "8px 14px", borderRadius: "8px",
                          border: "1px solid rgba(245,158,11,0.3)", color: "#F59E0B",
                          fontSize: "0.8rem", fontWeight: 700, textDecoration: "none",
                          background: "rgba(245,158,11,0.06)",
                          transition: "all 0.2s",
                        }}
                        className="hover:bg-[rgba(245,158,11,0.12)] hover:border-[rgba(245,158,11,0.5)]"
                      >
                        <Download style={{ width: "14px", height: "14px" }} />
                        {isAr ? "تحميل" : "Download"}
                      </a>
                    )}
                    {!m.file_url && content && (
                      <ExternalLink style={{ width: "16px", height: "16px", color: "rgba(255,255,255,0.2)", flexShrink: 0 }} />
                    )}
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
