import * as React from "react";
import { cn } from "../../lib/utils";

export function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        "bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)]",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }) {
  return (
    <div
      className={cn("p-5 border-b border-white/10 font-bold text-white text-base", className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }) {
  return (
    <div
      className={cn("p-5 text-sm text-slate-300", className)}
      {...props}
    />
  );
}
