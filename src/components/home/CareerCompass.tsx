"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Compass, Sparkles, ArrowRight, ArrowLeft, Loader2, RotateCcw, CheckCircle2 } from "lucide-react";
import { CAREER_QUESTIONS } from "@/lib/assess/careerQuiz";

const GOLD = "#F59E0B";
type Phase = "intro" | "quiz" | "loading" | "result";

interface Result {
  zoneLabel: string;
  avg: number;
  feedback: string;
  recommendation: { kind: string; title: string; blurb: string; href: string; ctaLabel: string };
}

export default function CareerCompass() {
  const locale = useLocale();
  const isRtl = locale === "ar";
  const Arrow = isRtl ? ArrowLeft : ArrowRight;

  const [phase, setPhase] = useState<Phase>("intro");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState(false);

  const total = CAREER_QUESTIONS.length;
  const q = CAREER_QUESTIONS[step];

  async function choose(optionIndex: number) {
    const next = { ...answers, [q.id]: optionIndex };
    setAnswers(next);
    if (step < total - 1) {
      setStep(step + 1);
    } else {
      await submit(next);
    }
  }

  async function submit(finalAnswers: Record<string, number>) {
    setPhase("loading");
    setError(false);
    try {
      const res = await fetch("/api/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: finalAnswers, locale }),
      });
      if (!res.ok) throw new Error();
      setResult(await res.json());
      setPhase("result");
    } catch {
      setError(true);
      setPhase("result");
    }
  }

  function restart() {
    setStep(0);
    setAnswers({});
    setResult(null);
    setError(false);
    setPhase("intro");
  }

  return (
    <section className="relative bg-[#0f172a]" style={{ paddingTop: "4.5rem", paddingBottom: "4.5rem", overflow: "hidden" }}>
      {/* Faint compass watermark */}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.04, pointerEvents: "none" }} aria-hidden="true">
        <Compass style={{ width: 520, height: 520, color: GOLD }} strokeWidth={0.5} />
      </div>

      <div style={{ maxWidth: "44rem", margin: "0 auto", padding: "0 1.5rem", position: "relative", textAlign: isRtl ? "right" : "left" }}>
        {/* Section header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "6px 16px", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.28)", color: GOLD, fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", borderRadius: "999px", marginBottom: "1.25rem" }}>
            <Sparkles style={{ width: 14, height: 14 }} />
            {isRtl ? "تقييم مجاني · دقيقتين" : "Free · 2 minutes"}
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-white" style={{ marginBottom: "0.85rem" }}>
            {isRtl ? "بوصلة مسارك" : "Your Career Compass"}
          </h2>
          <p className="text-white/55" style={{ fontSize: "1.02rem", lineHeight: 1.8, maxWidth: "34rem", margin: "0 auto" }}>
            {isRtl
              ? "جاوب ٧ أسئلة سريعة عن شغلك وحياتك، وإحنا عندك نتيجة مخصوصة ليك تساعدك تبدأ طريقك."
              : "Answer 7 quick questions about your career and life, and get a personalized result to help you start your path."}
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: "rgba(30,41,59,0.55)",
            border: "1px solid rgba(245,158,11,0.18)",
            borderRadius: "20px",
            padding: "clamp(1.5rem, 4vw, 2.5rem)",
            backdropFilter: "blur(12px)",
            boxShadow: "0 12px 48px rgba(0,0,0,0.4)",
            minHeight: "260px",
          }}
        >
          <AnimatePresence mode="wait">
            {/* ── INTRO ── */}
            {phase === "intro" && (
              <motion.div key="intro" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} style={{ textAlign: "center" }}>
                <div style={{ width: 72, height: 72, borderRadius: "50%", margin: "0 auto 1.25rem", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(245,158,11,0.12)", border: "1.5px solid rgba(245,158,11,0.35)" }}>
                  <Compass style={{ width: 34, height: 34, color: GOLD }} />
                </div>
                <h3 className="text-white font-black" style={{ fontSize: "1.4rem", marginBottom: "0.6rem" }}>
                  {isRtl ? "فين إنت من مسارك؟" : "Where are you in your career?"}
                </h3>
                <p className="text-white/50" style={{ fontSize: "0.95rem", lineHeight: 1.7, maxWidth: "28rem", margin: "0 auto 1.75rem" }}>
                  {isRtl
                    ? "مافيش إجابات صح أو غلط، بس صراحتك هتديك أوضح صورة."
                    : "There are no right or wrong answers. Your honesty gives the clearest picture."}
                </p>
                <button
                  onClick={() => setPhase("quiz")}
                  style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "14px 32px", borderRadius: "12px", background: GOLD, color: "#0f172a", fontWeight: 900, fontSize: "1rem", border: "none", cursor: "pointer", boxShadow: "0 8px 24px rgba(245,158,11,0.3)" }}
                >
                  {isRtl ? "ابدأ التقييم" : "Start the check-in"}
                  <Arrow style={{ width: 18, height: 18 }} />
                </button>
              </motion.div>
            )}

            {/* ── QUIZ ── */}
            {phase === "quiz" && (
              <motion.div key={`q-${step}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
                {/* Progress */}
                <div style={{ marginBottom: "1.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ color: GOLD, fontWeight: 800, fontSize: "0.78rem" }}>
                      {isRtl ? `سؤال ${step + 1} من ${total}` : `Question ${step + 1} of ${total}`}
                    </span>
                    {step > 0 && (
                      <button onClick={() => setStep(step - 1)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: "0.78rem", cursor: "pointer", fontWeight: 600 }}>
                        {isRtl ? "رجوع" : "Back"}
                      </button>
                    )}
                  </div>
                  <div style={{ height: 6, borderRadius: 999, background: "rgba(148,163,184,0.15)", overflow: "hidden" }}>
                    <motion.div animate={{ width: `${((step + 1) / total) * 100}%` }} transition={{ duration: 0.3 }} style={{ height: "100%", background: `linear-gradient(90deg, ${GOLD}, #FBBF24)`, borderRadius: 999 }} />
                  </div>
                </div>

                <h3 className="text-white font-black" style={{ fontSize: "1.25rem", lineHeight: 1.5, marginBottom: "1.25rem" }}>
                  {isRtl ? q.ar : q.en}
                </h3>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {q.options.map((opt, i) => {
                    const selected = answers[q.id] === i;
                    return (
                      <button
                        key={i}
                        onClick={() => choose(i)}
                        className="cc-option"
                        style={{
                          textAlign: isRtl ? "right" : "left",
                          padding: "14px 18px",
                          borderRadius: "12px",
                          background: selected ? "rgba(245,158,11,0.12)" : "rgba(15,23,42,0.6)",
                          border: `1.5px solid ${selected ? GOLD : "rgba(148,163,184,0.15)"}`,
                          color: selected ? "#fff" : "rgba(255,255,255,0.8)",
                          fontSize: "0.95rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          lineHeight: 1.5,
                        }}
                      >
                        {isRtl ? opt.ar : opt.en}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ── LOADING ── */}
            {phase === "loading" && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ textAlign: "center", padding: "2rem 0" }}>
                <Loader2 className="animate-spin" style={{ width: 40, height: 40, color: GOLD, margin: "0 auto 1.25rem" }} />
                <p className="text-white/70" style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "0.4rem" }}>
                  {isRtl ? "بنحلّل إجاباتك…" : "Reading your answers…"}
                </p>
                <p className="text-white/40" style={{ fontSize: "0.85rem" }}>
                  {isRtl ? "بنجهّز تقييمك المخصّص" : "Preparing your personalized assessment"}
                </p>
              </motion.div>
            )}

            {/* ── RESULT ── */}
            {phase === "result" && (
              <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: isRtl ? "right" : "left" }}>
                {error || !result ? (
                  <div style={{ textAlign: "center", padding: "1rem 0" }}>
                    <p className="text-white/70" style={{ marginBottom: "1rem" }}>
                      {isRtl ? "حصل خطأ بسيط، جرّب تاني." : "Something went wrong, please try again."}
                    </p>
                    <button onClick={restart} style={{ padding: "10px 22px", borderRadius: "10px", background: GOLD, color: "#0f172a", fontWeight: 800, border: "none", cursor: "pointer" }}>
                      {isRtl ? "إعادة" : "Retry"}
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center", marginBottom: "1.25rem" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 16px", borderRadius: "999px", background: "rgba(245,158,11,0.14)", border: "1px solid rgba(245,158,11,0.3)", color: GOLD, fontWeight: 800, fontSize: "0.82rem" }}>
                        <Compass style={{ width: 15, height: 15 }} />
                        {result.zoneLabel}
                      </span>
                    </div>

                    {/* AI feedback */}
                    <p className="text-white/85" style={{ fontSize: "1.05rem", lineHeight: 2, marginBottom: "1.5rem" }}>
                      {result.feedback}
                    </p>

                    {/* Recommendation card */}
                    <div style={{ borderRadius: "16px", padding: "20px", background: "linear-gradient(150deg, rgba(245,158,11,0.12), rgba(15,23,42,0.5))", border: "1px solid rgba(245,158,11,0.35)", marginBottom: "1.25rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", color: GOLD, fontSize: "0.72rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px", flexDirection: isRtl ? "row-reverse" : "row", justifyContent: isRtl ? "flex-end" : "flex-start" }}>
                        <CheckCircle2 style={{ width: 15, height: 15 }} />
                        {result.recommendation.kind === "workshop" ? (isRtl ? "الورشة المناسبة ليك" : "Your best-fit workshop") : (isRtl ? "أنسب بداية ليك" : "Your best first step")}
                      </div>
                      <h4 className="text-white font-black" style={{ fontSize: "1.3rem", marginBottom: "6px" }}>
                        {result.recommendation.title}
                      </h4>
                      <p className="text-white/55" style={{ fontSize: "0.9rem", lineHeight: 1.7, marginBottom: "16px", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {result.recommendation.blurb}
                      </p>
                      <Link
                        href={result.recommendation.href}
                        style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "12px 26px", borderRadius: "10px", background: GOLD, color: "#0f172a", fontWeight: 900, fontSize: "0.92rem", textDecoration: "none" }}
                      >
                        {result.recommendation.ctaLabel}
                        <Arrow style={{ width: 16, height: 16 }} />
                      </Link>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
                      <Link href={`/${locale}/auth`} style={{ color: GOLD, fontWeight: 700, fontSize: "0.85rem", textDecoration: "none" }}>
                        {isRtl ? "اعمل حساب واحفظ نتيجتك ←" : "Sign up to save your result →"}
                      </Link>
                      <button onClick={restart} style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: "0.85rem", cursor: "pointer", fontWeight: 600 }}>
                        <RotateCcw style={{ width: 14, height: 14 }} />
                        {isRtl ? "إعادة التقييم" : "Retake"}
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
