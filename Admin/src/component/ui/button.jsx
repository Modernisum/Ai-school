import * as React from "react";
import { cn } from "../../lib/utils";

const variants = {
  primary: "bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-[0_4px_14px_rgba(99,102,241,0.4)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.5)] hover:-translate-y-0.5",
  secondary: "bg-white/10 border border-white/20 text-slate-200 hover:bg-white/15 hover:border-white/30",
  danger: "bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:bg-rose-500/30",
  success: "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30",
  ghost: "text-slate-400 hover:text-white hover:bg-white/10",
};

const sizes = {
  sm: "py-1.5 px-3 text-xs rounded-lg",
  default: "py-2.5 px-5 text-sm rounded-xl",
  lg: "py-3 px-7 text-base rounded-xl",
};

export const Button = React.forwardRef(
  ({ className, variant = "primary", size = "default", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 focus:ring-2 focus:ring-indigo-500/40 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed",
        variants[variant] || variants.primary,
        sizes[size] || sizes.default,
        className
      )}
      {...props}
    />
  )
);

Button.displayName = "Button";
