"use client";

import { useState } from "react";

export interface SessionOption {
  id: string;
  label: string;
  labelAr: string;
  sessionId?: string;
  workshopId?: string;
  type: "individual" | "group";
  price: number;
}

interface SessionSelectorProps {
  options: SessionOption[];
  onSelect: (optionId: string) => void;
  isAr: boolean;
  selectedId?: string;
}

export default function SessionSelector({
  options,
  onSelect,
  isAr,
  selectedId,
}: SessionSelectorProps) {
  const [open, setOpen] = useState(false);

  const selectedOption = options.find((o) => o.id === selectedId);

  const priceLabel = (price: number) => {
    return `${price} ${isAr ? "جنيه" : "EGP"}`;
  };

  return (
    <div className="w-full">
      <label className="block text-white/70 text-sm font-medium mb-3">
        {isAr ? "اختر نوع الجلسة" : "What would you like to book?"}
      </label>

      {/* Dropdown Button */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full bg-white/5 border border-[rgba(245,158,11,0.25)] rounded-xl px-4 py-3 text-white text-left font-medium hover:bg-white/10 transition-colors flex items-center justify-between"
      >
        <span>
          {selectedOption ? (
            isAr ? selectedOption.labelAr : selectedOption.label
          ) : (
            <span className="text-white/50">
              {isAr ? "اختر خدمة" : "Select option"}
            </span>
          )}
        </span>
        <span className={`transition-transform ${open ? "rotate-180" : ""}`}>
          ▼
        </span>
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div className="absolute top-full left-0 right-0 bg-[#0d1526] border border-[rgba(245,158,11,0.25)] rounded-xl mt-2 shadow-2xl z-40 max-w-xs">
          {options.map((option) => (
            <button
              key={option.id}
              onClick={() => {
                onSelect(option.id);
                setOpen(false);
              }}
              className={`w-full px-4 py-3 text-left hover:bg-[rgba(245,158,11,0.12)] transition-colors border-b border-white/5 last:border-b-0 ${
                selectedId === option.id
                  ? "bg-[rgba(245,158,11,0.12)] border-l-2 border-l-[#F59E0B]"
                  : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-white font-semibold">
                    {isAr ? option.labelAr : option.label}
                  </p>
                  <p className="text-white/50 text-xs mt-0.5">
                    {priceLabel(option.price)} • {isAr ? (option.type === "individual" ? "فردي" : "مجموعة") : option.type === "individual" ? "Individual" : "Group"}
                  </p>
                </div>
                {selectedId === option.id && (
                  <div className="text-[#F59E0B] text-lg">✓</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Selection Display */}
      {selectedOption && (
        <div className="mt-3 p-3 bg-[rgba(245,158,11,0.12)] border border-[rgba(245,158,11,0.25)] rounded-lg">
          <p className="text-white/70 text-xs font-medium mb-1">
            {isAr ? "السعر:" : "Price:"}
          </p>
          <p className="text-[#F59E0B] font-bold text-lg">
            {priceLabel(selectedOption.price)}
          </p>
        </div>
      )}

      {/* Close overlay when clicking outside */}
      {open && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
