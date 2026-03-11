# Super Admin Architecture Details: Schools & Dashboard

This document covers the core administrative modules for managing school instances and platform-wide monitoring.

---

## 1. Dashboard (`src/pages/Dashboard.jsx`)
The Dashboard provides the primary entry point for monitoring the platform's health and growth.

*   **Growth Metrics**: Tracks total registrations, active instances, and monthly growth (New this month).
*   **Time-Series Tracking**: Visualizes registration trends by grouping schools by their `createdAt` date into monthly buckets.
*   **Real-time Activity**: Shows the most recent 8 registrations for quick auditing of new signups.

---

## 2. Schools Management (`src/pages/SchoolsList.jsx`)
The Schools List is the most action-heavy module in the Super Admin panel. It uses an **Elevated Card** layout for each school instance.

### A. Administrative Actions
Each school card offers a suite of critical operations:
*   **Status Control**: Instantly switch schools between `active`, `blocked`, or `inactive`. Blocked schools are prevented from logging in.
*   **Security Management**:
    *   **Password Reset**: Change the school's principal/admin password directly.
    *   **Session Expiration**: Force-expire all active web sessions for a specific school (Security lockout).
*   **Communication**:
    *   **Global Notifier**: Send overlay notifications (Info, Warning, Critical) that appear on the specific school's dashboard.
*   **Data Portability**:
    *   **Export Backup**: Downloads the entire school dataset (students, employees, attendance, etc.) as a specialized JSON file.
*   **Instance Deletion**: Permanent removal of all school records and associated data.

### B. Filtering & Sorting
*   **Search**: Real-time filtering by School Name or School ID.
*   **Status Filter**: View only blocked or active schools.
*   **Temporal Sorting**: Sort by registration date (Newest vs Oldest).

---

## 3. Technical Implementation
*   **Contextual Feedback**: Uses a `ToastCtx` (Toast Context) for immediate success/error feedback on async actions like deletions or password changes.
*   **Confirmation Guards**: critical destructive actions (like deletion) are protected by browser confirmation dialogs.
*   **Navigation Flow**: Deep linking to `/schools/:id` for more granular details (managed in `SchoolDetail.jsx`).

---

## Developer Takeaways
1.  **Safety Procedures**: The `expireSessions` and `deleteSchool` actions are high-impact. When modifying these, ensure the backend confirmation handshake is robust.
2.  **Notification System**: The notification type (`info`, `warning`, `error`) affects the top-border color on the school's frontend. Ensure consistency when adding new notification categories.
3.  **Data Architecture**: School-specific metadata (like Principal Name or specific address) is stored in a nested `data` object within the school record.
