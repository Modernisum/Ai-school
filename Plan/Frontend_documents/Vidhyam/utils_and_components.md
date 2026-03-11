# Frontend Architecture Details: Shared Utilities & UI Components

This document outlines the architecture and implementation details of the global shared resources located in `src/utils` and `src/components/ui` within the Vidhyam frontend application.

---

## 1. Utilities (`src/utils/`)

The utilities directory provides generic, highly reusable functions that keep components clean.

### `helpers.js`
Contains standard data formatting functions used across all tables and profile views.
*   **Date/Time Modifiers:** `formatDate`, `formatDateTime`, `formatTime`, `formatTimestamp`. These safely handle JavaScript Date objects, string dates, and Firestore-style `_seconds` timestamps.
*   **Text/Currency Formatters:** `formatClassName` (normalizes class IDs into title case strings), `formatCurrency` (adds the ₹ symbol and standard Indian numerical grouping).
*   **Class Names:** Includes a `cn` utility (often used with Tailwind) for conditional class joining.

### `api.js`
Handles core API configuration and network resilience.
*   **Base URL Config:** Evaluates `import.meta.env.VITE_API_BASE_URL` or dynamically builds it via `window.location.hostname`.
*   **`getSchoolIdFromStorage`:** A robust lookup function that attempts to extract the tenant `schoolId` falling back through multiple `localStorage` keys (`schoolId`, `currentSchoolId`, `userData` JSON object, etc.).
*   **`callApiWithBackoff`:** A highly useful wrapper around native `fetch`. It implements an exponential backoff retry mechanism (default 3 retries: wait 1s -> wait 2s -> wait 4s) to handle transient network instability. It also safely handles parsing both JSON and Text error responses.

### `academicUtils.js`
Provides pure functions for deriving academic structures.
*   `getClassesByLevel(level)`: Generates a list of valid classes (e.g., Nursery to Class 10/12) based on an integer `level`.
*   `getSectionForRoll(roll)`: Automatically derives a student's section (A, B, C...) based on their roll number, assuming 60 students per section.

### `theme.js`
A static configuration file defining a consistent color palette and gradient objects (`primary`, `success`, `warning`, `danger`) used frequently by UI elements.

---

## 2. Shared UI Components (`src/components/ui/`)

These represent the application's core structural and interaction components, decoupled from specific business modules.

### `Sidebar.jsx`
The primary navigation controller for the entire dashboard layout.
*   **Design:** Heavy usage of `framer-motion` to smoothly collapse/expand. Uses sleek gradients and glassmorphism styling.
*   **Routing Logic:** Maintains a `menuItems` array mapping to parent routes, and a `SUB_LINKS` object that dynamically renders child routes (e.g., "Add Student" inside the "Student" section) only when the parent section is active.
*   **Active State Detection:** Implements a robust `isPathActive` function that checks both `location.pathname` and `location.search` (`?add=1` vs generic lists) to accurately highlight the exact active route.

### `SchoolNotifier.jsx`
A global floating notification listener.
*   **Behavior:** Polls `/school/:schoolId/notification` every 60 seconds (with an immediate initial check) to fetch urgent messages from the Super Admin.
*   **Rendering:** Uses `framer-motion`'s `AnimatePresence` to blur the background and pop up a forced-acknowledgment modal tailored to the notification type (info, warning, error colors).
*   **Dismissal:** Users must click "I Understand" which triggers a `DELETE` request to clear the alert state.

### `BulkImportModal.jsx`
A generic, multi-step wizard for Excel/CSV data ingestion.
*   **Dependencies:** Runs on `xlsx` for parsing spreadsheet binary files.
*   **Flow:**
    1.  **Upload:** drag-and-drop or click to upload `.xlsx` / `.csv`. Also offers a "Download Template" button based on `expectedHeaders`.
    2.  **Preview & Validation:** Automatically reads sheet row-by-row and runs through a `validateRow` function (which ensures `expectedHeaders` aren't blank). Renders a color-coded table indicating valid/invalid rows.
    3.  **Submission:** On "Confirm Import", passes the clean array of objects to an asynchronous `onImport` prop provided by the parent view.

---

## Developer Takeaways
1.  **High Reusability in UI:** The `BulkImportModal` is an excellent generic component. Its API (`columns`, `expectedHeaders`, `onImport` callback) makes it trivially easy to implement importing across *any* module (Students, Staff, Materials, etc.) without re-writing file-reading logic.
2.  **Resilient Fetching:** Utilizing `callApiWithBackoff` inside deeply nested components (like `studentprofile.jsx` seen earlier) is a strong pattern for mobile/low-connectivity environments, though it explicitly breaks away from RTK Query tools.
3.  **Sidebar Scaling:** The hardcoded `SUB_LINKS` mapping inside `Sidebar.jsx` means whenever a new route or tab is added to a module, a developer must remember to modify `Sidebar.jsx` to ensure navigation correctly highlights. Moving this to a route-config object could improve global maintainability.
