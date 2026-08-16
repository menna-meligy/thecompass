"use client";

import { useState, useEffect, useRef } from "react";
import { useLocale } from "next-intl";
import {
  Save,
  Loader2,
  AlertCircle,
  Check,
  Lock,
  Eye,
  Calendar,
  FileText
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface ClientNote {
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
  locale?: "ar" | "en";
  onSave?: (note: ClientNote) => void;
}

const MIN_CHARS = 10;
const MAX_CHARS = 2000;
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

export default function ClientSessionNotesForm({
  bookingId,
  clientId,
  locale: propLocale,
  onSave,
}: Props) {
  const defaultLocale = useLocale();
  const locale = (propLocale || defaultLocale) as "ar" | "en";
  const isAr = locale === "ar";

  // Form states
  const [publicNote, setPublicNote] = useState("");
  const [privateNote, setPrivateNote] = useState("");

  // UI states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Timestamps
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [lastAutoSave, setLastAutoSave] = useState<number>(Date.now());

  // Dirty tracking
  const [isDirty, setIsDirty] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();
  const initialValuesRef = useRef({ publicNote: "", privateNote: "" });

  // Fetch existing notes
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/client-notes/${bookingId}?client_id=${clientId}&locale=${locale}`,
          { method: "GET" }
        );

        if (response.ok) {
          const data = await response.json();
          // Find public and private notes
          const publicN = data.find((n: ClientNote) => n.is_public);
          const privateN = data.find((n: ClientNote) => !n.is_public);

          const publicContent = publicN?.[`content_${locale}`] || "";
          const privateContent = privateN?.[`content_${locale}`] || "";

          setPublicNote(publicContent);
          setPrivateNote(privateContent);
          initialValuesRef.current = {
            publicNote: publicContent,
            privateNote: privateContent,
          };

          if (publicN) setCreatedAt(publicN.created_at);
          if (publicN) setUpdatedAt(publicN.updated_at);
          setError(null);
        } else if (response.status === 404) {
          // No notes yet
          setError(null);
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "error_loading");
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, [bookingId, clientId, locale]);

  // Auto-save functionality
  useEffect(() => {
    if (!isDirty) return;

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for auto-save
    autoSaveTimeoutRef.current = setTimeout(async () => {
      try {
        setAutoSaving(true);
        setSuccess(false);

        const response = await fetch("/api/client-notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            booking_id: bookingId,
            client_id: clientId,
            [`content_${locale}`]: publicNote.trim() || null,
            is_public: true,
          }),
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const savedNote = await response.json();
        setUpdatedAt(savedNote.updated_at);
        setLastAutoSave(Date.now());
        setSuccess(true);
        setError(null);

        // Auto-save private notes too
        if (privateNote.trim()) {
          await fetch("/api/client-notes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              booking_id: bookingId,
              client_id: clientId,
              [`content_${locale}`]: privateNote.trim(),
              is_public: false,
            }),
          });
        }

        setIsDirty(false);
        setTimeout(() => setSuccess(false), 2000);
      } catch (err) {
        setError(err instanceof Error ? err.message : "error_saving");
      } finally {
        setAutoSaving(false);
      }
    }, AUTO_SAVE_INTERVAL);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [isDirty, publicNote, privateNote, bookingId, clientId, locale]);

  // Handle manual save
  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!isFormValid) return;

    try {
      setSaving(true);
      setError(null);

      const response = await fetch("/api/client-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: bookingId,
          client_id: clientId,
          [`content_${locale}`]: publicNote.trim() || null,
          is_public: true,
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const savedNote = await response.json();
      setUpdatedAt(savedNote.updated_at);
      if (!createdAt) setCreatedAt(savedNote.created_at);

      // Save private notes
      if (privateNote.trim()) {
        await fetch("/api/client-notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            booking_id: bookingId,
            client_id: clientId,
            [`content_${locale}`]: privateNote.trim(),
            is_public: false,
          }),
        });
      }

      setIsDirty(false);
      initialValuesRef.current = { publicNote, privateNote };
      setSuccess(true);
      onSave?.(savedNote);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "error_saving");
    } finally {
      setSaving(false);
    }
  };

  const publicCharCount = publicNote.length;
  const privateCharCount = privateNote.length;
  const isPublicValid = publicCharCount >= MIN_CHARS && publicCharCount <= MAX_CHARS;
  const isPrivateValid = privateCharCount === 0 || (privateCharCount >= MIN_CHARS && privateCharCount <= MAX_CHARS);
  const isFormValid = isPublicValid && isPrivateValid;

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
    <Card variant="default" dir={isAr ? "rtl" : "ltr"}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#F59E0B]" />
              {isAr ? "ملاحظاتك عن الجلسة" : "Your Session Notes"}
            </CardTitle>
            <CardDescription className="mt-1">
              {isAr
                ? "شارك ملاحظاتك مع المرشد أو احفظها لنفسك"
                : "Share notes with your mentor or keep them private"}
            </CardDescription>
          </div>
          {success && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/20 text-green-300">
              <Check className="h-4 w-4" />
              <span className="text-xs font-semibold">{isAr ? "تم الحفظ" : "Saved"}</span>
            </div>
          )}
        </div>

        {/* Auto-save indicator */}
        {autoSaving && (
          <div className="flex items-center gap-2 mt-2 text-xs text-white/50">
            <Loader2 className="h-3 w-3 animate-spin" />
            {isAr ? "جاري الحفظ التلقائي..." : "Auto-saving..."}
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

        {/* Public Notes */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <label className="text-sm font-semibold text-white flex items-center gap-2">
              <Eye className="h-4 w-4 text-[#F59E0B]" />
              {isAr ? "ملاحظات مرئية للمرشد" : "Notes for Mentor"}
            </label>
            <span className={`text-xs font-medium ${
              isPublicValid ? "text-white/50" : "text-red-400"
            }`}>
              {publicCharCount}/{MAX_CHARS}
            </span>
          </div>
          <textarea
            value={publicNote}
            onChange={(e) => {
              setPublicNote(e.target.value);
              setIsDirty(true);
            }}
            placeholder={
              isAr
                ? "شارك ملاحظاتك مع المرشد (على الأقل 10 أحرف)..."
                : "Share your notes with your mentor (minimum 10 characters)..."
            }
            dir={isAr ? "rtl" : "ltr"}
            rows={4}
            maxLength={MAX_CHARS}
            className={`w-full px-4 py-3 rounded-lg bg-white/5 border text-sm text-white placeholder-white/40 focus:outline-none transition-colors resize-none ${
              isPublicValid || publicCharCount === 0
                ? "border-white/10 focus:border-[#F59E0B]/50"
                : "border-red-500/30 focus:border-red-500/50"
            }`}
          />
          <p className="text-xs text-white/50">
            {isAr
              ? "يرى المرشد هذه الملاحظات لفهم تجربتك بشكل أفضل"
              : "Your mentor will see these notes to better understand your experience"}
          </p>
        </div>

        {/* Private Notes */}
        <div className="space-y-3 pt-2 border-t border-white/10">
          <div className="flex items-center justify-between gap-2">
            <label className="text-sm font-semibold text-white flex items-center gap-2">
              <Lock className="h-4 w-4 text-[#F59E0B]" />
              {isAr ? "ملاحظات خاصة" : "Private Notes"}
            </label>
            <span className={`text-xs font-medium ${
              isPrivateValid ? "text-white/50" : "text-red-400"
            }`}>
              {privateCharCount}/{MAX_CHARS}
            </span>
          </div>
          <textarea
            value={privateNote}
            onChange={(e) => {
              setPrivateNote(e.target.value);
              setIsDirty(true);
            }}
            placeholder={
              isAr
                ? "ملاحظات شخصية لك وحدك فقط..."
                : "Personal reflection just for you (optional)..."
            }
            dir={isAr ? "rtl" : "ltr"}
            rows={4}
            maxLength={MAX_CHARS}
            className={`w-full px-4 py-3 rounded-lg bg-white/5 border text-sm text-white placeholder-white/40 focus:outline-none transition-colors resize-none ${
              isPrivateValid || privateCharCount === 0
                ? "border-white/10 focus:border-[#F59E0B]/50"
                : "border-red-500/30 focus:border-red-500/50"
            }`}
          />
          <p className="text-xs text-white/50">
            {isAr
              ? "هذه الملاحظات خاصة بك فقط ولن يراها المرشد"
              : "These notes are private and only you will see them"}
          </p>
        </div>

        {/* Timestamps */}
        {(createdAt || updatedAt) && (
          <div className="flex flex-wrap items-center gap-4 text-xs text-white/50 pt-2 border-t border-white/10">
            {createdAt && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3" />
                <span>{isAr ? "تم الإنشاء:" : "Created:"}</span>
                <span>
                  {new Date(createdAt).toLocaleDateString(isAr ? "ar-EG" : "en-US")}
                </span>
              </div>
            )}
            {updatedAt && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3" />
                <span>{isAr ? "آخر تحديث:" : "Updated:"}</span>
                <span>
                  {new Date(updatedAt).toLocaleDateString(isAr ? "ar-EG" : "en-US")}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/10">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${isDirty ? "bg-yellow-500 animate-pulse" : "bg-green-500"}`} />
            <span className="text-xs text-white/60">
              {isDirty
                ? isAr ? "يوجد تغييرات غير محفوظة" : "Unsaved changes"
                : isAr ? "تم الحفظ" : "All saved"}
            </span>
          </div>
          <Button
            onClick={handleSave}
            disabled={!isFormValid || saving || autoSaving}
            loading={saving}
            variant="primary"
            size="md"
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {isAr ? "حفظ الآن" : "Save Now"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
