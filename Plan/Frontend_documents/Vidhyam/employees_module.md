# Frontend Architecture Details: Employees Module

This document outlines the detailed breakdown of the `src/features/employees` feature module within the Vidhyam frontend application. It handles staff registration, leave applications, and payroll generation.

---

## 1. Directory Structure
`src/features/employees/`
*   `api/` -> Contains Redux Toolkit (RTK) Query logic (`employeeApi.js`) for fetching and managing core employee lists.
*   `components/` -> High-complexity components such as the multi-step `employeeform.jsx` and the `LeaveManagement.jsx` admin table.
*   `pages/` -> The primary container views accessible from the routing system (`employee.jsx`, `payroll.jsx`).

---

## 2. API Integration (`api/employeeApi.js`)
Unlike modules such as Auth or Billing which rely purely on native `fetch()`, this module introduces `RTK Query` for managing its core entity list.
*   **Endpoints defined**:
    *   `GET /employees/:schoolId/employees` (query: `getEmployees`)
    *   `POST /employees/:schoolId/employees` (mutation: `addEmployee`)
    *   `DELETE /employees/:schoolId/employees/:employeeId` (mutation: `deleteEmployee`)
*   **Benefits**: Automatically caches the employee list in the Redux store tag `['Employee']`. Automatically refetches upon successful creates/deletes.

---

## 3. Page Breakdowns (`pages/`)

### A. `employee.jsx` (Employee Management Directory)
The primary index for navigating staff members.
*   **Core Logic**: 
    1. Replaces manual `fetch` calls with RTK's `useGetEmployeesQuery()`.
    2. Allows filtering employees dynamically by text `search` or `filterType` (Teacher, Principal, Admin Staff).
    3. Triggers the `<BulkImportModal>` allowing CSV uploads of large staff rosters.
    4. Features an animated side-drawer (`AnimatePresence` panel sliding from the right) when clicking "View" on an employee to show detailed stats.
*   **Components**: Clean glassmorphism cards (`glass-card`) for each employee displaying a role badge, auto-generated avatar initials, and action buttons.

### B. `payroll.jsx` (Salary & Automation)
A dedicated page for managing employee salaries and executing monthly closures.
*   **Core Logic**:
    1. Bypasses the RTK Query `useGetEmployeesQuery` used in `employee.jsx` and strangely falls back to a redundant native `fetch` call (`${EMP_API_BASE}/${schoolId}/employees`) to load the employee list again.
    2. Admins can click a staff member to view their "Salary Breakdown".
    3. Handles triggering "Auto Close Month" which calculates Base + Allowances + Bonuses - Absence Deductions, generates a payroll record ledger item, and locks the balance.
*   **Specific Endpoints Used (via native fetch, bypassing RTK)**:
    *   `GET /emppay/:schoolId/:employeeId/breakdown`
    *   `POST /emppay/:schoolId/:employeeId/close-month`

---

## 4. Key Local Components (`components/`)

### A. `LeaveManagement.jsx`
A robust admin table component specifically for approving or rejecting leave requests.
*   **Core Logic**:
    *   Renders a table of leaves (From, To, Reason, Status).
    *   Admins can click "Approve" (calls `POST /leave/:schoolId/:leaveId/approve`) or "Reject".
    *   If a leave is `approved`, it dynamically renders a "Download PDF" link triggering the backend's PDF generator stream (`/leave/.../pdf`).
*   **Utility Usage**: Imports a custom wrapper `callApiWithBackoff` from `../../../utils/api` instead of standard fetch, ensuring resilient network requests.

### B. `employeeform.jsx` & `addemployee.jsx`
*   *(Not deeply analyzed line-by-line)* Very large files (~94kb) likely containing highly complex, multi-segmented HTML forms gathering extensive PII, qualification data, and document bounds for standard school Staff Registrations.

---

## Developer Takeaways
1.  **Architecture Inconsistency (RTK vs. Fetch)**: This module is suffering from split architectural paradigms. `employee.jsx` successfully utilizes RTK Query to load and cache the staff list. However, `payroll.jsx` (which needs exactly the same list) uses a native `fetch()` wiping out all caching benefits. `payroll.jsx` should be refactored to use `useGetEmployeesQuery()` from `employeeApi.js`.
2.  **API Structure Consistency**: The Payroll route is hardcoded to use `/emppay` instead of standardizing underneath the `/employees/...` prefix scope in the backend. 
3.  **PDF Generation Hooks**: `LeaveManagement.jsx` elegantly handles opening generated PDFs by treating the backend authenticated route directly as an `href` target in a new window via `target="_blank"`.
