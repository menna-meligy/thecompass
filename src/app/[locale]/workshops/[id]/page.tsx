import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getLocalizedField } from "@/lib/utils";
import type { Session } from "@/types/index";

export default async function WorkshopDetailPage(props: PageProps<"/[locale]/workshops/[id]">) {
  const { id } = await props.params;
  const t = await getTranslations("workshops");
  const locale = await getLocale();
  const supabase = await createClient();

  const [{ data: workshop }, { data: sessions }] = await Promise.all([
    supabase.from("workshops").select("*").eq("id", id).single(),
    supabase
      .from("sessions")
      .select("*")
      .eq("workshop_id", id)
      .eq("status", "published")
      .order("starts_at", { ascending: true }),
  ]);

  if (!workshop) notFound();

  const title = getLocalizedField(workshop as unknown as Record<string, unknown>, "title", locale);
  const description = getLocalizedField(workshop as unknown as Record<string, unknown>, "description", locale);

  return (
    <div className="min-h-screen bg-[#0f172a]">
      <div style={{maxWidth:"64rem",margin:"0 auto",padding:"0 1.5rem"}} className=" py-12">
        {/* Header card */}
        <div className="bg-[rgba(30,41,59,0.6)] border border-[rgba(245,158,11,0.12)] rounded-2xl overflow-hidden mb-10">
          <div className="grid md:grid-cols-2 gap-0">
            <div className="relative h-64 md:h-full min-h-[260px] bg-[rgba(15,23,42,0.8)]">
              {workshop.image_url ? (
                <Image src={workshop.image_url} alt={title} fill className="object-cover opacity-90" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-6xl">
                  🧭
                </div>
              )}
            </div>
            <div className="p-8 flex flex-col justify-center">
              {workshop.topic && (
                <span className="badge-gold inline-block mb-4 w-fit">
                  {workshop.topic}
                </span>
              )}
              <h1 className="text-3xl font-black text-white mb-4 leading-snug">{title}</h1>
              <p className="text-white/60 leading-relaxed text-sm">{description}</p>
            </div>
          </div>
        </div>

        {/* Sessions Table */}
        <div>
          <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
            <span>{t("sessions")}</span>
            <div className="flex-1 h-px bg-[rgba(245,158,11,0.12)]" />
          </h2>

          {!sessions || sessions.length === 0 ? (
            <div className="text-center py-10 text-white/30 bg-[rgba(30,41,59,0.5)] border border-[rgba(245,158,11,0.10)] rounded-2xl">
              {t("noResults")}
            </div>
          ) : (
            <div className="bg-[rgba(30,41,59,0.5)] border border-[rgba(245,158,11,0.10)] rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#0d1526]">
                    <th className="px-4 py-4 text-start text-[#F59E0B] text-xs font-bold uppercase tracking-wider">
                      {t("tableDay")}
                    </th>
                    <th className="px-4 py-4 text-start text-[#F59E0B] text-xs font-bold uppercase tracking-wider">
                      {t("tableTime")}
                    </th>
                    <th className="px-4 py-4 text-start text-[#F59E0B] text-xs font-bold uppercase tracking-wider">
                      {t("tableLocation")}
                    </th>
                    <th className="px-4 py-4 text-start text-[#F59E0B] text-xs font-bold uppercase tracking-wider">
                      {t("tablePrice")}
                    </th>
                    <th className="px-4 py-4 text-start text-[#F59E0B] text-xs font-bold uppercase tracking-wider">
                      {t("tableAction")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(sessions as Session[]).map((session) => {
                    const date = new Date(session.starts_at);
                    const isFullyBooked =
                      session.capacity != null &&
                      (session as unknown as Record<string, number>)["booked_count"] != null &&
                      (session as unknown as Record<string, number>)["booked_count"] >= session.capacity;

                    const dayLabel = date.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-GB", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    });

                    const timeLabel = date.toLocaleTimeString(locale === "ar" ? "ar-EG" : "en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    const priceLabel =
                      session.price != null
                        ? new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-GB", {
                            style: "currency",
                            currency: "EGP",
                            maximumFractionDigits: 0,
                          }).format(session.price)
                        : t("free");

                    return (
                      <tr
                        key={session.id}
                        className="border-b border-[rgba(148,163,184,0.06)] hover:bg-[rgba(245,158,11,0.04)] transition-colors"
                      >
                        <td className="px-4 py-3 text-white font-medium">{dayLabel}</td>
                        <td className="px-4 py-3 text-white/60">{timeLabel}</td>
                        <td className="px-4 py-3 text-white/60">{session.location_or_link ?? "—"}</td>
                        <td className="px-4 py-3 text-[#F59E0B] font-bold">{priceLabel}</td>
                        <td className="px-4 py-3">
                          {isFullyBooked ? (
                            <span className="badge-neutral inline-block">
                              {t("fullyBooked")}
                            </span>
                          ) : (
                            <Link
                              href={`/${locale}/book/${session.id}`}
                              className="inline-block bg-[#F59E0B] text-[#0f172a] font-bold px-4 py-2 rounded-lg hover:bg-[#FCD34D] transition-colors text-xs"
                            >
                              {t("book")}
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
