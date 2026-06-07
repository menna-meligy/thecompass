"use client";

import { useTranslations, useLocale } from "next-intl";
import { formatDateTime } from "@/lib/utils";
import type { TimeSlot } from "@/types/index";
import { cn } from "@/lib/utils";

interface TimeSlotPickerProps {
  slots: TimeSlot[];
  selectedSlot: string | null;
  onSelect: (slotId: string) => void;
}

export function TimeSlotPicker({ slots, selectedSlot, onSelect }: TimeSlotPickerProps) {
  const t = useTranslations("booking");
  const locale = useLocale();

  if (slots.length === 0) {
    return (
      <p className="text-gray-500 text-sm py-4">{t("noSlots")}</p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700 mb-3">{t("selectSlot")}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {slots.map((slot) => {
          const isFull = slot.booked_count >= slot.capacity;
          const isSelected = selectedSlot === slot.id;

          return (
            <button
              key={slot.id}
              onClick={() => !isFull && onSelect(slot.id)}
              disabled={isFull}
              className={cn(
                "p-3 rounded-lg border-2 text-start transition-all",
                isSelected
                  ? "border-[#8B0000] bg-[#8B0000]/5"
                  : isFull
                  ? "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed"
                  : "border-gray-200 hover:border-[#8B0000]/50 cursor-pointer"
              )}
            >
              <div className="text-sm font-medium text-gray-900">
                {formatDateTime(slot.starts_at, locale)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {slot.capacity - slot.booked_count} {locale === "ar" ? "مقعد متاح" : "seats left"}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default TimeSlotPicker;
