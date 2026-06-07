import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
  loading?: boolean;
}

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: [
    "bg-[#F59E0B] text-[#0f172a] font-black",
    "hover:bg-[#FCD34D]",
    "shadow-[0_4px_20px_rgba(245,158,11,0.35)]",
    "hover:-translate-y-0.5",
    "focus:ring-[#F59E0B]",
  ].join(" "),

  secondary: [
    "bg-[#1e293b] text-[#F59E0B]",
    "border border-[rgba(245,158,11,0.25)]",
    "hover:bg-[rgba(245,158,11,0.1)] hover:border-[rgba(245,158,11,0.5)]",
    "focus:ring-[#F59E0B]",
  ].join(" "),

  outline: [
    "bg-transparent text-[rgba(245,158,11,0.8)]",
    "border-2 border-[rgba(245,158,11,0.3)]",
    "hover:border-[#F59E0B] hover:text-[#F59E0B]",
    "focus:ring-[#F59E0B]",
  ].join(" "),

  ghost: [
    "bg-transparent text-white/60",
    "hover:text-white hover:bg-white/5",
    "focus:ring-white/20",
  ].join(" "),

  danger: [
    "bg-[#DC2626] text-white",
    "hover:bg-[#EF4444]",
    "shadow-[0_4px_16px_rgba(220,38,38,0.30)]",
    "focus:ring-red-500",
  ].join(" "),
};

const sizeClasses: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm:   "px-3.5 py-1.5 text-xs font-semibold rounded gap-1.5",
  md:   "px-5 py-2.5 text-sm font-semibold rounded gap-2",
  lg:   "px-7 py-3 text-base font-bold rounded gap-2",
  icon: "p-2.5 rounded",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center",
          "font-semibold",
          "transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0f172a]",
          "disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none",
          "select-none",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {loading ? (
          <>
            <svg
              className="animate-spin h-4 w-4 flex-shrink-0 text-[#F59E0B]"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span className="opacity-80">{children}</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
export type { ButtonProps };
