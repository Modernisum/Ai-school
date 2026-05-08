import { HeroSection } from "@/components/sections/HeroSection";
import { FeatureCardGrid } from "@/components/sections/FeatureCardGrid";
import { TaskManagementSection } from "@/components/sections/TaskManagementSection";
import { EcosystemSection } from "@/components/sections/EcosystemSection";
import { TestimonialsSection } from "@/components/sections/TestimonialsSection";
import { BlogPreviewSection } from "@/components/sections/BlogPreviewSection";
import { CTASection } from "@/components/sections/CTASection";
import { featureCategories } from "@/data/features";

export default function HomePage() {
  return (
    <>
      <HeroSection />

      {featureCategories.map((category, index) => (
        <FeatureCardGrid key={category.id} category={category} index={index} />
      ))}

      <TaskManagementSection />
      <EcosystemSection />
      <TestimonialsSection />
      <BlogPreviewSection />
      <CTASection />
    </>
  );
}