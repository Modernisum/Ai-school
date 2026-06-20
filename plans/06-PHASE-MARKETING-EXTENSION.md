# Phase 6: Marketing Website & Chrome Extension Rebuild

> **Goal**: Create a premium, conversion-optimized marketing/intro website that serves as the public face of Modern AI School, and rebuild the Chrome extension as a modern, Manifest V3 compliant tool with consistent design language.

---

## 6.1 Marketing Website — Architecture

### 6.1.1 Technology selection
- **Framework**: Next.js 15 (App Router) with React 19
- **Styling**: Tailwind 4 + `@modernschool/design-tokens`
- **Deployment**: Cloudflare Pages (edge-first, zero cold starts)
- **Analytics**: Vercel Analytics or Plausible (privacy-first)
- **CMS**: Not needed — content is developer-managed in MDX files
- **Rationale**: Next.js provides SSR/SSG for SEO, Cloudflare Pages gives global edge deployment, and MDX keeps content version-controlled

### 6.1.2 Project setup
- **Location**: `apps/marketing/` (within Turborepo workspace)
- **Sub-tasks**:
  1. Initialize Next.js 15 project: `pnpm create next-app@latest`
  2. Configure `next.config.ts`:
     - `output: 'export'` for static generation (Cloudflare Pages compatible)
     - Image optimization via Cloudflare
     - Redirects for legacy URLs
  3. Install dependencies:
     - `@modernschool/design-tokens` (workspace)
     - `@modernschool/ui` (workspace)
     - `framer-motion` (animations)
     - `next-mdx-remote` (MDX content)
     - `lucide-react` (icons)
  4. Configure Tailwind with `@modernschool/design-tokens` preset
  5. Set up folder structure:
     ```
     apps/marketing/
     ├── app/
     │   ├── layout.tsx          # Root layout with fonts, metadata
     │   ├── page.tsx            # Homepage
     │   ├── pricing/page.tsx    # Pricing page
     │   ├── features/page.tsx   # Features page
     │   ├── about/page.tsx      # About page
     │   ├── blog/               # Blog with MDX
     │   ├── contact/page.tsx    # Contact/sales page
     │   └── api/                # API routes (if needed)
     ├── components/
     │   ├── layout/             # Header, Footer, Navigation
     │   ├── sections/           # Homepage sections
     │   └── ui/                 # Marketing-specific UI
     ├── content/
     │   └── blog/               # MDX blog posts
     └── public/
         ├── images/
         └── videos/
     ```

---

## 6.2 Marketing Website — Homepage Sections

### 6.2.1 Hero section
- **Sub-tasks**:
  1. Create `HeroSection` component with:
     - Headline: "The Modern School Management Platform"
     - Subheadline: "Everything your school needs — attendance, fees, academics, communication — in one premium platform"
     - Primary CTA: "Start Free Trial" → links to signup
     - Secondary CTA: "Watch Demo" → opens demo video modal
     - Hero illustration: Animated dashboard preview (Lottie or CSS animation)
  2. Implement responsive layout (mobile-first)
  3. Add subtle entrance animation (fade-in + slide-up)
  4. Ensure LCP < 2.5s

### 6.2.2 Social proof section
- **Sub-tasks**:
  1. Create `SocialProofSection` with:
     - Logo bar of partner schools (if available)
     - Key metrics: "500+ Schools", "100K+ Students", "99.9% Uptime"
     - Animated counter on scroll into view
  2. Add testimonial cards (3-4 testimonials)
  3. Each card: quote, name, role, school name, avatar

### 6.2.3 Features showcase section
- **Sub-tasks**:
  1. Create `FeaturesSection` with tabbed interface:
     - Tab 1: "Smart Attendance" — QR + GPS + offline
     - Tab 2: "Fee Management" — collection + reminders + analytics
     - Tab 3: "Academic Excellence" — gradebook + exams + timetable
     - Tab 4: "Communication Hub" — chat + announcements + notifications
     - Tab 5: "AI-Powered Insights" — predictions + analytics + content generation
  2. Each tab shows: screenshot/mockup + feature bullets + CTA
  3. Add smooth tab transition animation

### 6.2.4 Platform preview section
- **Sub-tasks**:
  1. Create `PlatformPreviewSection` with:
     - Interactive dashboard mockup (static image with hover hotspots)
     - Click hotspot → feature detail popup
  2. Show all platform surfaces:
     - Admin web portal (Vidhyam)
     - Super admin dashboard
     - Student/parent mobile app (Chatra)
     - Employee mobile app
     - Chrome extension
  3. Add device mockup frames (laptop, tablet, phone)

### 6.2.5 Pricing section
- **Sub-tasks**:
  1. Create `PricingSection` with 3 tiers:
     - **Starter**: Free for schools < 100 students; basic features
     - **Professional**: ₹X/student/month; all features; priority support
     - **Enterprise**: Custom pricing; dedicated infrastructure; SLA; custom integrations
  2. Add feature comparison table
  3. Add FAQ accordion
  4. Add "Contact Sales" CTA for Enterprise
  5. Add annual discount badge (2 months free)

### 6.2.6 CTA section
- **Sub-tasks**:
  1. Create `CTASection` with:
     - "Ready to transform your school?"
     - Email input + "Get Started" button
     - Or "Schedule a Demo" link
  2. Add gradient background matching brand colors
  3. Add subtle particle/dot animation

### 6.2.7 Footer
- **Sub-tasks**:
  1. Create `Footer` with:
     - Logo + tagline
     - Product links (Features, Pricing, Demo, API Docs)
     - Company links (About, Blog, Careers, Contact)
     - Legal links (Privacy, Terms, Security)
     - Social media links
     - Newsletter signup
  2. Add copyright notice
  3. Responsive: 4 columns on desktop, stacked on mobile

---

## 6.3 Marketing Website — Additional Pages

### 6.3.1 Features page
- **Sub-tasks**:
  1. Create detailed feature pages for each module:
     - `/features/attendance`
     - `/features/fees`
     - `/features/academics`
     - `/features/communication`
     - `/features/ai`
     - `/features/infrastructure`
  2. Each page: hero + feature details + screenshots + pricing CTA
  3. Add structured data (JSON-LD) for SEO

### 6.3.2 Pricing page
- **Sub-tasks**:
  1. Expand pricing section into full page
  2. Add interactive pricing calculator (number of students × price)
  3. Add feature matrix with checkmarks
  4. Add ROI calculator (time saved vs cost)

### 6.3.3 Blog
- **Sub-tasks**:
  1. Set up MDX blog with `next-mdx-remote`
  2. Create blog listing page with pagination
  3. Create blog post template with:
     - Hero image
     - Author info
     - Reading time
     - Table of contents
     - Share buttons
  4. Write 5 launch blog posts:
     - "Why We Built Modern AI School"
     - "How QR Attendance Saves 2 Hours Daily"
     - "The Complete Guide to School Fee Management"
     - "AI in Education: Practical Applications"
     - "From Paper to Digital: A School Transformation Story"

### 6.3.4 Contact/Sales page
- **Sub-tasks**:
  1. Create contact form with:
     - Name, email, phone, school name, student count, message
     - Form validation
     - Submission to backend API or email service
  2. Add Calendly integration for demo scheduling
  3. Add office address and map
  4. Add support email and phone

---

## 6.4 Marketing Website — SEO & Performance

### 6.4.1 SEO optimization
- **Sub-tasks**:
  1. Add metadata to all pages (title, description, og:image)
  2. Add `sitemap.xml` generation
  3. Add `robots.txt`
  4. Add structured data (Organization, SoftwareApplication)
  5. Add canonical URLs
  6. Add hreflang tags for multi-language (future)
  7. Target: 100/100 on Lighthouse SEO audit

### 6.4.2 Performance optimization
- **Sub-tasks**:
  1. Use Next.js Image component for all images
  2. Implement lazy loading for below-fold sections
  3. Preload critical fonts (Inter)
  4. Add resource hints (preconnect to API domain)
  5. Target: Lighthouse Performance > 95
  6. Target: LCP < 1.5s, FID < 50ms, CLS < 0.05

### 6.4.3 Analytics and conversion tracking
- **Sub-tasks**:
  1. Add Plausible Analytics (privacy-first, no cookies)
  2. Add conversion tracking:
     - Signup form submission
     - Demo request
     - Pricing page visit
     - Blog subscription
  3. Add A/B testing framework (simple cookie-based)
  4. Add heatmap tracking (Hotjar or PostHog)

---

## 6.5 Chrome Extension — Complete Rebuild

### 6.5.1 Project setup
- **Location**: `apps/extension/` (within Turborepo workspace)
- **Sub-tasks**:
  1. Initialize Vite + React + TypeScript project
  2. Install CRXJS Vite plugin for Chrome Extension development
  3. Install dependencies:
     - `@modernschool/design-tokens`
     - `@modernschool/ui` (subset)
     - `@modernschool/api-client`
     - `lucide-react`
  4. Create `manifest.json` (Manifest V3):
     ```json
     {
       "manifest_version": 3,
       "name": "Modern School Auto-Fill",
       "version": "2.0.0",
       "description": "Auto-fill student and employee forms on Modern AI School portal",
       "permissions": ["activeTab", "storage"],
       "host_permissions": ["https://*.modernschool.app/*"],
       "action": { "default_popup": "popup.html" },
       "content_scripts": [{
         "matches": ["https://*.modernschool.app/*"],
         "js": ["src/content/index.tsx"]
       }],
       "background": { "service_worker": "src/background/index.ts" }
     }
     ```
  5. Configure Vite for extension build:
     ```typescript
     import crx from '@crxjs/vite-plugin';
     import manifest from './manifest.json';
     export default defineConfig({
       plugins: [react(), crx({ manifest })]
     });
     ```

### 6.5.2 Popup UI
- **Sub-tasks**:
  1. Create popup with light theme matching design system
  2. Show connection status (connected to which school)
  3. Show quick actions:
     - "Fill Student Form" → opens form filler
     - "Fill Employee Form" → opens form filler
     - "Settings" → opens settings
  4. Show recent auto-fill history (last 5)
  5. Add school selector dropdown (if user has multiple schools)

### 6.5.3 Content script — Form auto-fill
- **Sub-tasks**:
  1. Detect form fields on Vidhyam admin portal:
     - Student admission form fields
     - Employee registration form fields
  2. Create field mapping configuration:
     ```typescript
     const STUDENT_FIELD_MAP = {
       'student_name': 'input[name="name"]',
       'roll_number': 'input[name="rollNumber"]',
       'class': 'select[name="className"]',
       'section': 'select[name="section"]',
       // ... all student fields
     };
     ```
  3. Implement auto-fill logic:
     - Read data from extension storage or API
     - Match form fields by selector
     - Fill values with proper event dispatching (React compatible)
  4. Add bulk fill mode (fill multiple student forms from CSV)
  5. Add form field highlighting (show which fields will be filled)
  6. Add undo capability (revert filled fields)

### 6.5.4 Background service worker
- **Sub-tasks**:
  1. Handle extension installation and setup
  2. Manage authentication state (share with web app via cookies)
  3. Handle API calls for fetching student/employee data
  4. Cache frequently used data (class lists, sections)
  5. Handle keyboard shortcuts (Ctrl+Shift+F for auto-fill)

### 6.5.5 Settings page
- **Sub-tasks**:
  1. Create full-page settings (open in new tab):
     - API endpoint configuration
     - Default school selection
     - Auto-fill behavior (auto-submit, confirm before fill)
     - Field mapping customization
     - Data source (API vs manual CSV)
  2. Use `@modernschool/ui` components for consistent look
  3. Add import/export for settings

### 6.5.6 Data source integration
- **Sub-tasks**:
  1. Add CSV import for bulk student/employee data
  2. Add API integration to fetch existing student/employee data
  3. Add local storage for frequently used data
  4. Add data validation before filling
  5. Add error handling for missing/invalid fields

---

## 6.6 Chrome Extension — Testing & Publishing

### 6.6.1 Testing
- **Sub-tasks**:
  1. Write unit tests for form field mapping
  2. Write unit tests for auto-fill logic
  3. Write integration tests with Vidhyam admin portal
  4. Test on Chrome, Edge, and Brave
  5. Test with different form states (empty, partially filled, validation errors)

### 6.6.2 Publishing
- **Sub-tasks**:
  1. Create Chrome Web Store listing:
     - Name, description, screenshots, promotional tiles
     - Category: Productivity
     - Language: English + Hindi
  2. Create privacy policy page (on marketing website)
  3. Submit for Chrome Web Store review
  4. Set up auto-update mechanism

---

## Exit Criteria

- [ ] Marketing website is live at modernschool.app (or equivalent domain)
- [ ] Homepage has all 7 sections with premium design
- [ ] Features page details all 6 modules
- [ ] Pricing page has 3 tiers with calculator
- [ ] Blog has 5 launch posts
- [ ] Contact form submits successfully
- [ ] Lighthouse score > 95 (Performance, SEO, Accessibility)
- [ ] Chrome extension is rebuilt with React + TypeScript + Manifest V3
- [ ] Extension auto-fills student and employee forms correctly
- [ ] Extension is published on Chrome Web Store
- [ ] Both marketing site and extension use the shared design system
