"use client";

import { useState, useEffect, useRef } from "react";
import { useLocale } from "next-intl";
import {
  Save,
  Loader2,
  AlertCircle,
  Check,
  Send,
  Eye,
  Lock,
  Calendar,
  FileText,
  MessageCircle,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface MentorNote {
  id: string;
  booking_id: string;
  client_id: string;
  mentor_notes_ar?: string | null;
  mentor_notes_en?: string | null;
  status: "draft" | "published" | "archived";
  updated_at: string;
  submitted_at: string;
}

interface ClientPublishedNote {
  id: string;
  booking_id: string;
  client_id: string;
  content_ar?: string | null;
  content_en?: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

interface Props {
  bookingId: string;
  clientId: string;
  clientName?: string;
  locale?: "ar" | "en";
  onSave?: (note: MentorNote) => void;
}

const MIN_CHARS = 10;
const MAX_CHARS = 3000;

export default function MentorNotesForm({
  bookingId,
  clientId,
  clientName,
  locale: propLocale,
  onSave,
}: Props) {
  const defaultLocale = useLocale();
  const locale = (propLocale || defaultLocale) as "ar" | "en";
  const isAr = locale === "ar";

  // Form states
  const [mentorNotesAr, setMentorNotesAr] = useState("");
  const [mentorNotesEn, setMentorNotesEn] = useState("");
  const [clientPublishedNote, setClientPublishedNote] = useState<ClientPublishedNote | null>(null);

  // UI states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Mentor note info
  const [mentorNoteId, setMentorNoteId] = useState<string | null>(null);
  const [mentorNoteStatus, setMentorNoteStatus] = useState<"draft" | "published" | "archived">("draft");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  // Dirty tracking
  const [isDirty, setIsDirty] = useState(false);
  const initialValuesRef = useRef({ mentorNotesAr: "", mentorNotesEn: "" });

  // Fetch existing mentor notes
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/admin/mentor-notes?booking_id=${bookingId}&client_id=${clientId}`,
          { method: "GET" }
        );

        if (response.ok) {
          const data = await response.json();
          const { mentorNotes = null, clientPublishedNotes = null } = data;

          if (mentorNotes) {
            const arContent = mentorNotes.mentor_notes_ar || "";
            const enContent = mentorNotes.mentor_notes_en || "";

            setMentorNotesAr(arContent);
            setMentorNotesEn(enContent);
            setMentorNoteId(mentorNotes.id);
            setMentorNoteStatus(mentorNotes.status);
            setUpdatedAt(mentorNotes.updated_at);

            initialValuesRef.current = {
              mentorNotesAr: arContent,
              mentorNotesEn: enContent,
            };
          }

          if (clientPublishedNotes) {
            setClientPublishedNote(clientPublishedNotes);
          }

          setError(null);
        } else if (response.status === 404) {
          // No notes yet
          setError(null);
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : (isAr ? "حصل خطأ أثناء تحميل البيانات" : "Something went wrong loading the data"));
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, [bookingId, clientId]);

  // Handle save as draft
  const handleSaveDraft = async (e?: React.FormEvent) => {
    e?.preventDefault();

    try {
      setSaving(true);
      setError(null);

      const response = await fetch("/api/admin/mentor-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: bookingId,
          client_id: clientId,
          mentor_notes_ar: mentorNotesAr.trim() || null,
          mentor_notes_en: mentorNotesEn.trim() || null,
          action: "save",
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const savedNote = await response.json();
      setMentorNoteId(savedNote.id);
      setMentorNoteStatus(savedNote.status);
      setUpdatedAt(savedNote.updated_at);
      setIsDirty(false);
      initialValuesRef.current = { mentorNotesAr, mentorNotesEn };
      setSuccess(true);
      onSave?.(savedNote);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : (isAr ? "حصل خطأ أثناء الحفظ" : "Something went wrong saving"));
    } finally {
      setSaving(false);
    }
  };

  // Handle publish
  const handlePublish = async (e?: React.FormEvent) => {
    e?.preventDefault();

    try {
      setPublishing(true);
      setError(null);

      const response = await fetch("/api/admin/mentor-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: bookingId,
          client_id: clientId,
          mentor_notes_ar: mentorNotesAr.trim() || null,
          mentor_notes_en: mentorNotesEn.trim() || null,
          action: "publish",
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const publishedNote = await response.json();
      setMentorNoteId(publishedNote.id);
      setMentorNoteStatus(publishedNote.status);
      setUpdatedAt(publishedNote.updated_at);
      setIsDirty(false);
      initialValuesRef.current = { mentorNotesAr, mentorNotesEn };
      setSuccess(true);
      onSave?.(publishedNote);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : (isAr ? "حصل خطأ أثناء الحفظ" : "Something went wrong saving"));
    } finally {
      setPublishing(false);
    }
  };

  const arCharCount = mentorNotesAr.length;
  const enCharCount = mentorNotesEn.length;
  const isArValid = arCharCount === 0 || (arCharCount >= MIN_CHARS && arCharCount <= MAX_CHARS);
  const isEnValid = enCharCount === 0 || (enCharCount >= MIN_CHARS && enCharCount <= MAX_CHARS);
  const isFormValid = isArValid && isEnValid && (arCharCount > 0 || enCharCount > 0);

  if (loading) {
    return (
      <Card variant="default" className="animate-pulse">
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-[#F59E0B]" />
            <span className="text-sm text-white/60">{isAr ? "جاري التحميل..." : "Loading..."}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" dir={isAr ? "rtl" : "ltr"}>
      {/* Client's Published Notes */}
      {clientPublishedNote && (
        <Card variant="elevated" hover className="border border-[#F59E0B]/30">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-[#F59E0B]" />
                  {isAr ? "ملاحظات العميل" : "Client's Notes"}
                </CardTitle>
                <CardDescription className="mt-1">
                  {clientName && (isAr ? `من ${clientName}` : `From ${clientName}`)}
                </CardDescription>
              </div>
              <div className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-300 font-medium flex-shrink-0">
                {isAr ? "منشورة" : "Published"}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {clientPublishedNote.content_ar && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#F59E0B]">
                  Arabic (العربية)
                </h4>
                <p className="text-sm text-white/80 leading-relaxed">
                  {clientPublishedNote.content_ar}
                </p>
              </div>
            )}
            {clientPublishedNote.content_en && (
              <div
                className={`space-y-2 ${
                  clientPublishedNote.content_ar ? "pt-2 border-t border-white/10" : ""
                }`}
              >
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#F59E0B]">
                  English
                </h4>
                <p className="text-sm text-white/80 leading-relaxed">
                  {clientPublishedNote.content_en}
                </p>
              </div>
            )}
            <div className="text-xs text-white/40 pt-2 border-t border-white/10 flex items-center gap-1.5">
              <Calendar className="h-3 w-3" />
              <span>
                {new Date(clientPublishedNote.created_at).toLocaleDateString(
                  isAr ? "ar-EG" : "en-US"
                )}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mentor Notes Form */}
      <Card variant="default">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#F59E0B]" />
                {isAr ? "ملاحظات المرشد" : "Mentor Notes"}
              </CardTitle>
              <CardDescription className="mt-1">
                {isAr
                  ? "اكتب ملاحظاتك الخاصة بالجلسة والعميل"
                  : "Write your session and client feedback"}
              </CardDescription>
            </div>
            {success && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/20 text-green-300 flex-shrink-0">
                <Check className="h-4 w-4" />
                <span className="text-xs font-semibold">{isAr ? "تم الحفظ" : "Saved"}</span>
              </div>
            )}
          </div>

          {/* Status indicator */}
          {mentorNoteStatus && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-white/60">{isAr ? "الحالة:" : "Status:"}</span>
              <span
                className={`text-xs px-2 py-1 rounded-full font-medium ${
                  mentorNoteStatus === "published"
                    ? "bg-green-500/20 text-green-300"
                    : "bg-yellow-500/20 text-yellow-300"
                }`}
              >
                {mentorNoteStatus === "published"
                  ? isAr ? "منشورة" : "Published"
                  : isAr ? "مسودة" : "Draft"}
              </span>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Error message */}
          {error && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-red-300">{isAr ? "خطأ" : "Error"}</p>
                <p className="text-xs text-red-200/70 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Arabic Notes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-semibold text-white flex items-center gap-2">
                <span>ملاحظات عربي</span>
                <span className="text-xs text-white/50">(Arabic)</span>
              </label>
              <span
                className={`text-xs font-medium ${
                  isArValid ? "text-white/50" : "text-red-400"
                }`}
              >
                {arCharCount}/{MAX_CHARS}
              </span>
            </div>
            <textarea
              value={mentorNotesAr}
              onChange={(e) => {
                setMentorNotesAr(e.target.value);
                setIsDirty(true);
              }}
              placeholder={
                isAr
                  ? "اكتب ملاحظاتك بالعربية (اختياري)..."
                  : "Write your notes in Arabic (optional)..."
              }
              dir="rtl"
              rows={4}
              maxLength={MAX_CHARS}
              className={`w-full px-4 py-3 rounded-lg bg-white/5 border text-sm text-white placeholder-white/40 focus:outline-none transition-colors resize-none ${
                isArValid || arCharCount === 0
                  ? "border-white/10 focus:border-[#F59E0B]/50"
                  : "border-red-500/30 focus:border-red-500/50"
              }`}
            />
          </div>

          {/* English Notes */}
          <div className="space-y-3 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-semibold text-white flex items-center gap-2">
                <span>Mentor Notes</span>
                <span className="text-xs text-white/50">(English)</span>
              </label>
              <span
                className={`text-xs font-medium ${
                  isEnValid ? "text-white/50" : "text-red-400"
                }`}
              >
                {enCharCount}/{MAX_CHARS}
              </span>
            </div>
            <textarea
              value={mentorNotesEn}
              onChange={(e) => {
                setMentorNotesEn(e.target.value);
                setIsDirty(true);
              }}
              placeholder={
                isAr
                  ? "اكتب ملاحظاتك بالإنجليزية (اختياري)..."
                  : "Write your notes in English (optional)..."
              }
              dir="ltr"
              rows={4}
              maxLength={MAX_CHARS}
              className={`w-full px-4 py-3 rounded-lg bg-white/5 border text-sm text-white placeholder-white/40 focus:outline-none transition-colors resize-none ${
                isEnValid || enCharCount === 0
                  ? "border-white/10 focus:border-[#F59E0B]/50"
                  : "border-red-500/30 focus:border-red-500/50"
              }`}
            />
          </div>

          {/* Timestamps */}
          {updatedAt && (
            <div className="text-xs text-white/50 pt-2 border-t border-white/10 flex items-center gap-1.5">
              <Calendar className="h-3 w-3" />
              <span>{isAr ? "آخر تحديث:" : "Updated:"}</span>
              <span>
                {new Date(updatedAt).toLocaleDateString(isAr ? "ar-EG" : "en-US")}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/10 flex-wrap">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${isDirty ? "bg-yellow-500 animate-pulse" : "bg-green-500"}`} />
              <span className="text-xs text-white/60">
                {isDirty
                  ? isAr ? "يوجد تغييرات غير محفوظة" : "Unsaved changes"
                  : isAr ? "تم الحفظ" : "All saved"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleSaveDraft}
                disabled={!isFormValid || saving || publishing}
                loading={saving}
                variant="secondary"
                size="md"
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {isAr ? "حفظ مسودة" : "Save Draft"}
              </Button>
              <Button
                onClick={handlePublish}
                disabled={!isFormValid || saving || publishing}
                loading={publishing}
                variant="primary"
                size="md"
                className="flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                {isAr ? "نشر الآن" : "Publish"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
