import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, disabled, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[0.95rem] font-semibold text-white/85"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          className={cn(
            "w-full",
            "bg-[#162032]",
            "border border-[rgba(148,163,184,0.12)]",
            "text-white placeholder-white/30",
            "rounded-xl px-4 py-2.5 text-sm",
            "outline-none",
            "focus:border-[#F59E0B] focus:ring-2 focus:ring-[rgba(245,158,11,0.15)]",
            "transition-all duration-200",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            error && "border-[#EF4444] focus:border-[#EF4444] focus:ring-[rgba(239,68,68,0.15)]",
            className
          )}
          {...props}
        />
        {hint && !error && (
          <p className="text-white/40 text-xs mt-1">{hint}</p>
        )}
        {error && (
          <p className="text-[#EF4444] text-xs mt-1">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
