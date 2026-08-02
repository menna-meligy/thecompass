// Receipt OCR + validation for manual InstaPay / Vodafone Cash transfers.
// Uses Tesseract (traditional OCR — no external AI/API). Extracts amount, date,
// and reference number, then validates against the booking's price + today.

export interface ParsedReceipt {
  amount: number | null;
  date: Date | null;
  reference: string | null;
}

const AR = "٠١٢٣٤٥٦٧٨٩";
const normDigits = (s: string) => s.replace(/[٠-٩]/g, (d) => String(AR.indexOf(d)));

/** Parse amount / date / reference from OCR text (works for InstaPay + Vodafone Cash). */
export function parseReceipt(rawText: string): ParsedReceipt {
  const flat = normDigits(rawText).replace(/\n/g, " ");

  // Amount: a number adjacent to EGP / LE / جنيه / ج.م
  let amount: number | null = null;
  const m =
    flat.match(/(\d[\d,]*(?:\.\d+)?)\s*(?:EGP|LE|جنيه|ج\.?\s?م)/i) ||
    flat.match(/(?:EGP|LE|جنيه)\s*(\d[\d,]*(?:\.\d+)?)/i);
  if (m) amount = parseFloat(m[1].replace(/,/g, ""));

  // Date: "02 Aug 2026" | "2026-08-02" | "02/08/2026"
  let date: Date | null = null;
  const d = flat.match(/(\d{1,2}\s+[A-Za-z]{3,}\s+\d{4})|(\d{4}-\d{2}-\d{2})|(\d{1,2}\/\d{1,2}\/\d{4})/);
  if (d) {
    const parsed = new Date(d[0] + " 12:00:00");
    if (!isNaN(parsed.getTime())) date = parsed;
  }

  // Reference: label-independent — longest digit run (>=8) that is not the amount
  // and not an Egyptian mobile number (01xxxxxxxxx, i.e. the recipient).
  const amtStr = amount != null ? String(Math.round(amount)) : null;
  const runs = (flat.match(/\d{6,}/g) || []).filter(
    (x) => x !== amtStr && !/^01\d{9}$/.test(x) && x.length >= 8
  );
  runs.sort((a, b) => b.length - a.length);
  const reference = runs[0] || null;

  return { amount, date, reference };
}

/** Returns a list of validation error codes ([] means valid). */
export function validateReceipt(
  p: ParsedReceipt,
  opts: { expectedAmount: number; now?: Date; maxAgeDays?: number }
): string[] {
  const now = opts.now ?? new Date();
  const maxAge = opts.maxAgeDays ?? 2;
  const errors: string[] = [];

  if (p.amount == null) errors.push("amount_unreadable");
  else if (Math.round(p.amount) !== Math.round(opts.expectedAmount)) errors.push("amount_mismatch");

  if (p.date == null) errors.push("date_unreadable");
  else {
    const ageDays = (now.getTime() - p.date.getTime()) / 86_400_000;
    if (ageDays > maxAge) errors.push("date_too_old");
    else if (ageDays < -1) errors.push("date_future");
  }

  if (!p.reference) errors.push("reference_missing");

  return errors;
}

/** Run OCR on an image buffer (server-side). Reads with two page-seg modes for coverage. */
export async function ocrReceipt(buffer: Buffer, mimeType: string): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const dataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;
  // On Vercel only /tmp is writable — cache the language data there.
  const cachePath = "/tmp";
  let out = "";
  for (const psm of ["3", "11"]) {
    const worker = await createWorker("eng", 1, { cachePath });
    await worker.setParameters({ tessedit_pageseg_mode: psm as never });
    const { data: { text } } = await worker.recognize(dataUrl);
    await worker.terminate();
    out += "\n" + text;
  }
  return out;
}
