"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import {
  MessageCircle,
  Loader2,
  AlertCircle,
  RefreshCw,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";

interface MentorNote {
  id: string;
  booking_id: string;
  client_id: string;
  mentor_notes_ar?: string | null;
  mentor_notes_en?: string | null;
  status: "draft" | "published" | "archived";
  is_public?: boolean;
  updated_at: string;
  submitted_at: string;
}

interface Props {
  bookingId: string;
  clientId: string;
  locale?: "ar" | "en";
  /**
   * Which session these notes belong to, e.g. "اكسر الحلقة — فردي · 21 سبتمبر".
   * Notes are stored one-per-booking, so say so on the card: without it every
   * note looks like a general message and the timestamp reads like a session date.
   */
  sessionLabel?: string;
  onRefresh?: () => void;
}

export default function MentorNotesDisplay({
  bookingId,
  clientId,
  locale: propLocale,
  sessionLabel,
  onRefresh,
}: Props) {
  const defaultLocale = useLocale();
  const locale = (propLocale || defaultLocale) as "ar" | "en";
  const isAr = locale === "ar";

  const [mentorNotes, setMentorNotes] = useState<MentorNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMentorNotes = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const response = await fetch(
        `/api/client-notes?booking_id=${bookingId}&client_id=${clientId}`,
        {
          method: "GET",
          headers: { "Accept": "application/json" },
        }
      );

      if (response.status === 404) {
        setMentorNotes(null);
        setError(null);
      } else if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      } else {
        const data = await response.json();
        const publishedNotes = data.mentorNotes;

        // Only show if published (is_public=true or status=published)
        if (publishedNotes && publishedNotes.status === "published") {
          setMentorNotes(publishedNotes);
        } else {
          setMentorNotes(null);
        }
        setError(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : (isAr ? "حصل خطأ أثناء تحميل البيانات" : "Something went wrong loading the data");
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMentorNotes();
  }, [bookingId, clientId]);

  const handleRefresh = async () => {
    await fetchMentorNotes(true);
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
                {isAr ? "خطأ في التحميل" : "Error loading mentor notes"}
              </p>
              <p className="text-xs text-red-200/70 mt-1">{error}</p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex-shrink-0 p-1.5 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50"
              title={isAr ? "إعادة محاولة" : "Retry"}
            >
              <RefreshCw
                className={`h-4 w-4 text-red-300 ${refreshing ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No mentor notes state
  if (!mentorNotes) {
    return (
      <Card variant="flat" className="border border-white/10">
        <CardContent className="py-8">
          <div className="text-center space-y-2">
            <MessageCircle className="h-8 w-8 text-white/30 mx-auto" />
            <p className="text-sm text-white/60">
              {isAr ? "لم تتلقَ ملاحظات من المرشد بعد" : "No mentor notes yet"}
            </p>
            {sessionLabel && (
              <p className="text-xs text-white/35">{sessionLabel}</p>
            )}
            <p className="text-xs text-white/40">
              {isAr
                ? "سيشارك المرشد ملاحظاته معك بعد الجلسة"
                : "Your mentor will share their notes after the session"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const mentorContent = isAr
    ? mentorNotes.mentor_notes_ar
    : mentorNotes.mentor_notes_en;

  // If mentor wrote in the other language
  const alternativeContent = isAr
    ? mentorNotes.mentor_notes_en
    : mentorNotes.mentor_notes_ar;

  const dateObj = new Date(mentorNotes.updated_at);
  const formattedDate = dateObj.toLocaleDateString(
    isAr ? "ar-EG" : "en-US",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );

  return (
    <Card
      variant="elevated"
      hover
      dir={isAr ? "rtl" : "ltr"}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0 mt-1">
              <CheckCircle2 className="h-5 w-5 text-green-400" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="flex items-center gap-2">
                <span>{isAr ? "ملاحظات المرشد" : "Mentor Notes"}</span>
              </CardTitle>
              {sessionLabel && (
                <p className="text-xs text-white/55 mt-1">
                  {isAr ? "عن جلسة: " : "For: "}
                  <span className="text-white/75 font-semibold">{sessionLabel}</span>
                </p>
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-xs px-2 py-1 rounded-full font-medium bg-green-500/20 text-green-300">
                  {isAr ? "منشورة" : "Published"}
                </span>
                <span className="text-xs text-white/50 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {isAr ? "اتكتبت " : "written "}{formattedDate}
                </span>
              </div>
            </div>
          </div>
          <button
            className="flex-shrink-0 p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            disabled={refreshing}
            onClick={handleRefresh}
            title={isAr ? "تحديث" : "Refresh"}
          >
            <RefreshCw
              className={`h-4 w-4 text-white/60 ${refreshing ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Primary language content */}
        {mentorContent && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-[#F59E0B]">
              {isAr ? "الملاحظات" : "Notes"}
            </p>
            <p className="text-sm leading-relaxed text-white/80 whitespace-pre-wrap">
              {mentorContent}
            </p>
          </div>
        )}

        {/* Alternative language content if available */}
        {alternativeContent && (
          <div
            className={`space-y-2 ${mentorContent ? "pt-2 border-t border-white/10" : ""}`}
          >
            <p className="text-xs font-bold uppercase tracking-wider text-[#F59E0B]">
              {isAr ? "English" : "عربي"}
            </p>
            <p className="text-sm leading-relaxed text-white/80 whitespace-pre-wrap">
              {alternativeContent}
            </p>
          </div>
        )}

        {/* No content message */}
        {!mentorContent && !alternativeContent && (
          <div className="text-center py-4">
            <p className="text-sm text-white/50">
              {isAr ? "لا يوجد محتوى متاح" : "No content available"}
            </p>
          </div>
        )}

        {/* Metadata */}
        <div className="text-xs text-white/40 pt-2 border-t border-white/10 flex items-center gap-1.5">
          <span>{isAr ? "آخر تحديث:" : "Last updated:"}</span>
          <span>
            {new Date(mentorNotes.updated_at).toLocaleDateString(
              isAr ? "ar-EG" : "en-US"
            )}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
