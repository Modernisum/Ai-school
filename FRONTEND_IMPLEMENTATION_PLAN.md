# AI-School SaaS Platform — Frontend Implementation Master Plan

> **Global-Level SaaS | Multi-Tenant | 5 Frontend Apps | ~250+ APIs | 43 API Categories**
>
> **Goal:** Every API dead nahi padegi — har endpoint ka frontend consumer hoga. Schools ko provide karne layak professional product.

---

## Table of Contents

- [Phase 0: Foundation & Cross-Cutting](#phase-0-foundation--cross-cutting) — shared library, auth, config
- [Phase 1: Auth & Onboarding](#phase-1-auth--onboarding) — login, signup, school setup, password recovery
- [Phase 2: Core Dashboard & Health](#phase-2-core-dashboard--health) — dashboards, health check, monitoring
- [Phase 3: Student Management](#phase-3-student-management) — CRUD, search, import/export, bulk operations
- [Phase 4: Employee Management](#phase-4-employee-management) — CRUD, roles, teacher assignment
- [Phase 5: Academic Engine](#phase-5-academic-engine) — classes, exams, timetable, subjects, chapters
- [Phase 6: Attendance System](#phase-6-attendance-system) — student & employee attendance, reports
- [Phase 7: Leave Management](#phase-7-leave-management) — apply, approve, balances, calendar
- [Phase 8: Finance & Billing](#phase-8-finance--billing) — fees, billing, payment, salary, promo codes
- [Phase 9: Communication Hub](#phase-9-communication-hub) — chat, announcements, notifications, complaints
- [Phase 10: AI & Smart Features](#phase-10-ai--smart-features) — AI content, OCR, teacher assistant
- [Phase 11: Infrastructure & Resources](#phase-11-infrastructure--resources) — spaces, materials, awards, events, documents
- [Phase 12: Operations & Workflows](#phase-12-operations--workflows) — responsibilities, tasks, reminders
- [Phase 13: Transport & Geo](#phase-13-transport--geo) — GPS tracking, routes, webhooks
- [Phase 14: Developer Platform](#phase-14-developer-platform) — API keys, webhooks, public API, developer access
- [Phase 15: Super Admin & System](#phase-15-super-admin--system) — backup, audit, monitoring, billing
- [Phase 16: Browser Extension](#phase-16-browser-extension) — popup dashboard, quick actions
- [Phase 17: Polish & Launch](#phase-17-polish--launch) — offline, push notifications, skeletons, security

---

## Phase 0: Foundation & Cross-Cutting

**Duration:** 2 Weeks | **Priority:** CRITICAL — sab kuch ispe depend karta hai

### 0.1 Shared API Client Library

Create a shared `@aischool/api-client` package (TypeScript/JavaScript):

```
api-client/
  src/
    core/
      ApiClient.ts          — base HTTP client (fetch/axios wrapper)
      AuthManager.ts        — JWT storage, refresh, RLS header injection
      ErrorHandler.ts       — centralized error mapping (code → user message)
      RetryManager.ts       — exponential backoff with jitter
      CacheManager.ts       — in-memory + IndexedDB cache with TTL
      WebSocketManager.ts   — shared WS connection with auto-reconnect
    modules/
      auth.ts               — /api/auth/*
      dashboard.ts          — /api/dashboard/*
      students.ts           — /api/students/*
      employees.ts          — /api/employees/*
      classes.ts            — /api/classes/*
      exams.ts              — /api/exams/*
      timetable.ts          — /api/timetable/*
      attendance.ts         — /api/attendance/*
      leave.ts              — /api/leave/*
      fees.ts               — /api/fees/*
      billing.ts            — /api/billing/*
      payment.ts            — /api/payment/*
      payroll.ts            — /api/payroll/*
      complaints.ts         — /api/complaints/*
      notifications.ts      — /api/notifications/*
      ai.ts                 — /api/ai-content/* + /api/ocr/*
      geo.ts                — /api/geo/*
      storage.ts            — /api/storage/*
      apiKeys.ts            — /api/api-keys/*
      webhooks.ts           — /api/webhooks/*
      public.ts             — /api/public/*
      authSchool.ts         — /api/school-self/*
      setup.ts              — /api/setup/*
      tasks.ts              — /api/tasks/*
      spaces.ts             — /api/spaces/*
      materials.ts          — /api/materials/*
      awards.ts             — /api/awards/*
      documents.ts          — /api/document-upload/* + /api/documentbox/*
      reminders.ts          — /api/reminders/*
      responsibility.ts     — /api/responsibility/*
      chat.ts               — /api/chat/*
      transport.ts          — /api/transport/*
      events.ts             — /api/events/*
      announcements.ts      — /api/announcements/*
      holiday.ts            — /api/holidays/*
      developerAccess.ts    — /api/developer-access/*
      staticFiles.ts        — /api/static-files/*
      supplemental.ts       — /api/supplemental/*
    index.ts
```

**APIs consumed by this module:** ALL ~250+ endpoints — every frontend app imports from this shared library.

**Action:**
- [ ] Create `shared/api-client/` package with TypeScript
- [ ] Implement `ApiClient` base class with:
  - Auto-attach `Authorization: Bearer <jwt>`
  - Auto-attach `X-School-ID`, `X-Admin-ID` from stored context
  - Token refresh interceptor (on 401 → refresh → retry)
  - Request deduplication (same pending GET → reuse promise)
  - Timeout handling (30s default)
- [ ] Implement `WebSocketManager` for `/ws/notifications` and `/ws/chat`
- [ ] Publish as npm private package or workspace dependency

### 0.2 Flutter Shared Package

Create `Apps/shared/` Flutter package:

```
Apps/shared/
  lib/
    src/
      api/
        api_client.dart          — Dio wrapper with interceptors
        auth_interceptor.dart    — JWT refresh on 401
        rls_interceptor.dart     — X-School-ID, X-Admin-ID headers
        error_handler.dart       — DioException → user-friendly message
        api_response.dart        — Generic ApiResponse<T> model
      models/                    — shared data models
      widgets/                   — shared UI widgets
      utils/
        logger.dart
        connectivity.dart
      services/
        websocket_service.dart
        local_storage_service.dart
        notification_service.dart
    shared.dart
```

**Action:**
- [ ] Create `Apps/shared/` Flutter package
- [ ] Move `api_service.dart` common logic from both Chatra & Employee into shared
- [ ] Standardize server URL: single config file, env-based
- [ ] Add connectivity listener (online/offline → cache/sync)
- [ ] Refactor Chatra and Employee to depend on shared package

### 0.3 Fix Cross-Cutting Issues

| # | Issue | Fix |
|---|-------|-----|
| 1 | Inconsistent server URLs | Single config: `Apps/shared/lib/src/config.dart` with `.env` override |
| 2 | No shared API client | Created in 0.1 and 0.2 above |
| 3 | Duplicate token refresh logic | Single `AuthInterceptor` in shared package |
| 4 | No centralized error handling | `ErrorHandler.map(DioException)` → user message + optional retry |
| 5 | RLS headers not consistently sent | `RlsInterceptor` auto-attaches from stored `SchoolContext` |

---

## Phase 1: Auth & Onboarding

**Duration:** 2 Weeks | **Priority:** CRITICAL — users must sign in first

### 1.1 API Categories Covered

| API Category | Endpoints | Frontend App(s) |
|---|---|---|
| Auth (`02`) | POST/GET /api/auth/login, /api/auth/logout, /api/auth/refresh-token, /api/auth/reset-password, /api/auth/change-password, /api/auth/me, /api/auth/verify-email, /api/auth/send-verification | ALL |
| School Self (`22`) | GET/PUT /api/school-self/profile, /api/school-self/settings | Vidhyam, SuperAdmin |
| Setup (`23`) | POST /api/setup/initialize, /api/setup/verify | Vidhyam, SuperAdmin |
| Recovery (`38`) | POST /api/recovery/forgot-password, /api/recovery/reset-password | ALL |

### 1.2 Vidhyam (React) — Auth Module

**Screens to build/fix:**
- [x] Login Screen (exists — review & polish)
- [ ] Forgot Password flow (3-step: email → OTP → new password)
- [ ] Reset Password screen
- [ ] Email Verification screen
- [ ] School Setup Wizard (multi-step: school info → admin account → subjects → classes)

**API integration:**
- [ ] `POST /api/auth/login` — store JWT + refresh token in httpOnly cookie / secure storage
- [ ] `POST /api/auth/refresh-token` — silent refresh on 401
- [ ] `GET /api/auth/me` — fetch user profile on app start
- [ ] `POST /api/auth/change-password` — inside settings
- [ ] `POST /api/recovery/forgot-password` — forgot password flow
- [ ] `POST /api/recovery/reset-password` — reset with token
- [ ] `POST /api/setup/initialize` — school setup wizard
- [ ] `GET/PUT /api/school-self/profile` — school profile in settings

### 1.3 SuperAdmin — Auth Module

- [ ] Login screen (exists — verify JWT refresh works)
- [ ] Update Credentials screen (exists — wire to real API)
- [ ] Session management (view active sessions)

### 1.4 Chatra (Flutter) — Auth

- [ ] Login screen — tighten Firebase Auth → backend JWT bridge
- [ ] Auto-login with stored token
- [ ] Logout → clear all local data

### 1.5 Employee (Flutter) — Auth

- [ ] Login screen — Firebase Auth → backend JWT
- [ ] Role-based redirect (teacher vs management dashboard)
- [ ] Logout → clear local cache

---

## Phase 2: Core Dashboard & Health

**Duration:** 1 Week | **Priority:** HIGH — first thing users see

### 2.1 API Categories Covered

| API Category | Endpoints |
|---|---|
| Health (`01`) | GET /api/health, GET /api/health/detailed |
| Dashboard (`02`) | GET /api/dashboard/overview, /api/dashboard/stats, /api/dashboard/recent-activities, /api/dashboard/quick-actions |
| Notifications (`09`) | GET /api/notifications, PUT /api/notifications/{id}/read, POST /api/notifications/mark-all-read, DELETE /api/notifications/{id} |

### 2.2 Vidhyam — Dashboard

**Current state:** Basic dashboard components exist. Need enhancement.

**Actions:**
- [ ] `GET /api/dashboard/overview` — summary cards (students, employees, revenue, attendance %)
- [ ] `GET /api/dashboard/stats` — charts (attendance trend, fee collection, grade distribution)
- [ ] `GET /api/dashboard/recent-activities` — activity feed
- [ ] Add pull-to-refresh on all dashboard widgets
- [ ] Add loading skeletons for each widget
- [ ] Add date range picker for stats filtering
- [ ] Add school-switcher (for super-admin managing multiple schools)

### 2.3 Chatra — Dashboard

**Current state:** Dashboard API file exists.

**Actions:**
- [ ] `GET /api/dashboard/overview` — student-centric dashboard
- [ ] Show: upcoming classes today, pending fees, unread announcements, attendance %
- [ ] Add `RefreshIndicator` on dashboard
- [ ] Add `Shimmer` loading skeletons

### 2.4 Employee — Dashboard

**Current state:** ManagementDashboard exists with Redux/BLoC.

**Actions:**
- [ ] `GET /api/dashboard/overview` — employee view
- [ ] Show: today's classes, pending tasks, leave balance, announcements
- [ ] Replace mock data with real API calls
- [ ] Add pull-to-refresh

### 2.5 SuperAdmin — Dashboard

- [ ] `GET /api/dashboard/overview` — platform-level metrics
- [ ] Show: total schools, total students, total revenue, system health
- [ ] Charts: school growth, revenue trend, active users

### 2.6 Health Monitoring

- [ ] Vidhyam: Admin-only health status widget in settings
- [ ] SuperAdmin: System health page with `GET /api/health/detailed` — DB status, Redis status, queue sizes, disk usage

---

## Phase 3: Student Management

**Duration:** 2 Weeks | **Priority:** HIGH

### 3.1 API Category: Students (`04`)

| Method | Endpoint | App |
|--------|----------|-----|
| GET | /api/students | Vidhyam, Employee |
| GET | /api/students/{id} | Vidhyam, Employee |
| POST | /api/students | Vidhyam |
| PUT | /api/students/{id} | Vidhyam |
| DELETE | /api/students/{id} | Vidhyam |
| GET | /api/students/search?q=&class=&section= | Vidhyam, Employee |
| POST | /api/students/bulk-import | Vidhyam |
| GET | /api/students/export | Vidhyam |
| GET | /api/students/{id}/fees | Vidhyam |
| GET | /api/students/{id}/attendance | Vidhyam, Chatra, Employee |
| GET | /api/students/{id}/exams | Vidhyam, Chatra |

### 3.2 Vidhyam — Student Module

**Screens:**
- [ ] Student List (table + search + filter by class/section)
- [ ] Student Detail (tabs: profile, fees, attendance, exams, documents)
- [ ] Student Create/Edit form (with photo upload)
- [ ] Bulk Import (CSV upload → preview → confirm)
- [ ] Export Students (CSV/Excel)
- [ ] Student ID card generation (with QR code)

**Pagination:** All list endpoints → infinite scroll or server-side pagination.

### 3.3 Employee — Student Viewer

- [ ] Student list (read-only, filtered by assigned class)
- [ ] Student detail (attendance, exam marks entry)
- [ ] Quick search by name/roll number

### 3.4 Chatra — Student Profile

- [ ] Student's own profile view
- [ ] View own attendance summary
- [ ] View own exam results
- [ ] View own fee status

---

## Phase 4: Employee Management

**Duration:** 2 Weeks | **Priority:** HIGH

### 4.1 API Category: Employees (`05`)

| Method | Endpoint | App |
|--------|----------|-----|
| GET | /api/employees | Vidhyam |
| GET | /api/employees/{id} | Vidhyam, Employee |
| POST | /api/employees | Vidhyam |
| PUT | /api/employees/{id} | Vidhyam |
| DELETE | /api/employees/{id} | Vidhyam |
| GET | /api/employees/search?q=&role=&department= | Vidhyam |
| POST | /api/employees/bulk-import | Vidhyam |
| GET | /api/employees/export | Vidhyam |
| GET | /api/employees/{id}/attendance | Vidhyam, Employee |
| GET | /api/employees/{id}/leaves | Vidhyam, Employee |
| GET | /api/employees/{id}/payroll | Vidhyam, Employee |
| GET | /api/employees/{id}/timetable | Vidhyam, Employee |

### 4.2 Vidhyam — Employee Module

- [ ] Employee List (table + search + filter by role/department)
- [ ] Employee Detail (tabs: profile, attendance, leaves, payroll, timetable)
- [ ] Employee Create/Edit form
- [ ] Bulk Import (CSV)
- [ ] Export (CSV/Excel)
- [ ] ID card generation

### 4.3 Employee — Own Profile

- [ ] View own profile
- [ ] Edit own profile (photo, phone, address)
- [ ] View own attendance
- [ ] View own leave balance & history
- [ ] View own payroll/salary slips
- [ ] View own timetable

---

## Phase 5: Academic Engine

**Duration:** 3 Weeks | **Priority:** HIGH — core school functionality

### 5.1 API Categories Covered

| API Category | Endpoints |
|---|---|
| Classes (`10`) | CRUD /api/classes, sections, subjects, assign teacher |
| Exams (`11`) | CRUD /api/exams, marks, results, grade calculation |
| Timetable (`12`) | CRUD /api/timetable, periods, day-wise schedule |
| Subjects (supplemental) | CRUD /api/subjects |
| Chapters (supplemental) | CRUD /api/chapters |

### 5.2 Vidhyam — Academic Module

**Classes:**
- [ ] Class List with sections
- [ ] Class Create/Edit (name, section, class teacher, subjects)
- [ ] Assign subjects to class
- [ ] Assign teacher to class/subject
- [ ] Promote students to next class (year-end action)

**Exams:**
- [ ] Exam List (by academic year)
- [ ] Exam Create/Edit (name, date range, subjects, max marks)
- [ ] Marks Entry screen (grid: students × subjects)
- [ ] Marks Import (CSV)
- [ ] Results calculation (total, percentage, grade)
- [ ] Report card generation (PDF)
- [ ] Result analytics (class average, subject-wise performance)

**Timetable:**
- [ ] Timetable view (weekly grid)
- [ ] Period Create/Edit (day, time, subject, teacher, room)
- [ ] Bulk generate timetable (auto-scheduling)
- [ ] Teacher-wise timetable view
- [ ] Class-wise timetable view

### 5.3 Employee — Academic

- [ ] View assigned class timetable
- [ ] **Marks Entry:** Replace mock with real `POST /api/exams/{id}/marks`
- [ ] View exam results for assigned classes

### 5.4 Chatra — Academic

- [ ] View own class timetable
- [ ] View own exam schedule
- [ ] View own exam results & report card
- [ ] View subjects & chapters

---

## Phase 6: Attendance System

**Duration:** 2 Weeks | **Priority:** HIGH

### 6.1 API Categories

| API Category (`06`) | Endpoints |
|---|---|
| Student Attendance | POST /api/attendance/students, GET /api/attendance/students/{date}, GET /api/attendance/students/report |
| Employee Attendance | POST /api/attendance/employees, GET /api/attendance/employees/{date}, GET /api/attendance/employees/report |
| Bulk | POST /api/attendance/bulk-mark, GET /api/attendance/summary |

### 6.2 Vidhyam — Attendance Module

- [ ] Daily Attendance Sheet (class-wise, date picker)
- [ ] Bulk mark attendance (Present/Absent/Late/Half-day)
- [ ] Attendance correction (edit past records — admin only)
- [ ] Attendance Reports:
  - Student-wise monthly report
  - Class-wise daily summary
  - Low attendance alerts (<75%)
- [ ] Attendance analytics (trends, heatmap)

### 6.3 Employee — Attendance

- [ ] **FIX:** Replace 5 hardcoded mock students in `attendance_bloc.dart` with real API
- [ ] Mark student attendance for assigned class
- [ ] Mark own attendance (check-in via geolocation)
- [ ] View own attendance report

### 6.4 Chatra — Attendance

- [ ] View own attendance percentage
- [ ] View attendance calendar (monthly heatmap)
- [ ] Daily attendance status

---

## Phase 7: Leave Management

**Duration:** 1.5 Weeks | **Priority:** MEDIUM

### 7.1 API Category: Leave (`07`)

| Method | Endpoint | App |
|--------|----------|-----|
| GET | /api/leave/balances | Employee, Vidhyam |
| GET | /api/leave/requests | Employee, Vidhyam |
| POST | /api/leave/requests | Employee |
| PUT | /api/leave/requests/{id} | Employee, Vidhyam |
| DELETE | /api/leave/requests/{id} | Employee |
| GET | /api/leave/types | ALL |
| GET | /api/leave/calendar | ALL |
| GET | /api/leave/pending-approvals | Employee, Vidhyam |

### 7.2 Employee — Leave

- [ ] **CRITICAL FIX:** `LeaveManagementScreen` — currently PLACEHOLDER only, needs full UI
- [ ] Apply Leave screen (type, date range, reason, attachment)
- [ ] Leave Balance cards (sick, casual, earned — with progress bars)
- [ ] Leave History list (status: pending/approved/rejected)
- [ ] Cancel pending leave

### 7.3 Employee — Leave Approvals

- [ ] **FIX:** Replace hardcoded mock data in `LeaveApprovalsScreen`
- [ ] Pending approvals list
- [ ] Approve/Reject with comment
- [ ] Leave calendar (team view — who's off when)

### 7.4 Vidhyam — Leave

- [ ] Leave management dashboard (all employee leaves)
- [ ] Approve/Reject leaves
- [ ] Leave policy configuration
- [ ] Leave reports

---

## Phase 8: Finance & Billing

**Duration:** 3 Weeks | **Priority:** HIGH — revenue critical

### 8.1 API Categories Covered

| API Category | Endpoints |
|---|---|
| Fees (`08`) | CRUD /api/fees, fee structures, fee groups, fee collection, receipts |
| Billing (`33`) | GET/POST /api/billing, invoices, payment history, ledger |
| Payment (`34`) | POST /api/payment/create-order, /api/payment/verify, /api/payment/history |
| Payroll (`39`) | CRUD /api/payroll, salary structure, payslips, disbursements |
| Promo Codes (`35`) | CRUD /api/promo-codes, validation, usage tracking |

### 8.2 Vidhyam — Fees & Billing

**Fee Management:**
- [ ] Fee Structure CRUD (fee heads: tuition, transport, library, etc.)
- [ ] Assign fee structure to class/student
- [ ] Fee Collection screen (student search → enter amount → receipt)
- [ ] Bulk fee assignment
- [ ] Fee due reminders
- [ ] Fee reports (collected, pending, class-wise, date-wise)
- [ ] Receipt generation (PDF with school branding)

**Billing:**
- [ ] Invoice list
- [ ] Create invoice
- [ ] Payment history
- [ ] Billing ledger (student-wise account)

**Payment Gateway:**
- [ ] `POST /api/payment/create-order` — Razorpay integration
- [ ] `POST /api/payment/verify` — verify payment signature
- [ ] Payment success/failure screens
- [ ] Payment history with filters

**Promo Codes:**
- [ ] Promo code CRUD
- [ ] Assign to specific schools/students
- [ ] Usage analytics

### 8.3 Chatra — Fees

- [ ] View own fee status (paid, pending, overdue)
- [ ] Fee history
- [ ] Pay fees online (Razorpay → `POST /api/payment/create-order`)
- [ ] Download receipts

### 8.4 Employee — Payroll

- [ ] View own salary slips
- [ ] **FIX:** Replace hardcoded mock chart data in `SalaryAnalyticsScreen`
- [ ] Salary history
- [ ] Download payslip PDF

---

## Phase 9: Communication Hub

**Duration:** 2 Weeks | **Priority:** MEDIUM

### 9.1 API Categories Covered

| API Category | Endpoints |
|---|---|
| Chat (`35`) | WebSocket /ws/chat, GET /api/chat/messages, POST /api/chat/messages, GET /api/chat/conversations |
| Announcements (`37`) | CRUD /api/announcements, target audience (class/role/all) |
| Notifications (`09`) | GET /api/notifications, PUT read, POST mark-all-read, WebSocket /ws/notifications |
| Complaints (`13`) | CRUD /api/complaints, status tracking, resolution |

### 9.2 Vidhyam — Communication

**Announcements:**
- [ ] Create announcement (title, body, target: all/students/employees/class-wise)
- [ ] Announcement list with scheduling
- [ ] Pin important announcements

**Notifications:**
- [ ] Notification bell with unread count (polling + WebSocket)
- [ ] Notification list
- [ ] Mark as read / mark all read
- [ ] Click notification → navigate to relevant screen

**Complaints:**
- [ ] Complaint list (filter by status: open/in-progress/resolved)
- [ ] Complaint detail & timeline
- [ ] Resolve complaint with response
- [ ] Complaint analytics (category-wise, response time)

### 9.3 Chatra — Communication

**Announcements:**
- [ ] Announcement list
- [ ] Announcement detail
- [ ] Unread badge

**Notifications:**
- [ ] Notification bell in app bar
- [ ] Notification list screen
- [ ] Push notifications (FCM)

**Chat:**
- [ ] WebSocket `/ws/chat` connection
- [ ] Chat screen (class group / teacher / admin)
- [ ] Send message, image, file
- [ ] Typing indicator
- [ ] Online/offline status

**Complaints:**
- [ ] File new complaint (category, description, photo)
- [ ] View my complaints & status
- [ ] Add comment to complaint

### 9.4 Employee — Communication

**Announcements:**
- [ ] View announcements
- [ ] **FIX:** `BroadcastNoticeScreen` — uses `Future.delayed` simulation, replace with real API

**Notifications:**
- [ ] **FIX:** `NotificationsBloc` — timer-based fake notifications, replace with real WebSocket
- [ ] Notification list

**Chat:**
- [ ] **FIX:** `StaffRoomScreen` — hardcoded mock messages, replace with real WebSocket

**Complaints:**
- [ ] View complaints assigned to me
- [ ] Update complaint status

---

## Phase 10: AI & Smart Features

**Duration:** 2 Weeks | **Priority:** MEDIUM-HIGH — differentiator

### 10.1 API Categories Covered

| API Category | Endpoints |
|---|---|
| AI Content (`14`) | POST /api/ai-content/generate, POST /api/ai-content/lesson-plan, POST /api/ai-content/quiz, POST /api/ai-content/notes, GET /api/ai-content/history |
| OCR (`15`) | POST /api/ocr/extract-text, POST /api/ocr/extract-table, POST /api/ocr/scan-document |

### 10.2 Vidhyam — AI Studio

- [ ] AI Content Generator screen:
  - Select type: Lesson Plan / Quiz / Notes / Summary
  - Input: subject, topic, grade level, tone, length
  - Output: formatted content with copy/save/export
- [ ] History of generated content
- [ ] Save to resources library
- [ ] OCR Document Scanner
  - Upload image → extract text
  - Extract table from image → save as CSV
  - Scan document → searchable PDF

### 10.3 Employee — AI Assistant

- [ ] **CRITICAL FIX:** `TeacherAiAssistant` — currently UI-only shell, needs API integration
- [ ] Generate lesson plan → `POST /api/ai-content/lesson-plan`
- [ ] Generate quiz for students → `POST /api/ai-content/quiz`
- [ ] Generate study notes → `POST /api/ai-content/notes`
- [ ] OCR for grading paper answer sheets

### 10.4 Chatra — AI Features

- [ ] Generate study notes for my subjects
- [ ] Practice quiz generation
- [ ] OCR: scan textbook page → extract key points

---

## Phase 11: Infrastructure & Resources

**Duration:** 2 Weeks | **Priority:** MEDIUM

### 11.1 API Categories Covered

| API Category | Endpoints |
|---|---|
| Spaces (`25`) | CRUD /api/spaces (classrooms, labs, library, etc.) |
| Materials (`26`) | CRUD /api/materials (books, equipment, inventory) |
| Awards (`27`) | CRUD /api/awards, student awards, employee awards |
| Events (`30`) | CRUD /api/events, event registration, calendar |
| Document Upload (`28`) | POST /api/document-upload, GET documents |
| Document Box (`29`) | CRUD /api/documentbox, folders, sharing |
| Static Files (`42`) | GET /api/static-files/{path} |

### 11.2 Vidhyam

**Spaces:**
- [ ] Space/Infrastructure list (classrooms, labs, library, sports)
- [ ] Space detail (capacity, equipment, schedule)
- [ ] Space booking calendar

**Materials:**
- [ ] Inventory list
- [ ] Add/Edit material (name, quantity, category, location)
- [ ] Issue/Return tracking
- [ ] Low stock alerts

**Awards:**
- [ ] Award list
- [ ] Create award (name, description, icon)
- [ ] Assign award to student/employee
- [ ] Award ceremony reports

**Events:**
- [ ] Event calendar (month/week/day views)
- [ ] Create/Edit event (name, date, venue, participants)
- [ ] Event registration
- [ ] Event photos upload

**Documents:**
- [ ] Document upload (drag & drop)
- [ ] Folder organization (document box)
- [ ] Document sharing (by role/class)
- [ ] Document search

### 11.3 Chatra

- [ ] View events calendar
- [ ] Register for events
- [ ] View own awards
- [ ] Access shared documents

### 11.4 Employee

- [ ] View events
- [ ] Download shared documents

---

## Phase 12: Operations & Workflows

**Duration:** 2 Weeks | **Priority:** MEDIUM

### 12.1 API Categories Covered

| API Category | Endpoints |
|---|---|
| Responsibilities (`31`) | CRUD /api/responsibility, assignment, tracking, auto-execution |
| Tasks (`24`) | CRUD /api/tasks, assign, status update, due dates |
| Reminders (`32`) | CRUD /api/reminders, scheduling, recurring |

### 12.2 Employee — Tasks & Responsibilities

- [ ] **FIX:** `TasksBloc` — 3 hardcoded mock DutyItems, replace with real API
- [ ] Task list (filter: pending/in-progress/completed)
- [ ] Task detail
- [ ] Update task status
- [ ] Responsibility list
- [ ] Execute responsibility action
- [ ] Responsibility logs

### 12.3 Vidhyam — Operations

- [ ] Task assignment screen (assign to employee, set deadline)
- [ ] Task tracking dashboard
- [ ] Responsibility configuration
- [ ] Automated responsibility scheduling
- [ ] Reminder creation & management

### 12.4 Chatra

- [ ] View tasks assigned to class
- [ ] View reminders (homework due, exam date, fee payment)

---

## Phase 13: Transport & Geo

**Duration:** 1.5 Weeks | **Priority:** LOW-MEDIUM

### 13.1 API Categories Covered

| API Category | Endpoints |
|---|---|
| Transport (`16`) | POST /api/transport/location, GET /api/transport/track/{vehicle}, GET /api/transport/routes, WebSocket /ws/transport |
| Geo (`16`) | POST /api/geo/geocode, POST /api/geo/reverse-geocode, POST /api/geo/distance |

### 13.2 Employee — Transport

- [ ] **FIX:** `TransportBloc` — local GPS simulation, replace with real API → WebSocket streaming
- [ ] Real-time vehicle tracking map
- [ ] Route management
- [ ] Student pickup/drop status

### 13.3 Chatra — Transport

- [ ] Track my school bus in real-time
- [ ] Estimated arrival time
- [ ] Route view

### 13.4 Vidhyam — Transport

- [ ] Vehicle list
- [ ] Route CRUD
- [ ] Assign students to routes/stops
- [ ] Live tracking dashboard (all vehicles)

---

## Phase 14: Developer Platform

**Duration:** 2 Weeks | **Priority:** LOW-MEDIUM — for tech-savvy schools

### 14.1 API Categories Covered

| API Category | Endpoints |
|---|---|
| API Keys (`18`) | CRUD /api/api-keys, permissions, rate limits |
| Webhooks (`19`) | CRUD /api/webhooks, delivery logs, retry |
| Public API (`20`) | /api/public/* (rate-limited, documented endpoints) |
| Developer Access (`40`) | /api/developer-access/* |

### 14.2 Vidhyam — Developer Settings

- [ ] API Key management (create, revoke, permissions)
- [ ] API usage analytics (requests per key, error rate)
- [ ] Webhook configuration (URL, events, secret)
- [ ] Webhook delivery logs

### 14.3 SuperAdmin — Developer Platform

- [ ] Public API documentation portal
- [ ] Rate limit configuration
- [ ] Developer access management

---

## Phase 15: Super Admin & System

**Duration:** 2.5 Weeks | **Priority:** HIGH — platform management

### 15.1 API Categories Covered

| API Category | Endpoints |
|---|---|
| Super Admin (`03`) | CRUD /api/super-admin/schools, /api/super-admin/admins |
| Backup (`36`) | POST /api/backup/create, GET /api/backup/list, POST /api/backup/restore |
| Audit Logs | GET /api/super-admin/audit-logs |
| Monitoring | GET /api/super-admin/monitoring (system health, usage stats) |
| AI Settings | PUT /api/super-admin/ai-settings |
| Billing (SuperAdmin) | GET /api/super-admin/billing (platform billing) |
| Promo (SuperAdmin) | CRUD /api/super-admin/promo-codes |

### 15.2 SuperAdmin — All Pages

- [ ] **Dashboard:** platform metrics, school growth chart, revenue graph, system health
- [ ] **Schools List:** search, filter, status (active/inactive/suspended)
- [ ] **School Detail:** full school profile, usage stats, billing history, admin contacts
- [ ] **Monitoring:** DB status, Redis, queue depth, error rates, response times
- [ ] **Audit Logs:** filterable log viewer (by school, action, date range)
- [ ] **Backup:** manual backup trigger, backup list, restore
- [ ] **AI Settings:** configure AI provider, rate limits, prompt templates
- [ ] **Billing:** platform-level billing overview, subscription plans
- [ ] **Promo:** promo code management across schools
- [ ] **Sessions:** active session viewer, force logout
- [ ] **Support:** support ticket viewer

### 15.3 Vidhyam — Admin Settings

- [ ] School profile editing
- [ ] School-level backup management
- [ ] Audit log viewer (own school only)

---

## Phase 16: Browser Extension

**Duration:** 1 Week | **Priority:** LOW

### 16.1 modernschoolextension

**Current state:** Chrome Manifest V3 scaffold exists.

**Actions:**
- [ ] Popup dashboard:
  - Today's classes
  - Pending tasks
  - Unread notifications count
- [ ] Quick actions:
  - Mark attendance
  - Send announcement
  - Search student
- [ ] Content script: auto-fill school forms
- [ ] Service worker: background sync, notification polling

---

## Phase 17: Polish & Launch

**Duration:** 2 Weeks | **Priority:** HIGH

### 17.1 UI/UX Improvements — All Apps

**Vidhyam:**
- [ ] Loading skeletons for every list/detail screen
- [ ] Optimistic UI updates (mark attendance, update task status)
- [ ] Debounced search inputs
- [ ] Infinite scroll for all list screens
- [ ] Keyboard shortcuts (Ctrl+K search, Ctrl+N new student)
- [ ] Dark mode support
- [ ] Mobile responsive (PWA)

**Chatra:**
- [ ] **FIX:** `ClassroomBloc` — remove `Future.delayed` mock, connect to real API
- [ ] **FIX:** `LeaveManagementScreen` — remove placeholder, build full leave UI
- [ ] **FIX:** `LiveClassroomScreen` — integrate actual WebRTC/video stream
- [ ] Pull-to-refresh on all list screens
- [ ] Shimmer loading skeletons
- [ ] Empty state illustrations
- [ ] Error state with retry button
- [ ] Offline support (cache last-known state in sqflite)
- [ ] Bottom sheet for quick actions

**Employee:**
- [ ] **FIX:** All 12 identified mock data issues (see Phase 0.3 list)
- [ ] Add GoRouter sub-routes — remove all `Navigator.push` for proper routing
- [ ] Pull-to-refresh everywhere
- [ ] Shimmer loading
- [ ] Offline mode (cache + sync queue)
- [ ] Dark mode

**SuperAdmin:**
- [ ] Loading skeletons
- [ ] Debounced search
- [ ] Error boundaries
- [ ] Mobile responsive

### 17.2 Cross-Cutting Polish

- [ ] **Offline Support:** Cache API responses in IndexedDB (web) / sqflite (mobile)
- [ ] **Push Notifications:** FCM setup for Chatra & Employee
- [ ] **Deep Linking:** URL-based navigation (vidhyam.app/students/123)
- [ ] **Error Tracking:** Sentry integration
- [ ] **Analytics:** Mixpanel/PostHog for usage tracking
- [ ] **Performance:** Bundle splitting, lazy loading, image optimization
- [ ] **Security Audit:** CSP headers, input sanitization, XSS prevention
- [ ] **Accessibility:** ARIA labels, keyboard navigation, screen reader support
- [ ] **Internationalization:** i18n setup (Hindi, English minimum)
- [ ] **Documentation:** In-app help tooltips, onboarding tours

### 17.3 Testing

- [ ] Unit tests for all BLoC/Cubit classes (Flutter)
- [ ] Unit tests for all Redux slices (React)
- [ ] Widget/Component tests for critical screens
- [ ] Integration tests for auth → dashboard → CRUD flows
- [ ] E2E tests for critical paths (student enrollment, fee payment, attendance)
- [ ] API contract tests (verify frontend calls match backend schema)

---

## API Coverage Matrix

### Complete API → Frontend App Mapping

| # | API Category | # APIs | Vidhyam | Employee | Chatra | SuperAdmin | Extension |
|---|-------------|--------|---------|----------|--------|------------|-----------|
| 01 | Health | 2 | ✓ | — | — | ✓ | — |
| 02 | Dashboard | 4 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 03 | Super Admin | 12+ | — | — | — | ✓ | — |
| 04 | Students | 11 | ✓ | ✓ | ✓ | — | ✓ |
| 05 | Employees | 12 | ✓ | ✓ | — | — | — |
| 06 | Attendance | 8 | ✓ | ✓ | ✓ | — | ✓ |
| 07 | Leave | 8 | ✓ | ✓ | ✓ | — | — |
| 08 | Fees | 10 | ✓ | — | ✓ | — | — |
| 09 | Notifications | 5 | ✓ | ✓ | ✓ | — | ✓ |
| 10 | Classes | 8 | ✓ | ✓ | ✓ | — | — |
| 11 | Exams | 10 | ✓ | ✓ | ✓ | — | — |
| 12 | Timetable | 6 | ✓ | ✓ | ✓ | — | — |
| 13 | Complaints | 6 | ✓ | ✓ | ✓ | — | — |
| 14 | AI Content | 6 | ✓ | ✓ | ✓ | — | — |
| 15 | OCR | 3 | ✓ | ✓ | ✓ | — | — |
| 16 | Geo / Transport | 8 | ✓ | ✓ | ✓ | — | — |
| 17 | Storage | 4 | ✓ | ✓ | ✓ | — | — |
| 18 | API Keys | 5 | ✓ | — | — | ✓ | — |
| 19 | Webhooks | 5 | ✓ | — | — | ✓ | — |
| 20 | Public API | varies | — | — | — | ✓ | — |
| 21 | Auth | 8 | ✓ | ✓ | ✓ | ✓ | — |
| 22 | School Self | 4 | ✓ | — | — | ✓ | — |
| 23 | Setup | 3 | ✓ | — | — | ✓ | — |
| 24 | Tasks | 6 | ✓ | ✓ | ✓ | — | ✓ |
| 25 | Spaces | 6 | ✓ | — | — | — | — |
| 26 | Materials | 6 | ✓ | — | — | — | — |
| 27 | Awards | 5 | ✓ | — | ✓ | — | — |
| 28 | Document Upload | 4 | ✓ | ✓ | ✓ | — | — |
| 29 | Document Box | 6 | ✓ | ✓ | ✓ | — | — |
| 30 | Events | 6 | ✓ | ✓ | ✓ | — | — |
| 31 | Responsibilities | 5 | ✓ | ✓ | — | — | — |
| 32 | Reminders | 5 | ✓ | ✓ | ✓ | — | — |
| 33 | Billing | 6 | ✓ | — | — | ✓ | — |
| 34 | Payment | 4 | ✓ | — | ✓ | — | — |
| 35 | Chat | 4 | ✓ | ✓ | ✓ | — | — |
| 36 | Backup | 3 | ✓ | — | — | ✓ | — |
| 37 | Announcements | 5 | ✓ | ✓ | ✓ | — | — |
| 38 | Recovery | 3 | ✓ | — | — | — | — |
| 39 | Payroll | 6 | ✓ | ✓ | — | — | — |
| 40 | Developer Access | 4 | — | — | — | ✓ | — |
| 41 | Holidays | 4 | ✓ | ✓ | ✓ | — | — |
| 42 | Static Files | 2 | ✓ | ✓ | ✓ | — | — |
| 43 | Supplemental | varies | ✓ | ✓ | ✓ | — | — |

> **Total: ~250+ APIs — every single one has a frontend consumer.**

---

## UI Problems Fixed — Complete List

### Chatra App (6 fixes)

| # | File | Problem | Phase | Fix |
|---|------|---------|-------|-----|
| 1 | `leave/.../leave_management_screen.dart` | Placeholder text only | 7 | Build full leave apply/history/balance UI |
| 2 | `classroom/bloc/classroom_bloc.dart` | `Future.delayed` + empty list, TODO | 17 | Connect to real class/attendance APIs |
| 3 | `main.dart` | Notification service commented out | 9 | Enable + WebSocket subscribe |
| 4 | `LiveClassroomScreen` | No video/stream | 11 | Integrate WebRTC/camera |
| 5 | All list screens | No pull-to-refresh | 17 | Add `RefreshIndicator` |
| 6 | All screens | No loading skeletons | 17 | Add `Shimmer` widgets |

### Employee App (12 fixes)

| # | File | Problem | Phase | Fix |
|---|------|---------|-------|-----|
| 1 | `attendance_bloc.dart` | Hardcoded 5 mock students | 6 | Real API: `GET /api/students?class=X` |
| 2 | `tasks_bloc.dart` | 3 hardcoded `DutyItem`s | 12 | Real API: `GET /api/tasks` |
| 3 | `transport_bloc.dart` | Local GPS simulation | 13 | Real WebSocket `/ws/transport` |
| 4 | `notifications_bloc.dart` | Timer-based fake (15s) | 9 | Real WebSocket `/ws/notifications` |
| 5 | `timetable_screen.dart` | 6 hardcoded periods | 5 | Real API: `GET /api/timetable` |
| 6 | `broadcast_notice_screen.dart` | `Future.delayed` simulation | 9 | Real API: `POST /api/announcements` |
| 7 | `leave_approvals_screen.dart` | Hardcoded 2 mock leaves | 7 | Real API: `GET /api/leave/pending-approvals` |
| 8 | `salary_analytics_screen.dart` | Hardcoded mock chart data | 8 | Real API: `GET /api/payroll` |
| 9 | `staff_room_screen.dart` | Hardcoded mock messages | 9 | Real WebSocket `/ws/chat` |
| 10 | `teacher_ai_assistant.dart` | UI-only shell | 10 | Real API: `POST /api/ai-content/*` |
| 11 | All sub-screens | `Navigator.push` instead of GoRouter | 17 | Proper GoRouter sub-routes |
| 12 | All screens | No offline support | 17 | sqflite cache + sync queue |

---

## Phase Summary & Timeline

| Phase | Name | Duration | APIs Covered | Cumulative |
|-------|------|----------|-------------|------------|
| 0 | Foundation & Cross-Cutting | 2 weeks | ~20 (shared infra) | — |
| 1 | Auth & Onboarding | 2 weeks | ~25 | 4 weeks |
| 2 | Core Dashboard & Health | 1 week | ~10 | 5 weeks |
| 3 | Student Management | 2 weeks | ~11 | 7 weeks |
| 4 | Employee Management | 2 weeks | ~12 | 9 weeks |
| 5 | Academic Engine | 3 weeks | ~24 | 12 weeks |
| 6 | Attendance System | 2 weeks | ~8 | 14 weeks |
| 7 | Leave Management | 1.5 weeks | ~8 | 15.5 weeks |
| 8 | Finance & Billing | 3 weeks | ~26 | 18.5 weeks |
| 9 | Communication Hub | 2 weeks | ~20 | 20.5 weeks |
| 10 | AI & Smart Features | 2 weeks | ~9 | 22.5 weeks |
| 11 | Infrastructure & Resources | 2 weeks | ~27 | 24.5 weeks |
| 12 | Operations & Workflows | 2 weeks | ~16 | 26.5 weeks |
| 13 | Transport & Geo | 1.5 weeks | ~8 | 28 weeks |
| 14 | Developer Platform | 2 weeks | ~14 | 30 weeks |
| 15 | Super Admin & System | 2.5 weeks | ~30 | 32.5 weeks |
| 16 | Browser Extension | 1 week | ~5 | 33.5 weeks |
| 17 | Polish & Launch | 2 weeks | All | 35.5 weeks |

**Total: ~35.5 weeks (~9 months)** with a team of 4-6 developers.

### Parallel Execution Strategy

With 4 developers:
- **Dev A:** Vidhyam (React) — phases 1-17
- **Dev B:** Chatra (Flutter) — phases 1-17
- **Dev C:** Employee (Flutter) — phases 1-17
- **Dev D:** SuperAdmin (React) + Extension — phases 1-17 + shared package

**With parallel work: ~5-6 months total.**

---

## API Modification Notes

During implementation, these API request/response changes may be needed:

1. **Pagination standardization:** All list endpoints should return `{ data: [], total: N, page: N, per_page: N }`
2. **Bulk operations:** Add `POST /api/students/bulk-update`, `POST /api/employees/bulk-update`
3. **Search:** Add `?q=` search param to all list endpoints
4. **File upload endpoints:** Add `POST /api/students/{id}/photo`, `POST /api/employees/{id}/photo`
5. **WebSocket events:** Standardize event format `{ event: string, data: {}, timestamp: ISO }`
6. **Error responses:** Standardize to `{ error: { code: string, message: string, details?: {} } }`
7. **Dashboard APIs:** Add date range params `?from=ISO&to=ISO`
8. **Export APIs:** Add format param `?format=csv|pdf|excel`

---

## Next Steps

1. [ ] Review this plan with stakeholders
2. [ ] Set up `shared/api-client` package (Phase 0 — week 1)
3. [ ] Set up `Apps/shared/` Flutter package (Phase 0 — week 1)
4. [ ] Begin Phase 1 (Auth) for all 4 apps in parallel
5. [ ] Weekly review of phase progress against this document

---

*Plan Version: 1.0 | Last Updated: 2026-04-27 | Generated from deep analysis of 43 API categories + 5 frontend apps + Rust backend*
