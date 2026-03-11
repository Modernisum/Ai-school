# Super Admin Architecture Details: Schools List Module

This document details the central hub for managing all school instances within the platform.

---

## 1. Overview
The Schools List is the primary interface for auditing, managing, and interacting with registered schools. It uses a high-density "Elevated Card" layout to show critical data and provide quick-access administrative actions.

**Location**: `src/pages/SchoolsList.jsx`

---

## 2. Dynamic Filtering & UI
The module is designed for efficient navigation through hundreds of instances:
*   **Omni-Search**: Real-time filtering by `schoolName` or `schoolId`.
*   **Quick Filters**: Status-based filtering (`Active`, `Blocked`, `Inactive`).
*   **Smart Sorting**: Toggle between `Newest First` (default for auditing) and `Oldest First`.
*   **Status Badges**: Visual coding for instance health (Green = Active, Amber = Blocked/Warning, Slate = Inactive).

---

## 3. Core Administrative Actions
Each school card contains a suite of terminal and sensitive operations:

### A. Security & Access Control
*   **Activate/Block**: Instant status toggling. Blocking a school prevents all users from that instance from logging in.
*   **Password Reset (`doChangePw`)**: Super Admins can override the school's admin password via a secure modal.
*   **Session Lockout (`doExpire`)**: Force-terminates all active browser sessions for the school.

### B. Communication & Maintenance
*   **Global Notifier (`doNotify`)**: Sends a targeted notification (Info/Warning/Error) directly to the specific school's local dashboard.
*   **Data Export**: Triggers a full JSON backup of the school's specific data hierarchy.
*   **Purge (`doDelete`)**: Permanent removal of the school and all its nested records (Students, Exams, Financials, etc.). Protected by a confirmation guard.

---

## 4. Technical Implementation
*   **AnimatePresence**: Uses Framer Motion's `AnimatePresence` to handle smooth card removal/addition transitions during filtering or deletion.
*   **Busy State Management**: Implements a `busy` state to prevent race conditions during async operations (e.g., clicking 'Delete' twice).
*   **Navigation Logic**: Deep links to `/schools/:id` for granular configuration and `/schools/:id/sessions` for real-time monitoring.

---

## Developer Takeaways
1.  **StopPropagation**: The action buttons use `e.stopPropagation()` to prevent the parent card click (navigation to detail) from triggering.
2.  **Date Formatting**: Uses a `daysAgo` helper to show relative registration age, providing better context for "New this Month" metrics.
3.  **Token Validation**: The `load` function specifically checks for "token" errors in API responses to trigger a logout/re-authentication flow.
