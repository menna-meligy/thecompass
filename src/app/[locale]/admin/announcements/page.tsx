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
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import type { Announcement } from "@/types/index";
import { Plus } from "lucide-react";

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
  const [items, setItems] = useState<Announcement[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

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
    const supabase = createClient();
    await supabase.from("announcements").update({ is_active: !isActive }).eq("id", id);
    await load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{t("announcements")}</h1>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4 me-1" />
          {t("addNew")}
        </Button>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-gray-900">
                  {getLocalizedField(item as unknown as Record<string, unknown>, "title", locale)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {getLocalizedField(item as unknown as Record<string, unknown>, "body", locale)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={item.is_active ? "success" : "default"}>
                  {item.is_active ? "نشط" : "مخفي"}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleToggle(item.id, item.is_active)}
                >
                  {item.is_active ? "إخفاء" : "إظهار"}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="إضافة إعلان">
        <form onSubmit={form.handleSubmit(handleAdd)} className="space-y-4">
          <Input label="العنوان (عربي)" {...form.register("title_ar")} />
          <Input label="Title (English)" {...form.register("title_en")} />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">النص (عربي)</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#8B0000] focus:outline-none"
              rows={3}
              {...form.register("body_ar")}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Body (English)</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#8B0000] focus:outline-none"
              rows={3}
              {...form.register("body_en")}
            />
          </div>
          <Button type="submit" loading={loading} className="w-full">{t("save")}</Button>
        </form>
      </Modal>
    </div>
  );
}
