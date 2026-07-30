import type { ClientSkill, Skill, SkillLevel } from "@/lib/skills/types";
import type { Dimension } from "@/lib/compass/types";
import { LEVEL_LABELS } from "@/lib/skills/levels";

interface Props {
  clientSkills: ClientSkill[];
  skills: Skill[];
  locale: "ar" | "en";
}

const DIMENSION_META: Record<Dimension, { label_ar: string; label_en: string }> = {
  HAP: { label_ar: "السعادة",       label_en: "Happiness" },
  DIR: { label_ar: "الاتجاه",       label_en: "Direction" },
  PRD: { label_ar: "الإنتاجية",     label_en: "Productivity" },
  CNF: { label_ar: "الثقة",         label_en: "Confidence" },
  COM: { label_ar: "التواصل",       label_en: "Communication" },
  NRG: { label_ar: "الطاقة",        label_en: "Energy" },
};

const DIMENSION_ORDER: Dimension[] = ["HAP", "DIR", "PRD", "CNF", "COM", "NRG"];

// ---------------------------------------------------------------------------
// Dot bar sub-component
// ---------------------------------------------------------------------------
function LevelDots({
  level,
  color,
  emptyColor = "rgba(255,255,255,0.08)",
}: {
  level: SkillLevel | null;
  color: string;
  emptyColor?: string;
}) {
  return (
    <span className="flex items-center gap-1">
      {([1, 2, 3, 4, 5] as SkillLevel[]).map((n) => (
        <span
          key={n}
          className="inline-block w-2.5 h-2.5 rounded-full transition-all"
          style={{
            backgroundColor: level !== null && n <= level ? color : emptyColor,
            boxShadow: level !== null && n <= level ? `0 0 4px ${color}66` : "none",
          }}
        />
      ))}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Single skill row
// ---------------------------------------------------------------------------
function SkillRow({
  skill,
  clientSkill,
  isAr,
}: {
  skill: Skill;
  clientSkill: ClientSkill | null;
  isAr: boolean;
}) {
  const isEmpty = !clientSkill || (clientSkill.self_level === null && clientSkill.mentor_level === null);

  const selfLevel = clientSkill?.self_level ?? null;
  const mentorLevel = clientSkill?.mentor_level ?? null;
  const combinedLevel = clientSkill?.combined_level ?? null;

  const hasGap =
    selfLevel !== null &&
    mentorLevel !== null &&
    Math.abs(selfLevel - mentorLevel) >= 2;

  const updatedAt = clientSkill?.updated_at
    ? new Date(clientSkill.updated_at).toLocaleDateString(
        isAr ? "ar-EG" : "en-GB",
        { day: "numeric", month: "short", year: "numeric" }
      )
    : null;

  const selfLevelLabel = selfLevel ? LEVEL_LABELS[selfLevel] : null;
  const mentorLevelLabel = mentorLevel ? LEVEL_LABELS[mentorLevel] : null;
  const combinedLevelLabel = combinedLevel ? LEVEL_LABELS[combinedLevel] : null;

  return (
    <div
      className={`rounded-xl border p-4 transition-all ${
        isEmpty
          ? "border-white/5 bg-white/[0.015] opacity-50"
          : "border-[rgba(245,158,11,0.10)] bg-[rgba(13,21,38,0.55)]"
      }`}
    >
      {/* Skill name + meta */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className={`text-sm font-semibold leading-snug ${isEmpty ? "text-white/30" : "text-white/90"}`}>
            {isAr ? skill.name_ar : skill.name_en}
          </p>
          <p className="text-xs text-white/30 mt-0.5">
            {isAr ? skill.name_en : skill.name_ar}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {hasGap && (
            <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-300 border border-yellow-500/25">
              {isAr ? "فجوة" : "Gap"}
            </span>
          )}
          {updatedAt && (
            <span className="text-[10px] text-white/25 hidden sm:block">{updatedAt}</span>
          )}
        </div>
      </div>

      {isEmpty ? (
        <p className="text-xs text-white/20 italic">
          {isAr ? "لا توجد بيانات بعد" : "No data yet"}
        </p>
      ) : (
        <div className="space-y-2">
          {/* Self */}
          <div className="flex items-center gap-3">
            <span className="w-16 text-[10px] font-semibold text-white/35 uppercase tracking-wide flex-shrink-0">
              {isAr ? "ذاتي" : "Self"}
            </span>
            <LevelDots level={selfLevel} color="#F59E0B" />
            {selfLevelLabel && (
              <span className="text-[10px] text-white/35 ms-1">
                {isAr ? selfLevelLabel.ar : selfLevelLabel.en}
              </span>
            )}
          </div>

          {/* Mentor */}
          <div className="flex items-center gap-3">
            <span className="w-16 text-[10px] font-semibold text-white/35 uppercase tracking-wide flex-shrink-0">
              {isAr ? "مرشد" : "Mentor"}
            </span>
            <LevelDots level={mentorLevel} color="#60a5fa" />
            {mentorLevelLabel && (
              <span className="text-[10px] text-white/35 ms-1">
                {isAr ? mentorLevelLabel.ar : mentorLevelLabel.en}
              </span>
            )}
          </div>

          {/* Combined */}
          <div className="flex items-center gap-3">
            <span className="w-16 text-[10px] font-semibold text-white/35 uppercase tracking-wide flex-shrink-0">
              {isAr ? "مجمّع" : "Combined"}
            </span>
            <LevelDots level={combinedLevel} color="#a78bfa" />
            {combinedLevelLabel && (
              <span className="text-[10px] font-semibold ms-1" style={{ color: combinedLevelLabel.color }}>
                {isAr ? combinedLevelLabel.ar : combinedLevelLabel.en}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component (server)
// ---------------------------------------------------------------------------
export default function ClientSkillProfile({ clientSkills, skills, locale }: Props) {
  const isAr = locale === "ar";

  // Build a lookup map: skill_id -> ClientSkill
  const clientSkillMap = new Map<string, ClientSkill>();
  for (const cs of clientSkills) {
    clientSkillMap.set(cs.skill_id, cs);
  }

  // Group skills by dimension, preserving DIMENSION_ORDER
  const grouped: Array<{
    dimension: Dimension;
    label: string;
    skills: Skill[];
  }> = DIMENSION_ORDER.map((dim) => ({
    dimension: dim,
    label: isAr ? DIMENSION_META[dim].label_ar : DIMENSION_META[dim].label_en,
    skills: skills
      .filter((s) => s.dimension === dim && s.is_active)
      .sort((a, b) => a.sort_order - b.sort_order),
  })).filter((g) => g.skills.length > 0);

  // Stats
  const totalSkills = skills.filter((s) => s.is_active).length;
  const filledSkills = clientSkills.filter(
    (cs) => cs.self_level !== null || cs.mentor_level !== null
  ).length;
  const gapCount = clientSkills.filter(
    (cs) =>
      cs.self_level !== null &&
      cs.mentor_level !== null &&
      Math.abs(cs.self_level - cs.mentor_level) >= 2
  ).length;

  return (
    <div className="space-y-8">
      {/* Legend + summary bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Progress */}
        <div className="flex items-center gap-2">
          <div className="text-xs text-white/40">
            {isAr
              ? `${filledSkills} من ${totalSkills} مهارة مكتملة`
              : `${filledSkills} of ${totalSkills} skills filled`}
          </div>
          {gapCount > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-300 border border-yellow-500/25">
              {gapCount} {isAr ? "فجوات" : gapCount === 1 ? "gap" : "gaps"}
            </span>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[10px] text-white/35 font-semibold uppercase tracking-wide">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
            {isAr ? "ذاتي" : "Self"}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#60a5fa]" />
            {isAr ? "مرشد" : "Mentor"}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#a78bfa]" />
            {isAr ? "مجمّع" : "Combined"}
          </span>
        </div>
      </div>

      {/* Dimension groups */}
      {grouped.map(({ dimension, label, skills: dimSkills }) => (
        <div key={dimension}>
          {/* Dimension header */}
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#F59E0B] px-2 py-0.5 rounded bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.15)]">
              {dimension}
            </span>
            <span className="text-sm font-bold text-white/70">{label}</span>
            <span className="flex-1 h-px bg-[rgba(245,158,11,0.08)]" />
          </div>

          {/* Skill grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {dimSkills.map((skill) => (
              <SkillRow
                key={skill.id}
                skill={skill}
                clientSkill={clientSkillMap.get(skill.id) ?? null}
                isAr={isAr}
              />
            ))}
          </div>
        </div>
      ))}

      {grouped.length === 0 && (
        <div className="text-center py-16">
          <p className="text-white/20 text-sm">
            {isAr ? "لا توجد مهارات بعد" : "No skills configured yet"}
          </p>
        </div>
      )}
    </div>
  );
}
