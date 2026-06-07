import Link from "next/link";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { Play, Clock } from "lucide-react";
import { getLocalizedField } from "@/lib/utils";
import type { Vlog } from "@/types/index";

interface VlogCardProps {
  vlog: Vlog;
  duration?: string; // e.g. "12:35"
}

export function VlogCard({ vlog, duration }: VlogCardProps) {
  const t = useTranslations("vlogs");
  const locale = useLocale();
  const isRtl = locale === "ar";

  const title = getLocalizedField(vlog as unknown as Record<string, unknown>, "title", locale);
  const description = getLocalizedField(vlog as unknown as Record<string, unknown>, "description", locale);

  return (
    <div className="
      group relative
      bg-[rgba(30,41,59,0.55)]
      border border-[rgba(245,158,11,0.12)]
      rounded-2xl overflow-hidden
      hover:-translate-y-1
      hover:border-[rgba(245,158,11,0.30)]
      transition-all duration-300
    ">
      {/* ── Thumbnail ── */}
      <div className="relative h-48 bg-[rgba(10,15,26,0.9)] overflow-hidden">
        {vlog.thumbnail_url ? (
          <Image
            src={vlog.thumbnail_url}
            alt={title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-[rgba(245,158,11,0.10)] border border-[rgba(245,158,11,0.20)] flex items-center justify-center">
              <Play className="h-8 w-8 text-[#F59E0B]/50 ms-0.5" />
            </div>
          </div>
        )}

        {/* Dark overlay on hover */}
        <div className="
          absolute inset-0
          bg-gradient-to-t from-black/70 via-black/20 to-transparent
          opacity-0 group-hover:opacity-100
          transition-opacity duration-300
        " />

        {/* Play button — appears on hover */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="
            w-14 h-14 rounded-full
            bg-[#F59E0B] backdrop-blur-sm
            flex items-center justify-center
            shadow-[0_4px_20px_rgba(245,158,11,0.4)]
            scale-90 opacity-0
            group-hover:scale-100 group-hover:opacity-100
            transition-all duration-300
          ">
            <Play className="h-6 w-6 text-[#0a0f1a] ms-0.5 fill-[#0a0f1a]" />
          </div>
        </div>

        {/* Duration badge */}
        {duration && (
          <div className="
            absolute bottom-3 end-3
            flex items-center gap-1
            bg-[rgba(0,0,0,0.75)] backdrop-blur-sm text-[#FCD34D] rounded-lg px-2 py-1
            text-[10px] font-bold border border-[rgba(245,158,11,0.20)]
          ">
            <Clock className="h-2.5 w-2.5" />
            {duration}
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
      <div className="p-4">
        <h3 className="
          font-bold text-white text-sm mb-1.5 line-clamp-2 leading-snug
          group-hover:text-[#FCD34D] transition-colors duration-200
        ">
          {title}
        </h3>

        {description && (
          <p className="text-white/50 text-xs line-clamp-2 leading-relaxed mb-3">
            {description}
          </p>
        )}

        {/* Date + Watch CTA */}
        <div className="flex items-center justify-between pt-3 border-t border-[rgba(245,158,11,0.08)]">
          <span className="text-[10px] text-white/30">
            {new Date(vlog.created_at).toLocaleDateString(
              isRtl ? "ar-EG" : "en-US",
              { year: "numeric", month: "short", day: "numeric" }
            )}
          </span>
          <a
            href={vlog.video_url}
            target="_blank"
            rel="noopener noreferrer"
            className="
              inline-flex items-center gap-1.5
              text-[10px] font-bold text-[#F59E0B]
              hover:text-[#FCD34D]
              transition-colors duration-200
            "
          >
            <Play className="h-3 w-3 fill-current" />
            {isRtl ? "شاهد الآن" : "Watch Now"}
          </a>
        </div>
      </div>
    </div>
  );
}

export default VlogCard;
