import { redirect, notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getLocalizedField } from "@/lib/utils";
import type { SessionMaterial } from "@/types/index";
import { FileText, Download } from "lucide-react";

export default async function MaterialsPage(
  props: PageProps<"/[locale]/dashboard/materials/[bookingId]">
) {
  const { bookingId } = await props.params;
  const t = await getTranslations("materials");
  const locale = await getLocale();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/${locale}/auth`);

  const { data: booking } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .eq("user_id", user.id)
    .single();

  if (!booking) notFound();

  const { data: materials } = await supabase
    .from("session_materials")
    .select("*")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">{t("title")}</h1>

      {!materials || materials.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-100">
          {t("noMaterials")}
        </div>
      ) : (
        <div className="space-y-4">
          {(materials as SessionMaterial[]).map((material) => {
            const title = getLocalizedField(
              material as unknown as Record<string, unknown>,
              "title",
              locale
            );
            const content = getLocalizedField(
              material as unknown as Record<string, unknown>,
              "content",
              locale
            );

            return (
              <div
                key={material.id}
                className="bg-white rounded-xl border border-gray-100 p-5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-[#8B0000] mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-gray-900">{title}</h3>
                      {content && (
                        <p className="text-gray-600 text-sm mt-2 leading-relaxed">{content}</p>
                      )}
                    </div>
                  </div>
                  {material.file_url && (
                    <a
                      href={material.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-[#8B0000] font-medium hover:text-[#C41E3A]"
                    >
                      <Download className="h-4 w-4" />
                      {t("download")}
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
