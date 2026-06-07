import Link from "next/link";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { getLocalizedField } from "@/lib/utils";
import type { Workshop } from "@/types/index";
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
    <div
      className="group flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-2"
      style={{
        background: "rgba(15,23,42,0.7)",
        border: "1px solid rgba(245,158,11,0.14)",
        borderRadius: "12px",
        boxShadow: "0 4px 32px rgba(0,0,0,0.45)",
      }}
    >
      {/* Image — taller for breathing room */}
      <div className="relative h-56 overflow-hidden bg-[rgba(13,21,38,0.8)] flex-shrink-0">
        {workshop.image_url ? (
          <Image src={workshop.image_url} alt={title} fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Compass className="h-16 w-16 text-[#F59E0B]/15" />
          </div>
        )}
        {/* Dark bottom fade */}
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(13,21,38,0.85)] via-[rgba(13,21,38,0.2)] to-transparent" />
        {/* Topic tag */}
        {workshop.topic && (
          <div className="absolute top-4 start-4">
            <span style={{ background:"rgba(245,158,11,0.15)", border:"1px solid rgba(245,158,11,0.3)", color:"#F59E0B", fontSize:"0.68rem", fontWeight:700, padding:"4px 10px", borderRadius:"4px", textTransform:"uppercase", letterSpacing:"0.06em" }}>
              {workshop.topic}
            </span>
          </div>
        )}
      </div>

      {/* Body — generous padding */}
      <div className="flex flex-col flex-1 p-6">
        <h3 className="font-black text-white text-lg mb-3 leading-snug group-hover:text-[#FCD34D] transition-colors duration-200 line-clamp-2">
          {title}
        </h3>
        <p className="text-white/45 text-sm leading-relaxed line-clamp-3 flex-1 mb-6">
          {description}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4" style={{ borderTop:"1px solid rgba(245,158,11,0.08)" }}>
          <div className="flex items-center gap-1.5 text-white/30 text-xs">
            <Compass className="h-3.5 w-3.5 text-[#F59E0B]/35" />
            {isRtl ? "استكشف الجلسات" : "Explore sessions"}
          </div>

          <Link
            href={`/${locale}/workshops/${workshop.id}`}
            className="inline-flex items-center gap-1.5 text-sm font-bold transition-all duration-200"
            style={{ color:"#F59E0B", padding:"8px 16px", borderRadius:"6px", border:"1px solid rgba(245,158,11,0.3)", background:"transparent" }}
          >
            {t("learnMore")}
            {isRtl
              ? <ArrowLeft className="h-3.5 w-3.5" />
              : <ArrowRight className="h-3.5 w-3.5" />
            }
          </Link>
        </div>
      </div>
    </div>
  );
}

export default WorkshopCard;
