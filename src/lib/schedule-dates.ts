/**
 * Calendar date helpers.
 *
 * `availability_slots.date` is a plain SQL `date` and `start_time` a plain
 * `time` — both are wall-clock values in Cairo, with no zone attached. The old
 * calendars built their keys with `new Date(y, m, d).toISOString()`, which
 * shifts by the browser's UTC offset and rendered every slot one day early for
 * anyone east of Greenwich (i.e. every user of this product). Everything now
 * goes through these helpers instead.
 */

export const CAIRO_TZ = "Africa/Cairo";

/** "YYYY-MM-DD" for a calendar cell — local fields only, never UTC. */
export function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** "YYYY-MM-DD" for a Date, read in its own local fields. */
export function toISODate(d: Date): string {
  return isoDate(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Postgres may hand back a `date` column as either "2026-09-14" or a full
 * timestamp (node-postgres / PostgREST differ). Normalise to "YYYY-MM-DD".
 */
export function normaliseDate(value: string | null | undefined): string {
  if (!value) return "";
  return value.length >= 10 ? value.slice(0, 10) : value;
}

/** "13:00:00" → "13:00" */
export function shortTime(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 5);
}

/** Today / now as Cairo wall-clock, for deciding what is in the past. */
export function cairoNow(): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CAIRO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  // Intl can emit "24" for midnight in some runtimes.
  const hour = get("hour") === "24" ? "00" : get("hour");

  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${hour}:${get("minute")}:${get("second")}`,
  };
}

/** Is this wall-clock slot already in the past in Cairo? */
export function isPastSlot(date: string, startTime: string): boolean {
  const now = cairoNow();
  const d = normaliseDate(date);
  if (d < now.date) return true;
  if (d > now.date) return false;
  return (startTime || "00:00:00") <= now.time;
}

export function isPastDate(date: string): boolean {
  return normaliseDate(date) < cairoNow().date;
}

/** An ISO timestamp for a Cairo wall-clock slot (Cairo is UTC+2 year-round). */
export function slotStartsAtISO(date: string, startTime: string): string {
  return `${normaliseDate(date)}T${shortTime(startTime) || "00:00"}:00+02:00`;
}

const MONTHS_AR = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];
const MONTHS_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function monthName(month: number, isAr: boolean): string {
  return (isAr ? MONTHS_AR : MONTHS_EN)[month] ?? "";
}

export const WEEKDAYS_AR = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
export const WEEKDAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function weekdays(isAr: boolean): string[] {
  return isAr ? WEEKDAYS_AR : WEEKDAYS_EN;
}

/** Human date for a "YYYY-MM-DD" without dragging it through a timezone. */
export function formatISODate(date: string, isAr: boolean): string {
  const d = normaliseDate(date);
  const [y, m, day] = d.split("-").map(Number);
  if (!y || !m || !day) return d;
  return `${day} ${monthName(m - 1, isAr)} ${y}`;
}
