/**
 * The catalogue of things a client can actually book.
 *
 * There are exactly two shapes:
 *   • the Career Deciding Session (1-on-1, not tied to a workshop)
 *   • each workshop, bookable either 1-on-1 or as a group cohort
 *
 * Everything — the admin availability screen, the public calendars, and the
 * booking APIs — reads prices and capacities from here so the client, the admin
 * and the server can never disagree about what a slot is or what it costs.
 * Prices are enforced server-side; the browser never gets to name its own price.
 */

export type OfferingType = "career" | "individual" | "group";

export const OFFERING_TYPES: OfferingType[] = ["career", "individual", "group"];

/** EGP. The receipt's OCR'd amount is validated against this. */
export const OFFERING_PRICE: Record<OfferingType, number> = {
  career: 500,
  individual: 500,
  group: 1200,
};

/** How many people one slot can hold for this offering. */
export const OFFERING_CAPACITY: Record<OfferingType, number> = {
  career: 1,
  individual: 1,
  group: 8,
};

export const CAREER_TITLE_AR = "جلسة تحديد المسار الوظيفي";
export const CAREER_TITLE_EN = "Career Deciding Session";

/** Stable key used in URLs, checkboxes and API params. */
export const CAREER_KEY = "career";

export interface WorkshopLite {
  id: string;
  title_ar: string;
  title_en: string;
}

export interface Offering {
  /** "career" | "<workshopId>:individual" | "<workshopId>:group" */
  key: string;
  offeringType: OfferingType;
  workshopId: string | null;
  labelAr: string;
  labelEn: string;
  price: number;
  capacity: number;
}

export function offeringKey(
  offeringType: OfferingType,
  workshopId?: string | null,
): string {
  if (offeringType === "career") return CAREER_KEY;
  return `${workshopId}:${offeringType}`;
}

export function parseOfferingKey(
  key: string | null | undefined,
): { offeringType: OfferingType; workshopId: string | null } | null {
  if (!key) return null;
  if (key === CAREER_KEY) return { offeringType: "career", workshopId: null };
  const [workshopId, type] = key.split(":");
  if (!workshopId || (type !== "individual" && type !== "group")) return null;
  return { offeringType: type, workshopId };
}

export function isOfferingType(value: unknown): value is OfferingType {
  return value === "career" || value === "individual" || value === "group";
}

/** Server-authoritative price. Never trust an amount sent by the browser. */
export function priceFor(offeringType: OfferingType): number {
  return OFFERING_PRICE[offeringType];
}

export function capacityFor(offeringType: OfferingType): number {
  return OFFERING_CAPACITY[offeringType];
}

export function careerOffering(): Offering {
  return {
    key: CAREER_KEY,
    offeringType: "career",
    workshopId: null,
    labelAr: CAREER_TITLE_AR,
    labelEn: CAREER_TITLE_EN,
    price: OFFERING_PRICE.career,
    capacity: OFFERING_CAPACITY.career,
  };
}

export function workshopOfferings(w: WorkshopLite): Offering[] {
  return [
    {
      key: offeringKey("individual", w.id),
      offeringType: "individual",
      workshopId: w.id,
      labelAr: `${w.title_ar} — فردي`,
      labelEn: `${w.title_en} — 1-on-1`,
      price: OFFERING_PRICE.individual,
      capacity: OFFERING_CAPACITY.individual,
    },
    {
      key: offeringKey("group", w.id),
      offeringType: "group",
      workshopId: w.id,
      labelAr: `${w.title_ar} — مجموعة`,
      labelEn: `${w.title_en} — Group`,
      price: OFFERING_PRICE.group,
      capacity: OFFERING_CAPACITY.group,
    },
  ];
}

/** The full list the admin picks from when opening a day. */
export function allOfferings(workshops: WorkshopLite[]): Offering[] {
  return [careerOffering(), ...workshops.flatMap(workshopOfferings)];
}

export function offeringLabel(o: Offering, isAr: boolean): string {
  return isAr ? o.labelAr : o.labelEn;
}

/**
 * What to call the thing being booked in running prose ("سعر الورشة" vs
 * "سعر الجلسة"). A group cohort is a workshop; a 1-on-1 and the career call are
 * sessions. Use this instead of hard-coding "الجلسة" in client-facing copy.
 */
export function offeringNoun(offeringType: OfferingType, isAr: boolean): string {
  if (offeringType === "group") return isAr ? "الورشة" : "the workshop";
  return isAr ? "الجلسة" : "the session";
}

/** Title to show a client / store on a booking, given the resolved workshop. */
export function offeringTitle(
  offeringType: OfferingType,
  workshop: Pick<WorkshopLite, "title_ar" | "title_en"> | null | undefined,
  isAr: boolean,
): string {
  if (offeringType === "career") return isAr ? CAREER_TITLE_AR : CAREER_TITLE_EN;
  if (!workshop) return isAr ? "ورشة" : "Workshop";
  const base = isAr ? workshop.title_ar : workshop.title_en;
  const suffix =
    offeringType === "group"
      ? isAr
        ? "مجموعة"
        : "Group"
      : isAr
        ? "فردي"
        : "1-on-1";
  return `${base} — ${suffix}`;
}
