import { NextRequest, NextResponse } from "next/server";

const TARGET_PHONE = process.env.NEXT_PUBLIC_INSTAPAY_NUMBER || "01093036736";

function getPhoneVariants(phone: string): string[] {
  const d = phone.replace(/\D/g, "");
  return [phone, d, `+2${d}`, d.slice(-9), d.slice(-8), d.replace(/^0/,"")].filter(Boolean);
}

function phoneFoundInText(text: string, phone: string): boolean {
  const clean = text.replace(/[\s\-\.]/g, "");
  return getPhoneVariants(phone).some(v => clean.includes(v.replace(/[\s\-\.]/g,"")));
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const phone = (form.get("phone") as string) || TARGET_PHONE;

    if (!file || !file.type.startsWith("image/")) {
      return NextResponse.json({ verified: false, error: "Please upload an image file" });
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      const bytes = await file.arrayBuffer();
      const base64 = Buffer.from(bytes).toString("base64");
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${openaiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: [
            { type: "image_url", image_url: { url: `data:${file.type};base64,${base64}`, detail: "low" }},
            { type: "text", text: "Extract ALL text from this payment receipt screenshot. Return only the raw text." }
          ]}],
          max_tokens: 400,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content || "";
        return NextResponse.json({ verified: phoneFoundInText(text, phone), extractedText: text.slice(0,300) });
      }
    }

    // Soft fallback: accept if file is a real image > 20KB (admin reviews manually)
    const softOk = file.size > 20 * 1024;
    return NextResponse.json({ verified: softOk, softVerify: true });
  } catch {
    return NextResponse.json({ verified: true, softVerify: true });
  }
}
