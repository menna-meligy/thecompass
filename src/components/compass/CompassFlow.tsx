"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Compass, RotateCcw, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { QUESTIONS } from "@/lib/compass/questions";
import { assembleResult } from "@/lib/compass/scoring";
import type { AssessmentResult } from "@/lib/compass/types";
import { RECOMMENDATION_COPY, DIM_LABELS, ZONE_LABELS } from "@/lib/compass/templates";
import { CompassDial } from "./CompassDial";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const LS_KEY = "compass_v1_progress";
type FlowState = "intro" | "flow" | "computing" | "result";

// Renders "**bold**" segments as <strong> — the fallback opening templates use
// this markdown-style emphasis, but the text is otherwise displayed as plain text.
function renderBold(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

interface Props {
  locale: "ar" | "en";
  userId?: string;
  existingResult?: AssessmentResult | null;
}

export function CompassFlow({ locale, userId, existingResult }: Props) {
  const isAr = locale === "ar";
  const ChevronIcon = isAr ? ArrowLeft : ArrowRight;

  const [flowState, setFlowState] = useState<FlowState>(() =>
    existingResult ? "result" : "intro"
  );
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [contextOptionIdx, setContextOptionIdx] = useState<number | null>(null);
  const [intentOptionIdx, setIntentOptionIdx] = useState<number | null>(null);
  const [result, setResult] = useState<AssessmentResult | null>(existingResult ?? null);
  const [hasSavedProgress, setHasSavedProgress] = useState(false);

  useEffect(() => {
    if (existingResult) return;
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.answers && Object.keys(saved.answers).length > 0) {
          setHasSavedProgress(true);
        }
      }
    } catch {}
  }, [existingResult]);

  const saveProgress = useCallback(
    (idx: number, ans: Record<string, number>, ctxIdx: number | null, intIdx: number | null) => {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify({ currentIdx: idx, answers: ans, contextOptionIdx: ctxIdx, intentOptionIdx: intIdx }));
      } catch {}
    },
    []
  );

  const clearProgress = useCallback(() => {
    try { localStorage.removeItem(LS_KEY); } catch {}
    setHasSavedProgress(false);
  }, []);

  const startFresh = () => {
    clearProgress();
    setCurrentIdx(0);
    setAnswers({});
    setContextOptionIdx(null);
    setIntentOptionIdx(null);
    setFlowState("flow");
  };

  const resumeProgress = () => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        setCurrentIdx(saved.currentIdx ?? 0);
        setAnswers(saved.answers ?? {});
        setContextOptionIdx(saved.contextOptionIdx ?? null);
        setIntentOptionIdx(saved.intentOptionIdx ?? null);
      }
    } catch {}
    setFlowState("flow");
  };

  const handleAnswer = async (optionIdx: number) => {
    const question = QUESTIONS[currentIdx];
    const option = question.options[optionIdx];
    const newAnswers = { ...answers };
    if (question.scored) newAnswers[question.id] = option.score;
    let newCtxIdx = contextOptionIdx;
    let newIntIdx = intentOptionIdx;
    if (question.dimension === "CONTEXT") newCtxIdx = optionIdx;
    if (question.dimension === "INTENT") newIntIdx = optionIdx;
    const nextIdx = currentIdx + 1;
    if (nextIdx >= QUESTIONS.length) {
      setAnswers(newAnswers);
      setContextOptionIdx(newCtxIdx);
      setIntentOptionIdx(newIntIdx);
      clearProgress();
      await runCompute(newAnswers, newCtxIdx, newIntIdx);
    } else {
      setAnswers(newAnswers);
      setContextOptionIdx(newCtxIdx);
      setIntentOptionIdx(newIntIdx);
      setCurrentIdx(nextIdx);
      saveProgress(nextIdx, newAnswers, newCtxIdx, newIntIdx);
    }
  };

  const runCompute = async (
    finalAnswers: Record<string, number>,
    ctxIdx: number | null,
    intIdx: number | null
  ) => {
    setFlowState("computing");
    // Fully deterministic reading — no AI. The opening is composed from the
    // computed scores (zone + top strength + growth area) in assembleResult.
    const finalResult = assembleResult(finalAnswers, intIdx ?? undefined);
    if (userId) {
      try {
        const supabase = createClient();
        await supabase.from("assessments").insert({
          client_id: userId,
          locale,
          completed_at: new Date().toISOString(),
          dimension_scores: finalResult.dimensionScores as unknown as Record<string, number>,
          happiness_score: finalResult.happinessScore,
          recommended_type: finalResult.recommendation.type,
          result_snapshot: finalResult as unknown as Record<string, unknown>,
        });
      } catch {}
    }
    setResult(finalResult);
    setFlowState("result");
  };

  const handleRetake = () => {
    clearProgress();
    setResult(null);
    setCurrentIdx(0);
    setAnswers({});
    setContextOptionIdx(null);
    setIntentOptionIdx(null);
    setFlowState("intro");
  };

  // ── Shared wrappers ──────────────────────────────────────────────────────────

  const PageWrap = ({ children }: { children: React.ReactNode }) => (
    <div className="max-w-xl mx-auto px-4 py-10">{children}</div>
  );

  // ── INTRO ────────────────────────────────────────────────────────────────────

  if (flowState === "intro") {
    return (
      <PageWrap>
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-[rgba(245,158,11,0.12)] border border-[rgba(245,158,11,0.2)] flex items-center justify-center mx-auto mb-6">
            <Compass className="h-8 w-8 text-[#F59E0B]" />
          </div>
          <div className="w-10 h-0.5 bg-[#F59E0B] rounded-full mx-auto mb-4" />
          <h1 className="text-3xl font-extrabold text-white mb-3">
            {isAr ? "بوصلتك" : "Your Compass"}
          </h1>
          <p className="text-white/55 text-sm leading-relaxed max-w-sm mx-auto">
            {isAr
              ? "تقييم شخصي صادق في 21 سؤال: يكشف انت فين دلوقتي في 6 محاور من حياتك، ويوجّهك للخطوة اللي تناسبك."
              : "An honest self-assessment in 21 questions: reveals where you stand across 6 life dimensions and points you to what fits next."}
          </p>
        </div>

        {hasSavedProgress && (
          <div className="mb-5 bg-[rgba(245,158,11,0.06)] border border-[rgba(245,158,11,0.25)] rounded-2xl p-5 text-center">
            <p className="text-white/65 text-sm mb-4">
              {isAr ? "عندك تقييم ناقص، تكمّل من حيث وقفت؟" : "You have an incomplete assessment. Continue from where you left off?"}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={resumeProgress}
                className="bg-[#F59E0B] hover:bg-[#E88F00] text-[#0f172a] font-bold px-6 py-2.5 rounded-xl text-sm transition-colors"
              >
                {isAr ? "متابعة" : "Resume"}
              </button>
              <button
                onClick={startFresh}
                className="text-white/50 hover:text-white/80 text-sm transition-colors px-4 py-2.5"
              >
                {isAr ? "بدء من الأول" : "Start over"}
              </button>
            </div>
          </div>
        )}

        {!hasSavedProgress && (
          <button
            onClick={startFresh}
            className="w-full bg-[#F59E0B] hover:bg-[#E88F00] text-[#0f172a] font-extrabold py-4 rounded-2xl text-lg transition-colors flex items-center justify-center gap-2"
          >
            {isAr ? "ابدأ" : "Start"}
            <ChevronIcon className="h-5 w-5" />
          </button>
        )}

        <p className="text-center text-white/30 text-xs mt-6">
          {isAr
            ? "مفيش إجابات صح أو غلط، كن صادق مع نفسك."
            : "There are no right or wrong answers, just be honest with yourself."}
        </p>
      </PageWrap>
    );
  }

  // ── FLOW ─────────────────────────────────────────────────────────────────────

  if (flowState === "flow") {
    const question = QUESTIONS[currentIdx];
    const scoredDone = Object.keys(answers).length;
    const scoredTotal = 21;
    const progressPct = Math.min(100, Math.round((scoredDone / scoredTotal) * 100));
    const isLast = currentIdx === QUESTIONS.length - 1;
    const isContext = question.dimension === "CONTEXT";
    const isIntent = question.dimension === "INTENT";
    const displayNum = isContext
      ? null
      : isIntent
      ? null
      : scoredDone + 1;

    return (
      <div className="max-w-xl mx-auto px-4 py-8">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/35 font-medium">
              {isContext || isIntent
                ? isAr ? "سؤال توجيهي" : "Orientation"
                : isAr
                ? `${scoredDone} من ${scoredTotal}`
                : `${scoredDone} of ${scoredTotal}`}
            </span>
            {!isContext && !isIntent && (
              <span className="text-xs text-[#F59E0B] font-bold">{progressPct}%</span>
            )}
          </div>
          <div className="h-1 bg-white/8 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#F59E0B] rounded-full transition-all duration-500"
              style={{ width: `${isContext ? 0 : isIntent ? 100 : progressPct}%` }}
            />
          </div>
        </div>

        {/* Question card */}
        <div className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.12)] rounded-2xl p-6 sm:p-8 mb-4">
          {displayNum && (
            <div className="text-xs text-[#F59E0B]/60 font-semibold uppercase tracking-widest mb-4">
              {isAr ? `سؤال ${displayNum}` : `Question ${displayNum}`}
            </div>
          )}
          <p className="text-white text-lg sm:text-xl font-semibold leading-relaxed mb-8">
            {isAr ? question.text_ar : question.text_en}
          </p>

          <div className="flex flex-col gap-3">
            {question.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleAnswer(idx)}
                className={cn(
                  "w-full text-start px-5 py-4 rounded-xl border text-sm font-medium transition-all",
                  "bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.08)] text-white/75",
                  "hover:bg-[rgba(245,158,11,0.08)] hover:border-[rgba(245,158,11,0.35)] hover:text-white",
                  "active:scale-[0.99]"
                )}
              >
                {isAr ? option.label_ar : option.label_en}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom row */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleRetake}
            className="text-white/25 hover:text-white/50 text-xs transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="h-3 w-3" />
            {isAr ? "إعادة" : "Restart"}
          </button>
          {isLast && (
            <span className="text-xs text-white/30">
              {isAr ? "آخر سؤال" : "Last question"}
            </span>
          )}
        </div>
      </div>
    );
  }

  // ── COMPUTING ────────────────────────────────────────────────────────────────

  if (flowState === "computing") {
    return (
      <PageWrap>
        <div className="text-center py-16">
          <div className="relative w-20 h-20 mx-auto mb-8">
            <div className="absolute inset-0 rounded-full border-2 border-[rgba(245,158,11,0.15)]" />
            <div className="absolute inset-0 rounded-full border-2 border-t-[#F59E0B] border-x-transparent border-b-transparent animate-spin" />
            <div className="absolute inset-3 flex items-center justify-center">
              <Compass className="h-7 w-7 text-[#F59E0B]" />
            </div>
          </div>
          <p className="text-white font-semibold text-lg mb-2">
            {isAr ? "جاري تجهيز تقييمك..." : "Preparing your assessment..."}
          </p>
          <p className="text-white/35 text-sm">
            {isAr ? "بنحسب نقاط قوتك ومجالات النمو" : "Calculating your strengths and growth areas"}
          </p>
        </div>
      </PageWrap>
    );
  }

  // ── RESULT ───────────────────────────────────────────────────────────────────

  if (flowState === "result" && result) {
    const r = result;
    const recCopy = RECOMMENDATION_COPY[
      r.recommendation.type === "session" ? "session" : (r.recommendation.dimension ?? "PRD")
    ];
    const zoneColors: Record<string, string> = {
      needs_care: "text-red-400 bg-red-500/10 border-red-500/20",
      emerging: "text-amber-400 bg-amber-500/10 border-amber-500/20",
      steady: "text-blue-300 bg-blue-500/10 border-blue-500/15",
      thriving: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    };

    const ctaHref =
      r.recommendation.type === "session"
        ? `/${locale}/book/general`
        : `/${locale}/workshops?topic=${r.recommendation.workshopTopic ?? ""}`;

    return (
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
        {/* Header */}
        <div>
          <div className="w-10 h-0.5 bg-[#F59E0B] rounded-full mb-4" />
          <h1 className="text-3xl font-extrabold text-white mb-1">
            {isAr ? "بوصلتك" : "Your Compass"}
          </h1>
          <p className="text-white/40 text-sm">
            {isAr ? "تقييمك الشخصي" : "Your personal assessment"}
          </p>
        </div>

        {/* Opening paragraph */}
        <div className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.18)] border-s-2 rounded-2xl p-6"
          style={{ borderInlineStartColor: "#F59E0B", borderInlineStartWidth: "3px" }}>
          <p className="text-white/90 text-sm leading-7 italic">
            {renderBold(isAr ? r.opening_ar : r.opening_en)}
          </p>
        </div>

        {/* Compass Dial + happiness score */}
        <div className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.12)] rounded-2xl p-6 flex flex-col items-center gap-6">
          <CompassDial reads={r.dimensionReads} locale={locale} size={260} />
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.2)] rounded-xl px-5 py-2.5">
              <span className="text-2xl font-extrabold text-[#F59E0B]">
                {r.happinessScore.toFixed(1)}
              </span>
              <div className="text-start">
                <p className="text-white/70 text-xs font-medium">
                  {isAr ? "مؤشر السعادة الكلي" : "Overall happiness index"}
                </p>
                <p className={cn("text-xs font-semibold", zoneColors[r.happinessZone].split(" ")[0])}>
                  {isAr ? ZONE_LABELS[r.happinessZone].ar : ZONE_LABELS[r.happinessZone].en}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Narrative */}
        <div className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.12)] rounded-2xl p-6">
          <p className="text-white/75 text-sm leading-7">
            {isAr ? r.narrative_ar : r.narrative_en}
          </p>
        </div>

        {/* Dimension reads */}
        <div>
          <h2 className="text-white font-bold text-base mb-4">
            {isAr ? "المحاور الست" : "Six Dimensions"}
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {r.dimensionReads.map((read) => (
              <div
                key={read.dimension}
                className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.08)] rounded-xl p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/80 text-sm font-semibold">
                    {isAr ? read.label_ar : read.label_en}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[#F59E0B] font-bold text-sm">{read.score.toFixed(1)}</span>
                    <span
                      className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded-full border",
                        zoneColors[read.zone]
                      )}
                    >
                      {isAr ? ZONE_LABELS[read.zone].ar : ZONE_LABELS[read.zone].en}
                    </span>
                  </div>
                </div>
                {/* Score bar */}
                <div className="h-1 bg-white/8 rounded-full mb-3">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${((read.score - 1) / 3) * 100}%`,
                      background: read.zone === "thriving" ? "#10b981"
                        : read.zone === "steady" ? "#60a5fa"
                        : read.zone === "emerging" ? "#F59E0B"
                        : "#ef4444",
                    }}
                  />
                </div>
                <p className="text-white/45 text-xs leading-5">
                  {isAr ? read.read_ar : read.read_en}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendation */}
        {recCopy && (
          <div className="bg-[rgba(13,21,38,0.85)] border border-[rgba(245,158,11,0.3)] rounded-2xl p-6">
            <p className="text-[#F59E0B] text-xs font-semibold uppercase tracking-widest mb-3">
              {isAr ? "توصيتك" : "Your Recommendation"}
            </p>
            <h3 className="text-white font-bold text-lg mb-3">
              {isAr ? recCopy.title.ar : recCopy.title.en}
            </h3>
            <p className="text-white/60 text-sm leading-6 mb-5">
              {isAr ? recCopy.why.ar : recCopy.why.en}
            </p>
            <Link
              href={ctaHref}
              className="inline-flex items-center gap-2 bg-[#F59E0B] hover:bg-[#E88F00] text-[#0f172a] font-bold px-6 py-3 rounded-xl text-sm transition-colors"
            >
              {r.recommendation.type === "session"
                ? (isAr ? "احجزي جلستك" : "Book a session")
                : (isAr ? "استعرضي الورشة" : "View workshop")}
              <ChevronIcon className="h-4 w-4" />
            </Link>
          </div>
        )}

        {/* Micro-action */}
        <div className="bg-[rgba(255,255,255,0.03)] border border-white/8 rounded-2xl p-5">
          <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-2">
            {isAr ? "خطوة الآن" : "One step now"}
          </p>
          <p className="text-white/75 text-sm leading-6">
            {isAr ? r.microAction_ar : r.microAction_en}
          </p>
        </div>

        {/* Retake */}
        <div className="text-center pt-2 pb-8">
          <button
            onClick={handleRetake}
            className="inline-flex items-center gap-2 text-white/30 hover:text-white/60 text-sm transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {isAr ? "إعادة التقييم" : "Retake assessment"}
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export default CompassFlow;
