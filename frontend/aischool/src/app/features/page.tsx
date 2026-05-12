import { SectionWrapper } from "@/components/ui/SectionWrapper";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Card } from "@/components/ui/Card";
import { IconBox } from "@/components/ui/IconBox";
import { featureCategories } from "@/data/features";

export default function FeaturesPage() {
  const allFeatures = featureCategories.flatMap((cat) =>
    cat.features.map((f) => ({ ...f, category: cat.title }))
  );

  return (
    <SectionWrapper background="subtle">
      <SectionHeading
        badge="FEATURES"
        title="Everything Your School Needs"
        description="A comprehensive suite of AI-powered tools to automate every aspect of school management."
      />

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {allFeatures.map((feature, i) => (
          <Card key={feature.id} hover padding="lg" className="flex flex-col">
            <IconBox
              variant={i % 4 === 0 ? "primary" : i % 4 === 1 ? "accent" : i % 4 === 2 ? "success" : "warning"}
              className="mb-4 text-xl"
            >
              {feature.icon}
            </IconBox>
            <div className="text-xs font-medium text-text-tertiary mb-2">{feature.category}</div>
            <h3 className="text-lg font-bold text-text-primary mb-2">{feature.title}</h3>
            <p className="text-sm text-text-secondary leading-relaxed flex-1">{feature.description}</p>
            <ul className="mt-4 space-y-1.5">
              {feature.bullets.slice(0, 3).map((bullet) => (
                <li key={bullet} className="flex items-start gap-2 text-xs text-text-secondary">
                  <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {bullet}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </SectionWrapper>
  );
}