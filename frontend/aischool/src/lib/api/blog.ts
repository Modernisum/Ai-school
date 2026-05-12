import { apiFetch } from "@/lib/api-client";
import type { BlogListResponse, BlogPost } from "@/lib/types";
import type { ApiResponse } from "@/lib/types";

export async function getBlogPosts(params?: {
  page?: number;
  per_page?: number;
  category?: string;
  published?: boolean;
}): Promise<BlogListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.per_page) searchParams.set("per_page", String(params.per_page));
  if (params?.category) searchParams.set("category", params.category);
  if (params?.published !== undefined) searchParams.set("published", String(params.published));

  const query = searchParams.toString();
  return apiFetch<BlogListResponse>(`/api/cms/blog${query ? `?${query}` : ""}`, {
    revalidate: 3600,
  });
}

export async function getBlogPostBySlug(slug: string): Promise<ApiResponse<BlogPost>> {
  return apiFetch<ApiResponse<BlogPost>>(`/api/cms/blog/${slug}`, {
    revalidate: 3600,
  });
}

export async function getLatestBlogPosts(limit = 3): Promise<BlogListResponse> {
  return getBlogPosts({ per_page: limit, published: true });
}