# Super Admin Architecture Details: Backup & Restore Module

This document provides a technical breakdown of the Backup, Restore, and Geo-Synchronization capabilities within the Super Admin console.

---

## 1. Data Portability (`src/pages/BackupPage.jsx`)
The application implements a robust JSON-based portability layer to manage school data lifecycles.

### A. Export Logic
*   **Bulk Export (`handleExport('all')`)**: Calls the backend to aggregate all registered school data into a single downloadable JSON.
*   **Individual Export**: Allows targeted backups of specific school instances by their `schoolId`.
*   **Payload Contents**: The export includes:
    *   School Metadata
    *   Student & Employee records
    *   Academic configurations (Classes, Subjects, Exams)
    *   Financial data (Fees, Bills, Custom Fee rules)
    *   Infrastructure data (Spaces, Inventory)
    *   Operational data (Attendance, Announcements, Complaints)

### B. Restore / Import Logic
*   **Upsert Handshake**: The import process uses an **upsert** (Update or Insert) strategy. If a record with a matching UUID/ID exists, it is overwritten with the backup data; otherwise, a new record is created.
*   **Validation**: The frontend performs basic JSON parsing and file size validation before transmission.
*   **Progress Feedback**: Uses real-time status indicators (loading spinners and toast messages) to inform the admin of the import result.

---

## 2. Geo-Data Synchronization
A specialized system to keep the platform's geographical hierarchical data (Country > State > District) in sync.

*   **Export (`/api/geo/export`)**: Downloads the current geo-database as `geo.json`.
*   **Import & Sync (`/api/geo/import`)**: Allows the Super Admin to upload a modified `geo.json`. This action forces a database refresh and ensures all school instances have access to the same updated location dropdowns.

---

## 3. Server-Side Operational Backups
Beyond the JSON portability feature, the module provides direct control over the server's internal backup mechanism.

*   **Auto-Backup Interval**: The backend is configured to run incremental backups every 15 minutes.
*   **Manual Trigger (`manualBackup`)**: Allows the Admin to force an immediate system-wide backup (useful before performing high-risk operations like bulk imports or school deletions).

---

## Technical Details
*   **Direct API Calls**: Uses `fetch` directly with the `sa_token` for geo-sync operations, while other actions use the `api.js` wrappers.
*   **Blob Storage**: Utilizes `window.URL.createObjectURL(blob)` for managing large JSON downloads without taxing memory.
*   **Environment Agnostic**: The host is determined dynamically (`window.location.hostname`), which ensures the backup tools work across local, staging, and production environments.

---

## Developer Takeaways
1.  **DANGER ZONE (Restore)**: Importing data is destructive to existing records with matching IDs. Always recommend a "Manual System Backup" before performing a restore.
2.  **Geo Data Sensitivity**: The `geo.json` structure must follow the strict schema expected by the backend. Malformed Geo imports can break school onboarding and student registration forms globally.
3.  **Large File Handling**: For very large school databases, the browser's blob generation might hit memory limits. Consider implementing streamed exports for future scalability.
