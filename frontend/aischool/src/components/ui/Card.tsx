import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "glass" | "gradient-border";
  hover?: boolean;
  padding?: "sm" | "md" | "lg";
}

const paddingStyles = {
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function Card({
  children,
  className,
  variant = "default",
  hover = false,
  padding = "md",
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface",
        variant === "glass" && "glass-card",
        variant === "gradient-border" && "gradient-border",
        hover && "transition-all duration-300 hover:shadow-card-hover hover:-translate-y-0.5",
        paddingStyles[padding],
        className
      )}
    >
      {children}
    </div>
  );
}