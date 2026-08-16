"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import {
  CheckCircle2,
  Loader2,
  AlertCircle,
  RefreshCw,
  Calendar,
  Award,
  MessageCircle,
  ChevronDown
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface SessionReflection {
  id: string;
  booking_id: string;
  client_id: string;
  encouragement_ar?: string | null;
  encouragement_en?: string | null;
  status: "draft" | "published" | "archived";
  is_public: boolean;
  submitted_at: string;
  updated_at: string;
  skills?: Array<{
    id: string;
    mentor_level: number;
    skill?: { name_ar?: string; name_en?: string; name?: string };
  }>;
}

interface Props {
  bookingId: string;
  locale?: "ar" | "en";
  onRefresh?: () => void;
}

export default function ClientReflectionsCard({
  bookingId,
  locale: propLocale,
  onRefresh,
}: Props) {
  const defaultLocale = useLocale();
  const locale = (propLocale || defaultLocale) as "ar" | "en";
  const isAr = locale === "ar";

  const [reflection, setReflection] = useState<SessionReflection | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const fetchReflection = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const response = await fetch(
        `/api/reflections/${bookingId}?locale=${locale}`,
        {
          method: "GET",
          headers: { "Accept": "application/json" }
        }
      );

      if (response.status === 404) {
        setReflection(null);
        setError(null);
      } else if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      } else {
        const data = await response.json();
        setReflection(data);
        setError(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "error_loading";
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReflection();
  }, [bookingId, locale]);

  const handleRefresh = async () => {
    await fetchReflection(true);
    onRefresh?.();
  };

  // Loading state
  if (loading) {
    return (
      <Card variant="default" className="animate-pulse">
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-[#F59E0B]" />
            <span className="text-sm text-white/60">
              {isAr ? "جاري التحميل..." : "Loading..."}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card variant="crimson">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-red-300">
                {isAr ? "خطأ في التحميل" : "Error loading reflection"}
              </p>
              <p className="text-xs text-red-200/70 mt-1">{error}</p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex-shrink-0 p-1.5 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50"
              title={isAr ? "إعادة محاولة" : "Retry"}
            >
              <RefreshCw className={`h-4 w-4 text-red-300 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No reflection state
  if (!reflection) {
    return (
      <Card variant="flat" className="border border-white/10">
        <CardContent className="py-8">
          <div className="text-center space-y-2">
            <MessageCircle className="h-8 w-8 text-white/30 mx-auto" />
            <p className="text-sm text-white/60">
              {isAr ? "لم تتلقَ رسالة تشجيعية حتى الآن" : "No reflection yet"}
            </p>
            <p className="text-xs text-white/40">
              {isAr
                ? "سيرسل المرشد رسالة تشجيعية بعد انتهاء الجلسة"
                : "Your mentor will send feedback after the session"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const encouragement = isAr
    ? reflection.encouragement_ar
    : reflection.encouragement_en;

  const dateObj = new Date(reflection.submitted_at);
  const formattedDate = dateObj.toLocaleDateString(
    isAr ? "ar-EG" : "en-US",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }
  );

  const statusLabel = {
    draft: isAr ? "مسودة" : "Draft",
    published: isAr ? "منشورة" : "Published",
    archived: isAr ? "مؤرشفة" : "Archived"
  }[reflection.status];

  const statusColor = {
    draft: "bg-gray-500/20 text-gray-300",
    published: "bg-green-500/20 text-green-300",
    archived: "bg-slate-500/20 text-slate-300"
  }[reflection.status];

  return (
    <Card
      variant="elevated"
      hover
      className={`cursor-pointer transition-all ${expanded ? "ring-2 ring-[#F59E0B]/50" : ""}`}
      dir={isAr ? "rtl" : "ltr"}
    >
      {/* Header - Always visible */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="p-6 pb-0"
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0 mt-1">
              <CheckCircle2 className="h-5 w-5 text-[#F59E0B]" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="flex items-center gap-2">
                <span>{isAr ? "📝 رسالة تشجيعية" : "📝 Mentor Feedback"}</span>
              </CardTitle>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor}`}>
                  {statusLabel}
                </span>
                <span className="text-xs text-white/50 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formattedDate}
                </span>
              </div>
            </div>
          </div>
          <button
            className="flex-shrink-0 p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            disabled={refreshing}
            onClick={(e) => {
              e.stopPropagation();
              handleRefresh();
            }}
            title={isAr ? "تحديث" : "Refresh"}
          >
            <RefreshCw
              className={`h-4 w-4 text-white/60 ${refreshing ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        {/* Preview */}
        {!expanded && encouragement && (
          <p className="text-sm text-white/70 line-clamp-2 pb-4">
            {encouragement}
          </p>
        )}

        {/* Expand indicator */}
        <div className="flex items-center justify-center pt-2 border-t border-white/5">
          <ChevronDown
            className={`h-4 w-4 text-white/40 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <CardContent className="pt-4 space-y-4">
          {/* Encouragement Message */}
          {encouragement && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#F59E0B]">
                {isAr ? "الرسالة التشجيعية" : "Encouragement Message"}
              </h4>
              <p className="text-sm leading-relaxed text-white/80">
                {encouragement}
              </p>
            </div>
          )}

          {/* Skills Assessed */}
          {reflection.skills && reflection.skills.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-white/10">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-[#F59E0B]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#F59E0B]">
                  {isAr ? "المهارات المقيّمة" : "Skills Assessed"}
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {reflection.skills.map((skill) => {
                  const skillName = isAr
                    ? skill.skill?.name_ar || skill.skill?.name || "Unknown"
                    : skill.skill?.name_en || skill.skill?.name || "Unknown";

                  return (
                    <div
                      key={skill.id}
                      className="p-3 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/20 space-y-1.5"
                    >
                      <p className="text-sm font-semibold text-white truncate">
                        {skillName}
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div
                              key={i}
                              className={`h-2 w-2 rounded-full transition-colors ${
                                i < skill.mentor_level
                                  ? "bg-[#F59E0B]"
                                  : "bg-white/20"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-white/60 ml-auto">
                          {skill.mentor_level}/5
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="flex items-center gap-2 text-xs text-white/50 pt-2 border-t border-white/10">
            <span>{isAr ? "آخر تحديث:" : "Last updated:"}</span>
            <span>
              {new Date(reflection.updated_at).toLocaleDateString(
                isAr ? "ar-EG" : "en-US"
              )}
            </span>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
