import { apiFetch } from "@/lib/api-client";
import type { TestimonialsResponse } from "@/lib/types";

export async function getTestimonials(params?: {
  featured?: boolean;
}): Promise<TestimonialsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.featured !== undefined) searchParams.set("featured", String(params.featured));

  const query = searchParams.toString();
  return apiFetch<TestimonialsResponse>(
    `/api/cms/testimonials${query ? `?${query}` : ""}`,
    { revalidate: 86400 }
  );
}

export async function getFeaturedTestimonials(): Promise<TestimonialsResponse> {
  return getTestimonials({ featured: true });
}