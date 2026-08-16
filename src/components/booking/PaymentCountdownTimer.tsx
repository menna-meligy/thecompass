"use client";

import { useEffect, useState } from "react";
import { Clock, AlertTriangle } from "lucide-react";

interface PaymentCountdownTimerProps {
  paymentDeadline: string;
  onExpired?: () => void;
}

function formatTimeRemaining(ms: number): { hours: number; minutes: number; seconds: number } {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { hours, minutes, seconds };
}

export default function PaymentCountdownTimer({ paymentDeadline, onExpired }: PaymentCountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const deadline = new Date(paymentDeadline).getTime();
      const now = Date.now();
      const ms = deadline - now;

      if (ms <= 0) {
        setIsExpired(true);
        onExpired?.();
      } else {
        setTimeRemaining(formatTimeRemaining(ms));
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [paymentDeadline, onExpired]);

  if (!timeRemaining) return null;

  const { hours, minutes, seconds } = timeRemaining;
  const isLowTime = hours === 0 && minutes <= 30;

  if (isExpired) {
    return (
      <div className="bg-red-500/10 border border-red-500/25 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-red-500">انتهت مهلة الدفع</p>
          <p className="text-sm text-white/70">عذراً، لم تكمل الدفع في الوقت المحدد وتم إلغاء حجزك.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg p-4 flex items-start gap-3 ${
        isLowTime
          ? "bg-red-500/10 border border-red-500/25"
          : "bg-amber-500/10 border border-amber-500/25"
      }`}
    >
      <Clock className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isLowTime ? "text-red-500" : "text-amber-500"}`} />
      <div className="flex-1">
        <p className={`font-bold ${isLowTime ? "text-red-500" : "text-amber-500"}`}>
          ⏳ استكمل الدفع في الوقت المحدد
        </p>
        <div className="text-sm text-white/70 mt-1">
          <div className="flex justify-between items-center">
            <span>المهلة المتبقية:</span>
            <span className={`font-mono font-bold text-lg ${isLowTime ? "text-red-400" : "text-amber-400"}`}>
              {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </span>
          </div>
          <p className="text-xs text-white/50 mt-2">
            {isLowTime
              ? "⚠️ قريب جداً! استكمل الدفع دلوقتي قبل ما تخسر مكانك"
              : "🕐 عندك 24 ساعة من اختيار الجلسة"}
          </p>
        </div>
      </div>
    </div>
  );
}
