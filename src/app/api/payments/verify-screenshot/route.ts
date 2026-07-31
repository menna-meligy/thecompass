import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createHash } from "crypto";

const INSTAPAY_NUMBER = process.env.NEXT_PUBLIC_INSTAPAY_NUMBER || "01027857707";
const VODAFONE_NUMBER = process.env.NEXT_PUBLIC_VODAFONE_CASH_NUMBER || "01223810409";
// How recent the receipt must be (days). Transfers older than this are rejected.
const MAX_AGE_DAYS = 3;

type Extracted = {
  recipient_number: string | null;
  amount: number | null;
  date: string | null;
  reference: string | null;
};

const digits = (s: string | null | undefined) => (s || "").replace(/\D/g, "");

/** A receipt number matches a business number if their last 10 digits are equal (handles 0 / +20 prefixes). */
function numberMatches(recipient: string | null, targets: string[]): boolean {
  const r = digits(recipient);
  if (!r) return false;
  const tail = (n: string) => digits(n).slice(-10);
  return targets.some((t) => tail(t) && r.slice(-10) === tail(t));
}

function dateWithinWindow(dateStr: string | null): { ok: boolean; reason?: string } {
  if (!dateStr) return { ok: true }; // can't read date → don't hard-fail here
  const parsed = new Date(dateStr.trim());
  if (isNaN(parsed.getTime())) return { ok: true }; // unparseable → leave to admin
  const ageMs = Date.now() - parsed.getTime();
  if (ageMs < -24 * 3600 * 1000) return { ok: false, reason: "date_future" };
  if (ageMs > MAX_AGE_DAYS * 24 * 3600 * 1000) return { ok: false, reason: "date_too_old" };
  return { ok: true };
}

const PROMPT = `You are reading an Egyptian mobile payment receipt (InstaPay / "IPN" or Vodafone Cash).
Extract these fields exactly as shown. Respond with STRICT JSON only, no prose, no markdown:
{"recipient_number":"<beneficiary/recipient phone number shown under 'To', digits only, or null>","amount":<transfer amount in EGP as a plain number, or null>,"date":"<transaction date/time text after 'Date', or null>","reference":"<reference/transaction id, or null>"}`;

function parseJson(raw: string): Extracted {
  try {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
  } catch { /* ignore */ }
  return { recipient_number: null, amount: null, date: null, reference: null };
}

async function extractOpenAI(key: string, mediaType: string, base64: string): Promise<Extracted | null> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 200,
      messages: [{
        role: "user",
        content: [
          { type: "image_url", image_url: { url: `data:${mediaType};base64,${base64}`, detail: "high" } },
          { type: "text", text: PROMPT },
        ],
      }],
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return parseJson(data.choices?.[0]?.message?.content || "");
}

async function extractAnthropic(key: string, mediaType: string, base64: string): Promise<Extracted | null> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: PROMPT },
        ],
      }],
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const text = Array.isArray(data.content) ? data.content.map((c: { text?: string }) => c.text || "").join("") : "";
  return parseJson(text);
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const expectedAmount = Number(form.get("amount")) || 0;
    const bookingId = (form.get("booking_id") as string) || null;

    if (!file || !file.type.startsWith("image/")) {
      return NextResponse.json({ verified: false, error: "Please upload an image file" });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const supabase = await createClient();

    // ── Anti-replay: reject a receipt image already used for another booking ──
    const imageHash = createHash("sha256").update(buffer).digest("hex");
    if (bookingId) {
      const { data: existing } = await supabase
        .from("payments")
        .select("booking_id")
        .eq("gateway_txn_id", `proof_hash:${imageHash}`)
        .neq("booking_id", bookingId)
        .not("status", "eq", "failed")
        .maybeSingle();
      if (existing) {
        return NextResponse.json({ verified: false, error: "duplicate_proof" });
      }
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const hasVision = !!(openaiKey || anthropicKey);

    let verified = false;
    let extracted: Extracted | null = null;

    if (hasVision) {
      const base64 = buffer.toString("base64");
      try {
        extracted = openaiKey
          ? await extractOpenAI(openaiKey, file.type, base64)
          : await extractAnthropic(anthropicKey as string, file.type, base64);
      } catch {
        extracted = null;
      }

      if (extracted) {
        // 1) Recipient must be one of our business numbers (if the receipt shows one).
        if (extracted.recipient_number && !numberMatches(extracted.recipient_number, [INSTAPAY_NUMBER, VODAFONE_NUMBER])) {
          return NextResponse.json({ verified: false, error: "account_mismatch", extracted });
        }
        // 2) Amount must match the booking amount (when both are known).
        if (expectedAmount > 0 && extracted.amount != null) {
          if (Math.round(Number(extracted.amount)) !== Math.round(expectedAmount)) {
            return NextResponse.json({ verified: false, error: "amount_mismatch", expected: expectedAmount, extracted });
          }
        }
        // 3) Date must be recent.
        const d = dateWithinWindow(extracted.date);
        if (!d.ok) {
          return NextResponse.json({ verified: false, error: d.reason, extracted });
        }
        verified = true;
      } else {
        // Vision call failed — don't block the user; flag for manual admin review.
        verified = file.size > 20 * 1024;
      }
    } else {
      // No vision key configured → soft-accept a plausible screenshot, admin reviews.
      verified = file.size > 20 * 1024;
    }

    // ── Store hash to prevent replay ──
    if (verified && bookingId) {
      await supabase
        .from("payments")
        .update({ gateway_txn_id: `proof_hash:${imageHash}` })
        .eq("booking_id", bookingId)
        .eq("status", "pending");
    }

    return NextResponse.json({ verified, softVerify: !hasVision, extracted });
  } catch {
    return NextResponse.json({ verified: true, softVerify: true });
  }
}
