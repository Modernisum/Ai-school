# Super Admin Architecture Details: Onboarding & Management

This document covers the lifecycle of a school instance: from initial setup to granular management.

---

## 1. School Onboarding (`src/pages/SetupPage.jsx`)
The entry point for adding new educational institutions to the platform.

### A. Geographical Context
*   **Hierarchical Sync**: Enrollment forms are driven by the platform's Geo-Data system. Selecting a **Country** filters **States**, which then filters **Districts**.
*   **Automated Prefixes**: Selecting a country automatically populates the `phone` field with the corresponding international dial code.

### B. Configuration Parameters
*   **Academic Range**: Defines the `classLevelStart` (e.g., Pre-Nursery) and `classLevelEnd` (e.g., Class 12). These are converted to integer levels (e.g., Nursery = -1) for backend normalization.
*   **Infrastructure Defaults**: Automatically initializes the school with default capacities (e.g., `defaultStudents: 30` per class).

### C. Post-Creation Handshake
*   Upon success, a secure modal displays the **School ID** and **Admin Password**. 
*   **Copy Feature**: A dedicated "Copy Details" button ensures the Super Admin can easily share credentials with the school owner.

---

## 2. Granular Management (`src/pages/SchoolDetail.jsx`)
Once a school is active, its specific parameters can be tuned in the Detail view.

### A. Session Governance
*   **Session Duration**: Admins can set custom token TTLs (Time-To-Live) per school, ranging from 1 hour to several months. 

### B. Incentive Application
*   **Targeted Promos**: Unlike the global `PromoPage`, here an admin can apply a specific promo code directly to a single school instance.

### C. Financial & Temporal Auditing
Provides a quick-glance view of:
*   **Wallet Balance** and **Credit Rate**.
*   **Next Billing Date** (calculated 30 days from the last billing cycle).
*   **Temporal Stamps**: Precise `createdAt` and `updatedAt` logs.

---

## Technical Implementation
*   **Geo Fetching**: Uses a series of `useEffect` hooks to maintain the dependency chain between Country/State/District dropdowns.
*   **Class Normalization**: The `classNameToLevel` utility ensures human-readable class names (like "Kindergarten") map to consistent database integers.
*   **Dynamic Edits**: Implements a "Switch Mode" pattern where the UI toggles between a read-only profile and an editable form.

---

## Developer Takeaways
1.  **Geo Dependency**: Always ensure the `geo/` endpoints are healthy before modifying the Setup page, as the form is unusable without them.
2.  **Password Visibility**: The Admin password is only shown once during setup. After that, it must be reset via the Schools list if lost.
3.  **Level Mapping**: Be careful with the `classNameToLevel` logic when adding new Grade types (e.g., Playgroup), as it directly affects graduation and promotion logic.
