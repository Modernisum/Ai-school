import { cn } from "@/lib/utils";

interface IconBoxProps {
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "accent" | "success" | "warning";
  className?: string;
}

const sizeStyles = {
  sm: "w-8 h-8 text-base",
  md: "w-12 h-12 text-xl",
  lg: "w-16 h-16 text-2xl",
};

const variantStyles = {
  primary: "bg-primary-50 text-primary-600",
  accent: "bg-purple-50 text-accent-600",
  success: "bg-emerald-50 text-success",
  warning: "bg-amber-50 text-warning",
};

export function IconBox({
  children,
  size = "md",
  variant = "primary",
  className,
}: IconBoxProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-xl shrink-0",
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
    >
      {children}
    </div>
  );
}