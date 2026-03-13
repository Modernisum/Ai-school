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
- [x] Update Gemini AI prompt in [ai_orchestrator.rs](file:///C:/Users/ok/modernisum/Ai-school/Backend/src/logic/ai_orchestrator.rs) to generate Text-to-SQL dynamic queries (Cache Miss).
- [x] Integrate RLS-secured SQL execution via `with_tenant_tx` in the AI logic.
- [x] Create background worker jobs in `background_jobs.rs` to save new queries and vectors to the cache.

## Phase 3: NotebookLM-like RAG (Document Research)
- [x] Hook background OCR extraction to document upload events.
- [x] Implement text chunking and vector embedding logic for extracted text.
- [x] Create `search_school_documents` tool for the AI to perform vector searches on documents.

## Phase 4: Removing Limitations & Multimodal Output
- [x] Remove the hardcoded 3-turn limit in [ai_orchestrator.rs](file:///C:/Users/ok/modernisum/Ai-school/Backend/src/logic/ai_orchestrator.rs).
- [x] Implement structured chat history persistence (Redis/DB).
- [x] Integrate flexible output formats (e.g., dynamic PDF/quizzes).
- [x] Fix bulk_import_spaces logic error (calling create_announcement)
- [x] Improve error handling in get_school_details and get_setup (404 on Not Found)

## Phase 5: Students & Employees Module Refactor (Technical Debt resolution)
- [x] Refactor Student Profile
    - [x] Create modular components: `IdentitySection`, `DocumentsSection`, `AttendanceCalendar`, `FeesTimeline`
    - [x] Add RTK Query endpoints to [studentApi.js](file:///C:/Users/ok/modernisum/Ai-school/Vidhyam/src/features/students/api/studentApi.js)
    - [x] Update `studentprofile.jsx` to use modular components and RTK Query
- [x] Refactor Payroll Management
    - [x] Add payroll/emppay endpoints to [employeeApi.js](file:///C:/Users/ok/modernisum/Ai-school/Vidhyam/src/features/employees/api/employeeApi.js)
    - [x] Fix hardcoded URLs and integrate `useGetEmployeesQuery` in `payroll.jsx`
- [x] Backend route completions for standard parity
    - [x] Add [close_month](file:///C:/Users/ok/modernisum/Ai-school/Backend/src/routes/emppay.rs#90-108) route in [emppay.rs](file:///C:/Users/ok/modernisum/Ai-school/Backend/src/routes/emppay.rs)
    - [x] Add student-specific filtering in [award.rs](file:///C:/Users/ok/modernisum/Ai-school/Backend/src/routes/award.rs), [documentbox.rs](file:///C:/Users/ok/modernisum/Ai-school/Backend/src/routes/documentbox.rs), and exams

## Phase 5: Infrastructure Module Upgrade (Enterprise Standards)
- [x] Refactor `complain.jsx` with RTK Query and GCS support.
- [x] Refactor `space.jsx` with Framer Motion Accordion and RTK Query.
- [x] Refactor [schoolprofile.jsx](file:///C:/Users/ok/modernisum/Ai-school/Vidhyam/src/features/infrastructure/pages/schoolprofile.jsx) with Billing V2 sync and Premium UI.
- [x] Verify visual and functional integrity via browser.
  - [x] Fix backend 500 Internal Server Error (School Profile)
  - [x] Verify Spaces API 404 Resolution
  - [x] Proof of work: Visual confirmation with valid school data

## Phase 6: Vidhyam V3.0 Ultimate Upgrade (Technical Debt & Unfinished Features)
- [x] **Academics & Documents Frontend Cleanup**
  - [x] Migrate [Materials](file:///C:/Users/ok/modernisum/Ai-school/Vidhyam/src/features/academics/pages/Materials.jsx#610-618) (inventory) and `Holidays` (calendar) to RTK Query.
  - [x] Move [upload.jsx](file:///C:/Users/ok/modernisum/Ai-school/Vidhyam/src/features/documents/pages/upload.jsx) to a consistent location, apply API prefix, and refactor routing.
  - [x] Perfectly integrate GCS Signed URLs into frontend document uploads.
- [x] **Global React Performance & Security**
  - [x] Implement a Global Error Boundary to prevent white-screen crashes.
  - [x] Optimize heavy forms ([addstudent.jsx](file:///C:/Users/ok/modernisum/Ai-school/Vidhyam/src/features/students/components/addstudent.jsx), [employeeform.jsx](file:///C:/Users/ok/modernisum/Ai-school/Vidhyam/src/features/employees/components/employeeform.jsx)) with `useMemo` for low-end device performance.
- [x] **Advanced AI and Automation UI**
  - [x] Build the "Generate Timetable" UI frontend on top of `timetable_engine.rs`.
  - [x] Create Developer Portal & Webhooks UI in [schoolprofile.jsx](file:///C:/Users/ok/modernisum/Ai-school/Vidhyam/src/features/infrastructure/pages/schoolprofile.jsx) for third-party integrations (API Keys, Tally/WhatsApp bots).

## Phase 7: Vidhyam Employee App V3.0 (Flutter BLoC Migration)
- [x] **Base Setup & Architecture**
  - [x] Add `android.permission.INTERNET` to AndroidManifest.xml.
  - [x] Migrate [pubspec.yaml](file:///C:/Users/ok/modernisum/Ai-school/Apps/employee/pubspec.yaml) from `provider` to `flutter_bloc` & `equatable`.
  - [x] Implement Premium UI ThemeData ("Cotton candy skies" & Glassmorphism).
- [x] **Role-Based Dynamic Routing & Auth**
  - [x] Refactor Auth flow using [AuthBloc](file:///C:/Users/ok/modernisum/Ai-school/Apps/employee/lib/blocs/auth/auth_bloc.dart#7-81).
  - [x] Parse `employee_type` to route Teachers, Drivers, Peons, and Management to unique dashboards.
- [x] **Teacher Dashboard**
  - [x] Live Attendance Marking ([AttendanceBloc](file:///C:/Users/ok/modernisum/Ai-school/Apps/employee/lib/blocs/attendance/attendance_bloc.dart#9-79)).
  - [x] Timetable & Routine UI.
  - [x] Leave Management (Apply & View PDF).
- [x] **Driver Dashboard (Transport)**
  - [x] Simple UI with "Start Trip" button.
  - [x] Live GPS Streaming via WebSockets/Redis ([TransportBloc](file:///C:/Users/ok/modernisum/Ai-school/Apps/employee/lib/blocs/transport/transport_bloc.dart#6-60)).
- [x] **Peon / Support Staff Dashboard**
  - [x] Task & Responsibilities View.
  - [x] Inventory Delivery List.
- [x] **Management Dashboard**
  - [x] Leave Approvals UI.
  - [x] Live Announcements / Notice broadcast.
- [x] **Common Features**
  - [x] Salary & Payroll UI (Salary slip breakdown view).
  - [x] Real-time Notifications (WebSockets).

