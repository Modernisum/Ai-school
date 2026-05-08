"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SectionWrapper } from "@/components/ui/SectionWrapper";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getLatestBlogPosts } from "@/lib/api/blog";
import { BlogPost } from "@/lib/types";

export function BlogPreviewSection() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLatestBlogPosts(3)
      .then((res) => setPosts(res.data))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <SectionWrapper id="blog-preview" background="subtle">
        <SectionHeading
          badge="BLOG"
          title="Insights & Resources"
          description="Loading latest articles..."
        />
        <div className="grid md:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      </SectionWrapper>
    );
  }

  if (!posts.length) return null;

  return (
    <SectionWrapper id="blog-preview" background="subtle">
      <SectionHeading
        badge="BLOG"
        title="Insights & Resources"
        description="The latest thinking on AI in education, school automation, and digital transformation."
      />

      <div className="grid md:grid-cols-3 gap-8">
        {posts.map((post) => (
          <Link key={post.id} href={`/blog/${post.slug}`}>
            <Card hover padding="lg" className="h-full flex flex-col">
              <div className="h-40 rounded-xl bg-gradient-to-br from-primary-100 to-accent-100 flex items-center justify-center mb-5 overflow-hidden">
                <span className="text-4xl opacity-50">
                  {post.category === "AI in Education" ? "🤖" : post.category === "School Management" ? "📋" : "🏫"}
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
                <span>{post.published_at ? new Date(post.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}</span>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-10 text-center">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors"
        >
          View All Articles
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </Link>
      </div>
    </SectionWrapper>
  );
}