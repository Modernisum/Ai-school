import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "primary" | "secondary" | "outline";
  size?: "sm" | "md";
  className?: string;
}

const variants = {
  default: "bg-primary-50 text-primary-700 border-primary-100",
  primary: "bg-primary-600 text-white border-transparent",
  secondary: "bg-surface-secondary text-text-secondary border-border",
  outline: "bg-transparent text-primary-600 border-primary-200",
};

const sizes = {
  sm: "px-2.5 py-0.5 text-xs",
  md: "px-3 py-1 text-sm",
};

export function Badge({ children, variant = "default", size = "md", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-medium border rounded-full",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  );
}