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
- [x] Create background worker jobs in `background_jobs.rs` to save new queries and vectors to the cache.

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
  - [x] Migrate [pubspec.yaml](file:///C:/Users/ok/modernisum/Ai-school/Apps/employee/pubspec.yaml) from `provider` to `flutter_bloc` & `equatable`.
  - [x] Implement Premium UI ThemeData ("Cotton candy skies" & Glassmorphism).
- [x] **Role-Based Dynamic Routing & Auth**
  - [x] Refactor Auth flow using [AuthBloc](file:///C:/Users/ok/modernisum/Ai-school/Apps/employee/lib/blocs/auth/auth_bloc.dart#7-81).
  - [x] Parse `employee_type` to route Teachers, Drivers, Peons, and Management to unique dashboards.
- [x] **Teacher Dashboard**
  - [x] Live Attendance Marking ([AttendanceBloc](file:///C:/Users/ok/modernisum/Ai-school/Apps/employee/lib/blocs/attendance/attendance_bloc.dart#9-91)).
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

## Phase 8: Performance & Routing Optimization (V3.1)
- [x] **UI Lazy Loading (Dart Deferred Imports) ⚡**
  - [x] Implement deferred imports for Teacher, Driver, Peon, and Management Dashboards to save RAM.
- [x] **On-Demand BLoC Initialization (Lazy Injection) 🧠**
  - [x] Refactor BLoC creation so role-specific BLoCs (e.g., [TransportBloc](file:///C:/Users/ok/modernisum/Ai-school/Apps/employee/lib/blocs/transport/transport_bloc.dart#6-60)) are only injected when their respective role is authenticated.
- [x] **Strict Role-Based Router (`go_router`) 🛡️**
  - [x] Add `go_router` dependency to [pubspec.yaml](file:///C:/Users/ok/modernisum/Ai-school/Apps/employee/pubspec.yaml).
  - [x] Replace custom `AppRouter` with `GoRouter`.
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
  - [x] Add `fl_chart` dependency to [pubspec.yaml](file:///C:/Users/ok/modernisum/Ai-school/Apps/employee/pubspec.yaml).
  - [x] Implement `SalaryHistoryScreen` with animated Line/Bar charts.
  - [x] Connect to `salary-breakdown` API mock.
- [x] **Deep AI "Risk Radar" (Failure Diagnosis) 🎯🤖**
  - [x] Expand [RiskRadar](file:///C:/Users/ok/modernisum/Ai-school/Apps/employee/lib/screens/teacher/classroom_hub_screen.dart#83-115) to show detailed failure diagnosis (Missed tests, Attendance gaps).
  - [x] Implement diagnosis modal using `student_risk_profiles`.
- [x] **Smart Syllabus & Topic Tracker 📚**
  - [x] Create [SyllabusTracker](file:///C:/Users/ok/modernisum/Ai-school/Apps/employee/lib/screens/teacher/classroom_hub_screen.dart#191-213) widget with `chapters` and `topics`.
  - [x] Implement swipe-to-complete action for real-time progress updates.
- [x] **Live Classroom Streaming (One-Tap Broadcast) 🎥**
  - [x] Add "Go Live" action to Classroom Hub.
  - [x] Implement WebSocket-based broadcast triggers for the student app.

## Phase 13: Continuous Smart Vision AI (Hands-Free Copy Scanning)
- [x] **Continuous Auto-Capture Mode 📸🔄**
  - [x] Implement hands-free "Auto-Scan" toggle in [SmartScannerScreen](file:///C:/Users/ok/modernisum/Ai-school/Apps/employee/lib/screens/teacher/smart_scanner_screen.dart#8-14).
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
- [x] **Premium "Cotton Candy Skies" UI 🎨 (Performance Audit)**
  - [x] Ensure `BackdropFilter` and Animations remain lightweight alongside the new architecture.

