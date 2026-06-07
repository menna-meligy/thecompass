import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import RoadmapPath from "@/components/roadmap/RoadmapPath";
import type { RoadmapProgress } from "@/types/index";

export default async function RoadmapPage() {
  const t = await getTranslations("roadmap");
  const locale = await getLocale();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/${locale}/auth`);

  const { data: roadmap } = await supabase
    .from("roadmap_progress")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const defaultRoadmap: RoadmapProgress = {
    id: "",
    user_id: user.id,
    xp: 0,
    level: 1,
    completed_count: 0,
    badges: [],
    created_at: new Date().toISOString(),
  };

  return (
    <div className="bg-[#0f172a] min-h-screen">
      <div style={{maxWidth:"36rem",margin:"0 auto",padding:"0 1.5rem"}} className=" py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">{t("title")}</h1>
          <p className="text-white/50 mt-1">{t("subtitle")}</p>
        </div>

        <RoadmapPath progress={(roadmap as RoadmapProgress) || defaultRoadmap} />
      </div>
    </div>
  );
}
