# Phase 2: Structural Overhaul & Standardization

> **Goal**: Transform the project from a collection of independent apps into a unified monorepo with shared packages, consistent architecture patterns, and standardized tooling. This phase establishes the foundation for the design system and global scale.

---

## 2.1 Web Monorepo Migration (Turborepo + pnpm)

### 2.1.1 Initialize Turborepo workspace
- **Sub-tasks**:
  1. Create root `pnpm-workspace.yaml`:
     ```yaml
     packages:
       - 'apps/*'
       - 'packages/*'
     ```
  2. Create root `turbo.json`:
     ```json
     {
       "$schema": "https://turbo.build/schema.json",
       "globalDependencies": ["**/.env.*local"],
       "pipeline": {
         "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**", "build/**"] },
         "dev": { "cache": false, "persistent": true },
         "lint": { "dependsOn": ["^build"] },
         "test": { "dependsOn": ["build"] },
         "type-check": { "dependsOn": ["^build"] }
       }
     }
     ```
  3. Create root `package.json` with workspace scripts
  4. Run `pnpm install` at root level

### 2.1.2 Restructure web apps into monorepo
- **Sub-tasks**:
  1. Move `frontend/Vidhyam/` → `apps/vidhyam/`
  2. Move `frontend/SuperAdmin/` → `apps/super-admin/`
  3. Create `apps/marketing/` placeholder for Phase 6
  4. Update each app's `package.json` name to `@modernschool/vidhyam`, `@modernschool/super-admin`
  5. Update Vite proxy configs to point to backend (may need relative path adjustments)
  6. Verify both apps still build: `pnpm --filter @modernschool/vidhyam build`

### 2.1.3 Create shared packages
- **Sub-tasks**:
  1. Create `packages/ui/` — shared component library
     - `package.json` with name `@modernschool/ui`
     - Vite library mode config
     - Export all shared components (GlassCard, PageHeader, EmptyState, etc.)
  2. Create `packages/design-tokens/` — shared design tokens
     - `package.json` with name `@modernschool/design-tokens`
     - Export CSS custom properties, Tailwind preset, color constants
  3. Create `packages/api-client/` — shared API client
     - `package.json` with name `@modernschool/api-client`
     - Axios/fetch-based client with interceptors, auth, error handling
     - Auto-generated types from OpenAPI spec (future)
  4. Create `packages/types/` — shared TypeScript types
     - `package.json` with name `@modernschool/types`
     - Shared interfaces for Student, Employee, Fee, Attendance, etc.
  5. Create `packages/utils/` — shared utilities
     - `package.json` with name `@modernschool/utils`
     - Date formatting, currency formatting, validators, etc.
  6. Each package gets: `tsconfig.json`, `vite.config.ts` (if lib), proper `exports` field

### 2.1.4 Migrate shared code into packages
- **Sub-tasks**:
  1. Extract `GlassCard` from both Vidhyam and SuperAdmin → `packages/ui/src/GlassCard.tsx`
  2. Extract `PageHeader` from both → `packages/ui/src/PageHeader.tsx`
  3. Extract `EmptyState` from both → `packages/ui/src/EmptyState.tsx`
  4. Extract `StandardButton` from both → `packages/ui/src/StandardButton.tsx`
  5. Extract `Sidebar` patterns → `packages/ui/src/Sidebar.tsx`
  6. Extract `SpotlightSearch` → `packages/ui/src/SpotlightSearch.tsx`
  7. Extract API base from `Vidhyam/src/app/api/baseApi.js` → `packages/api-client/src/index.ts`
  8. Extract theme constants from `Vidhyam/src/utils/theme.js` → `packages/design-tokens/src/colors.ts`
  9. Update all imports in Vidhyam and SuperAdmin to use `@modernschool/*` packages
  10. Verify both apps build and run correctly

---

## 2.2 Flutter Monorepo Migration (Melos)

### 2.2.1 Initialize Melos workspace
- **Sub-tasks**:
  1. Create root `melos.yaml`:
     ```yaml
     name: modernschool
     packages:
       - apps/*
       - packages/**
     command:
       bootstrap:
         runPubGetInParallel: false
     scripts:
       analyze:
         run: melos exec -- dart analyze
       build:
         run: melos exec -- flutter build apk
         packageFilters:
           dirExists: android
     ```
  2. Create root `pubspec.yaml` with melos dependency
  3. Run `melos bootstrap`

### 2.2.2 Create shared Dart packages
- **Sub-tasks**:
  1. Create `packages/modernschool_ui/` — shared Flutter widgets
     - `GlassCard`, `EmptyState`, `SkeletonLoader`, `PullToRefresh`
     - `AnimatedGradientBg` (shared between employee and chatra)
  2. Create `packages/modernschool_api/` — shared API client
     - Dio-based HTTP client with interceptors
     - Auth token management
     - Error handling
     - Replace both `api_service.dart` files with this shared package
  3. Create `packages/modernschool_theme/` — shared theme
     - `AppTheme` class with light/dark themes
     - `AppColors` constants
     - Standardized text styles
  4. Create `packages/modernschool_models/` — shared data models
     - Student, Employee, Fee, Attendance, etc.
     - JSON serialization with `json_serializable`
  5. Create `packages/modernschool_auth/` — shared auth logic
     - Firebase auth integration
     - Token storage with `flutter_secure_storage`
     - Auth BLoC with shared events/states

### 2.2.3 Restructure employee app to feature-based architecture
- **Current**: `Apps/employee/lib/screens/` (flat structure)
- **Target**: Match chatra's feature-based structure
- **Sub-tasks**:
  1. Create feature directories:
     - `lib/features/auth/` (move `login_screen.dart`)
     - `lib/features/dashboard/` (move `screens/dashboards/`)
     - `lib/features/attendance/` (move `screens/teacher/attendance_screen.dart`)
     - `lib/features/classroom/` (move `screens/teacher/classroom_hub_screen.dart`)
     - `lib/features/leave/` (move `screens/teacher/leave_management_screen.dart`)
     - `lib/features/responsibility/` (move `screens/responsibility/`)
     - `lib/features/transport/` (move `screens/dashboards/driver_dashboard.dart`)
     - `lib/features/ai/` (move `screens/ai/`)
     - `lib/features/community/` (move `screens/community/`)
     - `lib/features/management/` (move `screens/management/`)
  2. Move BLoC files from `lib/blocs/` into respective feature directories
  3. Update all import paths
  4. Update `app_router.dart` with new paths
- **Verification**: App compiles and runs with new structure

### 2.2.4 Migrate shared code into Dart packages
- **Sub-tasks**:
  1. Move `GlassCard` from both apps → `packages/modernschool_ui/lib/src/glass_card.dart`
  2. Move `EmptyState` from chatra → `packages/modernschool_ui/lib/src/empty_state.dart`
  3. Move `SkeletonLoader` from chatra → `packages/modernschool_ui/lib/src/skeleton_loader.dart`
  4. Move `AnimatedGradientBg` from both → `packages/modernschool_ui/lib/src/animated_gradient_bg.dart`
  5. Move `AppTheme` from both → `packages/modernschool_theme/lib/src/app_theme.dart`
  6. Merge both `api_service.dart` files → `packages/modernschool_api/lib/src/api_client.dart`
  7. Update all imports in both apps
  8. Run `melos analyze` — must pass with zero errors

---

## 2.3 Backend Standardization

### 2.3.1 Standardize error handling
- **Sub-tasks**:
  1. Audit `Backend/src/error.rs` — ensure all error variants are covered
  2. Create standardized error response format:
     ```json
     {
       "error": {
         "code": "VALIDATION_ERROR",
         "message": "Human readable message",
         "details": {}
       }
     }
     ```
  3. Ensure all route handlers use the standardized error type
  4. Add error codes enum for frontend error mapping

### 2.3.2 Standardize API response format
- **Sub-tasks**:
  1. Audit `Backend/src/response.rs` — ensure consistent response wrapping
  2. Create standard response format:
     ```json
     {
       "data": {},
       "meta": { "page": 1, "per_page": 20, "total": 100 },
       "links": { "next": "...", "prev": "..." }
     }
     ```
  3. Add pagination helper for list endpoints
  4. Ensure all list endpoints return paginated responses

### 2.3.3 Add OpenAPI documentation generation
- **Sub-tasks**:
  1. Add `utoipa` and `utoipa-swagger-ui` dependencies to `Cargo.toml`
  2. Add `#[derive(ToSchema)]` to all request/response types
  3. Add `#[utoipa::path]` annotations to all route handlers
  4. Configure Swagger UI at `/api/docs`
  5. Generate `openapi.json` spec file for frontend type generation

### 2.3.4 Add request validation middleware
- **Sub-tasks**:
  1. Add `validator` derive macros to all request structs
  2. Create validation middleware that returns 422 with field-level errors
  3. Add validation rules: email format, phone format, required fields, length constraints
  4. Ensure all mutation endpoints validate input

### 2.3.5 Consolidate migration files
- **Sub-tasks**:
  1. Create a single canonical `migrations/README.md` documenting migration order
  2. Mark superseded migrations with `.superseded.sql` suffix
  3. Ensure no two migrations create the same table
  4. Add `migrations/validate_migration.sql` improvements
  5. Test on fresh database: `sqlx database create && sqlx migrate run`

---

## 2.4 TypeScript Migration (Web Frontends)

### 2.4.1 Add TypeScript to Vidhyam
- **Sub-tasks**:
  1. Add `typescript` and `@types/react` to devDependencies
  2. Create `tsconfig.json` with strict mode
  3. Rename `.jsx` files to `.tsx` one module at a time (start with shared components)
  4. Add proper type annotations to each converted file
  5. Fix all type errors
  6. Update Vite config for TypeScript support
- **Priority order**: utils → components/ui → features/auth → features/dashboard → remaining

### 2.4.2 Add TypeScript to SuperAdmin
- **Sub-tasks**:
  1. Same process as 2.4.1 but for SuperAdmin
  2. Start with `api.js` → `api.ts`, `config.js` → `config.ts`
  3. Convert pages one by one

---

## 2.5 Development Environment Standardization

### 2.5.1 Create root-level development scripts
- **Sub-tasks**:
  1. Create `scripts/dev.sh` (or `.ps1` for Windows) that starts all services:
     - PostgreSQL + Redis (Docker)
     - Backend (cargo run)
     - Vidhyam (pnpm dev)
     - SuperAdmin (pnpm dev)
  2. Create `scripts/build.sh` that builds everything
  3. Create `scripts/test.sh` that runs all tests
  4. Create `scripts/lint.sh` that runs all linters

### 2.5.2 Add pre-commit hooks
- **Sub-tasks**:
  1. Add `husky` + `lint-staged` to root package.json
  2. Configure lint-staged:
     - `*.{ts,tsx}` → eslint + prettier
     - `*.rs` → rustfmt + clippy
     - `*.dart` → dart format + dart analyze
  3. Add commit message linting with `commitlint`

### 2.5.3 Add ESLint + Prettier configuration
- **Sub-tasks**:
  1. Create root `.eslintrc.js` with shared rules
  2. Create root `.prettierrc` with shared formatting
  3. Add `eslint-config-prettier` to disable conflicting rules
  4. Configure per-app overrides if needed

### 2.5.4 Add CI pipeline
- **Sub-tasks**:
  1. Create `.github/workflows/ci.yml`:
     - Lint (ESLint, clippy, dart analyze)
     - Type check (tsc, cargo check)
     - Test (jest, cargo test, flutter test)
     - Build (all apps)
  2. Add branch protection rules
  3. Add status checks requirement for PRs

---

## Exit Criteria

- [ ] Turborepo workspace is set up with pnpm
- [ ] Both web apps build from monorepo: `pnpm build`
- [ ] At least 3 shared packages exist: `@modernschool/ui`, `@modernschool/design-tokens`, `@modernschool/api-client`
- [ ] Melos workspace is set up for Flutter
- [ ] At least 2 shared Dart packages exist: `modernschool_ui`, `modernschool_api`
- [ ] Employee app uses feature-based architecture
- [ ] Backend has OpenAPI docs at `/api/docs`
- [ ] Backend has standardized error and response formats
- [ ] TypeScript is added to both web frontends (at least shared code is typed)
- [ ] Pre-commit hooks are configured
- [ ] CI pipeline runs on every PR
