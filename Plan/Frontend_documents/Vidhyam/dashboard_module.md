# Frontend Architecture Details: Dashboard Module

This document outlines the detailed breakdown of the `src/features/dashboard` feature module within the Vidhyam frontend application. It serves as the primary landing page after login, providing a high-level overview of the school's status and serving as the foundational UI layout container for all authenticated routes.

---

## 1. Directory Structure
`src/features/dashboard/`
*   `pages/` -> Contains the layout wrapper (`dashboard.jsx`) and the main landing view (`home.jsx`).

**(Note: This module does not contain local components or an API folder. It borrows from `src/components/ui/` for its layout and utilizes native `fetch` for data retrieval.)**

---

## 2. Page Components (`pages/`)

### A. `dashboard.jsx` (Dashboard Layout Wrapper)
This is the **root layout component** for all authenticated pages in Vidhyam.
*   **Core Logic**: 
    1. It wraps all child routes (`<Outlet />`) inside the `<SessionHandler>` ensuring they are protected.
    2. It places the `<SchoolNotifier>` (a global custom toast/alert system) at the top level.
    3. It maintains the core CSS layout grid: a flex container with the `<Sidebar>` on the left and the scrollable `<main>` area on the right.
*   **Design Note**: Applies a global `bg-gradient` and subtle blurred decorative background blobs (`blur-[100px]`) that persist across the entire application once logged in.

### B. `home.jsx` (Home Page / Overview Screen)
The main landing dashboard displaying high-level statistics and an interactive academic calendar.
*   **Core Logic**:
    1. Uses a `setInterval` to run a live clock (`currentDateTime`) that ticks every second.
    2. Uses `Promise.allSettled` to execute 4 parallel API fetches on mount to gather data for the metric cards.
    3. Contains robust custom logic to generate a month-view calendar grid (`calDays`), which automatically calculates start days, end days, marks Sundays, and overlays fetched "Holidays".
*   **API Usage (Native Fetch API)**:
    *   `GET /students/:schoolId/students` -> (Used simply to count array length for "Total Students" stat).
    *   `GET /employees/:schoolId/employees` -> (Count length for "Total Employees").
    *   `GET /class/:schoolId/classes` -> (Count length for "Active Classes").
    *   `GET /operations/attendance/:schoolId/holidays` -> (Fetches array of date ranges to map onto the calendar grid).
*   **Components/UI**: Heavy usage of `framer-motion` for stagger fade-ups. Features 4 stat cards (Students, Employees, Classes, Date), a hardcoded "Notices" list, a System Architecture health card, and the full interactive Academic Calendar at the bottom.

---

## Developer Takeaways
1.  **Inefficient Data Fetching Strategy**: To display the "Total Students" and "Total Employees" numbers on the dashboard, `home.jsx` is pulling down the *entire* array of all students and all employees from their respective list routes, just to read `.length`. For a school with thousands of students, this payload will eventually become unnecessarily massive and slow down the initial dashboard load. It is highly recommended to create a dedicated backend route (`GET /dashboard/:schoolId/stats`) that simply returns the integer counts from a quick SQL `COUNT()` query instead of sending back all the rows.
2.  **Hardcoded Data**: The "Upcoming Notices" section in `home.jsx` currently uses a hardcoded array in state. This needs to be hooked up to an Announcements API endpoint in the future.
