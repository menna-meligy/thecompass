import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import RoadmapPath from "@/components/roadmap/RoadmapPath";
import KanbanBoard from "@/components/roadmap/KanbanBoard";
import type { RoadmapProgress } from "@/types/index";

export default async function RoadmapPage() {
  const t = await getTranslations("roadmap");
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth`);

  const { data: roadmap } = await supabase
    .from("roadmap_progress")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const defaultRoadmap: RoadmapProgress = {
    id: "", user_id: user.id, xp: 0, level: 1, completed_count: 0, badges: [], created_at: new Date().toISOString(),
  };

  const progress = (roadmap as RoadmapProgress | null) ?? defaultRoadmap;

  return (
    <div className="bg-[#0f172a] min-h-screen">
      <div style={{ maxWidth: "64rem", margin: "0 auto", padding: "2rem 1.5rem" }}>

        {/* Page title */}
        <div className="mb-8">
          <div style={{ width:"3px", height:"24px", background:"#F59E0B", borderRadius:"2px", display:"inline-block", verticalAlign:"middle", marginInlineEnd:"12px" }} />
          <h1 className="inline text-white font-black text-2xl align-middle">{t("title")}</h1>
          <p className="text-white/40 text-sm mt-1 ms-5">{t("subtitle")}</p>
        </div>

        {/* ── SECTION 1: Game Roadmap ── */}
        <div
          className="mb-10 p-6"
          style={{ background:"rgba(15,23,42,0.6)", border:"1px solid rgba(245,158,11,0.15)", borderRadius:"12px" }}
        >
          <div className="flex items-center gap-2 mb-5">
            <span className="text-base">🧭</span>
            <h2 className="text-white font-bold text-base">{locale === "ar" ? "مسار الخبرة" : "Experience Path"}</h2>
            <div className="ms-auto flex items-center gap-2">
              <span style={{ background:"rgba(245,158,11,0.12)", border:"1px solid rgba(245,158,11,0.25)", color:"#F59E0B", fontSize:"0.75rem", fontWeight:700, padding:"3px 10px", borderRadius:"20px" }}>
                Level {progress.level}
              </span>
              <span style={{ background:"rgba(30,41,59,0.6)", color:"rgba(255,255,255,0.5)", fontSize:"0.75rem", fontWeight:600, padding:"3px 10px", borderRadius:"20px" }}>
                {progress.xp} XP
              </span>
            </div>
          </div>
          <RoadmapPath progress={progress} />
        </div>

        {/* ── SECTION 2: Kanban Goals Board ── */}
        <div
          className="p-6"
          style={{ background:"rgba(15,23,42,0.4)", border:"1px solid rgba(148,163,184,0.08)", borderRadius:"12px" }}
        >
          <KanbanBoard userId={user.id} locale={locale} />
        </div>

      </div>
    </div>
  );
}
