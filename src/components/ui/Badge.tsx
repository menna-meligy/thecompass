import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger" | "info";
}

export function Badge({ className, variant = "default", children, ...props }: BadgeProps) {
  const variants: Record<NonNullable<BadgeProps["variant"]>, string> = {
    default: "badge-neutral",
    success: "badge-success",
    warning: "badge-gold",
    danger:  "badge-crimson",
    info: [
      "bg-[rgba(59,130,246,0.12)]",
      "border border-[rgba(59,130,246,0.25)]",
      "text-[#93C5FD]",
      "rounded-full text-[11px] font-bold px-2.5 py-0.5",
    ].join(" "),
  };

  return (
    <span
      className={cn(
        "inline-flex items-center",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export default Badge;
