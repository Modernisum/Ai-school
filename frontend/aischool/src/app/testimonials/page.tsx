"use client";

import { useState, useEffect } from "react";
import { TestimonialsSection } from "@/components/sections/TestimonialsSection";
import { SectionWrapper } from "@/components/ui/SectionWrapper";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Card } from "@/components/ui/Card";
import { getTestimonials } from "@/lib/api/testimonials";
import { Testimonial } from "@/lib/types";

export default function TestimonialsPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTestimonials()
      .then((res) => setTestimonials(res.data))
      .catch(() => setTestimonials([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <TestimonialsSection />
      <SectionWrapper background="subtle">
        <SectionHeading
          title="More Success Stories"
          description={loading ? "Loading..." : "Schools across India are transforming their operations with Vidhyam."}
        />
        {loading ? (
          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-40 rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : !testimonials.length ? (
          <p className="text-center text-text-secondary">No testimonials yet.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {testimonials.map((t) => (
              <Card key={t.id} variant="gradient-border" padding="lg">
                <div className="flex items-center gap-1 mb-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg
                      key={i}
                      className={`w-4 h-4 ${i < t.rating ? "text-amber-400" : "text-slate-200"}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <blockquote className="text-text-secondary leading-relaxed mb-4">
                  &ldquo;{t.content}&rdquo;
                </blockquote>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center font-bold text-white">
                    {t.client_name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-text-primary">{t.client_name}</div>
                    <div className="text-xs text-text-secondary">
                      {t.client_title}{t.school_name ? `, ${t.school_name}` : ""}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </SectionWrapper>
    </>
  );
}