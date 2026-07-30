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
import type { DiscountCode } from "@/types/index";
import { Plus, ToggleLeft, ToggleRight, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

const discountSchema = z.object({
  code: z.string().min(3),
  type: z.enum(["percent", "fixed"]),
  value: z.coerce.number().min(1),
  max_uses: z.coerce.number().optional(),
  expires_at: z.string().optional(),
});

type DiscountData = z.infer<typeof discountSchema>;

export default function AdminDiscountsPage() {
  const t = useTranslations("admin");
  const locale = useLocale();
  const isAr = locale === "ar";
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<DiscountData, any, DiscountData>({
    resolver: zodResolver(discountSchema) as any,
    defaultValues: { type: "percent" },
  });

  async function loadCodes() {
    const supabase = createClient();
    const { data } = await supabase
      .from("discount_codes")
      .select("*")
      .order("is_active", { ascending: false });
    setCodes((data as DiscountCode[]) || []);
  }

  useEffect(() => { loadCodes(); }, []);

  async function handleAdd(data: DiscountData) {
    setLoading(true);
    const supabase = createClient();
    await supabase.from("discount_codes").insert({
      ...data,
      code: data.code.toUpperCase(),
      used_count: 0,
      is_active: true,
    });
    setModalOpen(false);
    form.reset();
    await loadCodes();
    setLoading(false);
  }

  async function handleToggle(id: string, isActive: boolean) {
    setToggling(id);
    const supabase = createClient();
    await supabase.from("discount_codes").update({ is_active: !isActive }).eq("id", id);
    await loadCodes();
    setToggling(null);
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        supra={isAr ? "النمو" : "Growth"}
        title={t("discounts")}
        action={
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4 me-1" />
            {t("addNew")}
          </Button>
        }
      />

      <div className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.12)] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-start py-3.5 px-5 text-[0.65rem] font-bold uppercase tracking-widest text-white/30">
                  {isAr ? "الكود" : "Code"}
                </th>
                <th className="text-start py-3.5 px-5 text-[0.65rem] font-bold uppercase tracking-widest text-white/30">
                  {isAr ? "النوع" : "Type"}
                </th>
                <th className="text-start py-3.5 px-5 text-[0.65rem] font-bold uppercase tracking-widest text-white/30">
                  {isAr ? "القيمة" : "Value"}
                </th>
                <th className="text-start py-3.5 px-5 text-[0.65rem] font-bold uppercase tracking-widest text-white/30">
                  {isAr ? "الاستخدام" : "Uses"}
                </th>
                <th className="text-start py-3.5 px-5 text-[0.65rem] font-bold uppercase tracking-widest text-white/30">
                  {t("status")}
                </th>
                <th className="text-end py-3.5 px-5 text-[0.65rem] font-bold uppercase tracking-widest text-white/30">
                  {t("actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {codes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-white/25 text-sm">
                    {t("noData")}
                  </td>
                </tr>
              ) : codes.map((code) => (
                <tr key={code.id} className="border-b border-white/3 last:border-0 hover:bg-white/[0.02] transition-colors">
                  <td className="py-4 px-5">
                    <span className="font-mono text-sm font-bold text-[#F59E0B] tracking-wider">
                      {code.code}
                    </span>
                  </td>
                  <td className="py-4 px-5">
                    <span className="text-white/60 text-sm">
                      {code.type === "percent"
                        ? (isAr ? "نسبة %" : "Percent %")
                        : (isAr ? "مبلغ ثابت" : "Fixed")}
                    </span>
                  </td>
                  <td className="py-4 px-5">
                    <span className="text-white text-sm font-semibold">
                      {code.type === "percent" ? `${code.value}%` : `${code.value} ${isAr ? "ج" : "EGP"}`}
                    </span>
                  </td>
                  <td className="py-4 px-5">
                    <span className="text-white/50 text-sm">
                      {code.used_count}/{code.max_uses ?? "∞"}
                    </span>
                  </td>
                  <td className="py-4 px-5">
                    <span className={cn(
                      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
                      code.is_active
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-white/5 text-white/30"
                    )}>
                      {code.is_active ? (isAr ? "نشط" : "Active") : (isAr ? "معطل" : "Inactive")}
                    </span>
                  </td>
                  <td className="py-4 px-5 text-end">
                    <button
                      onClick={() => handleToggle(code.id, code.is_active)}
                      disabled={toggling === code.id}
                      title={code.is_active ? (isAr ? "تعطيل" : "Deactivate") : (isAr ? "تفعيل" : "Activate")}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border disabled:opacity-40",
                        code.is_active
                          ? "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                      )}
                    >
                      {code.is_active
                        ? <><ToggleRight className="h-3.5 w-3.5" />{isAr ? "تعطيل" : "Disable"}</>
                        : <><ToggleLeft className="h-3.5 w-3.5" />{isAr ? "تفعيل" : "Enable"}</>
                      }
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={isAr ? "إضافة كود خصم" : "Add Discount Code"}
      >
        <form onSubmit={form.handleSubmit(handleAdd)} className="space-y-4">
          <Input
            label={isAr ? "الكود" : "Code"}
            placeholder="SAVE20"
            {...form.register("code")}
            error={form.formState.errors.code?.message}
          />
          <div>
            <label className={darkLabelClass}>{isAr ? "النوع" : "Type"}</label>
            <select className={darkInputClass} {...form.register("type")}>
              <option value="percent">{isAr ? "نسبة مئوية %" : "Percent %"}</option>
              <option value="fixed">{isAr ? "مبلغ ثابت (جنيه)" : "Fixed Amount (EGP)"}</option>
            </select>
          </div>
          <Input
            label={isAr ? "القيمة" : "Value"}
            type="number"
            {...form.register("value")}
            error={form.formState.errors.value?.message}
          />
          <Input
            label={isAr ? "الحد الأقصى للاستخدام" : "Max Uses"}
            type="number"
            {...form.register("max_uses")}
          />
          <Input
            label={isAr ? "تاريخ الانتهاء" : "Expiry Date"}
            type="date"
            {...form.register("expires_at")}
          />
          <Button type="submit" loading={loading} className="w-full">
            {t("save")}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
