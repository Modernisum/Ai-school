# Super Admin Architecture Details: Operations & Support

This document details the operational sub-modules: Backup & Restore, Support Ticketing, and Global Data Synchronization.

---

## 1. Backup & Restore (`src/pages/BackupPage.jsx`)
The platform implements a JSON-based data portability layer allowing for granular or bulk data migrations.

### A. Data Portability
*   **School Export**: Generates a monolithic JSON object containing all school-related data (Students, Staff, Attendance, Fees, etc.). Supports single school or "All Schools" bulk export.
*   **Restoration (JSON Import)**: Allows uploading a backup file into a selected school instance. 
    *   **Note**: The system uses **upsert** logic, meaning it will update existing records if IDs match or create new ones if they don't.
*   **Auto-Backup Trigger**: While the server runs incremental backups every 15 minutes, the Super Admin can trigger a "Manual System Backup" to ensure data safety before major changes.

### B. Geo Data Management
A specialized feature for managing the platform's location database (Countries, States, Districts).
*   **Download geo.json**: Export the current geographical structure.
*   **Upload & Sync**: Force sync the backend database with a new geo-structure file.

---

## 2. Support Ticketing (`src/pages/SupportPage.jsx`)
A simplified helpdesk for internal communication between school admins and the platform owner.

*   **Inbound Requests**: Schools can send "Support Requests" (typically for password resets or login issues) which land in this queue.
*   **Categorization**: Track requests by school name and contact info.
*   **Workflow**: 
    1.  **Pending**: Request received and visible to Super Admin.
    2.  **Resolved**: Admin marks the request as resolved after taking action (e.g., reset via Schools module).

---

## 3. Session Monitoring (`src/pages/SessionsPage.jsx`)
*(Based on API/Routing Analysis)*
*   Allows Super Admins to view active browser sessions for any given school ID.
*   Provides transparency into who is currently logged into the platform at a school level.

---

## Technical Implementation
*   **Geo Sync**: Uses a specific `/api/geo/export` and `/api/geo/import` cluster on the backend.
*   **Blob Handling**: Exported JSON is handled via `window.URL.createObjectURL(blob)` for browser-side downloads.
*   **Real-time Toasts**: Status of all background operations (backups, imports) is provided via a centralized Toast notification system.

---

## Developer Takeaways
1.  **Upsert Risk**: During restore, remind users that existing data with conflicting IDs will be overwritten. There is no "merge" logic, only overwrite.
2.  **Geo Consistency**: The `geo.json` is the source of truth for all dropdowns in the main `Vidhyam` app. Inconsistent geo data here will break address/location forms globally.
