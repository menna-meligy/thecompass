import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { DIM_LABELS } from "@/lib/compass/templates";
import type { Dimension } from "@/lib/compass/types";

export async function POST(req: NextRequest) {
  try {
    const { topStrength, mainGrowthArea, locale, contextAnswer, intentAnswer } =
      await req.json() as {
        topStrength: Dimension;
        mainGrowthArea: Dimension;
        locale: "ar" | "en";
        contextAnswer?: string;
        intentAnswer?: string;
      };

    const strengthLabel = locale === "ar"
      ? DIM_LABELS[topStrength].ar
      : DIM_LABELS[topStrength].en;
    const growthLabel = locale === "ar"
      ? DIM_LABELS[mainGrowthArea].ar
      : DIM_LABELS[mainGrowthArea].en;

    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) {
      return NextResponse.json({ opening: "" }, { status: 200 });
    }

    const client = new Anthropic({ apiKey: key });

    const contextHint = contextAnswer
      ? (locale === "ar" ? `ما يشغل باله: "${contextAnswer}".` : `What's on their mind: "${contextAnswer}".`)
      : "";
    const intentHint = intentAnswer
      ? (locale === "ar" ? `ما يريد تغييره: "${intentAnswer}".` : `What they want to change: "${intentAnswer}".`)
      : "";

    const systemPrompt = locale === "ar"
      ? `أنت كاتب تطوير ذاتي دافئ وصادق. مهمتك كتابة فقرة افتتاحية قصيرة (جملتان أو ثلاث جمل بالحد الأقصى) لقراءة تقييم شخصي. القواعد الصارمة:
- باللغة العربية العامية المصرية الدافئة
- جملتان أو ثلاث فقط، لا أكثر
- لا مصطلحات طبية أو نفسية سريرية
- لا وعود أو ضمانات
- لا قسوة أو حكم
- يجب أن تذكر نقطة قوة المستخدم الأساسية ومنطقة نموه الرئيسية بوضوح
- صادق لكن مشجع ومليء بالأمل
- ممنوع استخدام الشرطة الطويلة (—) نهائياً في أي مكان من النص`
      : `You are a warm, honest personal-development writer. Your job is to write a short opening paragraph (2–3 sentences maximum) for a personal assessment reading. Strict rules:
- 2–3 sentences only, no more
- No clinical or diagnostic language
- No promises or guarantees
- No harshness or judgment
- Must clearly name the user's top strength and main growth area
- Honest but genuinely encouraging and hopeful
- Never use an em dash (—) anywhere in the text; use a period, comma, or semicolon instead`;

    const userPrompt = locale === "ar"
      ? `اكتب الفقرة الافتتاحية لهذا المستخدم:
- نقطة قوته: ${strengthLabel}
- منطقة نموه الرئيسية: ${growthLabel}
${contextHint}
${intentHint}
الفقرة باللغة العربية العامية المصرية فقط. جملتان أو ثلاث بالحد الأقصى.`
      : `Write the opening paragraph for this user:
- Top strength: ${strengthLabel}
- Main growth area: ${growthLabel}
${contextHint}
${intentHint}
2–3 sentences maximum.`;

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [{ role: "user", content: userPrompt }],
      system: systemPrompt,
    });

    const opening = (message.content[0] as { type: string; text: string }).text?.trim() ?? "";
    return NextResponse.json({ opening });
  } catch {
    return NextResponse.json({ opening: "" }, { status: 200 });
  }
}
