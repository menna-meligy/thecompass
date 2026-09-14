import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getLocalizedField } from "@/lib/utils";
import { topicLabel } from "@/lib/topics";
import { CheckCircle2, Users, Target, Compass } from "lucide-react";
import type { WorkshopOutlineItem } from "@/types/index";
import WorkshopGraphic from "@/components/workshops/WorkshopGraphic";
import WorkshopBookingPanel from "@/components/workshops/WorkshopBookingPanel";

export default async function WorkshopDetailPage(props: { params: Promise<{ id: string; locale: string }> }) {
  const { id } = await props.params;
  const t = await getTranslations("workshops");
  const locale = await getLocale();
  const isRtl = locale === "ar";
  const supabase = await createClient();

  const { data: workshop } = await supabase
    .from("workshops")
    .select("*")
    .eq("id", id)
    .single();

  if (!workshop) notFound();

  const title = getLocalizedField(workshop as unknown as Record<string, unknown>, "title", locale);
  const description = getLocalizedField(workshop as unknown as Record<string, unknown>, "description", locale);
  const targetAudience = isRtl ? workshop.target_audience_ar : workshop.target_audience_en;
  const outline: WorkshopOutlineItem[] = (isRtl ? workshop.outline_ar : workshop.outline_en) ?? [];
  const endGoals: string[] = (isRtl ? workshop.end_goals_ar : workshop.end_goals_en) ?? [];

  const TOPIC_COLORS: Record<string, string> = {
    scholarships: "#6366f1",
    "career-discovery": "#10b981",
    "career-change": "#f59e0b",
  };
  const accentColor = TOPIC_COLORS[workshop.topic] ?? "#F59E0B";

  return (
    <div className="min-h-screen bg-[#0f172a]">
      {/* Hero */}
      <div style={{ background: "linear-gradient(135deg, #0d1526 0%, #0f172a 100%)", borderBottom: "1px solid rgba(245,158,11,0.10)" }}>
        <div style={{ maxWidth: "72rem", margin: "0 auto", padding: "0 1.5rem" }}>
          <div className="grid md:grid-cols-5 gap-0 min-h-[360px]">
            {/* Branded graphic (no photo) */}
            <div className="relative md:col-span-2 h-60 md:h-full overflow-hidden">
              <WorkshopGraphic topic={workshop.topic} variant="hero" />
            </div>

            {/* Meta */}
            <div
              className="md:col-span-3 flex flex-col justify-center"
              style={{ padding: "2.5rem", textAlign: isRtl ? "right" : "left" }}
            >
              {workshop.topic && (
                <span
                  style={{ alignSelf: isRtl ? "flex-end" : "flex-start", marginBottom: "1.15rem", fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.08em", padding: "5px 14px", borderRadius: "999px", background: `${accentColor}1f`, border: `1px solid ${accentColor}4d`, color: accentColor }}
                >
                  {topicLabel(workshop.topic, locale)}
                </span>
              )}
              <h1 style={{ fontSize: "clamp(2rem, 4vw, 2.9rem)", fontWeight: 900, color: "#fff", lineHeight: 1.2, marginBottom: "1rem" }}>
                {title}
              </h1>
              <p style={{ color: "rgba(255,255,255,0.62)", lineHeight: 1.95, fontSize: "1rem", marginBottom: "1.5rem" }}>
                {description}
              </p>

              {/* Badges row */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: isRtl ? "flex-end" : "flex-start" }}>
                {workshop.spots_available != null && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 13px", borderRadius: "10px", fontSize: "0.78rem", fontWeight: 700, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}>
                    <Users className="h-3.5 w-3.5" />
                    {isRtl ? `متاح ${workshop.spots_available} أماكن فقط` : `${workshop.spots_available} spots only`}
                  </div>
                )}
                {targetAudience && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 13px", borderRadius: "10px", fontSize: "0.78rem", fontWeight: 700, background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.3)", color: "#a5b4fc" }}>
                    <Target className="h-3.5 w-3.5" />
                    {targetAudience}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: "72rem", margin: "0 auto", padding: "3rem 1.5rem" }}>
        <div className="grid lg:grid-cols-3 gap-10">
          {/* Left: Curriculum */}
          <div className="lg:col-span-2" style={{ display: "flex", flexDirection: "column", gap: "2.5rem", textAlign: isRtl ? "right" : "left" }}>
            {/* Program outline */}
            {outline.length > 0 && (
              <section>
                <h2 className="text-lg font-black text-white flex items-center gap-3" style={{ marginBottom: "1.5rem", flexDirection: isRtl ? "row-reverse" : "row" }}>
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0"
                    style={{ background: `${accentColor}20`, color: accentColor }}
                  >
                    #
                  </span>
                  {isRtl ? "محتوى البرنامج" : "Program Outline"}
                  <div className="flex-1 h-px" style={{ background: `${accentColor}20` }} />
                </h2>

                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {outline.map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl overflow-hidden"
                      style={{ border: "1px solid rgba(148,163,184,0.10)", background: "rgba(30,41,59,0.45)" }}
                    >
                      {/* Session header */}
                      <div
                        style={{ display: "flex", alignItems: "center", gap: "14px", padding: "12px 18px", background: "rgba(15,23,42,0.6)", borderBottom: "1px solid rgba(148,163,184,0.08)", flexDirection: isRtl ? "row-reverse" : "row", textAlign: isRtl ? "right" : "left" }}
                      >
                        <span
                          className="text-xs font-black uppercase tracking-wider rounded-md flex-shrink-0"
                          style={{ background: `${accentColor}18`, color: accentColor, padding: "4px 10px" }}
                        >
                          {item.session}
                        </span>
                        <span className="font-bold text-white text-sm">{item.title}</span>
                      </div>

                      {/* Bullets */}
                      {item.bullets.length > 0 && (
                        <ul style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: "9px" }}>
                          {item.bullets.map((bullet, bi) => (
                            <li
                              key={bi}
                              className="text-sm text-white/60"
                              style={{ display: "flex", alignItems: "flex-start", gap: "10px", flexDirection: isRtl ? "row-reverse" : "row", textAlign: isRtl ? "right" : "left", lineHeight: 1.7 }}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{ background: accentColor, opacity: 0.6, marginTop: "8px" }}
                              />
                              <span>{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* End Goals */}
            {endGoals.length > 0 && (
              <section>
                <h2 className="text-lg font-black text-white flex items-center gap-3" style={{ marginBottom: "1.5rem", flexDirection: isRtl ? "row-reverse" : "row" }}>
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${accentColor}20`, color: accentColor }}
                  >
                    <Target className="h-4 w-4" />
                  </span>
                  {isRtl ? "الهدف النهائي للبرنامج" : "What You'll Have by the End"}
                  <div className="flex-1 h-px" style={{ background: `${accentColor}20` }} />
                </h2>

                <div
                  className="rounded-xl"
                  style={{ border: `1px solid ${accentColor}25`, background: `${accentColor}08`, padding: "22px" }}
                >
                  <ul className="grid sm:grid-cols-2" style={{ gap: "14px" }}>
                    {endGoals.map((goal, gi) => (
                      <li
                        key={gi}
                        className="text-sm text-white/75"
                        style={{ display: "flex", alignItems: "flex-start", gap: "10px", flexDirection: isRtl ? "row-reverse" : "row", textAlign: isRtl ? "right" : "left", lineHeight: 1.7 }}
                      >
                        <CheckCircle2 className="h-4 w-4 flex-shrink-0" style={{ color: accentColor, marginTop: "3px" }} />
                        <span>{goal}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}
          </div>

          {/* Right: Booking sessions */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <h2 className="text-lg font-black text-white flex items-center gap-3" style={{ marginBottom: "1.15rem" }}>
                <span
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: `${accentColor}20`, color: accentColor }}
                >
                  <Compass className="h-4 w-4" />
                </span>
                {t("sessions")}
              </h2>

              <WorkshopBookingPanel
                workshopId={id}
                workshopTitle={title}
                isAr={isRtl}
                accentColor={accentColor}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
