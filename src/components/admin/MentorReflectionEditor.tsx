"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import {
  Save,
  Loader2,
  AlertCircle,
  Check,
  Undo2,
  Trash2,
  BookOpen,
  Star,
  Flag,
  Eye,
  Lock,
  MessageSquare,
  Calendar,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface Skill {
  id: string;
  name_ar: string;
  name_en: string;
  dimension?: string;
}

interface Milestone {
  id: string;
  title_ar?: string;
  title_en?: string;
  name_ar?: string;
  name_en?: string;
}

interface ClientInfo {
  name: string;
  skills?: Skill[];
  activeMilestones?: Milestone[];
}

interface ClientNote {
  id: string;
  content_ar?: string | null;
  content_en?: string | null;
  is_public: boolean;
  created_at: string;
}

interface ReflectionData {
  id?: string;
  encouragement_ar: string;
  encouragement_en: string;
  mentor_notes_ar: string;
  mentor_notes_en: string;
  status: "draft" | "published";
  skill_ratings: Record<string, number>;
  completed_milestones: string[];
}

interface Props {
  bookingId: string;
  clientId: string;
  reflectionId?: string;
  locale?: "ar" | "en";
  clientInfo?: ClientInfo;
  onSave?: (reflection: ReflectionData) => void;
}

const SKILL_LEVELS = [1, 2, 3, 4, 5] as const;

export default function MentorReflectionEditor({
  bookingId,
  clientId,
  reflectionId,
  locale: propLocale,
  clientInfo,
  onSave,
}: Props) {
  const defaultLocale = useLocale();
  const locale = (propLocale || defaultLocale) as "ar" | "en";
  const isAr = locale === "ar";

  // Form states
  const [encouragementAr, setEncouragementAr] = useState("");
  const [encouragementEn, setEncouragementEn] = useState("");
  const [mentorNotesAr, setMentorNotesAr] = useState("");
  const [mentorNotesEn, setMentorNotesEn] = useState("");
  const [skillRatings, setSkillRatings] = useState<Record<string, number>>({});
  const [completedMilestones, setCompletedMilestones] = useState<Set<string>>(new Set());

  // UI states
  const [loading, setLoading] = useState(!!reflectionId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [expandSections, setExpandSections] = useState({
    encouragement: true,
    mentorNotes: true,
    skills: true,
    milestones: false,
    clientNotes: false,
  });

  // Data states
  const [originalData, setOriginalData] = useState<ReflectionData | null>(null);
  const [clientNotes, setClientNotes] = useState<ClientNote[]>([]);

  // Fetch existing reflection and client notes
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch reflection if editing
        if (reflectionId) {
          const reflResponse = await fetch(`/api/reflections/${reflectionId}`);
          if (reflResponse.ok) {
            const data = await reflResponse.json();
            setEncouragementAr(data.encouragement_ar || "");
            setEncouragementEn(data.encouragement_en || "");
            setMentorNotesAr(data.mentor_notes_ar || "");
            setMentorNotesEn(data.mentor_notes_en || "");
            setSkillRatings(data.skill_ratings || {});
            setCompletedMilestones(new Set(data.completed_milestones || []));
            setOriginalData(data);
          }
        }

        // Fetch client notes
        const notesResponse = await fetch(
          `/api/client-notes/${bookingId}?client_id=${clientId}`
        );
        if (notesResponse.ok) {
          const notes = await notesResponse.json();
          setClientNotes(notes);
        }

        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "error_loading");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [reflectionId, bookingId, clientId]);

  // Handle skill rating
  const handleSkillRating = (skillId: string, level: number) => {
    setSkillRatings((prev) => ({
      ...prev,
      [skillId]: prev[skillId] === level ? 0 : level, // Toggle off if same level
    }));
  };

  // Handle milestone toggle
  const handleMilestoneToggle = (milestoneId: string) => {
    setCompletedMilestones((prev) => {
      const next = new Set(prev);
      if (next.has(milestoneId)) {
        next.delete(milestoneId);
      } else {
        next.add(milestoneId);
      }
      return next;
    });
  };

  // Handle save
  const handleSave = async (status: "draft" | "published") => {
    try {
      setSaving(true);
      setError(null);

      const payload = {
        booking_id: bookingId,
        client_id: clientId,
        encouragement_ar: encouragementAr.trim(),
        encouragement_en: encouragementEn.trim(),
        mentor_notes_ar: mentorNotesAr.trim(),
        mentor_notes_en: mentorNotesEn.trim(),
        status,
        skill_ratings: skillRatings,
        completed_milestones: Array.from(completedMilestones),
      };

      const method = reflectionId ? "PATCH" : "POST";
      const url = reflectionId
        ? `/api/reflections/${reflectionId}`
        : "/api/reflections";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const saved = await response.json();
      setOriginalData(saved);
      setSuccess(true);
      onSave?.(saved);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "error_saving");
    } finally {
      setSaving(false);
    }
  };

  // Handle discard
  const handleDiscard = () => {
    if (originalData) {
      setEncouragementAr(originalData.encouragement_ar);
      setEncouragementEn(originalData.encouragement_en);
      setMentorNotesAr(originalData.mentor_notes_ar);
      setMentorNotesEn(originalData.mentor_notes_en);
      setSkillRatings(originalData.skill_ratings);
      setCompletedMilestones(new Set(originalData.completed_milestones));
      setError(null);
    }
  };

  const hasChanges = originalData !== null && (
    encouragementAr !== originalData.encouragement_ar ||
    encouragementEn !== originalData.encouragement_en ||
    mentorNotesAr !== originalData.mentor_notes_ar ||
    mentorNotesEn !== originalData.mentor_notes_en ||
    JSON.stringify(skillRatings) !== JSON.stringify(originalData.skill_ratings) ||
    JSON.stringify(Array.from(completedMilestones)) !== JSON.stringify(originalData.completed_milestones)
  );

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
              <BookOpen className="h-5 w-5 text-[#F59E0B]" />
              {isAr ? "تقييم الجلسة" : "Session Reflection"}
            </CardTitle>
            <CardDescription className="mt-1">
              {clientInfo?.name && (
                <span>
                  {isAr ? "للعميل: " : "For: "}
                  <span className="font-semibold text-white">{clientInfo.name}</span>
                </span>
              )}
            </CardDescription>
          </div>
          {success && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/20 text-green-300">
              <Check className="h-4 w-4" />
              <span className="text-xs font-semibold">{isAr ? "تم الحفظ" : "Saved"}</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Encouragement Section */}
        <div className="border border-white/10 rounded-lg overflow-hidden">
          <button
            onClick={() =>
              setExpandSections((p) => ({ ...p, encouragement: !p.encouragement }))
            }
            className="w-full px-4 py-3 flex items-center justify-between bg-white/5 hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-[#F59E0B]" />
              <span className="font-semibold text-white">
                {isAr ? "رسالة التشجيع" : "Encouragement Message"}
              </span>
            </div>
            {expandSections.encouragement ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {expandSections.encouragement && (
            <div className="p-4 space-y-3 border-t border-white/10">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-white/70 uppercase">
                  {isAr ? "العربية" : "Arabic"}
                </label>
                <textarea
                  value={encouragementAr}
                  onChange={(e) => setEncouragementAr(e.target.value)}
                  placeholder={isAr ? "الرسالة التشجيعية بالعربية..." : "Encouragement in Arabic..."}
                  dir="rtl"
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#F59E0B]/50 resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-white/70 uppercase">
                  {isAr ? "الإنجليزية" : "English"}
                </label>
                <textarea
                  value={encouragementEn}
                  onChange={(e) => setEncouragementEn(e.target.value)}
                  placeholder={isAr ? "الرسالة التشجيعية بالإنجليزية..." : "Encouragement in English..."}
                  dir="ltr"
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#F59E0B]/50 resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Mentor Notes Section */}
        <div className="border border-white/10 rounded-lg overflow-hidden">
          <button
            onClick={() =>
              setExpandSections((p) => ({ ...p, mentorNotes: !p.mentorNotes }))
            }
            className="w-full px-4 py-3 flex items-center justify-between bg-white/5 hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-[#F59E0B]" />
              <span className="font-semibold text-white">
                {isAr ? "ملاحظات شخصية" : "Private Notes"}
              </span>
            </div>
            {expandSections.mentorNotes ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {expandSections.mentorNotes && (
            <div className="p-4 space-y-3 border-t border-white/10">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-white/70 uppercase">
                  {isAr ? "العربية" : "Arabic"}
                </label>
                <textarea
                  value={mentorNotesAr}
                  onChange={(e) => setMentorNotesAr(e.target.value)}
                  placeholder={isAr ? "ملاحظات خاصة بالعربية..." : "Private notes in Arabic..."}
                  dir="rtl"
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#F59E0B]/50 resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-white/70 uppercase">
                  {isAr ? "الإنجليزية" : "English"}
                </label>
                <textarea
                  value={mentorNotesEn}
                  onChange={(e) => setMentorNotesEn(e.target.value)}
                  placeholder={isAr ? "ملاحظات خاصة بالإنجليزية..." : "Private notes in English..."}
                  dir="ltr"
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#F59E0B]/50 resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Skills Section */}
        {clientInfo?.skills && clientInfo.skills.length > 0 && (
          <div className="border border-white/10 rounded-lg overflow-hidden">
            <button
              onClick={() =>
                setExpandSections((p) => ({ ...p, skills: !p.skills }))
              }
              className="w-full px-4 py-3 flex items-center justify-between bg-white/5 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-[#F59E0B]" />
                <span className="font-semibold text-white">
                  {isAr ? "تقييم المهارات" : "Skill Ratings"}
                </span>
                <span className="text-xs text-white/50 ml-auto">
                  {Object.values(skillRatings).filter((v) => v > 0).length}
                </span>
              </div>
              {expandSections.skills ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {expandSections.skills && (
              <div className="p-4 space-y-3 border-t border-white/10">
                <div className="grid grid-cols-1 gap-3">
                  {clientInfo.skills.map((skill) => (
                    <div key={skill.id} className="space-y-2">
                      <p className="text-sm font-semibold text-white">
                        {isAr ? skill.name_ar : skill.name_en}
                      </p>
                      <div className="flex items-center gap-2">
                        {SKILL_LEVELS.map((level) => (
                          <button
                            key={level}
                            onClick={() => handleSkillRating(skill.id, level)}
                            className={`w-10 h-10 rounded-lg font-semibold text-sm transition-colors ${
                              skillRatings[skill.id] === level
                                ? "bg-[#F59E0B] text-black"
                                : "bg-white/10 text-white/60 hover:bg-white/20"
                            }`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Milestones Section */}
        {clientInfo?.activeMilestones && clientInfo.activeMilestones.length > 0 && (
          <div className="border border-white/10 rounded-lg overflow-hidden">
            <button
              onClick={() =>
                setExpandSections((p) => ({ ...p, milestones: !p.milestones }))
              }
              className="w-full px-4 py-3 flex items-center justify-between bg-white/5 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Flag className="h-4 w-4 text-[#F59E0B]" />
                <span className="font-semibold text-white">
                  {isAr ? "الأهداف المحققة" : "Completed Milestones"}
                </span>
                <span className="text-xs text-white/50 ml-auto">
                  {completedMilestones.size}
                </span>
              </div>
              {expandSections.milestones ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {expandSections.milestones && (
              <div className="p-4 space-y-2 border-t border-white/10">
                {clientInfo.activeMilestones.map((milestone) => {
                  const title = isAr
                    ? milestone.title_ar || milestone.name_ar
                    : milestone.title_en || milestone.name_en;
                  return (
                    <label
                      key={milestone.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={completedMilestones.has(milestone.id)}
                        onChange={() => handleMilestoneToggle(milestone.id)}
                        className="w-4 h-4 rounded accent-[#F59E0B]"
                      />
                      <span className="text-sm text-white">{title}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Client Notes Section */}
        {clientNotes.length > 0 && (
          <div className="border border-white/10 rounded-lg overflow-hidden">
            <button
              onClick={() =>
                setExpandSections((p) => ({ ...p, clientNotes: !p.clientNotes }))
              }
              className="w-full px-4 py-3 flex items-center justify-between bg-white/5 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-[#F59E0B]" />
                <span className="font-semibold text-white">
                  {isAr ? "ملاحظات العميل" : "Client Notes"}
                </span>
                <span className="text-xs text-white/50 ml-auto">{clientNotes.length}</span>
              </div>
              {expandSections.clientNotes ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {expandSections.clientNotes && (
              <div className="p-4 space-y-3 border-t border-white/10">
                {clientNotes.map((note) => (
                  <div
                    key={note.id}
                    className="p-3 rounded-lg bg-white/5 border border-white/10"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        note.is_public
                          ? "bg-green-500/20 text-green-300"
                          : "bg-blue-500/20 text-blue-300"
                      }`}>
                        {note.is_public
                          ? isAr ? "مرئية" : "Public"
                          : isAr ? "خاصة" : "Private"}
                      </span>
                      <span className="text-xs text-white/50">
                        {new Date(note.created_at).toLocaleDateString(
                          isAr ? "ar-EG" : "en-US"
                        )}
                      </span>
                    </div>
                    <p className="text-sm text-white/80 leading-relaxed">
                      {note[`content_${locale}`] || note.content_ar || note.content_en}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/10">
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Button
                onClick={handleDiscard}
                variant="ghost"
                size="sm"
                className="flex items-center gap-1"
              >
                <Undo2 className="h-4 w-4" />
                {isAr ? "تراجع" : "Undo"}
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => handleSave("draft")}
              disabled={saving}
              loading={saving}
              variant="secondary"
              size="md"
              className="flex items-center gap-2"
            >
              {isAr ? "حفظ كمسودة" : "Save as Draft"}
            </Button>
            <Button
              onClick={() => handleSave("published")}
              disabled={saving}
              loading={saving}
              variant="primary"
              size="md"
              className="flex items-center gap-2"
            >
              <Check className="h-4 w-4" />
              {isAr ? "نشر" : "Publish"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
