# Advanced AI & Semantic Caching Task List

## Phase 1: Database Migration (Vector Database & Cache Table)
- [x] **Auth Module Upgrade**
  - [x] Create Redux Auth Slice and Store integration
  - [x] Implement RTK Query Base API & Auth Endpoints
  - [x] Refactor Login, Setup, and Session Handling
- [x] **Enterprise Billing & Fees Upgrade**
  - [x] RTK Query Migration for performance
  - [x] Tailwind CSS & Glassmorphism UI Refactor
  - [x] Razorpay Online Payment Integration
  - [x] Super Admin SaaS Billing Automation
- [x] Create database migration for `pgvector` extension.
- [x] Create `ai_query_cache` table for semantic caching.
- [x] Create `document_embeddings` table for RAG.
- [x] Implement Row-Level Security (RLS) policies using `app.current_school_id` on new tables.
- [x] Run and verify SQLx migrations (Using REAL[] fallback for Windows).

## Phase 2: Rust Backend - Semantic Caching and Text-to-SQL
- [x] Implement vector (Cosine Similarity) search logic against `ai_query_cache` for Cache Hits.
- [x] Update Gemini AI prompt in `ai_orchestrator.rs` to generate Text-to-SQL dynamic queries (Cache Miss).
- [x] Integrate RLS-secured SQL execution via `with_tenant_tx` in the AI logic.
- [x] Create background worker jobs in [background_jobs.rs](file:///C:/Users/ok/modernisum/Ai-school/Backend/src/background_jobs.rs) to save new queries and vectors to the cache.

## Phase 3: NotebookLM-like RAG (Document Research)
- [x] Hook background OCR extraction to document upload events.
- [x] Implement text chunking and vector embedding logic for extracted text.
- [x] Create `search_school_documents` tool for the AI to perform vector searches on documents.

## Phase 4: Removing Limitations & Multimodal Output
- [x] Remove the hardcoded 3-turn limit in `ai_orchestrator.rs`.
- [x] Implement structured chat history persistence (Redis/DB).
- [x] Integrate flexible output formats (e.g., dynamic PDF/quizzes).
- [x] Fix bulk_import_spaces logic error (calling create_announcement)
- [x] Improve error handling in get_school_details and get_setup (404 on Not Found)

## Phase 5: Students & Employees Module Refactor (Technical Debt resolution)
- [x] Refactor Student Profile
    - [x] Create modular components: `IdentitySection`, `DocumentsSection`, `AttendanceCalendar`, `FeesTimeline`
    - [x] Add RTK Query endpoints to `studentApi.js`
    - [x] Update `studentprofile.jsx` to use modular components and RTK Query
- [x] Refactor Payroll Management
    - [x] Add payroll/emppay endpoints to `employeeApi.js`
    - [x] Fix hardcoded URLs and integrate `useGetEmployeesQuery` in `payroll.jsx`
- [x] Backend route completions for standard parity
    - [x] Add `close_month` route in `emppay.rs`
    - [x] Add student-specific filtering in `award.rs`, `documentbox.rs`, and exams

## Phase 5: Infrastructure Module Upgrade (Enterprise Standards)
- [x] Refactor `complain.jsx` with RTK Query and GCS support.
- [x] Refactor `space.jsx` with Framer Motion Accordion and RTK Query.
- [x] Refactor `schoolprofile.jsx` with Billing V2 sync and Premium UI.
- [x] Verify visual and functional integrity via browser.
  - [x] Fix backend 500 Internal Server Error (School Profile)
  - [x] Verify Spaces API 404 Resolution
  - [x] Proof of work: Visual confirmation with valid school data

## Phase 6: Vidhyam V3.0 Ultimate Upgrade (Technical Debt & Unfinished Features)
- [x] **Academics & Documents Frontend Cleanup**
  - [x] Migrate `Materials` (inventory) and `Holidays` (calendar) to RTK Query.
  - [x] Move `upload.jsx` to a consistent location, apply API prefix, and refactor routing.
  - [x] Perfectly integrate GCS Signed URLs into frontend document uploads.
- [x] **Global React Performance & Security**
  - [x] Implement a Global Error Boundary to prevent white-screen crashes.
  - [x] Optimize heavy forms (`addstudent.jsx`, `employeeform.jsx`) with `useMemo` for low-end device performance.
- [x] **Advanced AI and Automation UI**
  - [x] Build the "Generate Timetable" UI frontend on top of `timetable_engine.rs`.
  - [x] Create Developer Portal & Webhooks UI in `schoolprofile.jsx` for third-party integrations (API Keys, Tally/WhatsApp bots).

## Phase 7: Vidhyam Employee App V3.0 (Flutter BLoC Migration)
- [x] **Base Setup & Architecture**
  - [x] Add `android.permission.INTERNET` to AndroidManifest.xml.
  - [x] Migrate [pubspec.yaml](file:///c:/Users/ok/modernisum/Ai-school/Apps/chatra/pubspec.yaml) from `provider` to `flutter_bloc` & `equatable`.
  - [x] Implement Premium UI ThemeData ("Cotton candy skies" & Glassmorphism).
- [x] **Role-Based Dynamic Routing & Auth**
  - [x] Refactor Auth flow using [AuthBloc](file:///c:/Users/ok/modernisum/Ai-school/Apps/chatra/lib/logic/auth/auth_bloc.dart#6-42).
  - [x] Parse `employee_type` to route Teachers, Drivers, Peons, and Management to unique dashboards.
- [x] **Teacher Dashboard**
  - [x] Live Attendance Marking (`AttendanceBloc`).
  - [x] Timetable & Routine UI.
  - [x] Leave Management (Apply & View PDF).
- [x] **Driver Dashboard (Transport)**
  - [x] Simple UI with "Start Trip" button.
  - [x] Live GPS Streaming via WebSockets/Redis (`TransportBloc`).
- [x] **Peon / Support Staff Dashboard**
  - [x] Task & Responsibilities View.
  - [x] Inventory Delivery List.
- [x] **Management Dashboard**
  - [x] Leave Approvals UI.
  - [x] Live Announcements / Notice broadcast.
- [x] **Common Features**
  - [x] Salary & Payroll UI (Salary slip breakdown view).
  - [x] Real-time Notifications (WebSockets).

## Phase 8: Performance & Routing Optimization (V3.1)
- [x] **UI Lazy Loading (Dart Deferred Imports) ⚡**
  - [x] Implement deferred imports for Teacher, Driver, Peon, and Management Dashboards to save RAM.
- [x] **On-Demand BLoC Initialization (Lazy Injection) 🧠**
  - [x] Refactor BLoC creation so role-specific BLoCs (e.g., `TransportBloc`) are only injected when their respective role is authenticated.
- [x] **Strict Role-Based Router (`go_router`) 🛡️**
  - [x] Add `go_router` dependency to [pubspec.yaml](file:///c:/Users/ok/modernisum/Ai-school/Apps/chatra/pubspec.yaml).
  - [x] Replace custom [AppRouter](file:///c:/Users/ok/modernisum/Ai-school/Apps/chatra/lib/router/app_router.dart#10-54) with [GoRouter](file:///c:/Users/ok/modernisum/Ai-school/Apps/chatra/lib/router/app_router.dart#55-71).
  - [x] Implement secure `redirect` logic based on `employee_type` to block unauthorized access.

## Phase 9: Refined Teacher Dashboard (Premium Experience)
- [x] **Smart "Swipe-to-Attend" & Holiday Guard 📅**
  - [x] Implement Glassmorphism Toggle Grid / Swipe-to-Mark UI for attendance.
  - [x] Add Holiday Guard logic to check for Sundays/Holidays before allowing attendance.
  - [x] Connect to `POST /api/operations/attendance/` endpoints.
- [x] **Leave Management & PDF integration 📄**
  - [x] Refactor Leave apply form with backend integration.
  - [x] Implement Native PDF Viewer / Download for approved leave letters.
- [x] **AI Timetable Vertical Timeline ⏳**
  - [x] Build a modern Vertical Timeline view for the daily routine.
  - [x] Fetch and display today's routine from `timetable_engine` backend.

## Phase 10: Ultra-Advanced LMS Hub (Teacher Powerhouse)
- [x] **Privacy & Access Isolation (Teacher-Student Bound) 🛡️**
  - [x] Implement `My Classes` fetch based on `class_periods` and `employee_id`.
  - [x] Create `ClassroomDetails` view limited to assigned students.
- [x] **Smart Attendance "Override" Logic (Leave Guard) 📅**
  - [x] Add `ClassTeacher` identity check.
  - [x] Implement backend-driven unlock for Subject Teachers if Class Teacher is on `Approved` leave.
- [x] **Classroom Dashboard (Interaction Hub) 🎓**
  - [x] **Real-time Hub**: WebSocket + GCS messaging integration.
  - [x] **AI Exams**: Integration with `POST /academic/generate-paper`.
  - [x] **Task Engine**: Homework assignment and verification (0-100% progress).
- [x] **Digital Staff Room (Community Tab) ☕**
  - [x] Add "Community" tab to Bottom Navigation.
  - [x] Implement Redis Pub/Sub powered global staff chat.

## Phase 11: AI-Powered "Pro" Teacher Tools (Handwritten OCR & Predictive Radar)
- [x] **Smart Scanner & OCR Auto-Grader 📸🤖**
  - [x] Implement camera interface for capturing handwritten documents.
  - [x] Connect to `POST /api/ocr-routes/extract` and `POST /api/ai/:schoolId/query` for grading.
- [x] **Predictive "At-Risk Student" Radar 🚨**
  - [x] Integrate `student_risk_profiles` with the Classroom Hub.
  - [x] Add visual Radar/Alerts for students with high risk scores (>60).
- [x] **Mobile AI Assistant (NotebookLM Experience) 🎙️📊**
  - [x] Add Floating AI Button with Glassmorphism styles.
  - [x] Implement voice/text query interface connected to backend toolset.
- [x] **Discipline & Document Vault 📂**
  - [x] Add "Quick Complain" action with student-ID binding.
  - [x] Implement GCS-backed document upload for `document_box`.

## Phase 12: Visual & Predictive Pedagogy (Salary Charts & Living Syllabus)
- [x] **Animated Salary Analytics 📊**
  - [x] Add `fl_chart` dependency to [pubspec.yaml](file:///c:/Users/ok/modernisum/Ai-school/Apps/chatra/pubspec.yaml).
  - [x] Implement `SalaryHistoryScreen` with animated Line/Bar charts.
  - [x] Connect to `salary-breakdown` API mock.
- [x] **Deep AI "Risk Radar" (Failure Diagnosis) 🎯🤖**
  - [x] Expand `RiskRadar` to show detailed failure diagnosis (Missed tests, Attendance gaps).
  - [x] Implement diagnosis modal using `student_risk_profiles`.
- [x] **Smart Syllabus & Topic Tracker 📚**
  - [x] Create `SyllabusTracker` widget with `chapters` and `topics`.
  - [x] Implement swipe-to-complete action for real-time progress updates.
- [x] **Live Classroom Streaming (One-Tap Broadcast) 🎥**
  - [x] Add "Go Live" action to Classroom Hub.
  - [x] Implement WebSocket-based broadcast triggers for the student app.

## Phase 13: Continuous Smart Vision AI (Hands-Free Copy Scanning)
- [x] **Continuous Auto-Capture Mode 📸🔄**
  - [x] Implement hands-free "Auto-Scan" toggle in `SmartScannerScreen`.
  - [x] Add timer/motion-based trigger for 3s interval captures.
- [x] **Smart ID & Unassigned Vault 🗂️**
  - [x] Create `UnassignedCopiesScreen` for manual ID binding.
  - [x] Simulate backend OCR-based roll number extraction logic.
- [x] **AI Auto-Grader with Reasoning 🤖✅**
  - [x] Implement "AI Reasoning" view in the grading result modal.
  - [x] Connect grading overrides to `audit_logs` simulation.
- [x] **Transparency Audit & Override 🔍**
  - [x] Add "View AI Logic" button to results.
  - [x] Implement manual mark override with teacher signature.

## Phase 14: Local Upgrade & Security Master Plan (Production Readiness)
- [x] **Flutter: Environment & Permissions 📱**
  - [x] Integrate `flutter_dotenv` for dynamic API URLs.
  - [x] Update [AndroidManifest.xml](file:///c:/Users/ok/modernisum/Ai-school/Apps/chatra/android/app/src/main/AndroidManifest.xml) with Camera, GPS, and Storage permissions.
  - [x] Refactor [api_service.dart](file:///c:/Users/ok/modernisum/Ai-school/Apps/chatra/lib/api_service.dart) to use `.env`.
- [x] **Rust: Security & Auth Hardening 🛡️**
  - [x] Move JWT Secrets to `.env`.
  - [x] Reduce token TTL from 10 years to 7 days.
  - [x] Implement Dev-only OTP terminal logger.
  - [x] Stabilize Backend Build (resolved trait & macro errors)
- [x] PostgreSQL Row-Level Security (RLS) - Middleware & DbClient integration
- [x] Axum Middleware for tenant isolation using school session variables.
  - [x] Enforce data isolation at the DB layer to prevent leakage.
- [x] **Admin Dashboard Optimization 🚀**
  - [x] Create high-speed SQL-backed `/api/dashboard/stats` route.
  - [x] Replace client-side aggregation with server-side metrics.

## Phase 15: Enterprise Hardening & UI/UX Perfection 🛡️🎨
- [x] **Security & Critical Hotfixes 🐞**
  - [x] Remove hardcoded credentials hint from Super Admin `Login.jsx`.
  - [x] Connect "Upcoming Notices" in `home.jsx` to live API.
  - [x] Standardize `FeesListAndPayment.jsx` styling (Tailwind conversion).
- [x] **Architectural & Performance Refactor 🚀**
  - [x] Implement Redux caching for Students/Employees in `fees.jsx`. (Initial pass, finalizing in Phase 17)
  - [x] Refactor Sidebar to use dynamic routing/mapping.
  - [x] Fix modular leakage (hardcoded URLs) in `space.jsx`.
- [x] **Enterprise Automation & Scalability 📈**
  - [x] Implement chunked/streamed exports for Super Admin Backup.
  - [x] Automate support ticket resolution on password reset.
  - [x] Final Performance Audit: Remove anti-patterns and unused imports.
- [x] **Premium "Cotton Candy Skies" UI 🎨 (Performance Audit)**
  - [x] Ensure `BackdropFilter` and Animations remain lightweight alongside the new architecture.

## Phase 16: Future-Ready Enterprise Features 🚀
- [x] **AI Churn Prediction Radar (Super Admin) 🧠**
  - [x] Implement Churn API in [super_admin/routes.rs](file:///C:/Users/ok/modernisum/Ai-school/Backend/src/super_admin/routes.rs).
  - [x] Refine `ChurnRadar` component and add visible triggers.
- [x] **Global 'Spotlight' Search (Cmd + K) 🔍**
  - [x] Create global search API for schools, students, and employees.
  - [x] Implement Spotlight Search with visible triggers.
  - [x] Add search triggers to sidebars.
- [x] **"Live Substitute" AI Auto-Assigner 📅**
  - [x] Add `find_available_substitutes` to Timetable Engine.
  - [x] Integrate proxy suggestions into the leave approval flow.
- [x] **AI Automated Fee Reminders 🤖**
  - [x] Automate polite reminders for high-risk financial profiles.
  - [x] Integration with dashboard notifications (via AI button).
- [x] **Mobile AI Parity Upgrade 📱🤖**
  - [x] Integrated AI Proxy Suggestions into Leave Management.
  - [x] Connected Smart Scanner to real Backend AI & OCR.
  - [x] Implemented Global Spotlight Search (Cmd+K) in Mobile Hub.
- [x] **Final Verification & Walkthrough.**

## Phase 17: Enterprise Hardening & Critical Infrastructure 🛡️🏗️
- [x] **Data Security & Privacy (RLS)**
  - [x] Implement `tenant_isolation_policy` in PostgreSQL.
  - [x] Set `app.current_school_id` in backend request context (Axum Middleware).
- [x] **Performance & State Management**
  - [x] Migrate `payroll.jsx` to RTK Query (`useGetEmployeesQuery`).
  - [x] Migrate `fees.jsx` to RTK Query (`useGetStudentsQuery`).
- [x] **Super Admin Dashboard Optimization**
  - [x] Implement `/api/admin/stats` for SQL-level chart aggregation.
- [x] **Stability & Scalability**
  - [x] Refactor Super Admin Backup to use direct GCS upload or Streamed Exports.

## Phase 18: Advanced Enterprise AI & Engagement 🚀🤖
- [x] **Predictive Analytics & Churn**
  - [x] Implement `analytics_engine.rs` with churn scoring logic.
  - [x] Auto-flag high-risk schools (>50 points logic).
- [x] **Automated Scheduling (CSP Engine)**
  - [x] Implement Greedy CSP in `timetable_engine.rs`.
  - [x] Handle `teacher_availability` and `timetable_rooms` constraints.
- [x] **External Integration (Webhooks)**
  - [x] Build Outbound Webhook Engine with HMAC-SHA256.
  - [x] Implement exponential backoff for retries.
- [x] **Cloud Native Storage (GCS Full Shift)**
  - [x] Implement Pre-signed PUT/GET URLs for all modules (Materials, Complaints, etc).
  - [x] Remove all local file system dependencies for user uploads.

## Phase 19: Chatra App Modernization (Enterprise Upgrade) 📱🚀
- [x] **Step 1: Base Dependencies & Security Fixes**
    - [x] Inject `android.permission.INTERNET` into [AndroidManifest.xml](file:///c:/Users/ok/modernisum/Ai-school/Apps/chatra/android/app/src/main/AndroidManifest.xml).
    - [x] Migrate State Management: Remove `provider`, add `flutter_bloc` and `equatable`.
    - [x] Verify/Ensure `flutter_secure_storage` for auth persistence.
- [x] **Step 2: Premium UI Engine (Cotton Candy Skies)**
    - [x] Configuration of [AppTheme](file:///c:/Users/ok/modernisum/Ai-school/Apps/chatra/lib/theme/app_theme.dart#14-39) with enterprise colors and typography.
    - [x] Implementation of [AnimatedGradientBg](file:///c:/Users/ok/modernisum/Ai-school/Apps/chatra/lib/widgets/animated_gradient_bg.dart#4-11) for dynamic visual energy.
    - [x] Creation of reusable [GlassCard](file:///c:/Users/ok/modernisum/Ai-school/Apps/chatra/lib/widgets/glass_card.dart#5-50) (Glassmorphism) component.
    - [x] Global Integration and verification.
- [x] **Step 3: Role-Based Router & Auth Bloc 🔐**
    - [x] Implement [AuthBloc](file:///c:/Users/ok/modernisum/Ai-school/Apps/chatra/lib/logic/auth/auth_bloc.dart#6-42) (Initial, Loading, Authenticated, Unauthenticated).
    - [x] Refactor [ApiService](file:///c:/Users/ok/modernisum/Ai-school/Apps/chatra/lib/api_service.dart#5-159) for JWT persistence via `flutter_secure_storage`.
    - [x] Integrate `go_router` with [AuthBloc](file:///c:/Users/ok/modernisum/Ai-school/Apps/chatra/lib/logic/auth/auth_bloc.dart#6-42) refresh listenable.
    - [x] Implement Role & Auth Guards (Strict student-only access).
- [x] **Step 4: Ultra-Modern Student Hub (Dashboard) 🎓**
    - [x] Implement [DashboardBloc](file:///c:/Users/ok/modernisum/Ai-school/Apps/chatra/lib/logic/dashboard/dashboard_bloc.dart#6-42) with parallelized API calls.
    - [x] Build Premium Header & Wallet Status.
    - [x] Build Quick Action Grid (Pay Fees, Track Bus, etc).
    - [x] Implementation of Vertical Timetable with "Ongoing" badge.
    - [x] Integrated Attendance Radar using `fl_chart`.
