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
- [x] Fix bulk_import_spaces logic error (calling create_announcement) <!-- id: 5 -->
- [x] Improve error handling in get_school_details and get_setup (404 on Not Found) <!-- id: 6 -->

## Phase 5: Students & Employees Module Refactor (Technical Debt resolution) <!-- id: 7 -->
- [x] Refactor Student Profile <!-- id: 8 -->
    - [x] Create modular components: [IdentitySection](file:///C:/Users/ok/modernisum/Ai-school/Vidhyam/src/features/students/components/sections/IdentitySection.jsx#5-71), `DocumentsSection`, `AttendanceCalendar`, `FeesTimeline` <!-- id: 9 -->
    - [x] Add RTK Query endpoints to [studentApi.js](file:///C:/Users/ok/modernisum/Ai-school/Vidhyam/src/features/students/api/studentApi.js) <!-- id: 10 -->
    - [x] Update [studentprofile.jsx](file:///C:/Users/ok/modernisum/Ai-school/Vidhyam/src/features/students/components/studentprofile.jsx) to use modular components and RTK Query <!-- id: 11 -->
- [x] Refactor Payroll Management <!-- id: 12 -->
    - [x] Add payroll/emppay endpoints to [employeeApi.js](file:///C:/Users/ok/modernisum/Ai-school/Vidhyam/src/features/employees/api/employeeApi.js) <!-- id: 13 -->
    - [x] Fix hardcoded URLs and integrate `useGetEmployeesQuery` in [payroll.jsx](file:///C:/Users/ok/modernisum/Ai-school/Vidhyam/src/features/employees/pages/payroll.jsx) <!-- id: 14 -->
- [x] Backend route completions for standard parity <!-- id: 15 -->
    - [x] Add [close_month](file:///C:/Users/ok/modernisum/Ai-school/Backend/src/services/operations_service.rs#524-619) route in [emppay.rs](file:///C:/Users/ok/modernisum/Ai-school/Backend/src/routes/emppay.rs) <!-- id: 16 -->
    - [x] Add student-specific filtering in [award.rs](file:///C:/Users/ok/modernisum/Ai-school/Backend/src/routes/award.rs), [documentbox.rs](file:///C:/Users/ok/modernisum/Ai-school/Backend/src/routes/documentbox.rs), and exams <!-- id: 17 -->

## Phase 5: Infrastructure Module Upgrade (Enterprise Standards)
- [x] Refactor `complain.jsx` with RTK Query and GCS support.
- [x] Refactor `space.jsx` with Framer Motion Accordion and RTK Query.
- [x] Refactor `schoolprofile.jsx` with Billing V2 sync and Premium UI.
- [x] Verify visual and functional integrity via browser.
  - [x] Fix backend 500 Internal Server Error (School Profile)
  - [x] Verify Spaces API 404 Resolution
  - [x] Proof of work: Visual confirmation with valid school data
