# Vidhyam Frontend Architecture & Developer Guide

## 1. Overview & Tech Stack
The **Vidhyam frontend** is a modern, responsive Single Page Application (SPA) designed for school management. It uses a component-based structure built for performance and high interactivity.

**Core Technology Stack:**
*   **Framework**: React 18
*   **Build Tool**: Vite (Lightning fast HMR and optimized builds)
*   **Routing**: React Router DOM v7
*   **State Management**: Redux Toolkit (RTK) with RTK Query for data fetching
*   **Styling**: Tailwind CSS (with complex custom variants and responsive design)
*   **Animations**: Framer Motion (for page transitions, modals, and micro-interactions)
*   **Icons**: Lucide React
*   **Charts**: Recharts (for dashboards and analytics visualizations)
*   **PDF Generation**: jsPDF & jsPDF-AutoTable

**Design Language:**
*   **Aesthetics**: "Glassmorphism" combined with dark mode themes (Slate/Indigo/Violet/Emerald).
*   **Components**: Features heavily rely on translucent `glass-card` classes with distinct gradients, animated badges, and rich tooltips.

---

## 2. Global Architecture & Project Structure

The project root is under `/Vidhyam`. The main code lives in `src/`.

### Directory Layout
```text
src/
├── app/                  # Redux store configuration (store.js)
├── components/           # Reusable UI components (Sidebar, Modals, Loaders, generic buttons)
├── features/             # Feature-based modular directories (The Core of the App)
│   ├── academics/        # Exams, attendance, materials, subjects
│   ├── auth/             # Login, setup
│   ├── billing/          # Fees, custom fees, referral coupons
│   ├── dashboard/        # Main dashboard layout and home overview
│   ├── documents/        # Global file/document upload mapping
│   ├── employees/        # Employee list, payroll, leave management, profiles
│   ├── infrastructure/   # Complains, School settings, Space/Class management
│   └── students/         # Student directory, bulk import, student profiles
├── utils/                # Helper functions (date formatting, calculation utils)
├── App.jsx               # Application router and lazy loading index
├── index.css             # Tailwind directives and custom utility classes
└── index.jsx             # React DOM mount point
```

### State Management & API Fetching
*   **Data Fetching**: The app avoids `useEffect`-heavy fetching where possible and delegates it to **RTK Query**. 
*   **Slices defined in `app/store.js`**:
    *   `studentApi`: Handles student operations.
    *   `employeeApi`: Handles staff and payroll.
    *   `academicApi`: Handles exams and subject mapping.
*   **Local State**: Managed via `useState`, heavy computations via `useMemo`.

### Routing (App.jsx)
Routing heavily utilizes **Lazy Loading** (`React.lazy` with `Suspense`) to ensure initial load performance is fast. 
*   `/` -> SchoolLoginPage (`features/auth/pages/login.jsx`)
*   `/setup` -> School Setup Wizard (`features/auth/pages/setup.jsx`)
*   `/dashboard/*` -> Protected routes wrapping a `DashboardLayout` standardizer.
    *   `/dashboard/home` (Home Dashboard)
    *   `/dashboard/student`, `/dashboard/employee`, `/dashboard/fees`, etc.

The layout is wrapped by `<SessionHandler>` which checks localStorage (`accessToken`, `schoolId`) to validate the user session before rendering child routes.

---

## 3. Module Breakdown (Page by Page Guide for Developers)

Below is an overview of what each feature/module does to help developers quickly locate bugs or implement enhancements.

### A. Auth Feature (`/features/auth`)
*   **`login.jsx`**: Main gateway. Validates credentials, receives the JWT payload, sets `schoolId` and `accessToken` in localStorage, and redirects to Dashboard.
*   **`setup.jsx`**: First-time wizard for onboarding a new school instance.

### B. Dashboard Feature (`/features/dashboard`)
*   **`dashboard.jsx`**: The main layout wrapper. It renders the Sidebar, the `SchoolNotifier`, and implements the global dark gradient background with glowing blur orbs. Uses `<Outlet>` to render sub-pages.
*   **`home.jsx`**: Aggregates high-level metrics (Total students, Revenue, Pending Complaints) to provide a bird's eye view.

### C. Students Feature (`/features/students`)
*   **`student.jsx`**: A highly comprehensive page with tabs for **"Overview"** and **"Attendance"**.
    *   *Overview Tab*: Uses Recharts to show Regular vs Private pie charts. Implements search and filtering. Renders students in a mapped table.
    *   *Attendance Tab*: Integrates calendar to quickly mark bulk present/absent states. Fetches holidays to disable dates.
    *   Contains a sliding **Profile Drawer** powered by Framer Motion to view individual metadata and fee summaries dynamically.
*   **`addstudent.jsx`**: Logic-heavy form to onboard a new student, dealing with classes, parent details, and type (Regular/Private).
*   **`BulkImportModal`**: Renders a UI for parsing Excel/CSV files to bulk import students.

### D. Employees Feature (`/features/employees`)
*   **`employee.jsx`**: Directory of staff members. Similar layout to students (Grid/Table view).
*   **`employeeprofile.jsx` & `employeeform.jsx`**: For viewing detailed stats (performance, leave tracking) and editing records.
*   **`payroll.jsx`**: Manages salary generation, bonus logic, and deductions. (Links with `employeeApi`).
*   **`LeaveManagement.jsx`**: UI for approving/rejecting leave requests.

### E. Billing / Fees Feature (`/features/billing`)
*   **`fees.jsx`**: Tracks financial metrics. Split into **Student Fees** and **Custom Fees**.
    *   Calculates Collection Rate, Paid, and Pending amounts.
    *   Permits creation of "Custom Fees" with penalties (e.g., Late Fee, Bus Fee) scoped to entire schools, specific classes, or individual students.
*   **`referralCoupons.jsx`**: UI to generate and track discount codes for marketing/enrollment boosts.

### F. Academics Feature (`/features/academics`)
*   **`attendance.jsx`**: Manages School Holidays and Announcements. Includes an interactive calendar with auto-Sunday detection and employee holiday exceptions.
*   **`Materials.jsx`**: Inventory ledger for school items. Supports buying/selling logic, stock history, and bulk Excel imports.
*   **`subject.jsx`**: Configuration of school subjects, mapped to classes with associated fee structures and schedules.
*   **`exam.jsx`**: AI-powered Exam Paper Generator. Supports selecting chapters, generating question structures, and PDF exports with a robust fallback template.

### G. Infrastructure Feature (`/features/infrastructure`)
*   **`complain.jsx`**: Ticketing system for parents/students to report issues. Displays status badges (Open, Resolved).
*   **`school.jsx` & `schoolprofile.jsx`**: Global school settings, metadata (logo, address, contact). Allows super admin modifications.
*   **`space.jsx`**: Management of physical infrastructure (classrooms, labs, libraries).

### H. UI Components Library (`/components/ui`)
The application uses a set of shared, reusable UI components to maintain consistency:
*   **`Sidebar.jsx`**: Global navigation menu.
*   **`SchoolNotifier.jsx`**: Global notification banner system.
*   **`BulkImportModal.jsx`**: Modal interface for dropping in Excel/CSV files.
*   **`SessionHandler.jsx`** (in auth): Context provider ensuring secure routing.

---

## 4. API Integration & Data Flow
The frontend communicates with a Rust backend (typically at `http://localhost:8080/api` or configured via `VITE_API_BASE_URL`). 

**Key API Patterns Used:**
*   **RTK Query** is implemented in `app/store.js` using RTK APIs (e.g., `studentApi`, `employeeApi`).
*   **Native Fetch API** is heavily used throughout the application for specific CRUD operations natively inside component effects or handlers.

**Common Endpoints Handled Natively:**
1.  **Students Module**:
    *   `GET /students/:schoolId/students` & `/students/:schoolId/students/:studentId/profile` (Student listing & details)
    *   `POST /students/:schoolId/students/bulk` (Excel Import)
2.  **Attendance Module**:
    *   `GET /operations/attendance/:schoolId/student/date/:date` (Fetch present students)
    *   `POST /operations/attendance/:schoolId/student/:studentId/present` (Mark present)
3.  **Fees & Billing Module**:
    *   `GET /fees/:schoolId` & `GET /fees/:schoolId/custom` (Fetch fee records)
    *   `POST /fees/:schoolId/custom` (Create new custom fee rules)
4.  **Employees Module**:
    *   `GET /employees/:schoolId/employees` (Staff listing)
    *   `GET /employees/:schoolId/payroll/` (Payroll summaries)
5.  **Infrastructure & Academics**:
    *   `GET /class/:schoolId/classes` (Fetch available classes)
    *   `GET /materials/:schoolId` (Fetch study materials)
    *   `POST /complains/:schoolId` (Create new issues)

**Authentication Headers:** 
Standard HTTP fetch requests manually append `Authorization: Bearer <token>` retrieved from `localStorage.getItem('accessToken')`.

---

## 5. Current State: What's Complete vs. Pending?

**✅ Completed / Mature Features:**
1.  **Core Foundation:** Vite config, Tailwind theming, Routing, Framer Motion integration.
2.  **Auth & Session:** Robust localStorage approach mapped inside `SessionHandler`.
3.  **Student Management:** Highly stable. Search, filter, bulk import, visual analytics, drawer profiles, and live attendance are all implemented.
4.  **Fees Management:** Advanced custom fee creation logic is built (scoping, penalties, one-time vs recurring).
5.  **RTK Query Integration:** The boilerplate for the store is established and operational for students/employees.

**🚧 Pending / Needs Refinement (Observations for Next Steps):**
1.  **Error Handling Global Boundaries**: Could benefit from a global Error Boundary in React to prevent white-screens on render errors.
2.  **Document Upload Integration (`upload.jsx`)**: The backend Cloud Storage (GCS) integration is being finalized; the frontend needs to ensure it perfectly parses GCS Signed URLs for uploads.
3.  **Performance Tuning**: While lazy loading is active, some large forms (like multi-step employee/student forms) might need careful memoization if they become slow on low-end devices.
4.  **Typesafety**: The project uses JavaScript (`.jsx`), not TypeScript. Type-checking relies largely on developer discipline. Proceed carefully when altering shared utility models or API expected JSON shapes.

## 6. Quick Fix Guide for Developers
*   **Component Not Re-rendering?** Check if you're mutating local state directly. Ensure Redux dispatch or `setState([...newState])` is used.
*   **API Calls failing?** Verify `.env` file logic. By default, API hits `http://localhost:8080/api` if `VITE_API_BASE_URL` is omitted. Ensure the backend is running and CORS allows the Vite origin (usually port 5173).
*   **UI glitches in Animations?** Verify `<AnimatePresence>` wraps your conditional Framer Motion components containing `exit` props.
*   **Styling issues?** Make sure you are using Tailwind utility classes. Global custom classes (like `glass-card`, `btn-primary`, `input-dark`) are defined in `index.css`. Look there before writing inline styles.
