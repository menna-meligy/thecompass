# Phase 4: Example Page Implementations

Complete example pages showing how to use the three Phase 4 UI components in real applications.

---

## 1. Client Session Dashboard Page

**File:** `app/[locale]/dashboard/sessions/[bookingId]/page.tsx`

Client views their session feedback and submits notes.

```typescript
"use client";

import { useAuth } from "@/lib/auth";
import { useLocale } from "next-intl";
import ClientReflectionsCard from "@/components/dashboard/ClientReflectionsCard";
import ClientSessionNotesForm from "@/components/dashboard/ClientSessionNotesForm";
import { useParams } from "next/navigation";
import { useState } from "react";

export default function SessionDetailPage() {
  const locale = useLocale() as "ar" | "en";
  const params = useParams();
  const { user } = useAuth();
  const bookingId = params.bookingId as string;

  const [notesUpdated, setNotesUpdated] = useState(false);

  return (
    <div dir={locale === "ar" ? "rtl" : "ltr"} className="space-y-8 max-w-4xl">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-white">
          {locale === "ar" ? "📋 تفاصيل الجلسة" : "📋 Session Details"}
        </h1>
        <p className="text-white/60">
          {locale === "ar"
            ? "اعرض تقييم المرشد وشارك ملاحظاتك"
            : "View mentor feedback and share your notes"}
        </p>
      </div>

      {/* Reflection Card */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">
          {locale === "ar" ? "📝 رسالة المرشد" : "📝 Mentor Feedback"}
        </h2>
        <ClientReflectionsCard
          bookingId={bookingId}
          locale={locale}
          onRefresh={() => {
            console.log("Refreshing reflection...");
            setNotesUpdated(true);
            setTimeout(() => setNotesUpdated(false), 3000);
          }}
        />
      </section>

      {/* Notes Form */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">
          {locale === "ar" ? "✍️ ملاحظاتك" : "✍️ Your Notes"}
        </h2>
        <ClientSessionNotesForm
          bookingId={bookingId}
          clientId={user?.id || ""}
          locale={locale}
          onSave={(note) => {
            console.log("Note saved:", note);
            // Show success message
          }}
        />
      </section>

      {/* Success Message */}
      {notesUpdated && (
        <div className="fixed bottom-4 right-4 px-4 py-3 rounded-lg bg-green-500/20 border border-green-500/30 text-green-300 text-sm">
          {locale === "ar" ? "✓ تم تحديث البيانات" : "✓ Data updated"}
        </div>
      )}
    </div>
  );
}
```

---

## 2. Mentor Reflection Creation Page

**File:** `app/[locale]/admin/sessions/[bookingId]/reflection/create/page.tsx`

Mentor creates a new reflection after a session.

```typescript
"use client";

import { useAuth } from "@/lib/auth";
import { useLocale } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import MentorReflectionEditor from "@/components/admin/MentorReflectionEditor";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

interface SessionData {
  id: string;
  booking_id: string;
  client_id: string;
  client_name: string;
  client_email: string;
  session_date: string;
  session_type: string;
  skills: Array<{
    id: string;
    name_ar: string;
    name_en: string;
    dimension: string;
  }>;
  milestones: Array<{
    id: string;
    title_ar: string;
    title_en: string;
    name_ar: string;
    name_en: string;
  }>;
}

export default function CreateReflectionPage() {
  const locale = useLocale() as "ar" | "en";
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const bookingId = params.bookingId as string;

  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Fetch session details
  useEffect(() => {
    const fetchSessionData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/admin/bookings/${bookingId}`);

        if (!response.ok) {
          throw new Error(
            locale === "ar" ? "فشل تحميل البيانات" : "Failed to load session data"
          );
        }

        const data = await response.json();
        setSessionData(data);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : locale === "ar"
              ? "خطأ"
              : "Error"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSessionData();
  }, [bookingId, locale]);

  const handleReflectionSave = async (reflection: any) => {
    setSaving(true);
    try {
      // Success - redirect to view
      setTimeout(() => {
        router.push(
          `/${locale}/admin/sessions/${bookingId}/reflection/${reflection.id}`
        );
      }, 1000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#F59E0B] mx-auto" />
          <p className="text-white/60">
            {locale === "ar" ? "جاري التحميل..." : "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-[#F59E0B] text-black rounded-lg font-semibold hover:bg-amber-400"
          >
            {locale === "ar" ? "العودة" : "Go Back"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      dir={locale === "ar" ? "rtl" : "ltr"}
      className="space-y-8 max-w-4xl"
    >
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-white">
          {locale === "ar" ? "📋 إنشاء تقييم الجلسة" : "📋 Create Session Reflection"}
        </h1>
        {sessionData && (
          <div className="space-y-1">
            <p className="text-white/80">
              {locale === "ar" ? "العميل: " : "Client: "}
              <span className="font-semibold text-[#F59E0B]">
                {sessionData.client_name}
              </span>
            </p>
            <p className="text-sm text-white/60">
              {locale === "ar" ? "تاريخ الجلسة: " : "Session date: "}
              {new Date(sessionData.session_date).toLocaleDateString(
                locale === "ar" ? "ar-EG" : "en-US"
              )}
            </p>
          </div>
        )}
      </div>

      {/* Reflection Editor */}
      {sessionData && (
        <MentorReflectionEditor
          bookingId={bookingId}
          clientId={sessionData.client_id}
          locale={locale}
          clientInfo={{
            name: sessionData.client_name,
            skills: sessionData.skills,
            activeMilestones: sessionData.milestones,
          }}
          onSave={handleReflectionSave}
        />
      )}

      {/* Help Text */}
      <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-200">
        <p className="text-sm">
          {locale === "ar"
            ? "💡 الرسالة التشجيعية ستظهر للعميل مباشرة. الملاحظات الشخصية خاصة بك فقط."
            : "💡 The encouragement message will be shown to the client. Private notes are only for you."}
        </p>
      </div>
    </div>
  );
}
```

---

## 3. Mentor Reflection Edit Page

**File:** `app/[locale]/admin/sessions/[bookingId]/reflection/[reflectionId]/edit/page.tsx`

Mentor edits an existing reflection.

```typescript
"use client";

import { useAuth } from "@/lib/auth";
import { useLocale } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import MentorReflectionEditor from "@/components/admin/MentorReflectionEditor";
import { useState, useEffect } from "react";
import { Loader2, ChevronLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface ReflectionData {
  id: string;
  booking_id: string;
  client_id: string;
  client_name: string;
  encouragement_ar: string;
  encouragement_en: string;
  mentor_notes_ar: string;
  mentor_notes_en: string;
  status: "draft" | "published";
  skills: Array<{
    id: string;
    name_ar: string;
    name_en: string;
  }>;
  milestones: Array<{
    id: string;
    title_ar: string;
    title_en: string;
    name_ar: string;
    name_en: string;
  }>;
}

export default function EditReflectionPage() {
  const locale = useLocale() as "ar" | "en";
  const params = useParams();
  const router = useRouter();

  const bookingId = params.bookingId as string;
  const reflectionId = params.reflectionId as string;

  const [reflection, setReflection] = useState<ReflectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch reflection details
  useEffect(() => {
    const fetchReflection = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/admin/reflections/${reflectionId}?locale=${locale}`
        );

        if (!response.ok) {
          throw new Error(
            locale === "ar" ? "فشل تحميل التقييم" : "Failed to load reflection"
          );
        }

        const data = await response.json();
        setReflection(data);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : locale === "ar"
              ? "خطأ"
              : "Error"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchReflection();
  }, [reflectionId, locale]);

  const handleReflectionSave = () => {
    router.push(`/${locale}/admin/sessions/${bookingId}/reflection/${reflectionId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#F59E0B] mx-auto" />
          <p className="text-white/60">
            {locale === "ar" ? "جاري التحميل..." : "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  if (error || !reflection) {
    return (
      <div className="space-y-4 max-w-4xl">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          {locale === "ar" ? "العودة" : "Back"}
        </button>

        <Card variant="crimson">
          <CardContent className="py-6">
            <p className="text-red-300">
              {error || (locale === "ar" ? "لم يتم العثور على التقييم" : "Reflection not found")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div dir={locale === "ar" ? "rtl" : "ltr"} className="space-y-6 max-w-4xl">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        {locale === "ar" ? "العودة" : "Back"}
      </button>

      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-white">
          {locale === "ar" ? "📋 تحرير التقييم" : "📋 Edit Reflection"}
        </h1>
        <div className="space-y-1">
          <p className="text-white/80">
            {locale === "ar" ? "العميل: " : "Client: "}
            <span className="font-semibold text-[#F59E0B]">
              {reflection.client_name}
            </span>
          </p>
          <p className="text-sm text-white/60">
            {locale === "ar" ? "الحالة: " : "Status: "}
            <span className={`font-semibold ${
              reflection.status === "published"
                ? "text-green-400"
                : "text-yellow-400"
            }`}>
              {reflection.status === "published"
                ? locale === "ar"
                  ? "منشورة"
                  : "Published"
                : locale === "ar"
                  ? "مسودة"
                  : "Draft"}
            </span>
          </p>
        </div>
      </div>

      {/* Reflection Editor */}
      <MentorReflectionEditor
        bookingId={bookingId}
        clientId={reflection.client_id}
        reflectionId={reflectionId}
        locale={locale}
        clientInfo={{
          name: reflection.client_name,
          skills: reflection.skills,
          activeMilestones: reflection.milestones,
        }}
        onSave={handleReflectionSave}
      />
    </div>
  );
}
```

---

## 4. Reflection View Page (Read-Only)

**File:** `app/[locale]/admin/sessions/[bookingId]/reflection/[reflectionId]/page.tsx`

Admin/Mentor views a completed reflection (read-only).

```typescript
"use client";

import { useLocale } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Loader2, ChevronLeft, Edit2, Calendar, Award } from "lucide-react";

interface ReflectionView {
  id: string;
  booking_id: string;
  client_id: string;
  client_name: string;
  encouragement_ar: string;
  encouragement_en: string;
  mentor_notes_ar: string;
  mentor_notes_en: string;
  status: "draft" | "published";
  submitted_at: string;
  updated_at: string;
  skills: Array<{
    name_ar: string;
    name_en: string;
    mentor_level: number;
  }>;
  milestones: Array<{
    title_ar: string;
    title_en: string;
    completed_at: string;
  }>;
}

export default function ViewReflectionPage() {
  const locale = useLocale() as "ar" | "en";
  const params = useParams();
  const router = useRouter();

  const bookingId = params.bookingId as string;
  const reflectionId = params.reflectionId as string;

  const [reflection, setReflection] = useState<ReflectionView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReflection = async () => {
      try {
        const response = await fetch(
          `/api/admin/reflections/${reflectionId}?locale=${locale}`
        );

        if (!response.ok) throw new Error("Failed to load");

        const data = await response.json();
        setReflection(data);
      } catch (err) {
        setError(
          locale === "ar"
            ? "فشل تحميل التقييم"
            : "Failed to load reflection"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchReflection();
  }, [reflectionId, locale]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-[#F59E0B]" />
      </div>
    );
  }

  if (error || !reflection) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-white/60"
        >
          <ChevronLeft className="h-4 w-4" />
          {locale === "ar" ? "العودة" : "Back"}
        </button>
        <Card variant="crimson">
          <CardContent className="py-6">
            <p className="text-red-300">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const encouragement = locale === "ar"
    ? reflection.encouragement_ar
    : reflection.encouragement_en;
  const mentorNotes = locale === "ar"
    ? reflection.mentor_notes_ar
    : reflection.mentor_notes_en;

  return (
    <div dir={locale === "ar" ? "rtl" : "ltr"} className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-white/60 hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
          {locale === "ar" ? "العودة" : "Back"}
        </button>
        <Button
          onClick={() => router.push(`${reflectionId}/edit`)}
          variant="secondary"
          size="sm"
          className="flex items-center gap-2"
        >
          <Edit2 className="h-4 w-4" />
          {locale === "ar" ? "تحرير" : "Edit"}
        </Button>
      </div>

      {/* Title */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-white">
          {locale === "ar"
            ? `تقييم جلسة ${reflection.client_name}`
            : `Reflection: ${reflection.client_name}`}
        </h1>
        <div className="flex flex-wrap gap-4 text-sm text-white/60">
          <span className={`px-3 py-1 rounded-full ${
            reflection.status === "published"
              ? "bg-green-500/20 text-green-300"
              : "bg-yellow-500/20 text-yellow-300"
          }`}>
            {reflection.status === "published"
              ? locale === "ar" ? "منشورة" : "Published"
              : locale === "ar" ? "مسودة" : "Draft"}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {new Date(reflection.submitted_at).toLocaleDateString(
              locale === "ar" ? "ar-EG" : "en-US"
            )}
          </span>
        </div>
      </div>

      {/* Encouragement */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>📝</span>
            {locale === "ar" ? "الرسالة التشجيعية" : "Encouragement"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-base leading-relaxed text-white/80">
            {encouragement}
          </p>
        </CardContent>
      </Card>

      {/* Mentor Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>🔒</span>
            {locale === "ar" ? "ملاحظات شخصية" : "Private Notes"}
          </CardTitle>
          <CardDescription>
            {locale === "ar"
              ? "هذه الملاحظات خاصة بك فقط"
              : "These notes are private"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-base leading-relaxed text-white/80">
            {mentorNotes || (locale === "ar" ? "بدون ملاحظات" : "No notes")}
          </p>
        </CardContent>
      </Card>

      {/* Skills */}
      {reflection.skills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              {locale === "ar" ? "المهارات المقيّمة" : "Skills Assessed"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {reflection.skills.map((skill, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-white/5 border border-white/10"
                >
                  <p className="text-sm font-semibold text-white">
                    {locale === "ar" ? skill.name_ar : skill.name_en}
                  </p>
                  <div className="flex gap-1 mt-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-2 w-2 rounded-full ${
                          i < skill.mentor_level ? "bg-[#F59E0B]" : "bg-white/20"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Milestones */}
      {reflection.milestones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {locale === "ar" ? "الأهداف المحققة" : "Completed Milestones"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {reflection.milestones.map((milestone, idx) => (
                <li key={idx} className="flex items-center gap-2 text-white/80">
                  <span className="text-[#F59E0B]">✓</span>
                  {locale === "ar" ? milestone.title_ar : milestone.title_en}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

---

## Integration Notes

1. **Replace placeholder API URLs** - Update `/api/reflections` and `/api/client-notes` paths to match your actual API routes
2. **Add auth guards** - Ensure only authenticated users can access these pages
3. **Add error boundaries** - Wrap components in React error boundaries for better error handling
4. **Add loading skeletons** - Replace simple spinners with skeleton screens for better UX
5. **Add analytics** - Track when users view/save reflections
6. **Add notifications** - Send email/push notifications when reflections are published

---

**Status:** ✅ Example Pages Complete
**Ready for:** Copy-paste into your Next.js app
