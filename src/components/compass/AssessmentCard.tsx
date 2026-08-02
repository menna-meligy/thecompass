"use client";

import Link from "next/link";
import { Compass, Calendar, ChevronRight } from "lucide-react";
import { getEligibilityMessage } from "@/lib/skills/eligibility";
import type { EligibilityResult } from "@/lib/skills/types";

interface Props {
  eligibility: EligibilityResult;
  locale: "ar" | "en";
  lastReadingDate?: string;
}

export default function AssessmentCard({ eligibility, locale, lastReadingDate }: Props) {
  const isAr = locale === "ar";
  const { state } = eligibility;
  const msg = getEligibilityMessage(eligibility, locale);

  const formattedLastReading = lastReadingDate
    ? new Date(lastReadingDate).toLocaleDateString(
        isAr ? "ar-EG" : "en-GB",
        { day: "numeric", month: "long", year: "numeric" }
      )
    : null;

  // ── BASELINE_OPEN ──────────────────────────────────────────────────────────
  if (state === "BASELINE_OPEN") {
    return (
      <div className="bg-[rgba(30,41,59,0.6)] border border-[rgba(245,158,11,0.12)] rounded-xl p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.15)] flex items-center justify-center flex-shrink-0">
              <Compass className="h-5 w-5 text-[#F59E0B]/60" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">
                {isAr ? "ابدأ تقييمك الأول" : "Start your first assessment"}
              </p>
              <p className="text-white/40 text-xs mt-0.5">{msg.body}</p>
            </div>
          </div>
          <Link
            href={`/${locale}/dashboard/compass`}
            className="flex items-center gap-1 bg-[#F59E0B] hover:bg-[#E88F00] text-[#0f172a] text-sm font-bold px-4 py-2 rounded-xl transition-colors flex-shrink-0"
          >
            {msg.cta}
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  // ── LOCKED_COOLDOWN ────────────────────────────────────────────────────────
  if (state === "LOCKED_COOLDOWN") {
    return (
      <div className="bg-[rgba(30,41,59,0.6)] border border-[rgba(245,158,11,0.12)] rounded-xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.15)] flex items-center justify-center flex-shrink-0">
            <Calendar className="h-5 w-5 text-white/30" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">{msg.title}</p>
            <p className="text-white/40 text-xs mt-0.5">{msg.body}</p>
            {formattedLastReading && (
              <p className="text-white/30 text-xs mt-1">
                {isAr ? `آخر تقييم: ${formattedLastReading}` : `Last assessment: ${formattedLastReading}`}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── ELIGIBLE ───────────────────────────────────────────────────────────────
  return (
    <div className="bg-[rgba(30,41,59,0.6)] border border-[rgba(245,158,11,0.12)] rounded-xl p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-[rgba(245,158,11,0.12)] border border-[rgba(245,158,11,0.25)] flex items-center justify-center flex-shrink-0">
            <Compass
              className="h-5 w-5 text-[#F59E0B] animate-pulse"
            />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">
              {isAr ? "تقييمك الجديد جاهز" : "Your new assessment is ready"}
            </p>
            <p className="text-white/40 text-xs mt-0.5">{msg.body}</p>
            {formattedLastReading && (
              <p className="text-white/30 text-xs mt-1">
                {isAr ? `آخر تقييم: ${formattedLastReading}` : `Last assessment: ${formattedLastReading}`}
              </p>
            )}
          </div>
        </div>
        <Link
          href={`/${locale}/dashboard/compass`}
          className="flex items-center gap-1 bg-[#F59E0B] hover:bg-[#E88F00] text-[#0f172a] text-sm font-bold px-4 py-2 rounded-xl transition-colors flex-shrink-0"
        >
          {msg.cta}
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
