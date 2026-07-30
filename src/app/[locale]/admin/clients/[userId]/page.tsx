import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import RoadmapClient from "@/components/roadmap/RoadmapClient";
import type { AssessmentResult } from "@/lib/compass/types";
import { DIM_LABELS, ZONE_LABELS } from "@/lib/compass/templates";

interface PageProps {
  params: Promise<{ userId: string; locale: string }>;
}

export default async function AdminClientRoadmapPage({ params }: PageProps) {
  const { userId } = await params;
  const locale = await getLocale();
  const supabase = await createClient();

  // Ensure the viewer is an admin
  const { data: { user: adminUser } } = await supabase.auth.getUser();
  if (!adminUser) notFound();

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", adminUser.id)
    .single();

  if (!adminProfile || adminProfile.role !== "admin") notFound();

  // Fetch the client's profile + latest compass assessment
  const [{ data: profile }, { data: latestAssessment }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase
      .from("assessments")
      .select("result_snapshot, happiness_score, recommended_type, completed_at")
      .eq("client_id", userId)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(1)
      .single(),
  ]);

  if (!profile) notFound();

  const clientName = (profile as { full_name?: string | null; email?: string }).full_name
    || (profile as { email?: string }).email
    || userId;

  const assessmentResult = latestAssessment?.result_snapshot as unknown as AssessmentResult | null;
  const isAr = locale === "ar";

  const zoneColors: Record<string, string> = {
    needs_care: "text-red-400",
    emerging: "text-amber-400",
    steady: "text-blue-300",
    thriving: "text-emerald-400",
  };

  return (
    <div className="bg-[#0f172a] min-h-screen">
      {/* Compass summary for admin */}
      {assessmentResult && (
        <div className="max-w-5xl mx-auto px-6 pt-8">
          <div className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.18)] rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-0.5 bg-[#F59E0B] rounded-full" />
              <h2 className="text-white font-bold text-sm uppercase tracking-widest">
                {isAr ? "بوصلة العميل" : "Client Compass"}
              </h2>
              {latestAssessment?.completed_at && (
                <span className="text-white/30 text-xs ms-auto">
                  {new Date(latestAssessment.completed_at).toLocaleDateString(
                    isAr ? "ar-EG" : "en-US",
                    { year: "numeric", month: "short", day: "numeric" }
                  )}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-6 mb-4">
              <div>
                <p className="text-white/40 text-xs mb-1">{isAr ? "مؤشر السعادة" : "Happiness Index"}</p>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-extrabold text-[#F59E0B]">
                    {latestAssessment?.happiness_score?.toFixed(1)}
                  </span>
                  {assessmentResult.happinessZone && (
                    <span className={`text-sm font-semibold ${zoneColors[assessmentResult.happinessZone]}`}>
                      {isAr
                        ? ZONE_LABELS[assessmentResult.happinessZone]?.ar
                        : ZONE_LABELS[assessmentResult.happinessZone]?.en}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-white/40 text-xs mb-1">{isAr ? "التوصية" : "Recommendation"}</p>
                <span className="text-white font-semibold text-sm">
                  {latestAssessment?.recommended_type === "session"
                    ? (isAr ? "جلسة فردية" : "1:1 Session")
                    : (isAr ? "ورشة" : "Workshop")}
                </span>
              </div>
              {assessmentResult.topStrength && (
                <div>
                  <p className="text-white/40 text-xs mb-1">{isAr ? "نقطة قوة" : "Top Strength"}</p>
                  <span className="text-white font-semibold text-sm">
                    {isAr
                      ? DIM_LABELS[assessmentResult.topStrength]?.ar
                      : DIM_LABELS[assessmentResult.topStrength]?.en}
                  </span>
                </div>
              )}
              {assessmentResult.mainGrowthArea && (
                <div>
                  <p className="text-white/40 text-xs mb-1">{isAr ? "منطقة نمو" : "Growth Area"}</p>
                  <span className="text-white font-semibold text-sm">
                    {isAr
                      ? DIM_LABELS[assessmentResult.mainGrowthArea]?.ar
                      : DIM_LABELS[assessmentResult.mainGrowthArea]?.en}
                  </span>
                </div>
              )}
            </div>

            {/* Dimension score bars */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {assessmentResult.dimensionReads?.map((read) => (
                <div key={read.dimension} className="bg-[rgba(255,255,255,0.03)] rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-white/55 text-xs">
                      {isAr ? read.label_ar : read.label_en}
                    </span>
                    <span className="text-[#F59E0B] text-xs font-bold">
                      {read.score?.toFixed(1)}
                    </span>
                  </div>
                  <div className="h-1 bg-white/8 rounded-full">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${((read.score - 1) / 3) * 100}%`,
                        background:
                          read.zone === "thriving" ? "#10b981"
                          : read.zone === "steady" ? "#60a5fa"
                          : read.zone === "emerging" ? "#F59E0B"
                          : "#ef4444",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <RoadmapClient
        userId={adminUser.id}
        targetUserId={userId}
        locale={locale}
        isAdmin={true}
        clientName={clientName}
      />
    </div>
  );
}
