import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { OrganizationSchema, SoftwareApplicationSchema } from "@/components/JsonLd";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default:
      "Vidhyam — AI School Management System | Automate 80% of School Operations",
    template: "%s | Vidhyam",
  },
  description:
    "Vidhyam is a revolutionary AI-powered school management platform that automates 80% of school operations — attendance, exams, finances, HR, and communication. Zero human dependency required.",
  keywords: [
    "AI school management",
    "school automation SaaS",
    "automated school ERP",
    "school management system",
    "AI powered school software",
    "education technology",
    "school ERP India",
  ],
  authors: [{ name: "Vidhyam" }],
  creator: "Vidhyam",
  publisher: "Vidhyam",
  metadataBase: new URL("https://vidhyam.in"),
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://vidhyam.in",
    siteName: "Vidhyam",
    title:
      "Vidhyam — AI School Management System | Automate 80% of School Operations",
    description:
      "Revolutionary AI-powered school management platform that automates 80% of school operations. Zero human dependency required.",
    images: [
      {
        url: "/images/og-image.png",
        width: 1200,
        height: 630,
        alt: "Vidhyam — AI School Management System",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Vidhyam — AI School Management System | Automate 80% of School Operations",
    description:
      "Revolutionary AI-powered school management platform that automates 80% of school operations. Zero human dependency required.",
    images: ["/images/og-image.png"],
    creator: "@vidhyam",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "google-site-verification-code",
  },
  alternates: {
    canonical: "https://vidhyam.in",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} antialiased`}>
      <body className="min-h-screen flex flex-col bg-surface text-text-primary">
        <OrganizationSchema />
        <SoftwareApplicationSchema />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}