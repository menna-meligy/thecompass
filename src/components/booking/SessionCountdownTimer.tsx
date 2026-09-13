"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface SessionCountdownTimerProps {
  sessionStartsAt: string; // ISO datetime
  isAr: boolean;
}

export default function SessionCountdownTimer({
  sessionStartsAt,
  isAr,
}: SessionCountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isUpcoming: boolean;
  } | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const sessionTime = new Date(sessionStartsAt).getTime();
      const diff = sessionTime - now;

      if (diff <= 0) {
        return {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isUpcoming: false,
        };
      }

      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / 1000 / 60) % 60),
        seconds: Math.floor((diff / 1000) % 60),
        isUpcoming: true,
      };
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [sessionStartsAt]);

  if (!timeLeft) return null;

  if (!timeLeft.isUpcoming) {
    return (
      <div className="p-4 bg-amber-500/20 border border-amber-500/50 rounded-lg text-center">
        <p className="text-amber-300 font-semibold">
          {isAr ? "🎉 الجلسة جارية الآن!" : "🎉 Session is happening now!"}
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-lg">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-blue-400" />
        <span className="text-sm font-semibold text-blue-400">
          {isAr ? "الوقت المتبقي:" : "Time until session:"}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { value: timeLeft.days, label: isAr ? "يوم" : "Days" },
          { value: timeLeft.hours, label: isAr ? "ساعة" : "Hours" },
          { value: timeLeft.minutes, label: isAr ? "دقيقة" : "Minutes" },
          { value: timeLeft.seconds, label: isAr ? "ثانية" : "Seconds" },
        ].map((item, idx) => (
          <div key={idx} className="text-center">
            <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3 mb-2">
              <p className="text-2xl font-bold text-blue-300">
                {String(item.value).padStart(2, "0")}
              </p>
            </div>
            <p className="text-xs font-medium text-white/50">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Alert if session is within 30 minutes */}
      {timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes <= 30 && (
        <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
          <p className="text-red-300 text-sm font-semibold text-center">
            {isAr ? "⚠️ ستبدأ الجلسة قريباً!" : "⚠️ Session starting soon!"}
          </p>
        </div>
      )}
    </div>
  );
}
