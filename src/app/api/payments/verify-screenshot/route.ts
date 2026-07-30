import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createHash } from "crypto";

const TARGET_PHONE = process.env.NEXT_PUBLIC_INSTAPAY_NUMBER || "01093036736";
// Set this to the account name as it appears (masked) on InstaPay receipts sent to your account
// e.g. "منة ع**** م****" — leave empty to skip name check
const TARGET_NAME = process.env.INSTAPAY_ACCOUNT_NAME || "";

function dateIsToday(extractedDate: string | null): boolean {
  if (!extractedDate) return true;
  try {
    // Handle "DD Mon YYYY" or "DD Mon YYYY HH:MM AM/PM" (InstaPay format)
    const cleaned = extractedDate.trim();
    const parsed = new Date(cleaned);
    if (isNaN(parsed.getTime())) return true;
    const today = new Date();
    return (
      parsed.getFullYear() === today.getFullYear() &&
      parsed.getMonth() === today.getMonth() &&
      parsed.getDate() === today.getDate()
    );
  } catch {
    return true;
  }
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const phone = (form.get("phone") as string) || TARGET_PHONE;
    const bookingId = (form.get("booking_id") as string) || null;

    if (!file || !file.type.startsWith("image/")) {
      return NextResponse.json({ verified: false, error: "Please upload an image file" });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // ── Anti-replay: hash the image and check for prior use ──────────────
    const imageHash = createHash("sha256").update(buffer).digest("hex");
    const supabase = await createClient();

    if (bookingId) {
      const { data: existingPayment } = await supabase
        .from("payments")
        .select("booking_id")
        .eq("gateway_txn_id", `proof_hash:${imageHash}`)
        .neq("booking_id", bookingId)
        .not("status", "eq", "failed")
        .maybeSingle();

      if (existingPayment) {
        return NextResponse.json({
          verified: false,
          error: "duplicate_proof",
          message: "هذا الإيصال مستخدم من قبل. من فضلك ارفع صورة الإيصال الخاص بهذا التحويل",
        });
      }
    }

    // ── OCR verification via OpenAI ───────────────────────────────────────
    const openaiKey = process.env.OPENAI_API_KEY;
    let verified = false;

    if (openaiKey) {
      const base64 = buffer.toString("base64");
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{
            role: "user",
            content: [
              { type: "image_url", image_url: { url: `data:${file.type};base64,${base64}`, detail: "low" } },
              {
                type: "text",
                text: `This is an InstaPay payment receipt. Answer:
1. Is the recipient phone number (shown below "To  Instapay") exactly "${phone}"? true or false
2. What is the full recipient name shown in the "To Instapay" section? (include masked characters as-is)
3. What is the exact date shown after the "Date:" label? (e.g. "09 Jun 2026 04:56 PM")

Respond ONLY with valid JSON:
{"to_matches": true, "to_name": "...", "date": "09 Jun 2026 04:56 PM"}`,
              },
            ],
          }],
          max_tokens: 100,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const rawText = data.choices?.[0]?.message?.content || "";

        let extracted: { to_matches?: boolean; to_name?: string | null; date?: string | null } = {};
        try {
          const jsonMatch = rawText.match(/\{[\s\S]*\}/);
          if (jsonMatch) extracted = JSON.parse(jsonMatch[0]);
        } catch {
          // JSON parse failed — fall through to reject
        }

        if (extracted.to_matches !== true) {
          return NextResponse.json({ verified: false, error: "phone_mismatch" });
        }

        // Name check — only if TARGET_NAME is configured and name was extracted
        if (TARGET_NAME && extracted.to_name) {
          const nameMatch = extracted.to_name
            .replace(/\s+/g, "")
            .includes(TARGET_NAME.replace(/\s+/g, "").slice(0, 4));
          if (!nameMatch) {
            return NextResponse.json({ verified: false, error: "account_mismatch" });
          }
        }

        if (!dateIsToday(extracted.date ?? null)) {
          return NextResponse.json({ verified: false, error: "date_too_old" });
        }
        verified = true;
      }
    }

    // ── Soft fallback: accept if file looks like a real screenshot ────────
    if (!openaiKey) {
      verified = file.size > 20 * 1024;
    }

    // ── Store hash to prevent replay ──────────────────────────────────────
    if (verified && bookingId) {
      await supabase
        .from("payments")
        .update({ gateway_txn_id: `proof_hash:${imageHash}` })
        .eq("booking_id", bookingId)
        .eq("status", "pending");
    }

    return NextResponse.json({ verified, softVerify: !openaiKey });
  } catch {
    return NextResponse.json({ verified: true, softVerify: true });
  }
}
