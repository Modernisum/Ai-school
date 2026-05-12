import { SectionWrapper } from "@/components/ui/SectionWrapper";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Card } from "@/components/ui/Card";
import { IconBox } from "@/components/ui/IconBox";

interface FeatureItem {
  title: string;
  description: string;
  bullets: string[];
  icon: string;
  id: string;
}

interface FeatureCategory {
  id: string;
  title: string;
  subtitle: string;
  features: FeatureItem[];
}

interface FeatureCardGridProps {
  category: FeatureCategory;
  index: number;
}

export function FeatureCardGrid({ category, index }: FeatureCardGridProps) {
  const isReversed = index % 2 === 1;

  return (
    <SectionWrapper
      id={category.id}
      background={index % 2 === 0 ? "white" : "subtle"}
    >
      <SectionHeading
        badge={category.id === "core-operations" ? "FEATURES" : undefined}
        title={category.title}
        description={category.subtitle}
      />

      <div className="space-y-12">
        {category.features.map((feature, fIndex) => (
          <div
            key={feature.id}
            className={`grid lg:grid-cols-2 gap-8 lg:gap-16 items-center ${
              isReversed && fIndex % 2 === 0 ? "lg:[direction:rtl]" : ""
            }`}
          >
            <div className={isReversed && fIndex % 2 === 0 ? "lg:[direction:ltr]" : ""}>
              <IconBox variant={fIndex % 4 === 0 ? "primary" : fIndex % 4 === 1 ? "accent" : fIndex % 4 === 2 ? "success" : "warning"} size="lg" className="mb-4 text-2xl">
                {feature.icon}
              </IconBox>
              <h3 className="text-xl sm:text-2xl font-bold text-text-primary mb-3">
                {feature.title}
              </h3>
              <p className="text-text-secondary leading-relaxed mb-4">
                {feature.description}
              </p>
              <ul className="space-y-2">
                {feature.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2.5 text-sm text-text-secondary">
                    <svg className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>

            <div className={isReversed && fIndex % 2 === 0 ? "lg:[direction:ltr]" : ""}>
              <Card className="overflow-hidden bg-gradient-to-br from-slate-50 to-white">
                <div className="aspect-[4/3] bg-gradient-to-br from-primary-50 to-accent-50 flex items-center justify-center p-8">
                  <div className="text-center">
                    <div className="text-5xl mb-3">{feature.icon || "🖥️"}</div>
                    <div className="text-sm font-medium text-text-secondary">
                      {feature.title} Dashboard
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`rounded-xl p-3 ${
                            i % 2 === 0
                              ? "bg-white border border-border"
                              : "bg-primary-50"
                          }`}
                        >
                          <div className="w-full h-1.5 rounded-full bg-primary-100 mb-2">
                            <div
                              className="h-full rounded-full bg-primary-500"
                              style={{ width: `${30 + i * 18}%` }}
                            />
                          </div>
                          <div className="w-16 h-2 rounded bg-slate-200" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        ))}
      </div>
    </SectionWrapper>
  );
}