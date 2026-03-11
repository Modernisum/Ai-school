# Frontend Architecture Details: Infrastructure Module

This document details the breakdown of the `src/features/infrastructure` feature module in the Vidhyam frontend application. It contains facilities management, system configurations via School Profile, and the administrative complaint system.

---

## 1. Directory Structure
`src/features/infrastructure/`
*   `components/` -> Currently an empty directory or holds unlinked components.
*   `pages/` -> Contains the primary container views (`complain.jsx`, `schoolprofile.jsx`, `space.jsx`).

**(Note: This module strictly uses native browser `fetch` for all API calls. There is no RTK Query integration.)**

---

## 2. Page Breakdowns (`pages/`)

### A. `space.jsx` (Space & Facilities Management)
A complex page designed for tracking physical rooms (Classrooms, Labs, Libraries) and linking them to inventory materials and assigned employees.
*   **Core Logic**:
    1. Fetches a list of spaces via `GET /spaces/:schoolId/spaces` and categories via `GET /spaces/:schoolId/categories`.
    2. Uses an expandable `AnimatePresence` accordion system. When a space is clicked, it fetches deeper relational data (`GET /spaces/:schoolId/:spaceId`) to retrieve assigned materials and employees.
    3. Handles **Material Binding**: Admins can assign existing inventory items to a specific room (e.g. allocating 5 Microscopes to the Science Lab).
    4. Handles **Employee Binding**: Admins can assign staff members (e.g. "Lab Assistant") to supervise specific spaces.
*   **External API Hooks**: This page reaches out to other modules' base endpoints to function:
    *   `GET /materials/:schoolId` (To find available items to assign)
    *   `GET /employees/:schoolId/employees` (To find staff to assign)
*   **UI Components**: Utilizes `<BulkImportModal>` for quick CSV setup of hundreds of rooms.

### B. `schoolprofile.jsx` (Global Account Settings)
A heavy settings page where the Super Admin manages the school's core identity, academic structure, contact info, and security credentials.
*   **Core Logic**:
    1. Segmented into 4 physical UI sections (Identity, Academic Structure, Contact, Security), each with independent "Edit", "Cancel", and "Save" toggle states.
    2. Maintains a `data` state object (the truth) and a `draft` state object (used only while actively editing a section).
    3. Features a unique, read-only **Billing & Subscription** panel that alerts the admin if their `walletBalance` is low (`billingStatus === 'warning'` or `'suspended'`).
*   **Local Storage Linking**: Saving the "Class Level" directly updates `localStorage.setItem('schoolLevel', ...)` which likely affects menu behaviors across the app.

### C. `complain.jsx` (Complaint Management)
A straightforward ticket tracking system.
*   **Core Logic**: 
    1. Fetches all active complaints lodged by students/parents via `GET /complains/:schoolId`.
    2. Click-to-open drawer displaying `studentId`, timestamps, and the complaint description.
    3. Visualizes resolution status with colored badges (`pending = amber`, `resolved = emerald`, `dismissed = slate`).

---

## Developer Takeaways
1.  **Overlapping Domains**: `space.jsx` dynamically calls `/materials` and `/employees` APIs directly using hardcoded base URLs. While functional, it breaks the modular isolation pattern. If those external backend routes change, `space.jsx` will silently break.
2.  **State Duplication**: The `schoolprofile.jsx` page maintains a local `draft` state alongside its `data` state for inline editing. This is a robust pattern for avoiding accidental mutations before the "Save" button is explicitly clicked.
3.  **Authentication Control**: `schoolprofile.jsx` houses the explicit log-out button that purges `accessToken` and `schoolId` from `localStorage` and forcibly navigates to `/`.
