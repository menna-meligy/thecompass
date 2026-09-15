import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, locale: string = "ar") {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "PPP", { locale: locale === "ar" ? ar : undefined });
}

export function formatDateTime(date: string | Date, locale: string = "ar") {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "PPp", { locale: locale === "ar" ? ar : undefined });
}

export function formatCurrency(amount: number | null | undefined, locale: string = "ar") {
  const n = amount ?? 0;
  if (locale === "ar") {
    return `${n.toLocaleString("ar-EG")} جنيه`;
  }
  return `${n.toLocaleString("en-EG")} EGP`;
}

export function getLocalizedField<T extends Record<string, unknown>>(
  obj: T,
  field: string,
  locale: string
): string {
  const key = `${field}_${locale}` as keyof T;
  const fallbackKey = `${field}_ar` as keyof T;
  return (obj[key] as string) || (obj[fallbackKey] as string) || "";
}

/**
 * Keeps sentence-final punctuation attached to a Latin run inside Arabic prose.
 *
 * In an RTL paragraph a full stop is a neutral character, so when the sentence
 * ends on Latin text ("...بيتلوّن بالـ halo effect.") the bidi algorithm gives
 * the stop the paragraph direction and paints it at the far LEFT, before the
 * English words — ".halo effect".
 *
 * A Left-to-Right Mark is the usual trick, but it fails as soon as the run ends
 * in a bracket ("(Growth vs Fixed Mindset).") because the paired-bracket rule
 * resolves the brackets first and the stop is still left outside the run. An
 * explicit isolate holds for both, so that is what we use.
 *
 * Only a trailing run with no Arabic in it is wrapped: a sentence that ends on
 * an Arabic word keeps its stop on the left, which is correct Arabic typography.
 * Every other string is returned untouched.
 */
export function bidiSafe(text: string): string {
  return text.replace(
    /([A-Za-z0-9([][^\u0600-\u06FF]*[.!?]+)\s*$/u,
    "\u2066$1\u2069",
  );
}
