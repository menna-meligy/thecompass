import { getTranslations, getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import WorkshopsClient from "@/components/workshops/WorkshopsClient";
import type { Workshop } from "@/types/index";

export default async function WorkshopsPage() {
  const t = await getTranslations("workshops");
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: workshops } = await supabase
    .from("workshops")
    .select("*")
    .order("created_at", { ascending: false });

  const topics = workshops
    ? Array.from(new Set(workshops.map((w) => w.topic)))
    : [];

  return (
    <div className="min-h-screen bg-[#0f172a]">
      {/* Page header */}
      <div style={{ background: "#0d1526", borderBottom: "1px solid rgba(245,158,11,0.10)" }}>
        <div style={{ maxWidth: "80rem", margin: "0 auto", padding: "3rem 1.5rem 2.5rem" }}>
          <div style={{ width: "40px", height: "3px", background: "#F59E0B", opacity: 0.7, marginBottom: "1rem" }} />
          <h1 className="text-3xl md:text-4xl font-black text-white mb-2">{t("title")}</h1>
          <p className="text-white/45 text-base">{t("subtitle")}</p>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: "80rem", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        <WorkshopsClient
          workshops={(workshops as Workshop[]) || []}
          topics={topics}
          locale={locale}
          filterAllLabel={t("filterAll")}
          noResultsLabel={t("noResults")}
        />
      </div>
    </div>
  );
}
