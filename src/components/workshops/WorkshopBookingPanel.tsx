"use client";

import { useState } from "react";
import { User, Users } from "lucide-react";
import OfferingCalendar from "@/components/booking/OfferingCalendar";
import { OFFERING_PRICE, offeringKey, type OfferingType } from "@/lib/offerings";

/**
 * Booking panel on a workshop page: pick 1-on-1 or group, then the same
 * calendar + payment flow the Self Awareness & Career Direction session uses.
 */

interface Props {
  workshopId: string;
  workshopTitle: string;
  isAr: boolean;
  accentColor: string;
}

const TABS: { type: Exclude<OfferingType, "career">; icon: typeof User; ar: string; en: string }[] = [
  { type: "individual", icon: User, ar: "فردي", en: "1-on-1" },
  { type: "group", icon: Users, ar: "مجموعة", en: "Group" },
];

export default function WorkshopBookingPanel({
  workshopId,
  workshopTitle,
  isAr,
  accentColor,
}: Props) {
  const [type, setType] = useState<Exclude<OfferingType, "career">>("individual");

  const price = OFFERING_PRICE[type];
  const suffix = type === "group" ? (isAr ? "مجموعة" : "Group") : isAr ? "فردي" : "1-on-1";

  return (
    <div style={{ direction: isAr ? "rtl" : "ltr" }}>
      {/* 1-on-1 / group switch */}
      <div
        className="grid grid-cols-2 gap-2 mb-4 p-1 rounded-xl"
        style={{ background: "rgba(15,23,42,0.6)", border: "1px solid rgba(148,163,184,0.12)" }}
      >
        {TABS.map((tab) => {
          const active = tab.type === type;
          const Icon = tab.icon;
          return (
            <button
              key={tab.type}
              type="button"
              onClick={() => setType(tab.type)}
              className="flex flex-col items-center gap-1 py-2.5 rounded-lg transition-all"
              style={{
                background: active ? `${accentColor}1f` : "transparent",
                border: `1px solid ${active ? `${accentColor}59` : "transparent"}`,
                color: active ? accentColor : "rgba(255,255,255,0.5)",
                fontWeight: active ? 800 : 600,
                cursor: "pointer",
              }}
            >
              <span className="flex items-center gap-1.5 text-sm">
                <Icon className="h-3.5 w-3.5" />
                {isAr ? tab.ar : tab.en}
              </span>
              <span className="text-xs opacity-80">
                {OFFERING_PRICE[tab.type].toLocaleString()} {isAr ? "ج.م" : "EGP"}
              </span>
            </button>
          );
        })}
      </div>

      <OfferingCalendar
        key={type}
        offering={offeringKey(type, workshopId)}
        title={`${workshopTitle}, ${suffix}`}
        price={price}
        isAr={isAr}
        heading={isAr ? "اختر موعداً" : "Choose a time"}
      />
    </div>
  );
}
