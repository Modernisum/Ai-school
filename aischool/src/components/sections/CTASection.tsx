import Link from "next/link";
import { SectionWrapper } from "@/components/ui/SectionWrapper";
import { Button } from "@/components/ui/Button";

export function CTASection() {
  return (
    <SectionWrapper background="gradient">
      <div className="text-center max-w-3xl mx-auto space-y-6">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-text-primary">
          Ready to{" "}
          <span className="gradient-text">Automate Your School</span>?
        </h2>
        <p className="text-lg text-text-secondary leading-relaxed">
          Join 500+ schools that have eliminated manual processes. Let our AI handle operations
          while your team focuses on what matters — quality education.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link href="/get-started">
            <Button size="lg">
              Request Access
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Button>
          </Link>
          <Link href="/#features">
            <Button variant="outline" size="lg">
              View All Features
            </Button>
          </Link>
        </div>
      </div>
    </SectionWrapper>
  );
}