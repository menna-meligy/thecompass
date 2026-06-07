import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import BookingFlow from "@/components/booking/BookingFlow";
import StepIndicator from "@/components/booking/StepIndicator";
import { Compass } from "lucide-react";

const GENERAL_SESSION_PRICE = parseInt(process.env.NEXT_PUBLIC_GENERAL_SESSION_PRICE || "500");

export default async function GeneralSessionPage() {
  const t = await getTranslations("booking");
  const locale = await getLocale();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth`);
  const isAr = locale === "ar";

  return (
    <div className="bg-[#0f172a] min-h-screen">
      <div style={{ maxWidth:"42rem", margin:"0 auto", padding:"2.5rem 1.5rem" }}>

        {/* Session info card */}
        <div style={{ background:"rgba(30,41,59,0.6)", border:"1px solid rgba(245,158,11,0.18)", borderRadius:"12px", padding:"20px", marginBottom:"28px", display:"flex", alignItems:"flex-start", gap:"16px" }}>
          <div style={{ width:"48px", height:"48px", borderRadius:"10px", background:"rgba(245,158,11,0.12)", border:"1px solid rgba(245,158,11,0.25)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <Compass className="h-6 w-6 text-[#F59E0B]" />
          </div>
          <div>
            <span style={{ fontSize:"0.7rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", color:"rgba(245,158,11,0.6)", display:"block", marginBottom:"4px" }}>
              {t("generalSession")}
            </span>
            <h1 style={{ color:"white", fontWeight:900, fontSize:"1.2rem", lineHeight:1.2, marginBottom:"6px" }}>
              {isAr ? "جلسة فردية مع المدربة" : "1-on-1 Coaching Session"}
            </h1>
            <p style={{ color:"rgba(255,255,255,0.45)", fontSize:"0.82rem", lineHeight:1.5 }}>
              {isAr ? "جلسة تدريب شخصي تساعدك على تحديد أهدافك والانطلاق نحو التغيير" : "A personal coaching session to help you set goals and start your transformation"}
            </p>
          </div>
        </div>

        <BookingFlow
          sessionId="general"
          workshopTitle={isAr ? "جلسة فردية" : "General Coaching Session"}
          price={GENERAL_SESSION_PRICE}
          isGeneralSession={true}
          userId={user.id}
        />
      </div>
    </div>
  );
}
