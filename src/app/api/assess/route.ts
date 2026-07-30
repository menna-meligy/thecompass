import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { recommend, zoneFromAvg, KICKSTART_SESSION, type QuizLocale, type Zone } from "@/lib/assess/careerQuiz";

const FEELING_KEYS = ["satisfaction", "clarity", "stuck", "confidence", "momentum"] as const;

const ZONE_LABEL: Record<Zone, { ar: string; en: string }> = {
  needs_care: { ar: "محتاج وقفة مع نفسك", en: "You need a real pause" },
  emerging: { ar: "في بداية الطريق", en: "At the start of the path" },
  steady: { ar: "ماشي ومحتاج دفعة", en: "Steady, and ready for a push" },
  thriving: { ar: "في مكان قوي", en: "In a strong place" },
};

// Rule-based fallback when the AI key isn't configured.
function fallbackFeedback(locale: QuizLocale, zone: Zone, recTitle: string): string {
  const z = ZONE_LABEL[zone][locale];
  if (locale === "ar") {
    return `من إجاباتك، إنت ${z}. الحاجة الكويسة إنك واخد خطوة إنك تفهم نفسك أكتر، وده أصعب جزء. أنسب بداية ليك دلوقتي: ${recTitle}، هيساعدك تحوّل الإحساس ده لخطوات واضحة.`;
  }
  return `From your answers, you're ${z.toLowerCase()}. The good news is you've taken the step of understanding yourself; that's the hardest part. Your best starting point right now: ${recTitle}, which will turn this feeling into clear, doable steps.`;
}

export async function POST(req: NextRequest) {
  try {
    const { answers, locale: rawLocale } = (await req.json()) as {
      answers: Record<string, number>;
      locale: QuizLocale;
    };
    const locale: QuizLocale = rawLocale === "ar" ? "ar" : "en";

    // ── Score the feeling questions ──────────────────────────────────────────
    const scores = FEELING_KEYS.map((k) => (answers?.[k] ?? 0) + 1); // option index → 1–4
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const zone = zoneFromAvg(avg);

    // ── Resolve the recommendation ───────────────────────────────────────────
    const target = recommend(answers?.goal ?? 4);
    let recTitle = "";
    let recBlurb = "";
    let href = "";
    let ctaLabel = "";

    if (target.kind === "workshop" && target.topic) {
      const supabase = await createClient();
      const { data: ws } = await supabase
        .from("workshops")
        .select("id, title_ar, title_en, description_ar, description_en")
        .eq("topic", target.topic)
        .limit(1)
        .maybeSingle();

      if (ws) {
        recTitle = locale === "ar" ? ws.title_ar : ws.title_en;
        recBlurb = locale === "ar" ? ws.description_ar : ws.description_en;
        href = `/${locale}/workshops/${ws.id}`;
        ctaLabel = locale === "ar" ? "اعرف تفاصيل الورشة" : "See the workshop";
      }
    }

    // Session fallback (also used if the topic workshop wasn't found).
    if (!href) {
      const k = KICKSTART_SESSION[locale];
      recTitle = k.name;
      recBlurb = k.tagline;
      href = `/${locale}/book/general`;
      ctaLabel = locale === "ar" ? "احجز جلسة الانطلاقة" : "Book the Kickstart Session";
    }

    // ── AI feedback (graceful fallback when no key) ──────────────────────────
    let feedback = fallbackFeedback(locale, zone, recTitle);
    const key = process.env.ANTHROPIC_API_KEY;
    if (key) {
      try {
        const client = new Anthropic({ apiKey: key });
        const system =
          locale === "ar"
            ? `أنت مدرب مسار مهني دافئ وصادق بيكتب بالعربي العامي المصري. اكتب رسالة قصيرة (٣ لـ ٤ جمل) للمستخدم بعد تقييم مساره. القواعد: تبدأ بتلخيص إحساسه بصدق وتعاطف، بعدين تطمّنه، وتقفل بإنك بترشّحله "${recTitle}" وليه هي المناسبة. من غير وعود مبالغة، من غير مصطلحات طبية، مشجّع وواقعي. ممنوع استخدام الشرطة الطويلة (—) نهائياً.`
            : `You are a warm, honest career coach. Write a short message (3–4 sentences) to a user after a career check-in. Rules: open by honestly and empathetically reflecting how they feel, then reassure them, then close by recommending "${recTitle}" and why it fits. No over-promising, no clinical language, encouraging but realistic. Never use an em dash (—) anywhere in the message.`;
        const userMsg =
          locale === "ar"
            ? `حالة المستخدم: ${ZONE_LABEL[zone].ar}. متوسط تقييمه للمشاعر ${avg.toFixed(1)} من 4. الترشيح ليه: ${recTitle}. اكتب الرسالة بالعامية المصرية فقط.`
            : `User state: ${ZONE_LABEL[zone].en}. Their feeling average is ${avg.toFixed(1)} of 4. Recommended for them: ${recTitle}. Write the message.`;
        const message = await client.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 300,
          system,
          messages: [{ role: "user", content: userMsg }],
        });
        const text = (message.content[0] as { type: string; text: string }).text?.trim();
        if (text) feedback = text;
      } catch {
        // keep fallback
      }
    }

    return NextResponse.json({
      zone,
      zoneLabel: ZONE_LABEL[zone][locale],
      avg: Number(avg.toFixed(1)),
      feedback,
      recommendation: { kind: target.kind, title: recTitle, blurb: recBlurb, href, ctaLabel },
    });
  } catch {
    return NextResponse.json({ error: "assess_failed" }, { status: 500 });
  }
}
