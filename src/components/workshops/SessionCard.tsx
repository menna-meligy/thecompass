import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { Calendar, MapPin, Users, User } from "lucide-react";
import { formatDateTime, formatCurrency } from "@/lib/utils";
import type { Session } from "@/types/index";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

interface SessionCardProps {
  session: Session;
  showBookButton?: boolean;
}

export function SessionCard({ session, showBookButton = true }: SessionCardProps) {
  const t = useTranslations("workshops");
  const locale = useLocale();

  const isAvailable = session.status === "published";

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          {session.type === "group" ? (
            <Users className="h-4 w-4 text-[#8B0000]" />
          ) : (
            <User className="h-4 w-4 text-[#8B0000]" />
          )}
          <Badge variant={session.type === "group" ? "info" : "success"}>
            {session.type === "group" ? t("group") : t("individual")}
          </Badge>
        </div>
        <Badge variant={isAvailable ? "success" : "default"}>
          {isAvailable ? t("available") : t("completed")}
        </Badge>
      </div>

      <div className="space-y-2 text-sm text-gray-600 mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 flex-shrink-0" />
          <span>{formatDateTime(session.starts_at, locale)}</span>
        </div>
        {session.location_or_link && (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{session.location_or_link}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 flex-shrink-0" />
          <span>
            {t("capacity")}: {session.capacity} {t("seats")}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-lg font-bold text-[#8B0000]">
          {formatCurrency(session.price, locale)}
        </div>
        {showBookButton && isAvailable && (
          <Link href={`/${locale}/book/${session.id}`}>
            <Button size="sm">{t("bookNow")}</Button>
          </Link>
        )}
      </div>
    </div>
  );
}

export default SessionCard;
