import { notFound, redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import BookingForm from "@/components/booking/BookingForm";
import { getLocalizedField, formatDateTime } from "@/lib/utils";
import type { Session, TimeSlot } from "@/types/index";
import { Calendar, MapPin, Tag } from "lucide-react";

function StepIndicator({ locale }: { locale: string }) {
  const isAr = locale === "ar";

  const steps = isAr
    ? [
        { label: "بياناتك", number: 1 },
        { label: "الدفع", number: 2 },
        { label: "التأكيد", number: 3 },
      ]
    : [
        { label: "Your Details", number: 1 },
        { label: "Payment", number: 2 },
        { label: "Confirmation", number: 3 },
      ];

  return (
    <div className="flex items-center justify-center mb-10" dir={isAr ? "rtl" : "ltr"}>
      {steps.map((step, index) => (
        <div key={step.number} className="flex items-center">
          <div className="flex flex-col items-center gap-2">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                step.number === 1
                  ? "bg-[#F59E0B] text-[#0f172a] shadow-lg shadow-amber-500/20"
                  : "bg-[rgba(148,163,184,0.10)] border border-[rgba(148,163,184,0.15)] text-white/30"
              }`}
            >
              {step.number}
            </div>
            <span
              className={`text-xs font-medium whitespace-nowrap ${
                step.number === 1 ? "text-[#F59E0B]" : "text-white/30"
              }`}
            >
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div className="h-[2px] w-16 sm:w-24 bg-[rgba(245,158,11,0.15)] mx-2 mb-5" />
          )}
        </div>
      ))}
    </div>
  );
}

export default async function BookingPage(props: PageProps<"/[locale]/book/[sessionId]">) {
  const { sessionId } = await props.params;
  const t = await getTranslations("booking");
  const tw = await getTranslations("workshops");
  const locale = await getLocale();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth`);
  }

  const [{ data: session }, { data: slots }] = await Promise.all([
    supabase
      .from("sessions")
      .select("*, workshop:workshops(*)")
      .eq("id", sessionId)
      .eq("status", "published")
      .single(),
    supabase
      .from("time_slots")
      .select("*")
      .eq("session_id", sessionId)
      .order("starts_at", { ascending: true }),
  ]);

  if (!session) notFound();

  const workshopTitle = getLocalizedField(
    (session.workshop as unknown as Record<string, unknown>) || {},
    "title",
    locale
  );

  return (
    <div className="bg-[#0f172a] min-h-screen">
      <div style={{maxWidth:"42rem",margin:"0 auto",padding:"0 1.5rem"}} className=" py-12">
        <StepIndicator locale={locale} />

        {/* Session info card */}
        <div className="bg-[rgba(30,41,59,0.6)] border border-[rgba(245,158,11,0.12)] rounded-xl p-5 mb-8 space-y-4">
          <div>
            <p className="text-[#F59E0B] text-xs font-semibold uppercase tracking-widest mb-1">
              {t("title")}
            </p>
            <h1 className="text-white text-xl font-bold leading-snug">{workshopTitle}</h1>
          </div>

          <div className="h-px bg-[rgba(245,158,11,0.08)]" />

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-white/60">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[rgba(245,158,11,0.10)] flex items-center justify-center">
                <Calendar className="h-3.5 w-3.5 text-[#F59E0B]" />
              </span>
              <span>{formatDateTime(session.starts_at, locale)}</span>
            </div>

            {session.location_or_link && (
              <div className="flex items-center gap-3 text-sm text-white/60">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[rgba(245,158,11,0.10)] flex items-center justify-center">
                  <MapPin className="h-3.5 w-3.5 text-[#F59E0B]" />
                </span>
                <span>{session.location_or_link}</span>
              </div>
            )}

            <div className="flex items-center gap-3 text-sm">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[rgba(245,158,11,0.10)] flex items-center justify-center">
                <Tag className="h-3.5 w-3.5 text-[#F59E0B]" />
              </span>
              <span className="font-bold text-[#F59E0B]">
                {session.price} {tw("egp")}
              </span>
            </div>
          </div>
        </div>

        <BookingForm
          session={session as Session}
          slots={(slots || []) as TimeSlot[]}
          userId={user.id}
        />
      </div>
    </div>
  );
}
