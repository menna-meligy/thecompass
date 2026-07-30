import { type ReactNode } from "react";

export function PageHeader({
  supra,
  title,
  subtitle,
  action,
}: {
  supra?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6 mb-8">
      <div className="min-w-0">
        {supra && (
          <p className="text-xs font-bold uppercase tracking-widest text-[#F59E0B] mb-1">
            {supra}
          </p>
        )}
        <h1 className="text-2xl font-black text-white leading-tight">{title}</h1>
        {subtitle && (
          <p className="text-sm text-white/40 mt-1.5">{subtitle}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0 pt-1">{action}</div>}
    </div>
  );
}

export const darkInputClass =
  "w-full bg-[#162032] border border-[rgba(148,163,184,0.12)] text-white placeholder-white/30 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[rgba(245,158,11,0.15)] transition-all";

export const darkLabelClass = "block text-sm font-medium text-white/60 mb-1.5";

export const TOPIC_LABELS: Record<string, { ar: string; en: string }> = {
  "productivity":           { ar: "الإنتاجية",          en: "Productivity" },
  "personal-development":   { ar: "التطوير الشخصي",     en: "Personal Development" },
  "communication":          { ar: "التواصل",             en: "Communication" },
  "leadership":             { ar: "القيادة",             en: "Leadership" },
  "mindset":                { ar: "العقلية",             en: "Mindset" },
  "career":                 { ar: "المسيرة المهنية",    en: "Career" },
  "confidence":             { ar: "الثقة بالنفس",       en: "Confidence" },
  "stress-management":      { ar: "إدارة الضغط",        en: "Stress Management" },
  "time-management":        { ar: "إدارة الوقت",        en: "Time Management" },
  "relationships":          { ar: "العلاقات",           en: "Relationships" },
};
