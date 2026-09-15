"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";

export interface SessionAnswers {
  experience_level: "beginner" | "intermediate" | "advanced" | "";
  career_goals: string;
  main_challenge: string;
  learning_style: "practical" | "theoretical" | "mixed" | "";
  time_commitment: string;
}

interface SessionQuestionnaireProps {
  onComplete: (answers: SessionAnswers) => void;
  onBack?: () => void;
  isAr: boolean;
}

const EXPERIENCE_LEVELS = [
  { value: "beginner", labelEn: "Just starting out", labelAr: "بادئ جديد" },
  { value: "intermediate", labelEn: "Some experience", labelAr: "لديّ بعض الخبرة" },
  { value: "advanced", labelEn: "Highly experienced", labelAr: "متقدم الخبرة" },
];

const LEARNING_STYLES = [
  { value: "practical", labelEn: "Hands-on & practical", labelAr: "عملي وتطبيقي" },
  { value: "theoretical", labelEn: "Theory & concepts", labelAr: "نظري ومفاهيمي" },
  { value: "mixed", labelEn: "Mix of both", labelAr: "مزيج من الاثنين" },
];

export default function SessionQuestionnaire({
  onComplete,
  onBack,
  isAr,
}: SessionQuestionnaireProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<SessionAnswers>({
    experience_level: "",
    career_goals: "",
    main_challenge: "",
    learning_style: "",
    time_commitment: "",
  });

  const questions = [
    {
      id: "experience_level",
      titleEn: "What's your career experience level?",
      titleAr: "ما مستوى خبرتك المهنية؟",
      type: "choice",
      options: EXPERIENCE_LEVELS,
    },
    {
      id: "career_goals",
      titleEn: "What are your career goals for the next 1-2 years?",
      titleAr: "ما أهدافك الوظيفية للسنة أو السنتين القادمة؟",
      type: "text",
      placeholder: isAr
        ? "مثال: الحصول على ترقية، تغيير المسار الوظيفي..."
        : "e.g., Get a promotion, change careers...",
    },
    {
      id: "main_challenge",
      titleEn: "What's your biggest career challenge right now?",
      titleAr: "ما أكبر تحدي وظيفي تواجهه حالياً؟",
      type: "text",
      placeholder: isAr
        ? "مثال: عدم الثقة، عدم التوازن بين العمل والحياة..."
        : "e.g., Lack of confidence, work-life balance...",
    },
    {
      id: "learning_style",
      titleEn: "How do you prefer to learn?",
      titleAr: "كيف تفضل أن تتعلم؟",
      type: "choice",
      options: LEARNING_STYLES,
    },
    {
      id: "time_commitment",
      titleEn: "How much time can you dedicate weekly?",
      titleAr: "كم ساعة يمكنك تخصيصها أسبوعياً؟",
      type: "text",
      placeholder: isAr
        ? "مثال: ساعة واحدة، ساعتان..."
        : "e.g., 1 hour, 2 hours...",
    },
  ];

  const currentQuestion = questions[step];
  const progress = ((step + 1) / questions.length) * 100;

  const handleNext = () => {
    const currentFieldId = currentQuestion.id as keyof SessionAnswers;

    if (
      currentQuestion.type === "choice" &&
      !answers[currentFieldId as keyof SessionAnswers]
    ) {
      return;
    }

    if (step < questions.length - 1) {
      setStep(step + 1);
    } else {
      onComplete(answers);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    } else if (onBack) {
      onBack();
    }
  };

  const updateAnswer = (value: string | boolean) => {
    const fieldId = currentQuestion.id as keyof SessionAnswers;
    setAnswers({ ...answers, [fieldId]: value });
  };

  const isStepValid = () => {
    const fieldId = currentQuestion.id as keyof SessionAnswers;
    const value = answers[fieldId];

    if (currentQuestion.type === "choice") {
      return value && value !== "";
    }
    return value && String(value).trim() !== "";
  };

  return (
    <div className="min-h-screen bg-[#0f172a] p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white mb-2">
            {isAr ? "تعرّف علينا بنفسك" : "Get to Know You"}
          </h1>
          <p className="text-white/50 text-sm">
            {isAr
              ? "سنسأل بعض الأسئلة لنفهم احتياجاتك بشكل أفضل"
              : "We'll ask a few questions to understand your needs better"}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-white/70">
              {isAr ? `السؤال ${step + 1} من ${questions.length}` : `Question ${step + 1} of ${questions.length}`}
            </span>
            <span className="text-xs font-semibold text-amber-300">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-amber-300 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <div className="mb-8">
          <h2 className="text-xl md:text-2xl font-bold text-white mb-6">
            {isAr ? currentQuestion.titleAr : currentQuestion.titleEn}
          </h2>

          {/* Choice options */}
          {currentQuestion.type === "choice" && (
            <div className="space-y-3">
              {currentQuestion.options?.map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateAnswer(option.value)}
                  className={`w-full p-4 rounded-lg border transition ${
                    answers[currentQuestion.id as keyof SessionAnswers] === option.value
                      ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                      : "bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-left">
                      {isAr ? option.labelAr : option.labelEn}
                    </span>
                    {answers[currentQuestion.id as keyof SessionAnswers] === option.value && (
                      <Check className="w-5 h-5 text-amber-300" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Text input */}
          {currentQuestion.type === "text" && (
            <textarea
              value={String(answers[currentQuestion.id as keyof SessionAnswers] || "")}
              onChange={(e) => updateAnswer(e.target.value)}
              placeholder={currentQuestion.placeholder}
              className="w-full bg-white/5 border border-white/10 rounded-lg p-4 text-white placeholder-white/30 focus:outline-none focus:border-amber-500/50 focus:bg-white/10 resize-none"
              rows={4}
            />
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-4 justify-between">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-4 py-3 rounded-lg border border-white/10 text-white hover:bg-white/10 transition"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>{isAr ? "رجوع" : "Back"}</span>
          </button>

          <button
            onClick={handleNext}
            disabled={!isStepValid()}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition ${
              isStepValid()
                ? "bg-amber-500 text-[#0f172a] hover:bg-amber-400"
                : "bg-white/10 text-white/50 cursor-not-allowed"
            }`}
          >
            <span>{step === questions.length - 1 ? (isAr ? "إكمال" : "Complete") : (isAr ? "التالي" : "Next")}</span>
            {step < questions.length - 1 && <ChevronRight className="w-4 h-4" />}
            {step === questions.length - 1 && <Check className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
