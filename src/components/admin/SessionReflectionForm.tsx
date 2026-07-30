"use client";

import { useState } from "react";
import type { Skill, RoadmapMilestone, SkillLevel } from "@/lib/skills/types";
import type { Dimension } from "@/lib/compass/types";

interface Props {
  bookingId: string;
  clientId: string;
  clientName: string;
  skills: Skill[];
  activeMilestones: RoadmapMilestone[];
  locale: "ar" | "en";
  onSuccess?: () => void;
}

interface SkillRating {
  skillId: string;
  level: SkillLevel;
}

const DIMENSION_LABELS: Record<Dimension, { ar: string; en: string }> = {
  HAP: { ar: "السعادة والرفاه", en: "Happiness & Wellbeing" },
  DIR: { ar: "الاتجاه والهدف", en: "Direction & Purpose" },
  PRD: { ar: "الإنتاجية والأداء", en: "Productivity & Performance" },
  CNF: { ar: "الثقة بالنفس", en: "Confidence & Self-belief" },
  COM: { ar: "التواصل والعلاقات", en: "Communication & Relationships" },
  NRG: { ar: "الطاقة والتوازن", en: "Energy & Balance" },
};

const LEVEL_LABELS: Record<SkillLevel, { ar: string; en: string }> = {
  1: { ar: "مبتدئ", en: "Beginner" },
  2: { ar: "ناشئ", en: "Emerging" },
  3: { ar: "متوسط", en: "Developing" },
  4: { ar: "متقدم", en: "Proficient" },
  5: { ar: "متمكن", en: "Expert" },
};

export default function SessionReflectionForm({
  bookingId,
  clientId,
  clientName,
  skills,
  activeMilestones,
  locale,
  onSuccess,
}: Props) {
  const isAr = locale === "ar";

  // Group skills by dimension
  const skillsByDimension = skills.reduce<Record<string, Skill[]>>((acc, skill) => {
    const dim = skill.dimension;
    if (!acc[dim]) acc[dim] = [];
    acc[dim].push(skill);
    return acc;
  }, {});

  const dimensions = Object.keys(skillsByDimension) as Dimension[];

  // Form state
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());
  const [skillRatings, setSkillRatings] = useState<Record<string, SkillLevel>>({});
  const [privateNotes, setPrivateNotes] = useState("");
  const [encouragementAr, setEncouragementAr] = useState("");
  const [encouragementEn, setEncouragementEn] = useState("");
  const [completedMilestones, setCompletedMilestones] = useState<Set<string>>(new Set());

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitState, setSubmitState] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const selectedCount = selectedSkills.size;
  const isSelectionValid = selectedCount >= 2 && selectedCount <= 4;

  function toggleSkill(skillId: string) {
    setSelectedSkills((prev) => {
      const next = new Set(prev);
      if (next.has(skillId)) {
        next.delete(skillId);
        setSkillRatings((r) => {
          const updated = { ...r };
          delete updated[skillId];
          return updated;
        });
      } else {
        if (next.size >= 4) return prev; // max 4
        next.add(skillId);
        // default to level 3
        setSkillRatings((r) => ({ ...r, [skillId]: 3 }));
      }
      return next;
    });
  }

  function setRating(skillId: string, level: SkillLevel) {
    setSkillRatings((r) => ({ ...r, [skillId]: level }));
  }

  function toggleMilestone(milestoneId: string) {
    setCompletedMilestones((prev) => {
      const next = new Set(prev);
      if (next.has(milestoneId)) next.delete(milestoneId);
      else next.add(milestoneId);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!isSelectionValid) {
      setErrorMessage(
        isAr
          ? "اختر من 2 إلى 4 مهارات تم العمل عليها في هذه الجلسة"
          : "Select 2–4 skills worked on in this session"
      );
      return;
    }

    const skillRatingsPayload: SkillRating[] = Array.from(selectedSkills).map((skillId) => ({
      skillId,
      level: skillRatings[skillId] ?? 3,
    }));

    const payload = {
      bookingId,
      clientId,
      privateNotes: privateNotes.trim() || null,
      encouragementAr: encouragementAr.trim() || null,
      encouragementEn: encouragementEn.trim() || null,
      skillRatings: skillRatingsPayload,
      completedMilestones: Array.from(completedMilestones),
    };

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/admin/session-reflection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `HTTP ${res.status}`);
      }

      setSubmitState("success");
      onSuccess?.();
    } catch (err) {
      setSubmitState("error");
      setErrorMessage(
        err instanceof Error ? err.message : (isAr ? "حدث خطأ غير متوقع" : "Unexpected error")
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitState === "success") {
    return (
      <div className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.12)] rounded-2xl p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-white font-bold text-lg mb-1">
          {isAr ? "تم حفظ تقرير الجلسة بنجاح" : "Session reflection submitted"}
        </p>
        <p className="text-white/40 text-sm">
          {isAr ? `تم تسجيل ملاحظاتك لجلسة ${clientName}` : `Notes recorded for ${clientName}'s session`}
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      dir={isAr ? "rtl" : "ltr"}
      className="space-y-8"
    >
      {/* Header */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-[#F59E0B] mb-1">
          {isAr ? "تقرير المرشد" : "Mentor Reflection"}
        </p>
        <h2 className="text-xl font-black text-white">
          {isAr ? `جلسة ${clientName}` : `${clientName}'s Session`}
        </h2>
      </div>

      {/* ── SKILL RATINGS SECTION ── */}
      <section className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.12)] rounded-2xl p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-[#F59E0B] uppercase tracking-wider mb-0.5">
              {isAr ? "تقييم المهارات" : "Skill Ratings"}
            </h3>
            <p className="text-xs text-white/40">
              {isAr
                ? "اختر 2–4 مهارات تم التركيز عليها فقط، ثم حدّد المستوى الحالي للعميل"
                : "Select only 2–4 skills worked on, then set the client's current level"}
            </p>
          </div>
          <span
            className={`flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full border ${
              selectedCount === 0
                ? "text-white/30 bg-white/5 border-white/10"
                : isSelectionValid
                ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                : selectedCount > 4
                ? "text-red-400 bg-red-500/10 border-red-500/20"
                : "text-amber-400 bg-amber-500/10 border-amber-500/20"
            }`}
          >
            {selectedCount}/4
          </span>
        </div>

        {dimensions.map((dim) => {
          const dimSkills = skillsByDimension[dim] ?? [];
          const label = DIMENSION_LABELS[dim as Dimension];
          if (!dimSkills.length) return null;
          return (
            <div key={dim}>
              <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                {isAr ? label.ar : label.en}
              </p>
              <div className="space-y-2">
                {dimSkills.map((skill) => {
                  const isChecked = selectedSkills.has(skill.id);
                  const rating = skillRatings[skill.id] ?? 3;
                  const skillName = isAr ? skill.name_ar : skill.name_en;
                  const skillDesc = isAr ? skill.description_ar : skill.description_en;
                  return (
                    <div
                      key={skill.id}
                      className={`rounded-xl border transition-all ${
                        isChecked
                          ? "border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.06)]"
                          : "border-white/5 bg-white/2 hover:border-white/10"
                      }`}
                    >
                      {/* Checkbox row */}
                      <label className="flex items-start gap-3 p-3 cursor-pointer select-none">
                        <div className="mt-0.5 flex-shrink-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSkill(skill.id)}
                            disabled={!isChecked && selectedCount >= 4}
                            className="sr-only"
                          />
                          <div
                            className={`w-4.5 h-4.5 w-[18px] h-[18px] rounded-md border flex items-center justify-center transition-all ${
                              isChecked
                                ? "bg-[#F59E0B] border-[#F59E0B]"
                                : "border-white/20 bg-transparent"
                            } ${!isChecked && selectedCount >= 4 ? "opacity-30 cursor-not-allowed" : ""}`}
                          >
                            {isChecked && (
                              <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold leading-tight ${isChecked ? "text-white" : "text-white/60"}`}>
                            {skillName}
                          </p>
                          {skillDesc && (
                            <p className="text-xs text-white/30 mt-0.5 leading-snug line-clamp-1">
                              {skillDesc}
                            </p>
                          )}
                        </div>
                      </label>

                      {/* Level selector — only shown when checked */}
                      {isChecked && (
                        <div className={`px-3 pb-3 ${isAr ? "pr-9" : "pl-9"}`}>
                          <p className="text-xs text-white/40 mb-1.5">
                            {isAr ? "المستوى الحالي للعميل:" : "Client's current level:"}
                          </p>
                          <div className="flex gap-1.5 flex-wrap">
                            {([1, 2, 3, 4, 5] as SkillLevel[]).map((lvl) => {
                              const lvlLabel = LEVEL_LABELS[lvl];
                              const isActive = rating === lvl;
                              return (
                                <button
                                  key={lvl}
                                  type="button"
                                  onClick={() => setRating(skill.id, lvl)}
                                  className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                                    isActive
                                      ? "bg-[#F59E0B] border-[#F59E0B] text-black"
                                      : "border-white/10 text-white/50 hover:border-[rgba(245,158,11,0.3)] hover:text-white/80"
                                  }`}
                                >
                                  {lvl}: {isAr ? lvlLabel.ar : lvlLabel.en}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {!isSelectionValid && selectedCount > 0 && (
          <p className="text-xs text-amber-400/80">
            {isAr
              ? selectedCount < 2
                ? "اختر على الأقل مهارتين"
                : "الحد الأقصى 4 مهارات"
              : selectedCount < 2
              ? "Select at least 2 skills"
              : "Maximum 4 skills allowed"}
          </p>
        )}
      </section>

      {/* ── PRIVATE NOTES ── */}
      <section className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.12)] rounded-2xl p-6 space-y-3">
        <div>
          <h3 className="text-sm font-bold text-[#F59E0B] uppercase tracking-wider mb-0.5">
            {isAr ? "ملاحظات خاصة" : "Private Notes"}
          </h3>
          <p className="text-xs text-white/40">
            {isAr
              ? "مرئية للمرشد فقط، لا يراها العميل"
              : "Visible to mentor only, not shown to client"}
          </p>
        </div>
        <textarea
          value={privateNotes}
          onChange={(e) => setPrivateNotes(e.target.value)}
          rows={4}
          placeholder={isAr ? "ملاحظاتك الخاصة عن الجلسة..." : "Your private notes about this session..."}
          className="input-dark w-full resize-none"
          dir={isAr ? "rtl" : "ltr"}
        />
      </section>

      {/* ── CLIENT-VISIBLE ENCOURAGEMENT ── */}
      <section className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.12)] rounded-2xl p-6 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-[#F59E0B] uppercase tracking-wider mb-0.5">
            {isAr ? "رسالة تشجيعية للعميل" : "Client Encouragement"}
          </h3>
          <p className="text-xs text-white/40">
            {isAr
              ? "ستظهر للعميل في لوحة التحكم الخاصة به"
              : "Will be shown to the client in their dashboard"}
          </p>
        </div>

        {/* Arabic */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-white/50 uppercase tracking-wide">
            {isAr ? "بالعربية" : "Arabic"}
          </label>
          <textarea
            value={encouragementAr}
            onChange={(e) => setEncouragementAr(e.target.value)}
            rows={3}
            dir="rtl"
            placeholder="اكتب رسالة تشجيعية بالعربية..."
            className="input-dark w-full resize-none"
          />
        </div>

        {/* English */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-white/50 uppercase tracking-wide">
            {isAr ? "بالإنجليزية" : "English"}
          </label>
          <textarea
            value={encouragementEn}
            onChange={(e) => setEncouragementEn(e.target.value)}
            rows={3}
            dir="ltr"
            placeholder="Write an encouragement message in English..."
            className="input-dark w-full resize-none"
          />
        </div>
      </section>

      {/* ── MILESTONE CHECKBOXES ── */}
      {activeMilestones.length > 0 && (
        <section className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.12)] rounded-2xl p-6 space-y-3">
          <div>
            <h3 className="text-sm font-bold text-[#F59E0B] uppercase tracking-wider mb-0.5">
              {isAr ? "الأهداف المكتملة" : "Completed Milestones"}
            </h3>
            <p className="text-xs text-white/40">
              {isAr
                ? "حدّد الأهداف التي أكملها العميل في هذه الجلسة"
                : "Mark milestones the client completed in this session"}
            </p>
          </div>

          <div className="space-y-2">
            {activeMilestones.map((milestone) => {
              const isChecked = completedMilestones.has(milestone.id);
              const milestoneTitle = isAr ? milestone.title_ar : milestone.title_en;
              const skillName = milestone.skill
                ? isAr
                  ? milestone.skill.name_ar
                  : milestone.skill.name_en
                : null;
              return (
                <label
                  key={milestone.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer select-none transition-all ${
                    isChecked
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-white/5 bg-white/2 hover:border-white/10"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleMilestone(milestone.id)}
                    className="sr-only"
                  />
                  <div
                    className={`mt-0.5 flex-shrink-0 w-[18px] h-[18px] rounded-md border flex items-center justify-center transition-all ${
                      isChecked
                        ? "bg-emerald-500 border-emerald-500"
                        : "border-white/20 bg-transparent"
                    }`}
                  >
                    {isChecked && (
                      <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold leading-tight ${isChecked ? "text-white" : "text-white/60"}`}>
                      {milestoneTitle}
                    </p>
                    {skillName && (
                      <p className="text-xs text-white/30 mt-0.5">
                        {isAr ? "المهارة:" : "Skill:"} {skillName}
                        {" · "}
                        {isAr ? "المستوى المستهدف:" : "Target:"} {milestone.target_level}
                      </p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </section>
      )}

      {/* ── ERROR MESSAGE ── */}
      {(submitState === "error" || errorMessage) && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-500/8 border border-red-500/20">
          <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <p className="text-sm text-red-400">{errorMessage}</p>
        </div>
      )}

      {/* ── SUBMIT BUTTON ── */}
      <div className={`flex ${isAr ? "justify-start" : "justify-end"}`}>
        <button
          type="submit"
          disabled={isSubmitting}
          className={`relative px-8 py-3 rounded-xl font-bold text-sm transition-all ${
            isSubmitting
              ? "bg-[rgba(245,158,11,0.3)] text-white/50 cursor-not-allowed"
              : "bg-[#F59E0B] hover:bg-amber-400 text-black"
          }`}
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {isAr ? "جاري الحفظ..." : "Saving..."}
            </span>
          ) : isAr ? (
            "حفظ تقرير الجلسة"
          ) : (
            "Submit Reflection"
          )}
        </button>
      </div>
    </form>
  );
}
