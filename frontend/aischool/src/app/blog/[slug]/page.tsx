import { notFound } from "next/navigation";
import Link from "next/link";
import { SectionWrapper } from "@/components/ui/SectionWrapper";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { getBlogPostBySlug, getLatestBlogPosts } from "@/lib/api/blog";
import { formatDate, calculateReadTime } from "@/lib/utils";
import type { Metadata } from "next";
import type { PageProps } from "@/lib/types";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!slug) return {};

  const response = await getBlogPostBySlug(slug);
  const post = response.data;

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.published_at || undefined,
      authors: [post.author_name],
      images: post.cover_image_url ? [post.cover_image_url] : [],
    },
  };
}

export default async function BlogDetailPage({ params }: PageProps) {
  const { slug } = await params;
  if (!slug) return notFound();

  const response = await getBlogPostBySlug(slug);
  const post = response.data;

  if (!post) return notFound();

  let relatedPosts: { id: string; slug: string; title: string; excerpt: string }[] = [];
  try {
    const latest = await getLatestBlogPosts(3);
    relatedPosts = latest.data.filter((p) => p.slug !== slug).slice(0, 3);
  } catch {
    relatedPosts = [];
  }

  const readTime = post.content ? calculateReadTime(post.content) : 5;

  return (
    <SectionWrapper background="white">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors mb-8"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Blog
        </Link>

        <Badge variant="default" size="md" className="mb-4">
          {post.category || "General"}
        </Badge>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-text-primary mb-6">
          {post.title}
        </h1>

        <div className="flex items-center gap-4 text-sm text-text-secondary mb-8 pb-8 border-b border-border">
          <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center font-bold text-white">
            {post.author_name?.charAt(0) || "V"}
          </div>
          <div>
            <div className="font-medium text-text-primary">{post.author_name}</div>
            <div>
              {post.published_at ? formatDate(post.published_at) : ""}
              {readTime ? ` · ${readTime} min read` : ""}
            </div>
          </div>
        </div>

        {post.cover_image_url && (
          <div className="aspect-video rounded-3xl bg-gradient-to-br from-primary-100 to-accent-100 flex items-center justify-center mb-8 overflow-hidden">
            <span className="text-6xl opacity-50">📝</span>
          </div>
        )}

        <div className="prose prose-lg max-w-none">
          {post.content ? (
            <div dangerouslySetInnerHTML={{ __html: post.content }} />
          ) : (
            <p className="text-text-secondary leading-relaxed">{post.excerpt}</p>
          )}
        </div>

        {relatedPosts.length > 0 && (
          <div className="mt-16 pt-8 border-t border-border">
            <h3 className="text-xl font-bold text-text-primary mb-6">Related Articles</h3>
            <div className="grid md:grid-cols-3 gap-6">
              {relatedPosts.map((rp) => (
                <Link key={rp.id} href={`/blog/${rp.slug}`}>
                  <Card hover padding="md">
                    <h4 className="font-semibold text-text-primary text-sm line-clamp-2 mb-2">
                      {rp.title}
                    </h4>
                    <p className="text-xs text-text-secondary line-clamp-2">
                      {rp.excerpt}
                    </p>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </SectionWrapper>
  );
}