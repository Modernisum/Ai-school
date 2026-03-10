# 🏫 Ai-School — Complete School Management ERP System

A full-stack, AI-powered School Management ERP (Enterprise Resource Planning) system. Built for modern educational institutions to digitize and automate every aspect of school operations — from student enrollment and fee collection to AI-powered analytics and automated payroll.

---

## 📁 Monorepo Structure

```
Ai-school/
├── Backend/          # Rust REST API Server (Port 8080)
├── Vidhyam/          # React Web App — School Admin Panel (Port 5173)
├── SuperAdmin/       # React Web App — Platform Admin (Port 3001)
├── Apps/             # Additional app modules
└── Plan/             # Architecture & planning documents
```

---

## 🚀 Tech Stack Overview

| Layer | Technology |
|---|---|
| **Backend API** | Rust · Axum · PostgreSQL · SQLx · Redis |
| **School Frontend** | React 18 · Vite · Redux Toolkit · TailwindCSS · Bootstrap |
| **Super Admin Panel** | React 18 · Vite · Framer Motion |
| **AI Engine** | Google Gemini 1.5 Flash |
| **OCR Engine** | PaddleOCR / Tesseract |
| **PDF Generation** | printpdf (Rust) · jsPDF (JS) |
| **Auth** | JWT · Bcrypt |
| **DevOps** | Docker · Docker Compose |

---

## 🖥️ Backend — `Backend/`

### Architecture

```
HTTP Request
     │
     ▼
  Routes (axum handlers)         ← src/routes/
     │
     ▼
  Services (business logic)      ← src/services/
     │
     ▼
  Repositories (DB queries)      ← src/repository/
     │
     ▼
  PostgreSQL Database
```

### Module List — `src/routes/`

| Module | File | Routes | Purpose |
|---|---|---|---|
| AI | `ai.rs` | 1 | Gemini NLP query engine |
| Announcement | `announcement.rs` | 1 | School/class/student announcements |
| Attendance | `attendance.rs` | 10 | Mark/update/list attendance, school holidays |
| Auth | `auth.rs` | 9 | Login, logout, JWT, security, password |
| Award | `award.rs` | 1 | Student/staff awards |
| Class | `class.rs` | 3 | Class creation, listing |
| Complains | `complains.rs` | 4 | Complaint registration and listing |
| Document Box | `documentbox.rs` + `documentUpload.rs` | 3 | File management |
| Employees | `employees.rs` | 6 | HR management, bulk import |
| Payroll | `emppay.rs` | 4 | Salary, bonus, financial aid |
| Events | `events.rs` | 1 | School events |
| Exam | `exam.rs` | 1 | Exam creation and marks |
| Fees | `fees.rs` | 18 | Fee management, coupons, discounts |
| Geo | `geo.rs` | 5 | Country/State/District data |
| Leave | `leave.rs` | 7 | Leave workflow + PDF generation |
| Materials | `materials.rs` | 3 | Inventory management |
| Mobile | `mobile.rs` | 2 | Mobile app JWT auth (mock OTP) |
| OCR | `ocr.rs` | 1 | Image → Text extraction |
| Reminder | `reminder.rs` | 1 | School reminders |
| Responsibility | `responsibility.rs` | 5 | Employee duty assignment |
| School | `school.rs` | 3 | School profile management |
| Setup | `setup.rs` | 2 | School onboarding/registration |
| Spaces | `spaces.rs` | 12 | Room/lab/space management |
| Students | `students.rs` | 8 | Student CRUD, bulk import |
| Subjects | `subjects.rs` | 2 | Subject management |
| Task | `task.rs` | 1 | Task tracking |
| Topic | `topic.rs` | 1 | Subject topics |
| **Super Admin** | `super_admin/routes.rs` | **25** | Platform-wide administration |

**Total: 130+ API Endpoints**

### Key Backend Features

#### 🔐 Authentication System
- Bcrypt password hashing (cost factor 10)
- JWT session tokens (1-hour validity)
- Security question with hashed answers for password recovery
- Temporary password generation for forgot-password flow
- Token revocation support (logout across devices)
- Session duration control per school (1–8760 hours)

#### 👨‍🎓 Student Management
- Complete CRUD with server-side validation (field length limits)
- Bulk import from JSON or Excel-compatible array (supports both camelCase and "Title Case" column names)
- Fee profile integration (full fee breakdown per student)
- Subject selection support

#### 👨‍💼 Employee Management
- Multi-field HR profiles with work experience and education history
- Supports multiple employee types (teacher, admin, support staff, etc.)
- Bulk import with row-by-row success/fail reporting
- Responsibility assignment system

#### 💰 Fee Management (18 Routes)
- School-wide fee type creation (monthly, quarterly, annual)
- Student-level fee assignment with payment tracking
- Custom one-off fees with batch student application
- Automatic pending fee calculation
- Discount application (percentage or flat)
- Referral coupon system (create → validate → use → block)
- Audit log for all fee transactions

#### 📅 Attendance System
- Mark individual or bulk attendance (present/absent/holiday)
- Role-based: separate records for `student`, `teacher`, `employee`
- Date-wise and user-wise listing
- School holiday management (create/check/delete)
- Legacy route alias for backward compatibility

#### 📝 Leave Management
- Full workflow: Apply → Approve/Reject → Extend/Reduce
- PDF leave letter generation using `printpdf` (A4 format, formatted)
- Leave status flow: `pending → approved/rejected`
- Duration modification after approval

#### 🏛️ Spaces & Infrastructure
- Full CRUD for physical spaces (classrooms, labs, halls)
- Space categorization system
- Material assignment to spaces (inventory linking)
- Employee assignment to spaces (duty assignment)
- Bulk import support

#### 💼 Payroll System
- Set base salary with parameters (hourly/daily/monthly)
- Month-wise salary breakdown calculation
- Bonus addition with description
- Financial aid/advance tracking

#### 🤖 AI Assistant (Gemini Integration)
- Natural language school data queries
- Multi-turn tool-calling loop (max 3 turns)
- Available tools: school stats, attendance summary, pending fees, fee financials, staff analytics, PDF report generation
- Requires `GEMINI_API_KEY`

#### 🔍 OCR Engine
- Multipart image upload
- Supports PaddleOCR (default) and Tesseract via query parameter
- Extracted text saved to `audit_logs`
- Optional compile-time feature flag (`--features ocr`)

#### 🛡️ Super Admin System (25 Routes)
- Separate JWT authentication for platform administrators
- Full school management: create, update, delete (cascade), block/activate
- Force session expiry across all school users
- Broadcast notifications to individual schools
- Full data export (JSON backup per school or all schools)
- Data import/restore
- Promo code system (credit amount, free days, discount %, expiry, max uses)
- Support ticket system (school-submitted → admin resolves)
- Manual and automated (15-min interval) backup system

### Database Tables

```
Authentication:    auth, tokens, auth_logs
Schools:           schools
Students:          students
Employees:         employees, employee_experience, employee_education
Attendance:        attendance, school_holidays
Fees:              fees, student_fees, custom_fees, custom_fee_applications,
                   referral_coupons, coupon_usage_log
Leave:             leave_applications
Payroll:           employee_salaries, employee_payments
Spaces:            spaces, space_categories, space_materials, space_employees
Materials:         materials, material_locations
Academics:         classes, subjects, exams, topics
Awards:            awards
Announcements:     announcements
Documents:         document_box
Complains:         complains
Responsibilities:  responsibilities, employee_responsibilities
Tasks:             tasks
Reminders:         reminders
Events:            events
Geo:               countries, states, districts
Super Admin:       super_admin, promo_codes, school_promo_codes, support_requests
Audit:             audit_logs
```

### Running the Backend

```bash
cd Backend

# Setup environment
cp .env .env.local
# Edit: DATABASE_URL, GEMINI_API_KEY, JWT_SECRET

# Run in development
cargo run

# Run with OCR support
cargo run --features ocr

# Skip OCR model loading (fast dev mode)
SKIP_OCR_INIT=true cargo run --features ocr

# Docker
docker-compose up -d
```

**Server runs on:** `http://localhost:8080`

---

## 🌐 School Admin Web App — `Vidhyam/`

**React 18 + Vite + Redux Toolkit + TailwindCSS + Bootstrap**

The primary web interface used by school staff to manage day-to-day operations.

### Feature Modules

| Module | Description |
|---|---|
| **Auth** | School login, JWT session management |
| **Dashboard** | Analytics overview — students, attendance, fees |
| **Academics** | Class management, subjects, exams, topics |
| **Students** | Enrollment, profiles, bulk import (Excel), fee status |
| **Employees** | Staff profiles, responsibilities, leave management |
| **Billing** | Fee collection, payment recording, coupon management |
| **Infrastructure** | Spaces (rooms/labs), materials inventory |
| **Documents** | File upload and document box |

### Key Libraries

| Library | Purpose |
|---|---|
| `@reduxjs/toolkit` + `react-redux` | Global state management |
| `react-router-dom` v7 | Client-side routing |
| `recharts` | Analytics charts and graphs |
| `framer-motion` | Smooth UI animations |
| `jspdf` + `jspdf-autotable` | In-browser PDF generation |
| `xlsx` | Excel file import/export |
| `react-calendar` | Date picker for attendance/leave |
| `react-hot-toast` | Toast notifications |
| `lucide-react` | Icon library |
| `TailwindCSS` + `Bootstrap` | Styling |

### Running Vidhyam

```bash
cd Vidhyam
npm install
npm run dev
# → http://localhost:5173
```

---

## 🛡️ Super Admin Panel — `SuperAdmin/`

**React 18 + Vite + Framer Motion**

Web dashboard for platform-level administrators to manage all registered schools.

### Pages

| Page | Purpose |
|---|---|
| `Login.jsx` | Super admin authentication |
| `Dashboard.jsx` | Platform-wide statistics overview |
| `SchoolsList.jsx` | All registered schools with status & controls |
| `SchoolDetail.jsx` | Individual school deep dive — data, sessions, billing |
| `SetupPage.jsx` | Register and onboard new schools |
| `PromoPage.jsx` | Create and manage promotional/discount codes |
| `SessionsPage.jsx` | View and revoke active school sessions |
| `SupportPage.jsx` | Support ticket management |
| `BackupPage.jsx` | Trigger manual backups, view restore points |
| `Billing/` | Subscription and billing management |

### Running Super Admin

```bash
cd SuperAdmin
npm install
npm run dev
# → http://localhost:3001
```

---

## 🔒 Environment Variables

### Backend (`Backend/.env`)

```env
DATABASE_URL=postgres://user:password@localhost:5432/aischool_db
GEMINI_API_KEY=your_google_ai_studio_key
JWT_SECRET=your_very_long_random_secret_key
REDIS_URL=redis://localhost:6379          # optional
SKIP_OCR_INIT=true                        # optional, dev only
```

### Vidhyam (`Vidhyam/.env`)

```env
VITE_API_URL=http://localhost:8080
```

---

## 🐳 Docker Deployment

```bash
# Build and start all services
cd Backend
docker-compose up -d

# Backend will be available at port 8080
# PostgreSQL at port 5432
```

`docker-compose.yml` includes:
- Rust backend service
- PostgreSQL database
- Automatic migration on startup
- 15-minute interval auto-backup

---

## 📄 API Documentation

All route documentation is in `Backend/`:

| Document | Routes Covered |
|---|---|
| [`api_documentation.md`](Backend/api_documentation.md) | Full reference |
| [`auth_route_documentation.md`](Backend/auth_route_documentation.md) | Auth (9 routes) |
| [`students_subjects_route_documentation.md`](Backend/students_subjects_route_documentation.md) | Students (8) + Subjects (2) |
| [`employees_route_documentation.md`](Backend/employees_route_documentation.md) | Employees (6 routes) |
| [`emppay_route_documentation.md`](Backend/emppay_route_documentation.md) | Payroll (4 routes) |
| [`fees_route_documentation.md`](Backend/fees_route_documentation.md) | Fees (18 routes) |
| [`attendance_route_documentation.md`](Backend/attendance_route_documentation.md) | Attendance (10 routes) |
| [`leave_route_documentation.md`](Backend/leave_route_documentation.md) | Leave (7 routes) |
| [`spaces_route_documentation.md`](Backend/spaces_route_documentation.md) | Spaces (12 routes) |
| [`class_route_documentation.md`](Backend/class_route_documentation.md) | Classes (3 routes) |
| [`materials_mobile_ocr_route_documentation.md`](Backend/materials_mobile_ocr_route_documentation.md) | Materials + Mobile + OCR |
| [`ai_route_documentation.md`](Backend/ai_route_documentation.md) | AI Assistant |
| [`geo_route_documentation.md`](Backend/geo_route_documentation.md) | Geo data (5 routes) |
| [`school_setup_route_documentation.md`](Backend/school_setup_route_documentation.md) | School + Setup (5 routes) |
| [`responsibility_route_documentation.md`](Backend/responsibility_route_documentation.md) | Responsibilities (5 routes) |
| [`announcement_route_documentation.md`](Backend/announcement_route_documentation.md) | Announcements |
| [`super_admin_route_documentation.md`](Backend/super_admin_route_documentation.md) | Super Admin (25 routes) |
| [`database_schema.md`](Backend/database_schema.md) | Full DB schema |

---

## 🏗️ Project Flow

```
School Registration (POST /api/setup/school)
        │
        ▼
Auto Login → accessToken received
        │
        ▼
School Admin logs into Vidhyam
        │
        ├── Add Classes, Subjects
        ├── Enroll Students (single or bulk import)
        ├── Add Employees (HR profiles)
        ├── Setup Spaces (rooms, labs)
        ├── Assign Materials to Spaces
        ├── Mark Daily Attendance
        ├── Manage Fee Collection
        ├── Process Leave Requests
        ├── Run Payroll
        └── Query AI Assistant for insights
```

---

## 📄 License

Private repository — © Modernisum. All rights reserved.
