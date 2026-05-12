export const SITE_CONFIG = {
  name: "Vidhyam",
  tagline: "AI-Driven School Management System",
  description:
    "Vidhyam is a revolutionary AI-powered school management platform that automates 80% of school operations — zero human dependency required. Manage attendance, exams, finances, HR, and communication seamlessly.",
  url: "https://vidhyam.in",
  ogImage: "/images/og-image.png",
  keywords: [
    "AI school management",
    "school automation SaaS",
    "automated school ERP",
    "school management system",
    "AI powered school software",
    "education technology",
    "school ERP India",
  ],
  social: {
    twitter: "@vidhyam",
    linkedin: "https://linkedin.com/company/vidhyam",
    facebook: "https://facebook.com/vidhyam",
  },
} as const;

export const NAV_ITEMS = [
  { label: "Features", href: "/#features" },
  { label: "AI Capabilities", href: "/#ai-capabilities" },
  { label: "Blog", href: "/blog" },
  { label: "Testimonials", href: "/testimonials" },
] as const;

export const FOOTER_LINKS = {
  product: [
    { label: "Features", href: "/features" },
    { label: "AI Capabilities", href: "/#ai-capabilities" },
    { label: "Integrations", href: "/#ecosystem" },
  ],
  company: [
    { label: "Blog", href: "/blog" },
    { label: "Testimonials", href: "/testimonials" },
    { label: "Contact", href: "/get-started" },
  ],
  legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
  ],
} as const;