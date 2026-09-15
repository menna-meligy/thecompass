"use client";

import { useState } from "react";
import { User, Users } from "lucide-react";
import OfferingCalendar from "@/components/booking/OfferingCalendar";
import { OFFERING_PRICE, offeringKey, offeringSizeLabel, type OfferingType } from "@/lib/offerings";

/**
 * Booking panel on a workshop page: pick a single session or the whole bundle,
 * then the same calendar + payment flow the Self Awareness & Career Direction
 * session uses.
 */

interface Props {
  workshopId: string;
  workshopTitle: string;
  isAr: boolean;
  accentColor: string;
  /** Sessions in this workshop, so the bundle can say how many it buys. */
  sessionCount: number;
}

const TABS: { type: Exclude<OfferingType, "career">; icon: typeof User }[] = [
  { type: "individual", icon: User },
  { type: "group", icon: Users },
];

export default function WorkshopBookingPanel({
  workshopId,
  workshopTitle,
  isAr,
  accentColor,
  sessionCount,
}: Props) {
  const [type, setType] = useState<Exclude<OfferingType, "career">>("individual");

  const price = OFFERING_PRICE[type];
  const suffix = offeringSizeLabel(type, isAr, sessionCount);

  return (
    <div style={{ direction: isAr ? "rtl" : "ltr" }}>
      {/* single session / full bundle switch */}
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
                {offeringSizeLabel(tab.type, isAr, sessionCount)}
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
