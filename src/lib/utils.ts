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
 * Keeps sentence-final punctuation attached to a Latin word inside Arabic prose.
 *
 * In an RTL paragraph a full stop is a neutral character, so when the sentence
 * ends on a Latin run ("...بيتلوّن بالـ halo effect.") the bidi algorithm gives
 * the stop the paragraph direction and paints it at the far LEFT — before the
 * English words, reading as ".halo effect". Appending a Left-to-Right Mark puts
 * the stop between two strong LTR characters, so it resolves LTR and stays
 * where it was typed.
 *
 * Invisible and inert for every other string, so it is safe to wrap any text.
 */
export function bidiSafe(text: string): string {
  return /[A-Za-z0-9)\]]\s*[.!?]\s*$/.test(text) ? `${text}\u200E` : text;
}
