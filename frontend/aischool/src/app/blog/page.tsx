import Link from "next/link";
import { SectionWrapper } from "@/components/ui/SectionWrapper";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getBlogPosts } from "@/lib/api/blog";
import { formatDate } from "@/lib/utils";

export const metadata = {
  title: "Blog — AI School Management Insights & Resources | Vidhyam",
  description:
    "Expert insights on AI in education, school automation, digital transformation, and education technology.",
};

export default async function BlogPage() {
  const posts = await getBlogPosts({ per_page: 9, published: true });
  const blogPosts = posts.data || [];

  if (!blogPosts.length) {
    return (
      <SectionWrapper background="subtle">
        <SectionHeading
          badge="BLOG"
          title="Insights & Resources"
          description="No articles published yet. Check back soon for expert perspectives on AI in education."
        />
      </SectionWrapper>
    );
  }

  return (
    <SectionWrapper background="subtle">
      <SectionHeading
        badge="BLOG"
        title="Insights & Resources"
        description="Expert perspectives on AI in education, school automation, and digital transformation."
      />

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {blogPosts.map((post) => (
          <Link key={post.id} href={`/blog/${post.slug}`}>
            <Card hover padding="lg" className="h-full flex flex-col">
              <div className="h-40 rounded-xl bg-gradient-to-br from-primary-100 to-accent-100 flex items-center justify-center mb-5 overflow-hidden">
                <span className="text-4xl opacity-50">
                  {post.category?.includes("AI") ? "🤖" : post.category?.includes("Study") ? "🏫" : "📋"}
                </span>
              </div>
              <Badge variant="default" size="sm" className="w-fit mb-3">
                {post.category || "General"}
              </Badge>
              <h3 className="text-lg font-bold text-text-primary mb-2 line-clamp-2">
                {post.title}
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed line-clamp-2 flex-1">
                {post.excerpt}
              </p>
              <div className="mt-4 flex items-center justify-between text-xs text-text-tertiary">
                <span>{post.author_name}</span>
                <span>{post.published_at ? formatDate(post.published_at) : ""}</span>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </SectionWrapper>
  );
}