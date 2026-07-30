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
import { PageHeader, darkInputClass, darkLabelClass, TOPIC_LABELS } from "@/components/admin/AdminPageWrapper";
import { Plus, Trash2, Users, User, Calendar, MapPin } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

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

export default function WorkshopEditPage() {
  const t = useTranslations("admin");
  const locale = useLocale();
  const isAr = locale === "ar";
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

  const topicOptions = Object.entries(TOPIC_LABELS).map(([key, labels]) => ({
    value: key,
    label: isAr ? labels.ar : labels.en,
  }));

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <PageHeader
        supra={isAr ? "البرامج" : "Programs"}
        title={isNew
          ? (isAr ? "إضافة ورشة جديدة" : "Add New Workshop")
          : (isAr ? "تعديل الورشة" : "Edit Workshop")
        }
      />

      {/* Workshop form */}
      <form onSubmit={form.handleSubmit(handleSave)}>
        <div className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.12)] rounded-2xl p-6 space-y-6">
          {/* Title row: AR + EN side by side */}
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className={cn(darkLabelClass, "text-end block")} dir="rtl">العنوان (عربي)</label>
              <Input
                {...form.register("title_ar")}
                error={form.formState.errors.title_ar?.message}
                dir="rtl"
              />
            </div>
            <div>
              <label className={darkLabelClass} dir="ltr">Title (English)</label>
              <Input
                {...form.register("title_en")}
                error={form.formState.errors.title_en?.message}
                dir="ltr"
              />
            </div>
          </div>

          {/* Description row: AR + EN side by side */}
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className={cn(darkLabelClass, "text-end block")} dir="rtl">الوصف (عربي)</label>
              <textarea
                className={darkInputClass}
                rows={4}
                dir="rtl"
                {...form.register("description_ar")}
              />
              {form.formState.errors.description_ar && (
                <p className="text-red-400 text-xs mt-1">{form.formState.errors.description_ar.message}</p>
              )}
            </div>
            <div>
              <label className={darkLabelClass} dir="ltr">Description (English)</label>
              <textarea
                className={darkInputClass}
                rows={4}
                dir="ltr"
                {...form.register("description_en")}
              />
              {form.formState.errors.description_en && (
                <p className="text-red-400 text-xs mt-1">{form.formState.errors.description_en.message}</p>
              )}
            </div>
          </div>

          {/* Topic + Image URL row */}
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className={darkLabelClass}>{isAr ? "الموضوع" : "Topic"}</label>
              <select className={darkInputClass} {...form.register("topic")}>
                <option value="">{isAr ? "اختر الموضوع" : "Select topic"}</option>
                {topicOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {form.formState.errors.topic && (
                <p className="text-red-400 text-xs mt-1">{form.formState.errors.topic.message}</p>
              )}
            </div>
            <Input
              label={isAr ? "رابط الصورة" : "Image URL"}
              {...form.register("image_url")}
            />
          </div>

          {/* Action row */}
          <div className="flex items-center gap-3 pt-2 border-t border-white/5">
            <Button type="submit" loading={loading}>{t("save")}</Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push(`/${locale}/admin/workshops`)}
            >
              {t("cancel")}
            </Button>
          </div>
        </div>
      </form>

      {/* Sessions section */}
      {workshopId && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#F59E0B] mb-0.5">
                {isAr ? "الجلسات" : "Sessions"}
              </p>
              <h2 className="text-lg font-bold text-white">
                {isAr ? `الجلسات (${sessions.length})` : `Sessions (${sessions.length})`}
              </h2>
            </div>
            <Button size="sm" onClick={() => setShowSessionForm(!showSessionForm)}>
              <Plus className="h-4 w-4 me-1" />
              {isAr ? "إضافة جلسة" : "Add Session"}
            </Button>
          </div>

          {/* Add session form */}
          {showSessionForm && (
            <form
              onSubmit={sessionForm.handleSubmit(handleAddSession)}
              className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.2)] rounded-2xl p-6 space-y-5"
            >
              <p className="text-sm font-bold text-[#F59E0B]">
                {isAr ? "بيانات الجلسة الجديدة" : "New Session Details"}
              </p>

              {/* Type, Price, Capacity */}
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className={darkLabelClass}>{isAr ? "النوع" : "Type"}</label>
                  <select className={darkInputClass} {...sessionForm.register("type")}>
                    <option value="group">{isAr ? "جماعية" : "Group"}</option>
                    <option value="individual">{isAr ? "فردية" : "Individual"}</option>
                  </select>
                </div>
                <Input
                  label={isAr ? "السعر (جنيه)" : "Price (EGP)"}
                  type="number"
                  {...sessionForm.register("price")}
                />
                <Input
                  label={isAr ? "الطاقة الاستيعابية" : "Capacity"}
                  type="number"
                  {...sessionForm.register("capacity")}
                />
              </div>

              {/* Start + End */}
              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  label={isAr ? "تاريخ ووقت البداية" : "Start Date & Time"}
                  type="datetime-local"
                  {...sessionForm.register("starts_at")}
                />
                <Input
                  label={isAr ? "تاريخ ووقت النهاية" : "End Date & Time"}
                  type="datetime-local"
                  {...sessionForm.register("ends_at")}
                />
              </div>

              <Input
                label={isAr ? "الموقع أو رابط الجلسة" : "Location / Meeting Link"}
                {...sessionForm.register("location_or_link")}
              />

              <div className="flex items-center gap-3 pt-2 border-t border-white/5">
                <Button type="submit" size="sm" loading={sessionLoading}>{t("save")}</Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowSessionForm(false)}
                >
                  {t("cancel")}
                </Button>
              </div>
            </form>
          )}

          {/* Sessions list */}
          {sessions.length === 0 ? (
            <div className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.12)] rounded-2xl p-12 text-center">
              <Calendar className="h-8 w-8 text-white/10 mx-auto mb-2" />
              <p className="text-white/30 text-sm">
                {isAr ? "لا توجد جلسات بعد. أضف أول جلسة" : "No sessions yet. Add the first one"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.08)] rounded-xl p-4 flex items-center justify-between gap-4 hover:border-[rgba(245,158,11,0.15)] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
                      s.type === "group"
                        ? "bg-blue-500/10 border border-blue-500/20 text-blue-400"
                        : "bg-purple-500/10 border border-purple-500/20 text-purple-400"
                    )}>
                      {s.type === "group"
                        ? <Users className="h-4 w-4" />
                        : <User className="h-4 w-4" />
                      }
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-semibold">
                        {formatDateTime(s.starts_at, locale)}
                        <span className="text-[#F59E0B] ms-2 font-black">
                          {s.price} {isAr ? "ج" : "EGP"}
                        </span>
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-white/40 text-xs">
                          {isAr ? `سعة: ${s.capacity}` : `Capacity: ${s.capacity}`}
                        </span>
                        {s.location_or_link && (
                          <span className="text-white/30 text-xs flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate max-w-[120px]">{s.location_or_link}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteSession(s.id)}
                    title={t("delete")}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors flex-shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
