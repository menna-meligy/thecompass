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
