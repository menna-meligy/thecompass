import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getLocalizedField } from "@/lib/utils";
import Button from "@/components/ui/Button";
import { PageHeader, TOPIC_LABELS } from "@/components/admin/AdminPageWrapper";
import type { Workshop } from "@/types/index";
import { Plus, Edit } from "lucide-react";

function TopicBadge({ topic, locale }: { topic: string; locale: string }) {
  const label = TOPIC_LABELS[topic];
  const display = label ? (locale === "ar" ? label.ar : label.en) : topic;
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[rgba(245,158,11,0.1)] text-[#F59E0B] border border-[rgba(245,158,11,0.18)]">
      {display}
    </span>
  );
}

export default async function AdminWorkshopsPage() {
  const t = await getTranslations("admin");
  const locale = await getLocale();
  const isAr = locale === "ar";
  const supabase = await createClient();

  const { data: workshops } = await supabase
    .from("workshops")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        supra={isAr ? "البرامج" : "Programs"}
        title={t("workshops")}
        action={
          <Link href={`/${locale}/admin/workshops/new/edit`}>
            <Button size="sm">
              <Plus className="h-4 w-4 me-1" />
              {t("addNew")}
            </Button>
          </Link>
        }
      />

      <div className="hidden sm:block bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.12)] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px]">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-start py-3.5 px-5 text-[0.65rem] font-bold uppercase tracking-widest text-white/30">
                  {isAr ? "الورشة" : "Workshop"}
                </th>
                <th className="text-start py-3.5 px-5 text-[0.65rem] font-bold uppercase tracking-widest text-white/30">
                  {isAr ? "الموضوع" : "Topic"}
                </th>
                <th className="text-end py-3.5 px-5 text-[0.65rem] font-bold uppercase tracking-widest text-white/30">
                  {t("actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {(!workshops || workshops.length === 0) ? (
                <tr>
                  <td colSpan={3} className="py-16 text-center text-white/25 text-sm">
                    {t("noData")}
                  </td>
                </tr>
              ) : (
                (workshops as Workshop[]).map((workshop) => (
                  <tr key={workshop.id} className="border-b border-white/3 last:border-0 hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-5">
                      <p className="text-white text-sm font-semibold">
                        {getLocalizedField(workshop as unknown as Record<string, unknown>, "title", locale)}
                      </p>
                    </td>
                    <td className="py-4 px-5">
                      <TopicBadge topic={workshop.topic} locale={locale} />
                    </td>
                    <td className="py-4 px-5 text-end">
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

      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {(!workshops || workshops.length === 0) ? (
          <div className="py-12 text-center text-white/25 text-sm">{t("noData")}</div>
        ) : (workshops as Workshop[]).map((workshop) => (
          <div key={workshop.id} className="bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.12)] rounded-2xl p-4">
            <p className="text-white text-sm font-semibold mb-3">
              {getLocalizedField(workshop as unknown as Record<string, unknown>, "title", locale)}
            </p>
            <div className="flex items-center justify-between gap-2">
              <TopicBadge topic={workshop.topic} locale={locale} />
              <Link href={`/${locale}/admin/workshops/${workshop.id}/edit`}>
                <Button size="sm" variant="outline">
                  <Edit className="h-3 w-3 me-1" />
                  {t("edit")}
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
