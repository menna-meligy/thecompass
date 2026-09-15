/**
 * Where a confirmed booking actually happens, and when the client may walk in.
 *
 * The link is deliberately NOT shown from the moment payment is approved.
 * Approval answers "is my seat safe?"; the join button answers "where do I go
 * now?". Publishing the link days early buries it in an old screen, invites
 * clients into an empty room ("the link is broken"), and makes it trivial to
 * pass on to someone who never paid. So the seat is confirmed immediately, and
 * the door opens shortly before the session — with the dashboard saying exactly
 * when, so nobody is left wondering.
 */

/** The coach's room. Overridable per booking, or globally via env. */
export const DEFAULT_MEET_LINK =
  process.env.NEXT_PUBLIC_DEFAULT_MEET_LINK || "https://meet.google.com/kcv-icuc-ovm";

/** How long before the start time the join button appears. */
export const JOIN_OPENS_MINUTES = 15;
/** How long after the start time it stays up, so a late client still gets in. */
export const JOIN_CLOSES_MINUTES = 120;

export function meetingLink(bookingLink?: string | null): string {
  const own = (bookingLink ?? "").trim();
  return own.startsWith("http") ? own : DEFAULT_MEET_LINK;
}

export type JoinState = "too_early" | "open" | "over";

/** Where `now` sits relative to the join window for a session starting at `startsAt`. */
export function joinState(startsAt: string | Date, now: Date = new Date()): JoinState {
  const start = startsAt instanceof Date ? startsAt.getTime() : new Date(startsAt).getTime();
  if (Number.isNaN(start)) return "too_early";
  const ms = start - now.getTime();
  if (ms > JOIN_OPENS_MINUTES * 60_000) return "too_early";
  if (-ms > JOIN_CLOSES_MINUTES * 60_000) return "over";
  return "open";
}

/** "قبل الميعاد بربع ساعة" — one sentence, used wherever we promise the link. */
export function linkAppearsNote(isAr: boolean): string {
  return isAr
    ? `لينك الجلسة هيظهر هنا قبل الميعاد بـ${JOIN_OPENS_MINUTES} دقيقة، وهيوصلك كمان على الإيميل.`
    : `The join link appears here ${JOIN_OPENS_MINUTES} minutes before the session, we'll email it to you too.`;
}
