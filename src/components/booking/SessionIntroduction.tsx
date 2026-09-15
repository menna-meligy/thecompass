"use client";

import { ChevronRight, Lightbulb, Heart, Target, Zap, Compass } from "lucide-react";

interface SessionIntroductionProps {
  onContinue: () => void;
  isAr: boolean;
}

export default function SessionIntroduction({
  onContinue,
  isAr,
}: SessionIntroductionProps) {
  const benefits = isAr
    ? [
        {
          icon: Lightbulb,
          title: "افهم نفسك بشكل أعمق",
          description: "تعرّف على نقاط قوتك وضعفك وما يحفزك حقاً",
        },
        {
          icon: Target,
          title: "خطط مسارك الوظيفي",
          description: "حدّد أهدافك واستراتيجيتك للنجاح",
        },
        {
          icon: Heart,
          title: "حقق التوازن",
          description: "عِش حياة مهنية مرضية مع حياة شخصية سعيدة",
        },
        {
          icon: Zap,
          title: "اتخذ خطوات عملية",
          description: "من الوضوح إلى الإجراء في كل جلسة",
        },
      ]
    : [
        {
          icon: Lightbulb,
          title: "Know yourself deeper",
          description: "Discover your strengths, weaknesses & what truly drives you",
        },
        {
          icon: Target,
          title: "Chart your path",
          description: "Define your goals and strategy for success",
        },
        {
          icon: Heart,
          title: "Achieve balance",
          description: "Build a fulfilling career and happy personal life",
        },
        {
          icon: Zap,
          title: "Take action",
          description: "From clarity to concrete steps every session",
        },
      ];

  return (
    <div className="min-h-screen bg-[#0f172a] p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        {/* Hero Section */}
        <div className="mb-12">
          <div className="mb-6 inline-block">
            <Compass className="w-12 h-12 text-amber-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
            {isAr ? "تعرّف على نفسك حقاً" : "Know Yourself Truly"}
          </h1>
          <p className="text-xl text-white/70 leading-relaxed mb-6">
            {isAr
              ? "كل شخص لديه قدرات فريدة وأحلام مختلفة. نحن هنا لمساعدتك على اكتشافها وتحويلها إلى واقع. من خلال جلسات تدريب فردية مع المنتور، ستفهم نفسك بشكل أعمق وتتخذ قرارات أفضل في حياتك الوظيفية."
              : "Everyone has unique talents and different dreams. We're here to help you discover them and turn them into reality. Through one-on-one mentor training sessions, you'll understand yourself better and make smarter career decisions."}
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          {benefits.map((benefit, idx) => {
            const Icon = benefit.icon;
            return (
              <div
                key={idx}
                className="p-6 bg-white/5 border border-white/10 rounded-lg hover:border-amber-500/30 hover:bg-white/[0.08] transition"
              >
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <Icon className="w-6 h-6 text-amber-400 mt-1" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white mb-1">{benefit.title}</h3>
                    <p className="text-sm text-white/60">{benefit.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* What to Expect */}
        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-lg p-6 mb-12">
          <h2 className="font-bold text-white mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-amber-400" />
            {isAr ? "ماذا تتوقع؟" : "What to Expect?"}
          </h2>
          <ul className="space-y-2 text-white/80 text-sm">
            <li className="flex gap-3">
              <span className="text-amber-300">✓</span>
              <span>
                {isAr
                  ? "جلسة فردية مع متخصص معتمد"
                  : "One-on-one session with a certified specialist"}
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-amber-300">✓</span>
              <span>
                {isAr
                  ? "فهم عميق لقدراتك وأهدافك"
                  : "Deep understanding of your abilities and goals"}
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-amber-300">✓</span>
              <span>
                {isAr
                  ? "خطة عملية ملموسة للخطوات القادمة"
                  : "Concrete action plan for next steps"}
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-amber-300">✓</span>
              <span>
                {isAr
                  ? "دعم مستمر وتوجيه شخصي"
                  : "Continuous support and personalized guidance"}
              </span>
            </li>
          </ul>
        </div>

        {/* CTA Button */}
        <button
          onClick={onContinue}
          className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-[#0f172a] font-bold py-4 px-6 rounded-lg transition flex items-center justify-center gap-2 group"
        >
          <span>{isAr ? "ابدأ الآن" : "Start Now"}</span>
          <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition" />
        </button>
      </div>
    </div>
  );
}
