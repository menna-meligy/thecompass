"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { getLocalizedField } from "@/lib/utils";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { PageHeader, darkInputClass, darkLabelClass } from "@/components/admin/AdminPageWrapper";
import type { Announcement } from "@/types/index";
import { Plus, Bell, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

const annSchema = z.object({
  title_ar: z.string().min(1),
  title_en: z.string().min(1),
  body_ar: z.string().min(1),
  body_en: z.string().min(1),
});

type AnnData = z.infer<typeof annSchema>;

export default function AdminAnnouncementsPage() {
  const t = useTranslations("admin");
  const locale = useLocale();
  const isAr = locale === "ar";
  const [items, setItems] = useState<Announcement[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const form = useForm<AnnData>({ resolver: zodResolver(annSchema) });

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });
    setItems((data as Announcement[]) || []);
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(data: AnnData) {
    setLoading(true);
    const supabase = createClient();
    await supabase.from("announcements").insert({ ...data, is_active: true });
    setModalOpen(false);
    form.reset();
    await load();
    setLoading(false);
  }

  async function handleToggle(id: string, isActive: boolean) {
    setToggling(id);
    const supabase = createClient();
    await supabase.from("announcements").update({ is_active: !isActive }).eq("id", id);
    await load();
    setToggling(null);
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        supra={isAr ? "المحتوى" : "Content"}
        title={t("announcements")}
        subtitle={isAr ? "إدارة الإعلانات المعروضة للمستخدمين" : "Manage announcements shown to users"}
        action={
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4 me-1" />
            {t("addNew")}
          </Button>
        }
      />

      {items.length === 0 ? (
        <div className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.12)] rounded-2xl p-16 text-center">
          <Bell className="h-10 w-10 text-white/10 mx-auto mb-3" />
          <p className="text-white/30 text-sm">{t("noData")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className={cn(
                "bg-[rgba(13,21,38,0.7)] border rounded-2xl p-5 flex flex-col gap-3 transition-colors",
                item.is_active
                  ? "border-[rgba(245,158,11,0.15)]"
                  : "border-white/5 opacity-60"
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 transition-colors",
                  item.is_active
                    ? "bg-[rgba(245,158,11,0.1)] border-[rgba(245,158,11,0.15)] text-[#F59E0B]"
                    : "bg-white/5 border-white/5 text-white/20"
                )}>
                  <Bell className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold leading-snug">
                    {getLocalizedField(item as unknown as Record<string, unknown>, "title", locale)}
                  </p>
                  <p className="text-white/40 text-xs mt-1 line-clamp-2">
                    {getLocalizedField(item as unknown as Record<string, unknown>, "body", locale)}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-white/5">
                <span className={cn(
                  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
                  item.is_active
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-white/5 text-white/30"
                )}>
                  {item.is_active ? (isAr ? "ظاهر" : "Active") : (isAr ? "مخفي" : "Hidden")}
                </span>
                <button
                  onClick={() => handleToggle(item.id, item.is_active)}
                  disabled={toggling === item.id}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border disabled:opacity-40",
                    item.is_active
                      ? "bg-white/5 text-white/40 border-white/10 hover:text-white/70 hover:border-white/20"
                      : "bg-[rgba(245,158,11,0.1)] text-[#F59E0B] border-[rgba(245,158,11,0.2)] hover:bg-[rgba(245,158,11,0.2)]"
                  )}
                >
                  {item.is_active
                    ? <><EyeOff className="h-3 w-3" />{isAr ? "إخفاء" : "Hide"}</>
                    : <><Eye className="h-3 w-3" />{isAr ? "إظهار" : "Show"}</>
                  }
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={isAr ? "إضافة إعلان جديد" : "Add Announcement"}
      >
        <form onSubmit={form.handleSubmit(handleAdd)} className="space-y-4">
          <Input label={isAr ? "العنوان (عربي)" : "العنوان (عربي)"} {...form.register("title_ar")} />
          <Input label="Title (English)" {...form.register("title_en")} />
          <div>
            <label className={darkLabelClass}>{isAr ? "النص (عربي)" : "النص (عربي)"}</label>
            <textarea
              className={darkInputClass}
              rows={3}
              dir="rtl"
              {...form.register("body_ar")}
            />
          </div>
          <div>
            <label className={darkLabelClass}>Body (English)</label>
            <textarea
              className={darkInputClass}
              rows={3}
              dir="ltr"
              {...form.register("body_en")}
            />
          </div>
          <Button type="submit" loading={loading} className="w-full">{t("save")}</Button>
        </form>
      </Modal>
    </div>
  );
}
