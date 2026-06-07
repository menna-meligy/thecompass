import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: string;
  className?: string;
}

export function StatsCard({ title, value, icon, trend, className }: StatsCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl p-6",
        "bg-[rgba(30,41,59,0.65)]",
        "border border-[rgba(245,158,11,0.15)]",
        "shadow-[0_4px_24px_rgba(0,0,0,0.45)]",
        "hover:border-[rgba(245,158,11,0.30)] hover:-translate-y-1",
        "transition-all duration-300",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-2">{title}</p>
          <p className="text-3xl font-black text-white leading-tight">{value}</p>
          {trend && (
            <p className="text-xs font-semibold text-[#F59E0B]/70 mt-1">{trend}</p>
          )}
        </div>
        <div className="w-12 h-12 rounded-xl bg-[rgba(245,158,11,0.12)] border border-[rgba(245,158,11,0.20)] flex items-center justify-center text-[#F59E0B]">
          {icon}
        </div>
      </div>

      {/* Gold bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#F59E0B] to-transparent opacity-40 rounded-b-2xl" />
    </div>
  );
}

export default StatsCard;
