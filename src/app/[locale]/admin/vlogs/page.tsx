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
import { PageHeader } from "@/components/admin/AdminPageWrapper";
import type { Vlog } from "@/types/index";
import { Plus, Trash2, Video, ExternalLink } from "lucide-react";

const vlogSchema = z.object({
  title_ar: z.string().min(1),
  title_en: z.string().min(1),
  description_ar: z.string().default(""),
  description_en: z.string().default(""),
  video_url: z.string().url(),
  thumbnail_url: z.string().optional(),
});

type VlogData = z.infer<typeof vlogSchema>;

export default function AdminVlogsPage() {
  const t = useTranslations("admin");
  const locale = useLocale();
  const isAr = locale === "ar";
  const [vlogs, setVlogs] = useState<Vlog[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<VlogData, any, VlogData>({ resolver: zodResolver(vlogSchema) as any });

  async function loadVlogs() {
    const supabase = createClient();
    const { data } = await supabase
      .from("vlogs")
      .select("*")
      .order("created_at", { ascending: false });
    setVlogs((data as Vlog[]) || []);
  }

  useEffect(() => { loadVlogs(); }, []);

  async function handleAdd(data: VlogData) {
    setLoading(true);
    const supabase = createClient();
    await supabase.from("vlogs").insert(data);
    setModalOpen(false);
    form.reset();
    await loadVlogs();
    setLoading(false);
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    const supabase = createClient();
    await supabase.from("vlogs").delete().eq("id", id);
    await loadVlogs();
    setDeleting(null);
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        supra={isAr ? "المحتوى" : "Content"}
        title={t("vlogs")}
        subtitle={isAr ? "إدارة مقاطع الفيديو التعليمية" : "Manage educational video content"}
        action={
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4 me-1" />
            {t("addNew")}
          </Button>
        }
      />

      {vlogs.length === 0 ? (
        <div className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.12)] rounded-2xl p-16 text-center">
          <Video className="h-10 w-10 text-white/10 mx-auto mb-3" />
          <p className="text-white/30 text-sm">{t("noData")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {vlogs.map((vlog) => (
            <div
              key={vlog.id}
              className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.12)] rounded-2xl p-5 flex flex-col gap-3 hover:border-[rgba(245,158,11,0.25)] transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.15)] flex items-center justify-center text-[#F59E0B] flex-shrink-0">
                  <Video className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold leading-snug">
                    {getLocalizedField(vlog as unknown as Record<string, unknown>, "title", locale)}
                  </p>
                </div>
              </div>
              <p className="text-white/35 text-xs truncate">{vlog.video_url}</p>
              <div className="flex items-center justify-between pt-1 border-t border-white/5">
                <a
                  href={vlog.video_url}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-1 text-xs text-white/30 hover:text-[#F59E0B] transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  {isAr ? "فتح" : "Open"}
                </a>
                <button
                  onClick={() => handleDelete(vlog.id)}
                  disabled={deleting === vlog.id}
                  title={t("delete")}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-40 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={isAr ? "إضافة فيديو جديد" : "Add New Vlog"}
      >
        <form onSubmit={form.handleSubmit(handleAdd)} className="space-y-4">
          <Input
            label={isAr ? "العنوان (عربي)" : "العنوان (عربي)"}
            {...form.register("title_ar")}
            error={form.formState.errors.title_ar?.message}
          />
          <Input
            label="Title (English)"
            {...form.register("title_en")}
            error={form.formState.errors.title_en?.message}
          />
          <Input
            label={isAr ? "رابط الفيديو" : "Video URL"}
            placeholder="https://youtube.com/..."
            {...form.register("video_url")}
            error={form.formState.errors.video_url?.message}
          />
          <Input
            label={isAr ? "رابط الصورة المصغرة" : "Thumbnail URL"}
            {...form.register("thumbnail_url")}
          />
          <Button type="submit" loading={loading} className="w-full">
            {t("save")}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
