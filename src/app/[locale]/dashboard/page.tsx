import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime, formatCurrency, getLocalizedField } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import type { Booking, RoadmapProgress } from "@/types/index";
import { Calendar, BookOpen, ChevronRight, ClipboardList, Map, User, Compass, StickyNote } from "lucide-react";
import type { AssessmentResult } from "@/lib/compass/types";
import { ZONE_LABELS } from "@/lib/compass/templates";
import NextSessionCountdown from "@/components/dashboard/NextSessionCountdown";
import { slotStartsAtISO, formatISODate, shortTime } from "@/lib/schedule-dates";
import { offeringTitle, isOfferingType } from "@/lib/offerings";
import { meetingLink } from "@/lib/meeting";

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const locale = await getLocale();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/${locale}/auth`);

  const [{ data: profile }, { data: bookings }, { data: roadmap }, { data: latestAssessment }, { data: mentorNotes }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase
        .from("bookings")
        .select(
          "*, workshop:workshops(id, title_ar, title_en), slot:availability_slots(date, start_time, end_time), payment:payments(*)",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("roadmap_progress")
        .select("*")
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("assessments")
        .select("result_snapshot, happiness_score, completed_at")
        .eq("client_id", user.id)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(1)
        .single(),
      // Mentor notes live on the roadmap board (user_tasks, track='mentor').
      // They were only reachable via Roadmap -> a second tab, so clients never
      // found them; surface the latest ones here too.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from("user_tasks")
        .select("id, title, icon, status, updated_at")
        .eq("user_id", user.id)
        .eq("track", "mentor")
        .order("updated_at", { ascending: false })
        .limit(4),
    ]);

  const isAr = locale === "ar";
  const statusLabel = (s: string) => {
    const map: Record<string, { ar: string; en: string }> = {
      pending: { ar: "قيد الانتظار", en: "Pending" },
      proof_submitted: { ar: "في انتظار المراجعة", en: "Under review" },
      confirmed: { ar: "مؤكد", en: "Confirmed" },
      completed: { ar: "مكتمل", en: "Completed" },
      attended: { ar: "تمّ الحضور", en: "Attended" },
      cancelled: { ar: "ملغي", en: "Cancelled" },
    };
    const m = map[s] ?? { ar: s, en: s };
    return isAr ? m.ar : m.en;
  };

  const now = new Date();
  // Bookings hang off availability_slots now; the old `sessions` join was always
  // null, so this whole section (and the next-session countdown) never appeared.
  type Row = Booking & {
    offering_type?: string | null;
    google_meet_link?: string | null;
    workshop?: { id: string; title_ar: string; title_en: string } | null;
    slot?: { date?: string; start_time?: string; end_time?: string } | null;
  };
  const withStart = ((bookings as unknown as Row[]) ?? [])
    .map((b) => ({
      b,
      startsAt: b.slot?.date && b.slot?.start_time ? slotStartsAtISO(b.slot.date, b.slot.start_time) : null,
      title: offeringTitle(isOfferingType(b.offering_type) ? b.offering_type : "career", b.workshop, isAr),
    }))
    .filter((x) => x.startsAt);

  const upcoming = withStart.filter(
    (x) => new Date(x.startsAt!) > now && x.b.status !== "cancelled",
  );
  const past = withStart.filter((x) => new Date(x.startsAt!) <= now);

  // The countdown is only a promise worth making once the seat is paid for.
  const nextSession =
    [...upcoming]
      .filter((x) => x.b.status === "confirmed")
      .sort((a, b) => new Date(a.startsAt!).getTime() - new Date(b.startsAt!).getTime())[0] || null;

  const quickLinks = [
    { href: `/${locale}/dashboard/bookings`, label: t("bookings"), icon: ClipboardList },
    { href: `/${locale}/dashboard/roadmap`, label: t("roadmapPreview"), icon: Map },
    { href: `/${locale}/dashboard/profile`, label: t("profile"), icon: User },
    { href: `/${locale}/workshops`, label: locale === "ar" ? "استكشف" : "Explore", icon: Compass },
  ];

  // Level progress ring
  const progress = roadmap as RoadmapProgress | null;
  const xpPerLevel = 100;
  const levelProgress = progress ? (progress.xp % xpPerLevel) / xpPerLevel : 0;
  const circumference = 2 * Math.PI * 26; // r=26
  const strokeDash = circumference * levelProgress;

  return (
    <div style={{maxWidth:"64rem",margin:"0 auto",padding:"0 1.5rem"}} className=" py-12">
      {/* Welcome */}
      <div className="mb-10">
        <div className="w-10 h-0.5 bg-[#F59E0B] rounded-full mb-4" />
        <h1 className="text-4xl font-bold text-white tracking-tight">
          {t("welcome")}, {profile?.full_name?.split(" ")[0] || ""}!
        </h1>
        <p className="text-white/40 mt-2 text-sm">
          {locale === "ar" ? "أهلاً بيك في لوحة التحكم بتاعتك" : "Welcome back to your dashboard"}
        </p>
      </div>

      {/* Next session countdown */}
      {nextSession?.startsAt && (
        <NextSessionCountdown
          startsAt={nextSession.startsAt!}
          title={nextSession.title}
          locationOrLink={meetingLink(nextSession.b.google_meet_link)}
          locale={locale}
        />
      )}

      {/* Roadmap preview */}
      {progress && (
        <div className="relative rounded-2xl p-6 mb-8 text-white overflow-hidden bg-[rgba(30,41,59,0.7)] border border-[rgba(245,158,11,0.18)]">
          {/* Dot pattern */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
          {/* Gold glow blob */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-10 -right-10 w-48 h-48 rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, #F59E0B, transparent 70%)" }}
          />

          <div className="relative flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-6">
              {/* SVG progress ring */}
              <div className="relative flex-shrink-0">
                <svg width="64" height="64" className="-rotate-90">
                  <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="4" />
                  <circle
                    cx="32" cy="32" r="26"
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={`${strokeDash} ${circumference}`}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-lg font-extrabold text-[#F59E0B]">
                  {progress.level}
                </span>
              </div>

              <div className="flex items-center gap-8">
                <div className="flex flex-col">
                  <span className="text-3xl font-extrabold leading-none text-[#F59E0B]">
                    {progress.xp}
                  </span>
                  <span className="text-white/50 text-xs mt-1 uppercase tracking-wider">
                    {t("xp")}
                  </span>
                </div>
                <div className="w-px h-10 bg-white/20" />
                <div className="flex flex-col">
                  <span className="text-3xl font-extrabold leading-none text-white">
                    {progress.completed_count}
                  </span>
                  <span className="text-white/50 text-xs mt-1 uppercase tracking-wider">
                    {locale === "ar" ? "خلصان" : "Completed"}
                  </span>
                </div>
              </div>
            </div>

            <Link
              href={`/${locale}/dashboard/roadmap`}
              className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors backdrop-blur-sm border border-white/15"
            >
              {t("viewRoadmap")}
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Compass Hero Card */}
      <CompassHeroCard
        locale={locale}
        assessment={latestAssessment as { result_snapshot: AssessmentResult; happiness_score: number; completed_at: string } | null}
      />

      {/* Mentor notes — written by the mentor on the client's journey board */}
      {Array.isArray(mentorNotes) && mentorNotes.length > 0 && (
        <div className="mt-10">
          <h2 className="font-bold text-white mb-4 flex items-center gap-2 text-base">
            <StickyNote className="h-5 w-5 text-[#A78BFA]" />
            {isAr ? "ملاحظات المنتور" : "Mentor Notes"}
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(167,139,250,0.15)", color: "#A78BFA" }}
            >
              {mentorNotes.length}
            </span>
          </h2>
          <div
            className="rounded-xl p-5"
            style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.22)" }}
          >
            <div className="space-y-2.5">
              {(mentorNotes as unknown as { id: string; title: string; icon: string | null }[]).map((note) => (
                <div key={note.id} className="flex items-start gap-3">
                  {note.icon ? (
                    <span className="text-lg leading-none mt-0.5 flex-shrink-0">{note.icon}</span>
                  ) : (
                    <StickyNote className="h-4 w-4 mt-0.5 flex-shrink-0 text-[#A78BFA]" />
                  )}
                  <p className="text-sm text-white/80 leading-relaxed">{note.title}</p>
                </div>
              ))}
            </div>
            <Link
              href={`/${locale}/dashboard/roadmap?tab=mentor`}
              className="inline-flex items-center gap-1.5 mt-4 text-sm font-semibold"
              style={{ color: "#A78BFA" }}
            >
              {isAr ? "شوف كل الملاحظات" : "See all notes"}
              <ChevronRight className="h-4 w-4" style={{ transform: isAr ? "rotate(180deg)" : undefined }} />
            </Link>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8 mt-10">
        {/* Upcoming Sessions */}
        <div>
          <h2 className="font-bold text-white mb-4 flex items-center gap-2 text-base">
            <Calendar className="h-5 w-5 text-[#F59E0B]" />
            {t("upcomingSessions")}
          </h2>
          {upcoming.length === 0 ? (
            <div className="bg-[rgba(30,41,59,0.6)] border border-[rgba(245,158,11,0.12)] rounded-xl p-6 text-center text-white/40 text-sm">
              {t("noUpcoming")}
              <div className="mt-3">
                <Link href={`/${locale}/workshops`} className="text-[#F59E0B] font-medium text-sm">
                  {locale === "ar" ? "شوف الورش" : "Explore workshops"}
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.slice(0, 3).map(({ b, startsAt, title }) => (
                <div
                  key={b.id}
                  className="bg-[rgba(30,41,59,0.6)] border border-[rgba(245,158,11,0.12)] rounded-xl p-4 border-s-2"
                  style={{ borderInlineStartColor: "#F59E0B" }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-white text-sm">{title}</p>
                      <p className="text-xs text-white/40 mt-1">
                        {b.slot?.date ? formatISODate(b.slot.date, isAr) : ""}
                        {b.slot?.start_time ? ` · ${shortTime(b.slot.start_time)}` : ""}
                      </p>
                    </div>
                    <Badge variant={b.status === "confirmed" ? "success" : "warning"}>
                      {statusLabel(b.status)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Past Sessions */}
        <div>
          <h2 className="font-bold text-white mb-4 flex items-center gap-2 text-base">
            <BookOpen className="h-5 w-5 text-[#F59E0B]" />
            {t("pastSessions")}
          </h2>
          {past.length === 0 ? (
            <div className="bg-[rgba(30,41,59,0.6)] border border-[rgba(245,158,11,0.12)] rounded-xl p-6 text-center text-white/40 text-sm">
              {t("noPast")}
            </div>
          ) : (
            <div className="space-y-3">
              {past.slice(0, 3).map(({ b, startsAt, title }) => (
                <div
                  key={b.id}
                  className="bg-[rgba(30,41,59,0.6)] border border-[rgba(245,158,11,0.12)] rounded-xl p-4 border-s-2"
                  style={{ borderInlineStartColor: "#F59E0B" }}
                >
                  <div>
                    <p className="font-medium text-white text-sm">{title}</p>
                    <p className="text-xs text-white/40 mt-1">
                      {b.slot?.date ? formatISODate(b.slot.date, isAr) : ""}
                      {b.slot?.start_time ? ` · ${shortTime(b.slot.start_time)}` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="bg-[rgba(30,41,59,0.6)] border border-[rgba(245,158,11,0.12)] rounded-xl p-5 text-center hover:border-[rgba(245,158,11,0.3)] hover:bg-[rgba(30,41,59,0.9)] transition-all group flex flex-col items-center gap-3"
            >
              <div className="w-10 h-10 rounded-full bg-[rgba(245,158,11,0.15)] flex items-center justify-center group-hover:bg-[rgba(245,158,11,0.25)] transition-colors">
                <Icon className="h-5 w-5 text-[#F59E0B]" />
              </div>
              <div className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">{link.label}</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ── Compass Hero Card ─────────────────────────────────────────────────────────

function CompassHeroCard({
  locale,
  assessment,
}: {
  locale: string;
  assessment: { result_snapshot: AssessmentResult; happiness_score: number; completed_at: string } | null;
}) {
  const isAr = locale === "ar";

  if (assessment) {
    const result = assessment.result_snapshot;
    const zone = result?.happinessZone;
    const score = assessment.happiness_score;
    const zoneLabel = zone ? (isAr ? ZONE_LABELS[zone]?.ar : ZONE_LABELS[zone]?.en) : "";
    const topStrength = result?.topStrength;
    const topLabel = topStrength
      ? (isAr
          ? result.dimensionReads.find((d) => d.dimension === topStrength)?.label_ar
          : result.dimensionReads.find((d) => d.dimension === topStrength)?.label_en)
      : null;

    return (
      <div className="relative rounded-2xl p-6 mb-8 bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.18)] overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-10 -end-10 w-40 h-40 rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #F59E0B, transparent 70%)" }}
        />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[rgba(245,158,11,0.12)] border border-[rgba(245,158,11,0.2)] flex items-center justify-center flex-shrink-0">
              <Compass className="h-6 w-6 text-[#F59E0B]" />
            </div>
            <div>
              <p className="text-white/40 text-xs font-medium mb-0.5">
                {isAr ? "بوصلتك" : "Your Compass"}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-extrabold text-[#F59E0B]">{score?.toFixed(1)}</span>
                {zoneLabel && (
                  <span className="text-white/60 text-xs">{zoneLabel}</span>
                )}
              </div>
              {topLabel && (
                <p className="text-white/40 text-xs mt-0.5">
                  {isAr ? `أقوى نقطة عندك: ${topLabel}` : `Top strength: ${topLabel}`}
                </p>
              )}
            </div>
          </div>
          <Link
            href={`/${locale}/dashboard/compass`}
            className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors border border-white/10"
          >
            {isAr ? "القراية الكاملة" : "Full reading"}
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  // Not started
  return (
    <div className="relative rounded-2xl p-6 mb-8 bg-[rgba(13,21,38,0.7)] border border-[rgba(245,158,11,0.12)] overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-10 -end-10 w-40 h-40 rounded-full opacity-10"
        style={{ background: "radial-gradient(circle, #F59E0B, transparent 70%)" }}
      />
      <div className="relative flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.15)] flex items-center justify-center flex-shrink-0">
            <Compass className="h-6 w-6 text-[#F59E0B]/60" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm mb-0.5">
              {isAr ? "بوصلتك" : "Your Compass"}
            </p>
            <p className="text-white/40 text-xs">
              {isAr
                ? "اعرف انت فين دلوقتي: 21 سؤال، 6 محاور"
                : "Discover where you stand: 21 questions, 6 dimensions"}
            </p>
          </div>
        </div>
        <Link
          href={`/${locale}/dashboard/compass`}
          className="flex items-center gap-1 bg-[#F59E0B] hover:bg-[#E88F00] text-[#0f172a] text-sm font-bold px-4 py-2 rounded-xl transition-colors"
        >
          {isAr ? "يلا نبدأ" : "Start"}
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
