"use client";

import { useState } from "react";
import { BookOpen, SlidersHorizontal } from "lucide-react";
import WorkshopCard from "@/components/workshops/WorkshopCard";
import type { Workshop } from "@/types/index";

interface Props {
  workshops: Workshop[];
  topics: string[];
  locale: string;
  filterAllLabel: string;
  noResultsLabel: string;
}

export default function WorkshopsClient({
  workshops,
  topics,
  locale,
  filterAllLabel,
  noResultsLabel,
}: Props) {
  const [activeTopic, setActiveTopic] = useState<string | null>(null);

  const filtered = activeTopic
    ? workshops.filter((w) => w.topic === activeTopic)
    : workshops;

  return (
    <>
      {/* Filter bar */}
      <div
        className="flex flex-wrap items-center gap-2 mb-8 pb-6"
        style={{ borderBottom: "1px solid rgba(245,158,11,0.08)" }}
      >
        <div className="flex items-center gap-1.5 text-white/30 text-xs font-semibold uppercase tracking-wider me-2">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span>{locale === "ar" ? "تصفية" : "Filter"}</span>
        </div>

        {/* All button */}
        <button
          onClick={() => setActiveTopic(null)}
          className="text-sm font-semibold transition-all duration-200"
          style={{
            padding: "6px 16px",
            borderRadius: "6px",
            background: activeTopic === null ? "#F59E0B" : "rgba(30,41,59,0.5)",
            border: `1px solid ${activeTopic === null ? "#F59E0B" : "rgba(245,158,11,0.18)"}`,
            color: activeTopic === null ? "#0f172a" : "rgba(255,255,255,0.5)",
          }}
        >
          {filterAllLabel}
        </button>

        {topics.map((topic) => (
          <button
            key={topic}
            onClick={() => setActiveTopic(topic === activeTopic ? null : topic)}
            className="text-sm font-semibold transition-all duration-200"
            style={{
              padding: "6px 16px",
              borderRadius: "6px",
              background: activeTopic === topic ? "#F59E0B" : "rgba(30,41,59,0.5)",
              border: `1px solid ${activeTopic === topic ? "#F59E0B" : "rgba(245,158,11,0.18)"}`,
              color: activeTopic === topic ? "#0f172a" : "rgba(255,255,255,0.5)",
            }}
          >
            {topic}
          </button>
        ))}

        {/* Count */}
        <span className="ms-auto text-white/30 text-xs">
          {filtered.length} {locale === "ar" ? "ورشة" : filtered.length === 1 ? "workshop" : "workshops"}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-24"
          style={{ border: "1px dashed rgba(245,158,11,0.15)", borderRadius: "10px", background: "rgba(30,41,59,0.2)" }}
        >
          <div
            className="w-14 h-14 flex items-center justify-center mb-4"
            style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: "10px" }}
          >
            <BookOpen className="h-6 w-6 text-[#F59E0B]/50" />
          </div>
          <p className="text-white/50 font-semibold text-sm">{noResultsLabel}</p>
          <p className="text-white/25 text-xs mt-1">
            {locale === "ar" ? "جرّب تصفية مختلفة أو تحقق لاحقاً" : "Try a different filter or check back later"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((workshop) => (
            <WorkshopCard key={workshop.id} workshop={workshop} />
          ))}
        </div>
      )}
    </>
  );
}
