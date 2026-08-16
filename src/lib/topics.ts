/** Localised labels for workshop topic slugs (used by cards, filters, detail, admin). */
export const TOPIC_LABELS: Record<string, { ar: string; en: string }> = {
  "career-discovery": { ar: "اكتشاف المسار", en: "Career Discovery" },
  "career-change": { ar: "تغيير المسار", en: "Career Change" },
  scholarships: { ar: "المنح الدراسية", en: "Scholarships" },
  "personal-growth": { ar: "تطوير الذات", en: "Personal Growth" },
  productivity: { ar: "الإنتاجية", en: "Productivity" },
};

export function topicLabel(topic: string | null | undefined, locale: string): string {
  if (!topic) return "";
  const m = TOPIC_LABELS[topic];
  if (m) return locale === "ar" ? m.ar : m.en;
  // Fallback: prettify an unknown slug ("some-topic" → "Some topic").
  const pretty = topic.replace(/-/g, " ");
  return pretty.charAt(0).toUpperCase() + pretty.slice(1);
}
