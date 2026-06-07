import { type HTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type CardVariant = "default" | "elevated" | "surface" | "crimson" | "flat";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  hover?: boolean;
  accent?: boolean;
}

const variantClasses: Record<CardVariant, string> = {
  default: [
    "bg-[rgba(30,41,59,0.6)]",
    "border border-[rgba(245,158,11,0.15)]",
    "backdrop-blur-xl",
    "rounded-2xl",
    "shadow-[0_4px_24px_rgba(0,0,0,0.45)]",
  ].join(" "),

  elevated: [
    "bg-[rgba(30,41,59,0.8)]",
    "border border-[rgba(245,158,11,0.25)]",
    "rounded-2xl",
    "shadow-[0_8px_40px_rgba(0,0,0,0.55),0_0_20px_rgba(245,158,11,0.08)]",
  ].join(" "),

  surface: [
    "bg-[#1e293b]",
    "border border-[rgba(148,163,184,0.10)]",
    "rounded-xl",
  ].join(" "),

  crimson: [
    "bg-gradient-to-br from-[#991B1B]/30 to-[#7f1d1d]/20",
    "border border-[rgba(220,38,38,0.25)]",
    "rounded-2xl",
  ].join(" "),

  flat: [
    "bg-[#1e293b]",
    "rounded-xl",
  ].join(" "),
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", hover = false, accent = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative overflow-hidden",
          variantClasses[variant],
          hover && [
            "transition-all duration-300",
            "hover:-translate-y-1",
            "hover:border-[rgba(245,158,11,0.35)]",
            "cursor-pointer",
          ].join(" "),
          accent && "border-s-4 border-s-[#F59E0B]",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = "Card";

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-6 pt-6 pb-0", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-lg font-bold text-white leading-snug", className)}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({ className, children, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("mt-1 text-sm text-white/50 leading-relaxed", className)}
      {...props}
    >
      {children}
    </p>
  );
}

export function CardContent({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-6 py-4", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "px-6 pb-6 pt-4",
        "border-t border-[rgba(148,163,184,0.10)]",
        "flex items-center gap-3",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
