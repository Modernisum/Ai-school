export interface SiteConfig {
  name: string;
  tagline: string;
  description: string;
  url: string;
  ogImage: string;
  keywords: string[];
}

export const SITE_CONFIG: SiteConfig = {
  name: "Vidhyam",
  tagline: "AI-Driven School Management System",
  description:
    "Vidhyam is a revolutionary AI-powered school management platform that automates 80% of school operations — zero human dependency required.",
  url: "https://vidhyam.in",
  ogImage: "/images/og-image.png",
  keywords: [
    "AI school management",
    "school automation SaaS",
    "automated school ERP",
  ],
};