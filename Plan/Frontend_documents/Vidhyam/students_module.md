# Frontend Architecture Details: Students Module

This document outlines the architecture and implementation details of the `src/features/students` feature module within the Vidhyam frontend application. This module handles student lists, admissions, profile viewing, attendance viewing, and document management.

---

## 1. Directory Structure & State Choices
`src/features/students/`
*   `api/` -> `studentApi.js` (Redux Toolkit Query implementation).
*   `components/` -> Smaller modular files (`addstudent.jsx`, `editstudent.jsx`, `studentprofile.jsx`).
*   `pages/` -> Main container view (`student.jsx`).

**State Management**:
This module uses a hybrid approach:
1.  **Redux Toolkit Query (RTK Query)**: Used exclusively for fetching and invalidating the core student list (`getStudents`, `getStudentById`, `addStudent`, `updateStudent`).
2.  **Native `fetch()`**: Used for auxiliary actions within the same module (e.g. fetching attendance, subjects, classes, referral coupons, generating next roll numbers, uploading documents).
3.  **Local Component State**: Heavy reliance on `useState`/`useMemo` for client-side filtering (by name, class, ID).

---

## 2. Page Breakdowns

### A. `pages/student.jsx` (Student List & Quick Attendance)
The primary entry point, housing two major sub-views (Tabs): "Overview" and "Attendance".
*   **Overview Tab Logic**:
    *   Downloads the full student list via RTK Query (`useGetStudentsQuery`).
    *   Computes client-side live stats (Total Regular/Private students) feeding into Recharts Pie Charts.
    *   Provides a search and filter table. Clicking "Eye" opens a quick-view Drawer overlay displaying basic profile info and a **ProfileFeeSummary** (which natively fetches `/students/:schoolId/students/:studentId/profile`).
*   **Attendance Tab Logic**:
    *   Natively fetches daily attendance (`GET /operations/attendance/...`) to get a list of `presentIds`.
    *   Admins can toggle attendance natively (POST for present, DELETE for absent).
    *   Also natively fetches `/operations/attendance/:schoolId/holidays` to disable attendance marking on designated holidays/Sundays.

### B. `components/addstudent.jsx` (New Admission Form)
A complex, wizard-style long-form component broken down into 4 sections: Personal, Contact, Academic, Transport.
*   **Core Behaviors**:
    *   *Auto-generation*: Natively calls `/students/:schoolId/nextRoll` based on the selected class to calculate the next sequential `rollNumber`.
    *   *Subject Calculation*: When a class is selected, natively fetches `/subjects/:schoolId`, filtering to subjects available for that class, identifying "Compulsory" subjects, and auto-calculating `totalFees`.
    *   *Coupon Validation*: Includes a native fetch to `/fees/:schoolId/coupons/validate` to apply student referring discounts during admission.
    *   *Student Type Lock*: Automatically sets `studentType` to 'Regular' if the chosen class is 9th or below.

### C. `components/studentprofile.jsx` (Detailed Student Profile)
A monolithic (1700+ line) comprehensive dashboard for an individual student. *Currently located in `components/`, but acts as a full page route in practice.*
*   **Sub-Systems**:
    1.  **Identity & Emergency**: Read-only display of basic info.
    2.  **Documents Section**: Renders UI to preview or download uploaded Aadhaar, Marksheets, etc. using `ImagePreviewModal`.
    3.  **Attendance History Detailed**: Renders a full React-Calendar view highlighting Present/Absent/Holiday statuses. Includes a PDF Export feature (`jspdf` and `jspdf-autotable`).
    4.  **Fees History**: Timeline view of payments vs discounts.
*   **Utilities**: Utilizes a custom utility `callApiWithBackoff` (from `src/utils/api.js`) to handle flaky network requests with automatic retries, bypassing RTK Query.

---

## Developer Takeaways
1.  **Hybrid Fetching Inconsistencies**: The module is torn between `studentApi.js` (RTK Query) for CRUD and `fetch()` for everything else. This leads to disjointed caching. E.g., adding a student via the form invalidates the RTK Query cache, but submitting fees or marking attendance inside the profile component circumvent Redux entirely.
2.  **Giant Components**: `studentprofile.jsx` is almost 1800 lines long. It memoizes massive chunks (`AttendanceCalendar`, `DocumentsSection`, `FeesHistory`) but keeps them in the exact same file. This severely impacts code readability and maintainability. These could instantly be broken into distinct `.jsx` files.
3.  **Direct DOM Logic**: `student.jsx` has inline Recharts logic and heavy array filtering embedded directly within the render loop (though slightly mitigated by `useMemo`).
4.  **UI Tooling**: Heavy/excellent reuse of `framer-motion` for transitions, generic Modals for image previews, and `jspdf` for client-side report generation.
