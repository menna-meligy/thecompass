import Link from "next/link";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { getLocalizedField } from "@/lib/utils";
import type { Workshop } from "@/types/index";
import Badge from "@/components/ui/Badge";
import { Compass, ArrowRight, ArrowLeft } from "lucide-react";

interface WorkshopCardProps {
  workshop: Workshop;
  sessionCount?: number;
  minPrice?: number;
}

export function WorkshopCard({ workshop, sessionCount, minPrice }: WorkshopCardProps) {
  const t = useTranslations("workshops");
  const locale = useLocale();
  const isRtl = locale === "ar";

  const title = getLocalizedField(workshop as unknown as Record<string, unknown>, "title", locale);
  const description = getLocalizedField(workshop as unknown as Record<string, unknown>, "description", locale);

  return (
    <div className="
      group relative
      bg-[rgba(30,41,59,0.55)]
      border border-[rgba(245,158,11,0.15)]
      rounded-2xl overflow-hidden
      hover:border-[rgba(245,158,11,0.35)]
      hover:-translate-y-1.5
      transition-all duration-300
      shadow-[0_4px_24px_rgba(0,0,0,0.4)]
    ">
      {/* ── Image / placeholder ── */}
      <div className="relative h-48 bg-[rgba(15,23,42,0.8)] overflow-hidden">
        {workshop.image_url ? (
          <Image
            src={workshop.image_url}
            alt={title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Compass className="h-20 w-20 text-[#F59E0B]/20 transition-transform duration-500 group-hover:rotate-45" />
          </div>
        )}

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(0,0,0,0.6)] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Topic badge — top left */}
        <div className="absolute top-3 start-3">
          <Badge variant="info" className="badge-gold">{workshop.topic}</Badge>
        </div>

        {/* Session count badge — top right */}
        {sessionCount !== undefined && sessionCount > 0 && (
          <div className="
            absolute top-3 end-3
            bg-[rgba(0,0,0,0.6)] backdrop-blur-sm rounded-full px-2.5 py-1
            text-[10px] font-bold text-[#FCD34D]
            border border-[rgba(245,158,11,0.25)]
          ">
            {sessionCount} {isRtl ? "جلسة" : "sessions"}
          </div>
        )}

        {/* Gold accent line on hover */}
        <div className="
          absolute bottom-0 inset-x-0 h-0.5
          bg-gradient-to-r from-transparent via-[#F59E0B] to-transparent
          scale-x-0 group-hover:scale-x-100
          transition-transform duration-300 origin-center
        " />
      </div>

      {/* ── Body ── */}
      <div className="p-5">
        <h3 className="font-black text-white text-base mb-2 line-clamp-2 group-hover:text-[#FCD34D] transition-colors duration-200 leading-snug">
          {title}
        </h3>
        <p className="text-white/50 text-sm line-clamp-2 leading-relaxed mb-4">
          {description}
        </p>

        {/* ── Footer row ── */}
        <div className="flex items-center justify-between pt-4 border-t border-[rgba(245,158,11,0.10)]">
          {/* Price */}
          {minPrice !== undefined ? (
            <div>
              <span className="text-[10px] text-white/30 block leading-none mb-0.5">
                {isRtl ? "يبدأ من" : "Starting from"}
              </span>
              <span className="text-base font-black text-[#F59E0B]">
                {minPrice} {isRtl ? "ج.م" : "EGP"}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Compass className="h-3.5 w-3.5 text-[#F59E0B]/40" />
              <span className="text-xs text-white/30">
                {isRtl ? "استكشف الجلسات" : "Explore sessions"}
              </span>
            </div>
          )}

          {/* CTA */}
          <Link
            href={`/${locale}/workshops/${workshop.id}`}
            className="
              inline-flex items-center gap-1.5
              text-xs font-bold text-[#F59E0B]
              px-3 py-1.5 rounded-lg
              border border-[rgba(245,158,11,0.35)]
              hover:bg-[#F59E0B] hover:text-[#0a0f1a] hover:border-[#F59E0B]
              transition-all duration-200
              group/btn
            "
          >
            {t("learnMore")}
            {isRtl
              ? <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover/btn:-translate-x-0.5" />
              : <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover/btn:translate-x-0.5" />
            }
          </Link>
        </div>
      </div>
    </div>
  );
}

export default WorkshopCard;
