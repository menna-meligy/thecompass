"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Calendar,
  User,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import type { SessionReflection, SessionReflectionSkill } from "@/lib/skills/types";
import { getLocalizedField } from "@/lib/utils";

interface ReflectionDetail extends SessionReflection {
  skills?: SessionReflectionSkill[];
  mentor?: { full_name: string | null; email: string | null };
  user?: { full_name: string | null; email: string | null };
  session?: {
    starts_at: string;
    workshop?: { title_ar: string; title_en: string };
  };
}

export default function AdminReflectionDetailPage() {
  const locale = useLocale();
  const isAr = locale === "ar";
  const params = useParams();
  const router = useRouter();
  const reflectionId = params.id as string;

  const [reflection, setReflection] = useState<ReflectionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReflection = async () => {
      try {
        setLoading(true);
        const supabase = createClient();

        const { data, error: fetchError } = await supabase
          .from("session_reflections")
          .select(
            `
            id,
            booking_id,
            client_id,
            mentor_id,
            private_notes,
            encouragement_ar,
            encouragement_en,
            submitted_at,
            mentor:profiles(full_name, email),
            user:profiles!client_id(full_name, email),
            booking:bookings(
              session:sessions(starts_at, workshop:workshops(title_ar, title_en))
            )
          `
          )
          .eq("id", reflectionId)
          .single();

        if (fetchError) throw fetchError;
        setReflection(data as ReflectionDetail);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : (isAr ? "خطأ في التحميل" : "Failed to load")
        );
      } finally {
        setLoading(false);
      }
    };

    fetchReflection();
  }, [reflectionId, isAr]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-[#F59E0B]" />
      </div>
    );
  }

  if (error || !reflection) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Link
          href={`/${locale}/admin/reflections`}
          className="flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          {isAr ? "العودة" : "Back"}
        </Link>

        <div className="flex items-start gap-2.5 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-400">
            {error || (isAr ? "لم يتم العثور على الرسالة" : "Reflection not found")}
          </p>
        </div>
      </div>
    );
  }

  const sessionTitle = reflection.booking?.session?.workshop
    ? getLocalizedField(
        reflection.booking.session.workshop as Record<string, unknown>,
        "title",
        locale
      )
    : isAr
    ? "جلسة فردية"
    : "General Session";

  const sessionDate = reflection.booking?.session?.starts_at
    ? new Date(reflection.booking.session.starts_at).toLocaleDateString(
        isAr ? "ar-EG" : "en-US",
        { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
      )
    : "Unknown";

  const encouragement = isAr
    ? reflection.encouragement_ar
    : reflection.encouragement_en;

  const submittedDate = new Date(reflection.submitted_at).toLocaleDateString(
    isAr ? "ar-EG" : "en-US",
    { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <Link
        href={`/${locale}/admin/reflections`}
        className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {isAr ? "العودة لقائمة الرسائل" : "Back to Reflections"}
      </Link>

      {/* Main card */}
      <div
        className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.12)] rounded-2xl overflow-hidden"
        dir={isAr ? "rtl" : "ltr"}
      >
        {/* Header section */}
        <div className="px-6 py-5 border-b border-white/5 bg-gradient-to-r from-amber-500/5 to-transparent">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#F59E0B] mb-1">
                {isAr ? "تفاصيل الرسالة" : "Reflection Details"}
              </p>
              <h1 className="text-2xl font-black text-white">{sessionTitle}</h1>
            </div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "5px 11px",
                borderRadius: "20px",
                background: "rgba(245,158,11,0.12)",
                border: "1px solid rgba(245,158,11,0.25)",
                flexShrink: 0,
              }}
            >
              <MessageSquare className="h-3.5 w-3.5" style={{ color: "#F59E0B" }} />
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#F59E0B" }}>
                {isAr ? "رسالة" : "Feedback"}
              </span>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider">
                {isAr ? "الموعد" : "Session Date"}
              </p>
              <p className="text-sm font-semibold text-white mt-1">{sessionDate}</p>
            </div>
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider">
                {isAr ? "تم إنشاؤها" : "Submitted"}
              </p>
              <p className="text-sm font-semibold text-white mt-1">{submittedDate}</p>
            </div>
          </div>
        </div>

        {/* Content sections */}
        <div className="p-6 space-y-8">
          {/* Client info */}
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wider text-white/70 mb-3">
              {isAr ? "بيانات العميل" : "Client Information"}
            </h2>
            <div className="bg-white/2 border border-white/5 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-[rgba(245,158,11,0.1)] flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5 text-[#F59E0B]" />
                </div>
                <div>
                  <p className="font-semibold text-white">
                    {reflection.user?.full_name || "-"}
                  </p>
                  <p className="text-sm text-white/40">
                    {reflection.user?.email || "-"}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Encouragement message */}
          {encouragement && (
            <section>
              <h2 className="text-sm font-bold uppercase tracking-wider text-white/70 mb-3">
                {isAr ? "الرسالة التشجيعية" : "Encouragement Message"}
              </h2>
              <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                <p
                  className="text-sm leading-relaxed text-white"
                  style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                >
                  {encouragement}
                </p>
              </div>
            </section>
          )}

          {/* Skills assessed */}
          {reflection.skills && reflection.skills.length > 0 && (
            <section>
              <h2 className="text-sm font-bold uppercase tracking-wider text-white/70 mb-3">
                {isAr ? "المهارات المقيّمة" : "Skills Assessed"}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {reflection.skills.map((skill) => (
                  <div
                    key={skill.id}
                    className="bg-white/2 border border-white/5 rounded-xl p-4"
                  >
                    <p className="font-semibold text-white">
                      {skill.skill
                        ? getLocalizedField(
                            skill.skill as Record<string, unknown>,
                            "name",
                            locale
                          )
                        : "Unknown"}
                    </p>
                    <p className="text-xs text-white/40 mt-1">
                      {skill.skill
                        ? getLocalizedField(
                            skill.skill as Record<string, unknown>,
                            "description",
                            locale
                          )
                        : ""}
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-white/50">
                        {isAr ? "المستوى:" : "Level:"}
                      </span>
                      <span className="text-sm font-bold text-[#F59E0B]">
                        {skill.mentor_level}/5
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Private notes */}
          {reflection.private_notes && (
            <section>
              <h2 className="text-sm font-bold uppercase tracking-wider text-white/70 mb-3">
                {isAr ? "ملاحظات خاصة" : "Private Notes"}
              </h2>
              <div className="bg-white/2 border border-white/5 rounded-xl p-4">
                <p
                  className="text-sm text-white leading-relaxed"
                  style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                >
                  {reflection.private_notes}
                </p>
              </div>
            </section>
          )}

          {/* Mentor info */}
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wider text-white/70 mb-3">
              {isAr ? "بيانات المرشد" : "Mentor Information"}
            </h2>
            <div className="bg-white/2 border border-white/5 rounded-xl p-4">
              <p className="text-sm text-white/60">
                {reflection.mentor?.full_name || "Unknown"}
                {reflection.mentor?.email && ` (${reflection.mentor.email})`}
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
