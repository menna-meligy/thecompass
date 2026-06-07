"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Plus, FileText } from "lucide-react";

const materialSchema = z.object({
  booking_id: z.string().min(1),
  session_id: z.string().min(1),
  title_ar: z.string().min(1),
  title_en: z.string().min(1),
  content_ar: z.string().optional(),
  content_en: z.string().optional(),
  file_url: z.string().optional(),
});

type MaterialData = z.infer<typeof materialSchema>;

interface MaterialRow {
  id: string;
  title_ar: string;
  title_en: string;
  booking_id: string;
  session_id: string;
  created_at: string;
}

export default function AdminMaterialsPage() {
  const t = useTranslations("admin");
  const locale = useLocale();
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [bookings, setBookings] = useState<{ id: string; label: string; session_id: string }[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<MaterialData>({ resolver: zodResolver(materialSchema) });

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from("session_materials")
      .select("*")
      .order("created_at", { ascending: false });
    setMaterials((data as MaterialRow[]) || []);

    const { data: bkgs } = await supabase
      .from("bookings")
      .select("id, session_id, user:profiles(full_name), session:sessions(workshop:workshops(title_ar))")
      .eq("status", "confirmed")
      .limit(50);

    if (bkgs) {
      setBookings(
        bkgs.map((b) => ({
          id: b.id,
          session_id: b.session_id,
          label: `${(b as { user?: { full_name?: string } }).user?.full_name || b.id.slice(0, 8)} — ${(b as { session?: { workshop?: { title_ar?: string } } }).session?.workshop?.title_ar || ""}`,
        }))
      );
    }
  }

  useEffect(() => { load(); }, []);

  function handleBookingChange(bookingId: string) {
    const booking = bookings.find((b) => b.id === bookingId);
    if (booking) {
      form.setValue("session_id", booking.session_id);
    }
  }

  async function handleAdd(data: MaterialData) {
    setLoading(true);
    const supabase = createClient();
    await supabase.from("session_materials").insert(data);
    setModalOpen(false);
    form.reset();
    await load();
    setLoading(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{t("materials")}</h1>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4 me-1" />
          {t("addNew")}
        </Button>
      </div>

      <div className="space-y-3">
        {materials.map((m) => (
          <div key={m.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
            <FileText className="h-5 w-5 text-[#8B0000]" />
            <div>
              <p className="font-medium text-gray-900">{locale === "ar" ? m.title_ar : m.title_en}</p>
              <p className="text-xs text-gray-500">{m.booking_id.slice(0, 8)}</p>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="إضافة مادة تعليمية">
        <form onSubmit={form.handleSubmit(handleAdd)} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">الحجز</label>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#8B0000] focus:outline-none"
              {...form.register("booking_id")}
              onChange={(e) => {
                form.setValue("booking_id", e.target.value);
                handleBookingChange(e.target.value);
              }}
            >
              <option value="">اختر حجزاً</option>
              {bookings.map((b) => (
                <option key={b.id} value={b.id}>{b.label}</option>
              ))}
            </select>
          </div>
          <input type="hidden" {...form.register("session_id")} />
          <Input label="العنوان (عربي)" {...form.register("title_ar")} />
          <Input label="Title (English)" {...form.register("title_en")} />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">المحتوى (عربي)</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#8B0000] focus:outline-none"
              rows={3}
              {...form.register("content_ar")}
            />
          </div>
          <Input label="رابط الملف / File URL" {...form.register("file_url")} />
          <Button type="submit" loading={loading} className="w-full">{t("save")}</Button>
        </form>
      </Modal>
    </div>
  );
}
