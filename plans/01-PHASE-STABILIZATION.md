# Phase 1: Stabilization & Bug Fixes

> **Goal**: Eliminate ALL compilation errors, broken imports, deprecation warnings, and critical bugs across every sub-project. The codebase must compile and run cleanly before any architectural changes begin.

---

## 1.1 Chatra Flutter App — Compilation Blockers

### 1.1.1 Delete `fix_imports_v3.dart`
- **File**: `Apps/chatra/lib/fix_imports_v3.dart`
- **Issue**: 6 type errors where `dynamic Function(dynamic)` is assigned to `String` parameter (lines 30-35)
- **Action**: Delete this file entirely — it is a one-time migration script that has been run and is no longer needed
- **Verification**: `flutter analyze` must show 0 errors from this file

### 1.1.2 Fix `dashboard_stats_widget.dart` broken imports
- **File**: `Apps/chatra/lib/features/home/widgets/dashboard_stats_widget.dart`
- **Issue**: Imports `../../widgets/glass_card.dart` and `../../theme/app_theme.dart` — both paths do not exist from this location
- **Sub-tasks**:
  1. Determine correct relative path to `Apps/chatra/lib/widgets/glass_card.dart` → `../../../widgets/glass_card.dart`
  2. Determine correct relative path to `Apps/chatra/lib/theme/app_theme.dart` → `../../../theme/app_theme.dart`
  3. Replace `import '../../widgets/glass_card.dart'` with `import '../../../widgets/glass_card.dart'`
  4. Replace `import '../../theme/app_theme.dart'` with `import '../../../theme/app_theme.dart'`
  5. Fix all `GlassCard()` calls — verify the class name matches the export from `glass_card.dart`
  6. Fix all `AppColors` references — verify `AppColors` is exported from `app_theme.dart`; if not, add the `AppColors` class definition to `app_theme.dart` with the standard color constants
- **Verification**: File compiles with zero errors

### 1.1.3 Fix `timetable_widget.dart` broken imports
- **File**: `Apps/chatra/lib/features/home/widgets/timetable_widget.dart`
- **Issue**: Same broken import paths as dashboard_stats_widget
- **Sub-tasks**:
  1. Replace `import '../../widgets/glass_card.dart'` with `import '../../../widgets/glass_card.dart'`
  2. Replace `import '../../theme/app_theme.dart'` with `import '../../../theme/app_theme.dart'`
  3. Fix all `GlassCard()` and `AppColors` references
- **Verification**: File compiles with zero errors

### 1.1.4 Fix `spotlight_search_widget.dart` broken imports
- **File**: `Apps/chatra/lib/features/home/widgets/spotlight_search_widget.dart`
- **Issue**: Broken import for `../../theme/app_theme.dart`
- **Sub-tasks**:
  1. Replace `import '../../theme/app_theme.dart'` with `import '../../../theme/app_theme.dart'`
  2. Fix all `AppColors` references
- **Verification**: File compiles with zero errors

### 1.1.5 Ensure `AppColors` class exists in `app_theme.dart`
- **File**: `Apps/chatra/lib/theme/app_theme.dart`
- **Action**: If `AppColors` is not defined, add it with these constants:
  ```dart
  class AppColors {
    static const Color primary = Color(0xFF6366F1);
    static const Color primaryLight = Color(0xFF818CF8);
    static const Color primaryDark = Color(0xFF4F46E5);
    static const Color accent = Color(0xFF06B6D4);
    static const Color success = Color(0xFF059669);
    static const Color warning = Color(0xFFD97706);
    static const Color error = Color(0xFFDC2626);
    static const Color textPrimary = Color(0xFF1E293B);
    static const Color textSecondary = Color(0xFF64748B);
    static const Color surface = Color(0xFFF8FAFC);
    static const Color cardBackground = Color(0xFFFFFFFF);
    static const Color border = Color(0xFFE2E8F0);
  }
  ```
- **Verification**: All files referencing `AppColors` compile successfully

---

## 1.2 Chatra Flutter App — Deprecation Warnings

### 1.2.1 Replace all `withOpacity` calls with `withValues`
- **Scope**: 50+ occurrences across the entire chatra app
- **Pattern**: `Color.withOpacity(0.XX)` → `Color.withValues(alpha: 0.XX)`
- **Files affected** (from analysis output):
  - `lib/features/academic/screens/academic_vault_screen.dart` (3 occurrences)
  - `lib/features/announcement/screens/announcement_screen.dart` (3 occurrences)
  - `lib/features/attendance/screens/attendance_calendar_screen.dart` (6 occurrences)
  - `lib/features/auth/screens/login_screen.dart` (10 occurrences)
  - `lib/features/classroom/screens/classroom_screen.dart` (4 occurrences)
  - `lib/features/dashboard/screens/account_screen.dart` (3 occurrences)
  - `lib/features/fees/screens/fees_screen.dart` (7 occurrences)
  - `lib/features/home/screens/home_screen.dart` (10 occurrences)
  - `lib/features/home/widgets/dashboard_stats_widget.dart` (1 occurrence)
  - `lib/features/home/widgets/personalized_greeting.dart` (2 occurrences)
  - `lib/features/home/widgets/spotlight_search_widget.dart` (4 occurrences)
  - `lib/features/home/widgets/timetable_widget.dart` (0 — already fixed by import fix)
  - `lib/features/live/screens/live_classroom_screen.dart` (4 occurrences)
  - `lib/features/transport/screens/bus_tracking_screen.dart` (3 occurrences)
  - `lib/intro_screen.dart` (1 occurrence)
  - `lib/navbar_screen.dart` (2 occurrences)
  - `lib/widgets/account/personal_details_widget.dart` (0 — unused import only)
  - `lib/widgets/account/profile_header_widget.dart` (1 occurrence)
  - `lib/widgets/account/settings_widget.dart` (2 occurrences)
  - `lib/widgets/common/empty_state.dart` (6 occurrences)
  - `lib/widgets/common/skeleton_loader.dart` (2 occurrences)
  - `lib/widgets/glass_card.dart` (3 occurrences)
- **Action**: For each file, find-and-replace `.withOpacity(` → `.withValues(alpha: ` and close the parenthesis correctly
- **Verification**: `flutter analyze` shows zero `deprecated_member_use` warnings

### 1.2.2 Fix deprecated `setMapStyle` in bus_tracking_screen.dart
- **File**: `Apps/chatra/lib/features/transport/screens/bus_tracking_screen.dart` line 70
- **Issue**: `setMapStyle` is deprecated; use `GoogleMap.style` instead
- **Action**: Replace `controller.setMapStyle(mapStyle)` with assigning style to the `GoogleMap` widget's `style` parameter
- **Verification**: No deprecation warning for this file

---

## 1.3 Chatra Flutter App — Unused Imports & Code

### 1.3.1 Remove unused imports
- **Files and specific imports to remove**:
  - `announcement_screen.dart`: Remove `package:go_router/go_router.dart`
  - `announcement_screen.dart`: Remove `package:chatra/features/announcement/bloc/announcement_event.dart`
  - `announcement_screen.dart`: Remove `package:chatra/features/announcement/bloc/announcement_state.dart`
  - `classroom_screen.dart`: Remove `package:chatra/features/classroom/bloc/classroom_event.dart`
  - `classroom_screen.dart`: Remove `package:chatra/features/classroom/bloc/classroom_state.dart`
  - `classroom_screen.dart`: Remove `package:chatra/widgets/common/skeleton_loader.dart`
  - `account_screen.dart`: Remove `dart:convert`
  - `account_screen.dart`: Remove `package:chatra/widgets/glass_card.dart`
  - `home_screen.dart`: Remove `package:go_router/go_router.dart`
  - `home_screen.dart`: Remove `package:chatra/features/auth/bloc/auth_bloc.dart`
  - `home_screen.dart`: Remove `package:chatra/features/auth/bloc/auth_event.dart`
  - `home_screen.dart`: Remove `package:chatra/features/home/widgets/personalized_greeting.dart`
  - `personalized_greeting.dart`: Remove `package:google_fonts/google_fonts.dart`
  - `skeleton_loader.dart`: Remove `package:flutter_animate/flutter_animate.dart`
  - `personal_details_widget.dart`: Remove `../../theme/app_theme.dart`
  - `main.dart`: Remove `dart:io`

### 1.3.2 Remove unused declarations
- `home_screen.dart`: Remove or connect `_buildActionButton` method (line 290)
- `skeleton_loader.dart`: Remove unused `key` parameter from constructor (line 41)

### 1.3.3 Fix unnecessary non-null assertions
- `announcement_screen.dart` line 38: Remove `!` from non-nullable receiver
- `classroom_screen.dart` line 39: Remove `!` from both non-nullable receivers

### 1.3.4 Fix unnecessary casts
- `leave_bloc.dart` lines 104, 125: Remove unnecessary cast operations

### 1.3.5 Remove unnecessary imports
- `classroom_screen.dart`: Remove `package:chatra/features/classroom/bloc/classroom_event.dart` and `classroom_state.dart` (already covered by `classroom_bloc.dart` export)

---

## 1.4 Employee Flutter App — Bug Fixes

### 1.4.1 Audit and fix import paths
- **Action**: Run `flutter analyze` on `Apps/employee/` and catalog all warnings/errors
- **Sub-tasks**:
  1. Run `cd Apps/employee && flutter analyze 2>&1 > analysis_output.txt`
  2. Parse output for errors and warnings
  3. Fix each error following the same pattern as chatra fixes
- **Verification**: `flutter analyze` returns zero errors

### 1.4.2 Verify API service connectivity
- **File**: `Apps/employee/lib/api_service.dart`
- **Action**: Verify the base URL configuration matches the backend, ensure `.env` file exists with correct `API_BASE_URL`
- **Verification**: App can connect to backend on launch

---

## 1.5 Backend — Rust Compilation & Warnings

### 1.5.1 Remove `#![allow(unused)]` from main.rs
- **File**: `Backend/src/main.rs` line 1
- **Issue**: This suppresses ALL unused warnings, hiding potential bugs
- **Action**: Remove the `#![allow(unused)]` attribute
- **Sub-tasks**:
  1. Remove the attribute
  2. Run `cargo build` and catalog all new warnings
  3. Fix each warning by either using the item or prefixing with `#[allow(unused)]` individually with a TODO comment
- **Verification**: `cargo build` succeeds with zero warnings or only explicitly allowed ones

### 1.5.2 Clean up duplicate migration files
- **Issue**: Multiple migration files with overlapping concerns:
  - `202603110009_create_audit_logs.sql` AND `20260311110009_create_audit_logs.sql` AND `20260311144745_recreate_audit_logs.sql`
  - `20260311180017_add_vector_extension_and_ai_tables.up.sql` AND `20260311180017_add_vector_extension_and_ai_tables.sql` AND `20260311180051_add_vector_extension_and_ai_tables.sql`
  - `20260311181404_add_ai_chat_history_table.sql` AND `20260311181458_add_ai_chat_history_table.sql`
  - `202604110002_enhanced_audit_logging.sql` AND `202604110002_enhanced_audit_logging_complete.sql`
- **Action**:
  1. Identify which migration files have actually been applied (check `_sqlx_migrations` table)
  2. Mark duplicate/unused migration files by renaming with `.bak` suffix
  3. Document which migrations are canonical in a `migrations/README.md`
- **Verification**: `sqlx migrate run` succeeds without conflicts on a fresh database

### 1.5.3 Verify all API routes compile and respond
- **Action**: Run the existing API test suite
- **Sub-tasks**:
  1. Start backend: `cd Backend && docker compose up -d`
  2. Run health tests: `node api-tests/run-health-tests.js`
  3. Catalog any failing endpoints
  4. Fix each failing endpoint
- **Verification**: All health check endpoints return 200

---

## 1.6 Frontend Vidhyam — Bug Fixes

### 1.6.1 Fix duplicate `infrastructureApi.js`
- **Issue**: `frontend/Vidhyam/src/features/infrastructure/infrastructureApi.js` exists at root level AND inside `api/` subdirectory
- **Action**: Delete the root-level duplicate `infrastructureApi.js`; keep only `api/infrastructureApi.js`
- **Verification**: All imports resolve correctly

### 1.6.2 Audit for console errors
- **Action**: Start the dev server and navigate all routes, cataloging console errors
- **Sub-tasks**:
  1. `cd frontend/Vidhyam && npm run dev`
  2. Open browser DevTools console
  3. Navigate to each route in the sidebar
  4. Document all errors and warnings
  5. Fix each error
- **Verification**: Zero console errors on all routes

### 1.6.3 Fix Redux store configuration
- **File**: `frontend/Vidhyam/src/app/store.js`
- **Action**: Verify all slice reducers are properly registered; ensure no slice is missing
- **Verification**: Redux DevTools shows correct state tree

---

## 1.7 Frontend SuperAdmin — Bug Fixes

### 1.7.1 Fix CSP headers for development
- **File**: `frontend/SuperAdmin/index.html`
- **Issue**: CSP allows `unsafe-inline` and `unsafe-eval` which is insecure
- **Action**: For development only, keep current CSP. Add a separate production CSP that removes `unsafe-inline` and `unsafe-eval`
- **Sub-tasks**:
  1. Create `frontend/SuperAdmin/index.html` with strict CSP for production
  2. Create `frontend/SuperAdmin/index.dev.html` with relaxed CSP for development
  3. Configure Vite to use `index.dev.html` in dev mode
- **Verification**: Production build has strict CSP; dev server works with relaxed CSP

### 1.7.2 Audit for missing error boundaries
- **Action**: Add React ErrorBoundary wrapper to the SuperAdmin App.jsx
- **Verification**: App doesn't white-screen on component errors

---

## 1.8 Chrome Extension — Basic Fixes

### 1.8.1 Verify manifest.json validity
- **File**: `modernschoolextension/manifest.json`
- **Action**: Read and validate the manifest against Chrome Extension Manifest V3 spec
- **Sub-tasks**:
  1. Verify `manifest_version` is 3
  2. Verify `permissions` are minimal
  3. Verify `host_permissions` match the backend API
  4. Fix any invalid fields
- **Verification**: Extension loads in Chrome without errors

### 1.8.2 Fix content script injection
- **File**: `modernschoolextension/content.js`
- **Action**: Verify the content script correctly identifies form fields on the Vidhyam admin portal
- **Verification**: Extension can auto-fill student/employee forms

---

## 1.9 Cross-Project — Integration Verification

### 1.9.1 End-to-end smoke test
- **Action**: Run all services and verify basic flows
- **Sub-tasks**:
  1. Start PostgreSQL and Redis: `cd Backend && docker compose up -d`
  2. Start Backend: `cargo run`
  3. Start Vidhyam: `cd frontend/Vidhyam && npm run dev`
  4. Start SuperAdmin: `cd frontend/SuperAdmin && npm run dev`
  5. Test login flow on Vidhyam
  6. Test login flow on SuperAdmin
  7. Test API health endpoint
  8. Document any failures
- **Verification**: All services start and basic flows work

### 1.9.2 Create stabilization report
- **Action**: Write a `STABILIZATION-REPORT.md` documenting:
  1. All bugs found and fixed
  2. All warnings resolved
  3. Remaining known issues (if any)
  4. Verification results
- **Output**: `plans/STABILIZATION-REPORT.md`

---

## Exit Criteria

- [ ] `flutter analyze` on chatra returns ZERO errors and ZERO warnings
- [ ] `flutter analyze` on employee returns ZERO errors and ZERO warnings
- [ ] `cargo build` on Backend succeeds with zero warnings (or only explicitly allowed)
- [ ] All Vidhyam routes load without console errors
- [ ] All SuperAdmin routes load without console errors
- [ ] Chrome extension loads in Chrome without errors
- [ ] End-to-end smoke test passes
- [ ] Stabilization report is written
