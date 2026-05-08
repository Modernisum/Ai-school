# Phase 3: Design System & UI/UX Transformation

> **Goal**: Implement a premium, light-first design system with standardized color codes, typography, spacing, and maximum component reusability across ALL platforms (Web, Mobile, Extension). Every screen must feel cohesive and premium.

---

## 3.1 Design Token Foundation

### 3.1.1 Create design token source of truth
- **File**: `packages/design-tokens/src/tokens.ts`
- **Sub-tasks**:
  1. Define color tokens as TypeScript constants:
     ```typescript
     export const colors = {
       primary: {
         50: '#EEF2FF', 100: '#E0E7FF', 200: '#C7D2FE',
         300: '#A5B4FC', 400: '#818CF8', 500: '#6366F1',
         600: '#4F46E5', 700: '#4338CA', 800: '#3730A3', 900: '#312E81'
       },
       gray: {
         50: '#F8FAFC', 100: '#F1F5F9', 200: '#E2E8F0',
         300: '#CBD5E1', 400: '#94A3B8', 500: '#64748B',
         600: '#475569', 700: '#334155', 800: '#1E293B', 900: '#0F172A'
       },
       semantic: {
         success: '#059669', warning: '#D97706',
         error: '#DC2626', info: '#0284C7'
       },
       surface: {
         page: '#F8FAFC', card: '#FFFFFF',
         elevated: '#FFFFFF', overlay: '#FFFFFF'
       }
     } as const;
     ```
  2. Define typography tokens:
     ```typescript
     export const typography = {
       fontFamily: { sans: 'Inter, system-ui, sans-serif' },
       fontSize: { xs: '0.75rem', sm: '0.875rem', base: '1rem',
                    lg: '1.125rem', xl: '1.25rem', '2xl': '1.5rem',
                    '3xl': '1.875rem', '4xl': '2.25rem' },
       fontWeight: { regular: 400, medium: 500, semibold: 600, bold: 700 },
       lineHeight: { tight: 1.25, normal: 1.5, relaxed: 1.75 }
     } as const;
     ```
  3. Define spacing tokens:
     ```typescript
     export const spacing = { 1: '4px', 2: '8px', 3: '12px', 4: '16px',
       5: '20px', 6: '24px', 8: '32px', 10: '40px', 12: '48px',
       16: '64px', 20: '80px', 24: '96px' } as const;
     ```
  4. Define shadow tokens:
     ```typescript
     export const shadows = {
       sm: '0 1px 2px rgba(0,0,0,0.05)',
       md: '0 4px 6px -1px rgba(0,0,0,0.07)',
       lg: '0 10px 15px -3px rgba(0,0,0,0.08)',
       xl: '0 20px 25px -5px rgba(0,0,0,0.1)'
     } as const;
     ```
  5. Define radius tokens:
     ```typescript
     export const radius = {
       sm: '6px', md: '8px', lg: '12px', xl: '16px', '2xl': '24px', full: '9999px'
     } as const;
     ```

### 3.1.2 Generate platform-specific outputs
- **Sub-tasks**:
  1. Create `packages/design-tokens/src/css.ts` — generates CSS custom properties
  2. Create `packages/design-tokens/src/tailwind.ts` — generates Tailwind preset
  3. Create `packages/design-tokens/src/dart.ts` — generates Dart color/theme constants
  4. Create build script that generates all outputs from source tokens
  5. Add generated files to `.gitignore` but keep generation script in repo

### 3.1.3 Create Tailwind preset package
- **File**: `packages/design-tokens/src/tailwind-preset.ts`
- **Sub-tasks**:
  1. Export a Tailwind v4 preset that uses all design tokens
  2. Configure `theme.extend.colors` from token source
  3. Configure `theme.extend.spacing`, `theme.extend.borderRadius`, `theme.extend.boxShadow`
  4. Configure `theme.extend.fontFamily` with Inter
  5. Both Vidhyam and SuperAdmin import this preset

---

## 3.2 Web Component Library (`@modernschool/ui`)

### 3.2.1 Base components — atoms
- **Sub-tasks** (each component gets: TypeScript interface, light-theme styling, accessibility, Storybook story):
  1. `Button` — primary, secondary, ghost, danger variants; sizes: sm, md, lg; loading state
  2. `Input` — text, email, password, search; with label, error, icon; focus ring
  3. `Select` — single, multi; with search; async options
  4. `Checkbox` — with label, indeterminate state
  5. `Radio` — group with label
  6. `Switch` — toggle with label
  7. `Badge` — status colors, dot indicator, removable
  8. `Avatar` — image, initials fallback, size variants
  9. `Tooltip` — hover, focus trigger; positions: top, right, bottom, left
  10. `Spinner` — size variants, color variants

### 3.2.2 Composite components — molecules
- **Sub-tasks**:
  1. `Card` — header, body, footer; elevation levels; hover state
  2. `Modal` — sizes: sm, md, lg, full; close button; overlay; animation
  3. `DataTable` — sorting, filtering, pagination, row selection, bulk actions
  4. `Form` — form field wrapper with label, error, description
  5. `Dropdown` — menu items, dividers, icons, keyboard navigation
  6. `Tabs` — horizontal, vertical; active indicator; content panels
  7. `Breadcrumb` — with separator, current page indicator
  8. `Pagination` — page numbers, prev/next, items per page selector
  9. `SearchInput` — with debounce, clear button, results dropdown
  10. `DatePicker` — single date, date range; calendar popup

### 3.2.3 Layout components — organisms
- **Sub-tasks**:
  1. `AppShell` — sidebar + topbar + content area; responsive
  2. `Sidebar` — collapsible, nested menu items, active indicator, user section
  3. `TopBar` — breadcrumb, search, notifications, user menu
  4. `PageHeader` — title, description, actions, breadcrumbs
  5. `EmptyState` — icon, title, description, action button
  6. `ErrorState` — error illustration, message, retry button
  7. `LoadingState` — skeleton, spinner, progress bar variants
  8. `KPIWidget` — value, label, trend, sparkline
  9. `ChartWidget` — wrapper for Tremor charts with title, legend
  10. `SpotlightSearch` — Cmd+K search overlay with fuzzy matching

### 3.2.4 Feature-specific components
- **Sub-tasks**:
  1. `StudentCard` — avatar, name, class, roll number, status
  2. `EmployeeCard` — avatar, name, role, department, status
  3. `FeeStatusBadge` — paid, pending, overdue, partial
  4. `AttendanceIndicator` — present, absent, late, holiday
  5. `LeaveStatusBadge` — approved, pending, rejected
  6. `ResponsibilityCard` — type, assignee, spaces, status
  7. `NotificationItem` — icon, title, message, time, read/unread
  8. `TimetableSlot` — subject, teacher, room, time

### 3.2.5 Add Storybook
- **Sub-tasks**:
  1. Install Storybook 8 in `packages/ui/`
  2. Configure for React + TypeScript + Tailwind
  3. Write stories for all atom components
  4. Write stories for all molecule components
  5. Write stories for all organism components
  6. Deploy Storybook to Chromatic for visual regression testing

---

## 3.3 Flutter Component Library (`modernschool_ui`)

### 3.3.1 Create theme package
- **File**: `packages/modernschool_theme/lib/src/`
- **Sub-tasks**:
  1. Define `AppColors` with exact same values as web design tokens
  2. Define `AppTextStyles` matching web typography
  3. Define `AppSpacing` matching web spacing scale
  4. Define `AppRadius` matching web border radius
  5. Define `AppShadows` matching web shadows
  6. Create `ThemeData` for light mode (default)
  7. Create `ThemeData` for dark mode (opt-in)
  8. Export `AppTheme` class that provides both themes

### 3.3.2 Create widget library
- **Sub-tasks** (each widget must match web counterpart visually):
  1. `ModernCard` — elevation levels, rounded corners, padding variants
  2. `ModernButton` — primary, secondary, ghost, danger; loading state
  3. `ModernInput` — with label, error text, icon prefix/suffix
  4. `ModernBadge` — status colors, dot indicator
  5. `ModernAvatar` — image, initials fallback
  6. `ModernEmptyState` — icon, title, description, action
  7. `ModernLoadingState` — skeleton, shimmer, spinner
  8. `ModernKPIWidget` — value, label, trend indicator
  9. `ModernListTile` — leading, title, subtitle, trailing
  10. `ModernBottomNav` — items with icons, active indicator
  11. `ModernAppBar` — title, actions, back button
  12. `ModernSearchBar` — with debounce, clear button

### 3.3.3 Migrate chatra app to new design system
- **Sub-tasks**:
  1. Replace all `GlassCard` with `ModernCard`
  2. Replace all `withOpacity` / `withValues` with `AppColors` constants
  3. Replace all hardcoded colors with `AppColors` references
  4. Replace all hardcoded text styles with `AppTextStyles` references
  5. Replace all hardcoded spacing with `AppSpacing` references
  6. Update `app_theme.dart` to use `AppTheme.lightTheme` as default
  7. Verify every screen renders correctly in light theme
  8. Test dark theme toggle works on all screens

### 3.3.4 Migrate employee app to new design system
- **Sub-tasks**:
  1. Same migration steps as chatra (3.3.3)
  2. Ensure role-based dashboards (teacher, driver, peon, management) all use new components
  3. Verify every screen renders correctly in light theme

---

## 3.4 Web App Theme Migration

### 3.4.1 Migrate Vidhyam to light-first theme
- **Sub-tasks**:
  1. Update `index.css` — swap `:root` and `[data-theme='light']` so light is default
  2. Update CSS custom properties to use design token values
  3. Remove dark gradient backgrounds from all components
  4. Replace `GlassCard` glassmorphism with clean white cards + subtle shadows
  5. Update `Sidebar` — white background, gray borders, primary active indicator
  6. Update `TopBar` — white background, subtle bottom border
  7. Update all page backgrounds to `#F8FAFC`
  8. Update all card backgrounds to `#FFFFFF`
  9. Update all text colors to gray scale
  10. Update all form inputs to light theme styling
  11. Remove all `bg-via` gradient backgrounds
  12. Remove all glow effects (`primary-glow`)
  13. Test every route in light theme
  14. Ensure dark theme toggle still works (but light is default)

### 3.4.2 Migrate SuperAdmin to light-first theme
- **Sub-tasks**:
  1. Same migration steps as Vidhyam (3.4.1)
  2. Update `index.css` with design token values
  3. Replace all dark-themed components with light equivalents
  4. Test every page in light theme

### 3.4.3 Remove scale-factor system from Vidhyam
- **File**: `frontend/Vidhyam/src/index.css`
- **Issue**: Custom `--scale-factor` overrides Tailwind's spacing/sizing system
- **Action**:
  1. Remove all `calc(Xrem * var(--scale-factor))` overrides
  2. Use Tailwind's built-in responsive utilities instead
  3. Remove `--scale-factor`, `--font-scale`, `--ui-scale` CSS variables
  4. Remove `useScreenScale` hook
  5. Remove `ScaleWrapper` component
  6. Use CSS `zoom` or viewport-based sizing for different screen sizes
- **Verification**: App renders correctly at all common screen sizes without scale factor

---

## 3.5 Responsive Design Standardization

### 3.5.1 Define breakpoint system
- **Sub-tasks**:
  1. Standard breakpoints across all web apps:
     - `sm`: 640px (mobile landscape)
     - `md`: 768px (tablet portrait)
     - `lg`: 1024px (tablet landscape / small desktop)
     - `xl`: 1280px (desktop)
     - `2xl`: 1536px (large desktop)
  2. Configure in Tailwind preset
  3. Document responsive design guidelines

### 3.5.2 Implement responsive layouts for all pages
- **Sub-tasks**:
  1. Audit all pages for mobile responsiveness
  2. Fix sidebar → hamburger menu on mobile
  3. Fix data tables → card layout on mobile
  4. Fix modals → full-screen on mobile
  5. Fix forms → single column on mobile
  6. Test on: iPhone SE, iPhone 14, iPad, Desktop

---

## 3.6 Accessibility Audit

### 3.6.1 WCAG 2.1 AA compliance
- **Sub-tasks**:
  1. Run axe-core audit on all pages
  2. Fix all critical accessibility issues:
     - Color contrast ratios (minimum 4.5:1 for text)
     - Focus indicators on all interactive elements
     - ARIA labels on all form inputs
     - Alt text on all images
     - Keyboard navigation for all interactive components
     - Screen reader announcements for dynamic content
  3. Add skip-to-content link
  4. Add landmark regions (nav, main, aside)
  5. Test with screen reader (NVDA/VoiceOver)

---

## Exit Criteria

- [ ] Design token package exists with source of truth for all platforms
- [ ] Tailwind preset uses design tokens
- [ ] Web component library has 30+ components with TypeScript types
- [ ] Storybook is deployed with all component stories
- [ ] Flutter widget library has 12+ widgets matching web counterparts
- [ ] Both web apps default to light theme
- [ ] Both Flutter apps default to light theme
- [ ] Scale-factor system is removed from Vidhyam
- [ ] All pages are responsive (mobile, tablet, desktop)
- [ ] WCAG 2.1 AA compliance on all pages
- [ ] Dark theme toggle works on all platforms
