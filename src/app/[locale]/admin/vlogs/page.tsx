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
import type { Vlog } from "@/types/index";
import { Plus, Trash2 } from "lucide-react";

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
  const [vlogs, setVlogs] = useState<Vlog[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    loadVlogs();
  }, []);

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
    const supabase = createClient();
    await supabase.from("vlogs").delete().eq("id", id);
    await loadVlogs();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{t("vlogs")}</h1>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4 me-1" />
          {t("addNew")}
        </Button>
      </div>

      <div className="space-y-3">
        {vlogs.map((vlog) => (
          <div
            key={vlog.id}
            className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between"
          >
            <div>
              <p className="font-medium text-gray-900">
                {getLocalizedField(vlog as unknown as Record<string, unknown>, "title", locale)}
              </p>
              <p className="text-sm text-gray-500 truncate max-w-xs">{vlog.video_url}</p>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleDelete(vlog.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={locale === "ar" ? "إضافة فيديو جديد" : "Add New Vlog"}
      >
        <form onSubmit={form.handleSubmit(handleAdd)} className="space-y-4">
          <Input
            label="العنوان (عربي)"
            {...form.register("title_ar")}
            error={form.formState.errors.title_ar?.message}
          />
          <Input
            label="Title (English)"
            {...form.register("title_en")}
            error={form.formState.errors.title_en?.message}
          />
          <Input
            label="رابط الفيديو / Video URL"
            {...form.register("video_url")}
            error={form.formState.errors.video_url?.message}
          />
          <Input
            label="رابط الصورة / Thumbnail URL"
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
