import Link from "next/link";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Plus, Edit, BookOpen } from "lucide-react";
import { PageHeader } from "@/components/admin/AdminPageWrapper";
import type { Skill } from "@/lib/skills/types";
import type { Dimension } from "@/lib/compass/types";

const DIMENSION_LABELS: Record<Dimension, { ar: string; en: string; color: string }> = {
  HAP: { ar: "السعادة والمعنى",         en: "Happiness & Meaning",       color: "rgba(251,191,36,0.12)" },
  DIR: { ar: "الوضوح والاتجاه",          en: "Clarity & Direction",       color: "rgba(99,102,241,0.12)" },
  PRD: { ar: "الإنتاجية والتركيز",       en: "Productivity & Focus",      color: "rgba(16,185,129,0.12)" },
  CNF: { ar: "الثقة والقيمة الذاتية",   en: "Confidence & Self-worth",   color: "rgba(236,72,153,0.12)" },
  COM: { ar: "التواصل والاتصال",         en: "Communication & Connection", color: "rgba(14,165,233,0.12)" },
  NRG: { ar: "الطاقة والعافية",          en: "Energy & Wellbeing",        color: "rgba(245,101,42,0.12)" },
};

const DIMENSION_ORDER: Dimension[] = ["HAP", "DIR", "PRD", "CNF", "COM", "NRG"];

function ActiveBadge({ isActive, isAr }: { isActive: boolean; isAr: boolean }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[0.65rem] font-bold uppercase tracking-wider ${
        isActive
          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
          : "bg-white/5 text-white/30 border border-white/8"
      }`}
    >
      {isActive ? (isAr ? "نشط" : "Active") : (isAr ? "معطّل" : "Inactive")}
    </span>
  );
}

function SkillCard({ skill, locale, isAr }: { skill: Skill; locale: string; isAr: boolean }) {
  return (
    <div className="flex flex-col gap-3 bg-[rgba(255,255,255,0.02)] border border-white/5 rounded-xl p-4 hover:border-[rgba(245,158,11,0.15)] transition-all">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-white text-sm font-semibold leading-snug">
            {isAr ? skill.name_ar : skill.name_en}
          </p>
          <p className="text-white/30 text-xs mt-0.5">
            {isAr ? skill.name_en : skill.name_ar}
          </p>
        </div>
        <ActiveBadge isActive={skill.is_active} isAr={isAr} />
      </div>

      {/* Description */}
      {(isAr ? skill.description_ar : skill.description_en) && (
        <p className="text-white/40 text-xs leading-relaxed line-clamp-2">
          {isAr ? skill.description_ar : skill.description_en}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-white/5">
        <Link
          href={`/${locale}/admin/skills/${skill.id}/edit`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white/50 hover:text-[#F59E0B] hover:bg-[rgba(245,158,11,0.08)] border border-white/8 hover:border-[rgba(245,158,11,0.2)] transition-all"
        >
          <Edit className="h-3 w-3" />
          {isAr ? "تعديل" : "Edit"}
        </Link>
      </div>
    </div>
  );
}

function DimensionGroup({
  dimension,
  skills,
  locale,
  isAr,
}: {
  dimension: Dimension;
  skills: Skill[];
  locale: string;
  isAr: boolean;
}) {
  const labels = DIMENSION_LABELS[dimension];
  const activeCount = skills.filter((s) => s.is_active).length;

  return (
    <div className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.12)] rounded-2xl overflow-hidden">
      {/* Dimension header */}
      <div
        className="px-6 py-4 border-b border-[rgba(245,158,11,0.08)]"
        style={{ background: labels.color }}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[0.6rem] font-black uppercase tracking-widest text-[#F59E0B] bg-[rgba(245,158,11,0.12)] border border-[rgba(245,158,11,0.2)] rounded px-1.5 py-0.5">
                {dimension}
              </span>
              <span className="text-xs text-white/25 font-medium">
                {activeCount}/{skills.length} {isAr ? "نشط" : "active"}
              </span>
            </div>
            <h2 className="text-base font-black text-white leading-tight">
              {isAr ? labels.ar : labels.en}
            </h2>
            <p className="text-xs text-white/35 mt-0.5">
              {isAr ? labels.en : labels.ar}
            </p>
          </div>
          <Link
            href={`/${locale}/admin/skills/new?dimension=${dimension}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[#F59E0B] border border-[rgba(245,158,11,0.25)] hover:bg-[rgba(245,158,11,0.1)] transition-all flex-shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            {isAr ? "إضافة مهارة" : "Add Skill"}
          </Link>
        </div>
      </div>

      {/* Skills grid */}
      <div className="p-5">
        {skills.length === 0 ? (
          <div className="text-center py-8">
            <BookOpen className="h-7 w-7 text-white/8 mx-auto mb-2" />
            <p className="text-white/20 text-sm">
              {isAr ? "مفيش مهارات في البُعد ده بعد" : "No skills in this dimension yet"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {skills.map((skill) => (
              <SkillCard key={skill.id} skill={skill} locale={locale} isAr={isAr} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default async function AdminSkillsPage() {
  const locale = await getLocale();
  const isAr = locale === "ar";
  const supabase = await createClient();

  const { data: skills } = await supabase
    .from("skills")
    .select("*")
    .order("dimension")
    .order("sort_order")
    .order("name_ar");

  const allSkills = (skills ?? []) as Skill[];

  // Group by dimension, preserving DIMENSION_ORDER
  const byDimension = DIMENSION_ORDER.reduce<Record<Dimension, Skill[]>>(
    (acc, dim) => {
      acc[dim] = allSkills.filter((s) => s.dimension === dim);
      return acc;
    },
    {} as Record<Dimension, Skill[]>
  );

  const totalActive = allSkills.filter((s) => s.is_active).length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        supra={isAr ? "الإدارة" : "Admin"}
        title={isAr ? "مكتبة المهارات" : "Skill Library"}
        subtitle={
          isAr
            ? `${allSkills.length} مهارة، ${totalActive} نشطة`
            : `${allSkills.length} skills, ${totalActive} active`
        }
        // No create route exists for skills yet, so there's no button to show —
        // linking to /admin/skills/new only ever produced a 404.

      />

      {/* Stats bar */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {DIMENSION_ORDER.map((dim) => {
          const count = byDimension[dim].length;
          const active = byDimension[dim].filter((s) => s.is_active).length;
          const labels = DIMENSION_LABELS[dim];
          return (
            <div
              key={dim}
              className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.12)] rounded-xl p-3 text-center"
            >
              <p className="text-[0.6rem] font-black uppercase tracking-widest text-[#F59E0B] mb-1">
                {dim}
              </p>
              <p className="text-xl font-black text-white leading-none">{count}</p>
              <p className="text-[0.6rem] text-white/25 mt-0.5 truncate">
                {isAr ? labels.ar : labels.en}
              </p>
              <p className="text-[0.6rem] text-emerald-400/60 mt-0.5">
                {active} {isAr ? "نشط" : "active"}
              </p>
            </div>
          );
        })}
      </div>

      {/* Dimension groups */}
      <div className="space-y-6">
        {DIMENSION_ORDER.map((dim) => (
          <DimensionGroup
            key={dim}
            dimension={dim}
            skills={byDimension[dim]}
            locale={locale}
            isAr={isAr}
          />
        ))}
      </div>
    </div>
  );
}
