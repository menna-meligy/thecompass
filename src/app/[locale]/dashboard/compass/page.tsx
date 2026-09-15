import { redirect } from "next/navigation";
import Link from "next/link";
import { getLocale } from "next-intl/server";
import { Compass, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { fetchEligibilityData } from "@/lib/skills/operations";
import { computeEligibility, getEligibilityMessage } from "@/lib/skills/eligibility";
import { CompassFlow } from "@/components/compass/CompassFlow";
import type { AssessmentResult } from "@/lib/compass/types";

export default async function CompassPage() {
  const locale = await getLocale();
  const isAr = locale === "ar";
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/${locale}/auth`);

  // Fetch eligibility data + active milestone skill IDs + previous assessment in parallel
  const [eligibilityData, { data: activeMilestones }, { data: latestAssessment }] =
    await Promise.all([
      fetchEligibilityData(supabase, user.id),
      supabase
        .from("roadmap_milestones")
        .select("skill_id")
        .eq("client_id", user.id)
        .eq("status", "active"),
      supabase
        .from("assessments")
        .select("result_snapshot, completed_at")
        .eq("client_id", user.id)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const eligibility = computeEligibility(eligibilityData);
  const { state } = eligibility;

  const isEligible = state === "ELIGIBLE" || state === "BASELINE_OPEN";

  // Blocked states — show gating message
  if (!isEligible) {
    const msg = getEligibilityMessage(eligibility, isAr ? "ar" : "en");

    return (
      <div style={{ maxWidth: "40rem", margin: "0 auto", padding: "0 1.5rem" }} className="py-16">
        {/* Accent bar */}
        <div className="w-10 h-0.5 bg-[#F59E0B] rounded-full mb-8" />

        {/* Lock card */}
        <div className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.18)] rounded-2xl p-8 text-center relative overflow-hidden">
          {/* Subtle gold glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-10"
            style={{ background: "radial-gradient(circle, #F59E0B, transparent 70%)" }}
          />

          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.15)] flex items-center justify-center mx-auto mb-6">
              <Lock className="h-8 w-8 text-[#F59E0B]/60" />
            </div>

            <h1 className="text-xl font-bold text-white mb-3">{msg.title}</h1>
            <p className="text-white/50 text-sm leading-6 mb-8 max-w-xs mx-auto">{msg.body}</p>

            <Link
              href={`/${locale}/dashboard`}
              className="text-white/30 hover:text-white/60 text-sm transition-colors"
            >
              {isAr ? "العودة للوحة التحكم" : "Back to dashboard"}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Eligible or baseline — assemble props
  const isBaseline = state === "BASELINE_OPEN";
  const previousAssessmentAt = eligibility.lastAssessmentAt;
  const activeMilestoneSkillIds = (activeMilestones ?? []).map((m) => m.skill_id);

  // For re-assessment, don't pre-fill existingResult (let the user take a fresh flow).
  // For baseline with a result already stored (edge-case: completed but state reset),
  // surface the stored result so CompassFlow lands on the results screen.
  const existingResult = isBaseline
    ? ((latestAssessment?.result_snapshot as unknown as AssessmentResult) ?? null)
    : null;

  return (
    <div style={{ maxWidth: "64rem", margin: "0 auto", padding: "0 1.5rem" }} className="py-8">
      {/* Page header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[rgba(245,158,11,0.12)] border border-[rgba(245,158,11,0.2)] flex items-center justify-center flex-shrink-0">
          <Compass className="h-5 w-5 text-[#F59E0B]" />
        </div>
        <div>
          <div className="w-8 h-0.5 bg-[#F59E0B] rounded-full mb-1" />
          <h1 className="text-lg font-bold text-white leading-tight">
            {isAr ? "بوصلتك" : "Your Compass"}
          </h1>
        </div>
      </div>

      {/* Badge: baseline vs re-assessment */}
      {isBaseline && (
        <div className="mb-4 inline-flex items-center gap-2 bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.2)] rounded-lg px-3 py-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse" />
          <span className="text-[#F59E0B] text-xs font-semibold">
            {isAr ? "قراءة أساسية: المرة الأولى" : "Baseline reading: first time"}
          </span>
        </div>
      )}

      {!isBaseline && previousAssessmentAt && (
        <div className="mb-4 inline-flex items-center gap-2 bg-[rgba(255,255,255,0.04)] border border-white/10 rounded-lg px-3 py-1.5">
          <span className="text-white/40 text-xs">
            {isAr
              ? `آخر تقييم: ${new Date(previousAssessmentAt).toLocaleDateString("ar-EG", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}`
              : `Last assessment: ${new Date(previousAssessmentAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}`}
          </span>
        </div>
      )}

      {/*
        CompassFlow, the full interactive quiz + result screen.
        Props passed for context:
          clientId            → user.id
          locale              → page locale
          isBaseline          → state === "BASELINE_OPEN"
          previousAssessmentAt→ ISO string of last completed assessment
          activeMilestoneSkillIds → skill IDs currently on the active roadmap
      */}
      <CompassFlow
        locale={isAr ? "ar" : "en"}
        userId={user.id}
        existingResult={existingResult}
      />
    </div>
  );
}
