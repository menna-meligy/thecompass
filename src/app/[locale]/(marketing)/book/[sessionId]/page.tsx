import { notFound, redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import BookingFlow from "@/components/booking/BookingFlow";
import { getLocalizedField, formatDateTime } from "@/lib/utils";
import type { Session } from "@/types/index";
import { Calendar, MapPin, Tag } from "lucide-react";

export default async function BookingPage(props: PageProps<"/[locale]/book/[sessionId]">) {
  const { sessionId } = await props.params;
  const t = await getTranslations("booking");
  const tw = await getTranslations("workshops");
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth`);

  const { data: session } = await supabase
    .from("sessions")
    .select("*, workshop:workshops(*)")
    .eq("id", sessionId)
    .eq("status", "published")
    .single();

  if (!session) notFound();

  const workshopTitle = getLocalizedField(
    (session.workshop as unknown as Record<string, unknown>) || {}, "title", locale
  );

  return (
    <div className="bg-[#0f172a] min-h-screen">
      <div style={{ maxWidth:"42rem", margin:"0 auto", padding:"2.5rem 1.5rem" }}>

        {/* Session info card */}
        <div style={{ background:"rgba(30,41,59,0.6)", border:"1px solid rgba(245,158,11,0.12)", borderRadius:"12px", padding:"20px", marginBottom:"28px" }}>
          <span style={{ fontSize:"0.7rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", color:"rgba(245,158,11,0.6)" }}>
            {t("workshopSession")}
          </span>
          <h1 style={{ color:"white", fontWeight:900, fontSize:"1.15rem", margin:"6px 0 12px", lineHeight:1.25 }}>{workshopTitle}</h1>
          
          <div style={{ borderTop:"1px solid rgba(245,158,11,0.08)", paddingTop:"12px", display:"flex", flexDirection:"column", gap:"8px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"10px", fontSize:"0.83rem", color:"rgba(255,255,255,0.55)" }}>
              <span style={{ width:"28px", height:"28px", borderRadius:"50%", background:"rgba(245,158,11,0.10)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <Calendar className="h-3.5 w-3.5 text-[#F59E0B]" />
              </span>
              {formatDateTime(session.starts_at, locale)}
            </div>
            {session.location_or_link && (
              <div style={{ display:"flex", alignItems:"center", gap:"10px", fontSize:"0.83rem", color:"rgba(255,255,255,0.55)" }}>
                <span style={{ width:"28px", height:"28px", borderRadius:"50%", background:"rgba(245,158,11,0.10)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <MapPin className="h-3.5 w-3.5 text-[#F59E0B]" />
                </span>
                {session.location_or_link}
              </div>
            )}
            <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
              <span style={{ width:"28px", height:"28px", borderRadius:"50%", background:"rgba(245,158,11,0.10)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <Tag className="h-3.5 w-3.5 text-[#F59E0B]" />
              </span>
              <span style={{ fontWeight:900, fontSize:"1rem", color:"#F59E0B" }}>{session.price} {tw("egp")}</span>
            </div>
          </div>
        </div>

        <BookingFlow
          sessionId={session.id}
          workshopTitle={workshopTitle}
          price={session.price || 0}
          userId={user.id}
          sessionStartsAt={session.starts_at}
          sessionEndsAt={session.ends_at ?? undefined}
          sessionLocation={session.location_or_link}
        />
      </div>
    </div>
  );
}
