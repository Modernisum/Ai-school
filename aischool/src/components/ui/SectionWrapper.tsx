import { cn } from "@/lib/utils";

interface SectionWrapperProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  background?: "white" | "subtle" | "gradient" | "dark" | "dots";
}

const backgrounds = {
  white: "bg-surface",
  subtle: "bg-surface-secondary",
  gradient: "gradient-bg-subtle",
  dark: "bg-gradient-to-b from-slate-900 to-slate-800 text-white",
  dots: "bg-surface grid-dots",
};

export function SectionWrapper({
  children,
  className,
  id,
  background = "white",
}: SectionWrapperProps) {
  return (
    <section id={id} className={cn("py-20 lg:py-28", backgrounds[background], className)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
    </section>
  );
}