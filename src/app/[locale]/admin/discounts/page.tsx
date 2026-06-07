"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import type { DiscountCode } from "@/types/index";
import { Plus, Trash2 } from "lucide-react";

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
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    loadCodes();
  }, []);

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
    const supabase = createClient();
    await supabase
      .from("discount_codes")
      .update({ is_active: !isActive })
      .eq("id", id);
    await loadCodes();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{t("discounts")}</h1>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4 me-1" />
          {t("addNew")}
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-start py-3 px-4 text-sm font-medium text-gray-600">الكود</th>
              <th className="text-start py-3 px-4 text-sm font-medium text-gray-600">النوع</th>
              <th className="text-start py-3 px-4 text-sm font-medium text-gray-600">القيمة</th>
              <th className="text-start py-3 px-4 text-sm font-medium text-gray-600">الاستخدام</th>
              <th className="text-start py-3 px-4 text-sm font-medium text-gray-600">{t("status")}</th>
              <th className="text-start py-3 px-4 text-sm font-medium text-gray-600">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {codes.map((code) => (
              <tr key={code.id} className="border-b border-gray-100">
                <td className="py-3 px-4 font-mono text-sm font-medium">{code.code}</td>
                <td className="py-3 px-4 text-sm text-gray-600">{code.type}</td>
                <td className="py-3 px-4 text-sm">
                  {code.type === "percent" ? `${code.value}%` : `${code.value} EGP`}
                </td>
                <td className="py-3 px-4 text-sm text-gray-600">
                  {code.used_count}/{code.max_uses || "∞"}
                </td>
                <td className="py-3 px-4">
                  <Badge variant={code.is_active ? "success" : "default"}>
                    {code.is_active ? "نشط" : "غير نشط"}
                  </Badge>
                </td>
                <td className="py-3 px-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggle(code.id, code.is_active)}
                  >
                    {code.is_active ? "تعطيل" : "تفعيل"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="إضافة كود خصم"
      >
        <form onSubmit={form.handleSubmit(handleAdd)} className="space-y-4">
          <Input
            label="الكود"
            placeholder="SAVE20"
            {...form.register("code")}
            error={form.formState.errors.code?.message}
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">النوع</label>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#8B0000] focus:outline-none"
              {...form.register("type")}
            >
              <option value="percent">نسبة مئوية %</option>
              <option value="fixed">مبلغ ثابت EGP</option>
            </select>
          </div>
          <Input
            label="القيمة"
            type="number"
            {...form.register("value")}
            error={form.formState.errors.value?.message}
          />
          <Input
            label="الحد الأقصى للاستخدام"
            type="number"
            {...form.register("max_uses")}
          />
          <Input
            label="تاريخ الانتهاء"
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
