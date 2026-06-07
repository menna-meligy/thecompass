"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { Plus, Trash2, Users, User } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

const workshopSchema = z.object({
  title_ar: z.string().min(1),
  title_en: z.string().min(1),
  description_ar: z.string().min(1),
  description_en: z.string().min(1),
  topic: z.string().min(1),
  image_url: z.string().optional(),
});

const sessionSchema = z.object({
  type: z.enum(["group", "individual"]),
  price: z.coerce.number().min(0),
  capacity: z.coerce.number().min(1),
  starts_at: z.string().min(1),
  ends_at: z.string().min(1),
  location_or_link: z.string().optional(),
});

type WorkshopData = z.infer<typeof workshopSchema>;
type SessionData = z.infer<typeof sessionSchema>;

interface SessionRow {
  id: string;
  type: string;
  price: number;
  capacity: number;
  starts_at: string;
  ends_at: string;
  location_or_link: string | null;
  status: string;
}

const textareaClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#8B0000] focus:outline-none focus:ring-1 focus:ring-[#8B0000]";

export default function WorkshopEditPage() {
  const t = useTranslations("admin");
  const locale = useLocale();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [workshopId, setWorkshopId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);

  const form = useForm<WorkshopData>({
    resolver: zodResolver(workshopSchema),
    defaultValues: { title_ar: "", title_en: "", description_ar: "", description_en: "", topic: "", image_url: "" },
  });

  const sessionForm = useForm<SessionData, any, SessionData>({
    resolver: zodResolver(sessionSchema) as any,
    defaultValues: { type: "group", price: 500, capacity: 10 },
  });

  const loadSessions = useCallback(async (wid: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("sessions")
      .select("*")
      .eq("workshop_id", wid)
      .order("starts_at", { ascending: true });
    setSessions((data as SessionRow[]) || []);
  }, []);

  useEffect(() => {
    const pathParts = window.location.pathname.split("/");
    const id = pathParts[pathParts.indexOf("workshops") + 1];

    if (id === "new") {
      setIsNew(true);
      return;
    }
    setWorkshopId(id);

    const supabase = createClient();
    supabase.from("workshops").select("*").eq("id", id).single().then(({ data }) => {
      if (data) {
        form.reset({
          title_ar: data.title_ar,
          title_en: data.title_en,
          description_ar: data.description_ar,
          description_en: data.description_en,
          topic: data.topic,
          image_url: data.image_url || "",
        });
      }
    });
    loadSessions(id);
  }, [loadSessions]);

  async function handleSave(data: WorkshopData) {
    setLoading(true);
    const supabase = createClient();

    if (isNew) {
      const { data: auth } = await supabase.auth.getUser();
      const { data: created } = await supabase
        .from("workshops")
        .insert({ ...data, created_by: auth.user?.id })
        .select()
        .single();
      if (created) setWorkshopId(created.id);
      setIsNew(false);
    } else if (workshopId) {
      await supabase.from("workshops").update(data).eq("id", workshopId);
    }

    setLoading(false);
  }

  async function handleAddSession(data: SessionData) {
    if (!workshopId) return;
    setSessionLoading(true);
    const supabase = createClient();
    await supabase.from("sessions").insert({
      workshop_id: workshopId,
      type: data.type,
      price: data.price,
      capacity: data.capacity,
      starts_at: new Date(data.starts_at).toISOString(),
      ends_at: new Date(data.ends_at).toISOString(),
      location_or_link: data.location_or_link || null,
      status: "published",
    });
    await loadSessions(workshopId);
    setShowSessionForm(false);
    sessionForm.reset();
    setSessionLoading(false);
  }

  async function handleDeleteSession(id: string) {
    const supabase = createClient();
    await supabase.from("sessions").delete().eq("id", id);
    if (workshopId) loadSessions(workshopId);
  }

  return (
    <div className="max-w-3xl space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">
        {isNew ? (locale === "ar" ? "إضافة ورشة جديدة" : "Add New Workshop") : t("edit")}
      </h1>

      {/* Workshop form */}
      <form
        onSubmit={form.handleSubmit(handleSave)}
        className="bg-white rounded-xl border border-gray-100 p-6 space-y-5"
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="العنوان (عربي)" error={form.formState.errors.title_ar?.message} {...form.register("title_ar")} />
          <Input label="Title (English)" error={form.formState.errors.title_en?.message} {...form.register("title_en")} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">الوصف (عربي)</label>
            <textarea className={textareaClass} rows={3} {...form.register("description_ar")} />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Description (English)</label>
            <textarea className={textareaClass} rows={3} {...form.register("description_en")} />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="الموضوع / Topic" error={form.formState.errors.topic?.message} {...form.register("topic")} />
          <Input label="رابط الصورة / Image URL" {...form.register("image_url")} />
        </div>
        <div className="flex gap-3">
          <Button type="submit" loading={loading}>{t("save")}</Button>
          <Button type="button" variant="outline" onClick={() => router.push(`/${locale}/admin/workshops`)}>{t("cancel")}</Button>
        </div>
      </form>

      {/* Sessions section (only after workshop is saved) */}
      {workshopId && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {locale === "ar" ? "الجلسات" : "Sessions"} ({sessions.length})
            </h2>
            <Button size="sm" onClick={() => setShowSessionForm(!showSessionForm)}>
              <Plus className="h-4 w-4 me-1" />
              {locale === "ar" ? "إضافة جلسة" : "Add Session"}
            </Button>
          </div>

          {/* Add session form */}
          {showSessionForm && (
            <form
              onSubmit={sessionForm.handleSubmit(handleAddSession)}
              className="bg-white rounded-xl border border-[#8B0000]/20 p-5 mb-4 space-y-4"
            >
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">{locale === "ar" ? "النوع" : "Type"}</label>
                  <select className={textareaClass} {...sessionForm.register("type")}>
                    <option value="group">{locale === "ar" ? "جماعية" : "Group"}</option>
                    <option value="individual">{locale === "ar" ? "فردية" : "Individual"}</option>
                  </select>
                </div>
                <Input label={locale === "ar" ? "السعر (جنيه)" : "Price (EGP)"} type="number" {...sessionForm.register("price")} />
                <Input label={locale === "ar" ? "الطاقة" : "Capacity"} type="number" {...sessionForm.register("capacity")} />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Input label={locale === "ar" ? "تاريخ البداية" : "Start"} type="datetime-local" {...sessionForm.register("starts_at")} />
                <Input label={locale === "ar" ? "تاريخ النهاية" : "End"} type="datetime-local" {...sessionForm.register("ends_at")} />
              </div>
              <Input label={locale === "ar" ? "الموقع / رابط" : "Location / Link"} {...sessionForm.register("location_or_link")} />
              <div className="flex gap-3">
                <Button type="submit" size="sm" loading={sessionLoading}>{t("save")}</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setShowSessionForm(false)}>{t("cancel")}</Button>
              </div>
            </form>
          )}

          {/* Sessions list */}
          <div className="space-y-3">
            {sessions.length === 0 ? (
              <div className="text-center py-8 text-gray-400 bg-white rounded-xl border border-gray-100 text-sm">
                {locale === "ar" ? "لا توجد جلسات بعد" : "No sessions yet"}
              </div>
            ) : (
              sessions.map((s) => (
                <div key={s.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${s.type === "group" ? "bg-blue-50" : "bg-purple-50"}`}>
                      {s.type === "group"
                        ? <Users className="h-4 w-4 text-blue-600" />
                        : <User className="h-4 w-4 text-purple-600" />
                      }
                    </div>
                    <div>
                      <div className="font-medium text-sm text-gray-900">
                        {formatDateTime(s.starts_at, locale)} — {s.price} {locale === "ar" ? "جنيه" : "EGP"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {locale === "ar" ? `سعة: ${s.capacity}` : `Capacity: ${s.capacity}`}
                        {s.location_or_link && ` · ${s.location_or_link}`}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteSession(s.id)}
                    className="text-red-400 hover:text-red-600 p-1 rounded transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
