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
import { PageHeader, darkInputClass, darkLabelClass } from "@/components/admin/AdminPageWrapper";
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
  const isAr = locale === "ar";
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [bookings, setBookings] = useState<{ id: string; label: string; session_id: string | null }[]>([]);
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

    // Bookings are slot-based: the appointment time lives on availability_slots
    // and the subject on workshops (or, with no workshop, the career session).
    const { data: bkgs } = await supabase
      .from("bookings")
      .select("id, session_id, user:profiles(full_name), workshop:workshops(title_ar, title_en), slot:availability_slots(date, start_time)")
      .eq("status", "confirmed")
      .limit(50);

    if (bkgs) {
      setBookings(
        bkgs.map((b) => {
          const row = b as unknown as {
            user?: { full_name?: string };
            workshop?: { title_ar?: string; title_en?: string } | null;
            slot?: { date?: string; start_time?: string } | null;
          };
          const who = row.user?.full_name || b.id.slice(0, 8);
          const what =
            (isAr ? row.workshop?.title_ar : row.workshop?.title_en) ||
            (isAr ? "جلسة تحديد المسار" : "Career session");
          const when = row.slot?.date
            ? ` · ${String(row.slot.date).slice(0, 10)} ${String(row.slot.start_time ?? "").slice(0, 5)}`
            : "";
          return { id: b.id, session_id: b.session_id, label: `${who} — ${what}${when}` };
        })
      );
    }
  }

  useEffect(() => { load(); }, []);

  function handleBookingChange(bookingId: string) {
    const booking = bookings.find((b) => b.id === bookingId);
    if (booking?.session_id) form.setValue("session_id", booking.session_id);
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
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        supra={isAr ? "المحتوى" : "Content"}
        title={t("materials")}
        subtitle={isAr ? "المواد التعليمية المرتبطة بالحجوزات" : "Learning materials linked to bookings"}
        action={
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4 me-1" />
            {t("addNew")}
          </Button>
        }
      />

      {materials.length === 0 ? (
        <div className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.12)] rounded-2xl p-16 text-center">
          <FileText className="h-10 w-10 text-white/10 mx-auto mb-3" />
          <p className="text-white/30 text-sm">{t("noData")}</p>
        </div>
      ) : (
        <div className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.12)] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px]">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-start py-3.5 px-5 text-[0.65rem] font-bold uppercase tracking-widest text-white/30">
                    {isAr ? "المادة" : "Material"}
                  </th>
                  <th className="text-start py-3.5 px-5 text-[0.65rem] font-bold uppercase tracking-widest text-white/30">
                    {isAr ? "الحجز" : "Booking"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {materials.map((m) => (
                  <tr key={m.id} className="border-b border-white/3 last:border-0 hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.15)] flex items-center justify-center text-[#F59E0B]">
                          <FileText className="h-3.5 w-3.5" />
                        </div>
                        <p className="text-white text-sm font-semibold">
                          {locale === "ar" ? m.title_ar : m.title_en}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <span className="text-white/40 text-xs font-mono">{m.booking_id.slice(0, 8)}…</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={isAr ? "إضافة مادة تعليمية" : "Add Material"}
      >
        <form onSubmit={form.handleSubmit(handleAdd)} className="space-y-4">
          <div>
            <label className={darkLabelClass}>{isAr ? "الحجز" : "Booking"}</label>
            <select
              className={darkInputClass}
              {...form.register("booking_id")}
              onChange={(e) => {
                form.setValue("booking_id", e.target.value);
                handleBookingChange(e.target.value);
              }}
            >
              <option value="">{isAr ? "اختر حجزاً" : "Select booking"}</option>
              {bookings.map((b) => (
                <option key={b.id} value={b.id}>{b.label}</option>
              ))}
            </select>
          </div>
          <input type="hidden" {...form.register("session_id")} />
          <Input label={isAr ? "العنوان (عربي)" : "العنوان (عربي)"} {...form.register("title_ar")} />
          <Input label="Title (English)" {...form.register("title_en")} />
          <div>
            <label className={darkLabelClass}>{isAr ? "المحتوى (عربي)" : "Content (Arabic)"}</label>
            <textarea className={darkInputClass} rows={3} dir="rtl" {...form.register("content_ar")} />
          </div>
          <Input label={isAr ? "رابط الملف" : "File URL"} {...form.register("file_url")} />
          <Button type="submit" loading={loading} className="w-full">{t("save")}</Button>
        </form>
      </Modal>
    </div>
  );
}
