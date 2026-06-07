import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getLocalizedField } from "@/lib/utils";
import Button from "@/components/ui/Button";
import type { Workshop } from "@/types/index";
import { Plus, Edit } from "lucide-react";

export default async function AdminWorkshopsPage() {
  const t = await getTranslations("admin");
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: workshops } = await supabase
    .from("workshops")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{t("workshops")}</h1>
        <Link href={`/${locale}/admin/workshops/new/edit`}>
          <Button size="sm">
            <Plus className="h-4 w-4 me-1" />
            {t("addNew")}
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-start py-3 px-4 text-sm font-medium text-gray-600">
                {locale === "ar" ? "الورشة" : "Workshop"}
              </th>
              <th className="text-start py-3 px-4 text-sm font-medium text-gray-600">
                {locale === "ar" ? "الموضوع" : "Topic"}
              </th>
              <th className="text-start py-3 px-4 text-sm font-medium text-gray-600">
                {t("actions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {(!workshops || workshops.length === 0) ? (
              <tr>
                <td colSpan={3} className="py-8 text-center text-gray-400">
                  {t("noData")}
                </td>
              </tr>
            ) : (
              (workshops as Workshop[]).map((workshop) => (
                <tr key={workshop.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm text-gray-900 font-medium">
                    {getLocalizedField(workshop as unknown as Record<string, unknown>, "title", locale)}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">{workshop.topic}</td>
                  <td className="py-3 px-4">
                    <Link href={`/${locale}/admin/workshops/${workshop.id}/edit`}>
                      <Button size="sm" variant="outline">
                        <Edit className="h-3 w-3 me-1" />
                        {t("edit")}
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
