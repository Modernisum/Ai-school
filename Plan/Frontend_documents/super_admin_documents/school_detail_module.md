# Super Admin Architecture Details: School Detail Module

This document outlines the granular management and configuration engine for individual school instances.

---

## 1. Overview
The School Detail page is the "Deep Configuration" view where Super Admins can modify profile data, manage security policies, and apply financial incentives at the instance level.

**Location**: `src/pages/SchoolDetail.jsx`

---

## 2. Configuration Zones

### A. Instance Profile Management
*   **Mode-Based UI**: Toggles between a high-legibility "Read-Only" profile and an "Interactive Edit" mode.
*   **Metadata Fields**: Full access to modify:
    *   Official School Name & Principal Name.
    *   Contact Hierarchy (Phone, Email, Physical Address).
    *   Operational Context (Affiliated Board, School Type).

### B. Security / Session Governance
*   **TTL Configuration (Token Time-To-Live)**: Allows setting a custom `sessionDurationHours` for the specific school. This is critical for schools with specific security requirements (e.g., high-security schools might want 2-hour sessions, while others might prefer 30 days).

### C. Financial Integration
*   **Incentive Application**: Targeted promo code application logic. Applying a code here immediately modifies the school's wallet or discount rate.
*   **Live Audit View**: Displays real-time financial stats including `Wallet Balance`, `Credit Rate`, and the next projected `Billing Date`.

---

## 3. Instance Control Plane
*   **Activation/Blocking**: Replicated control from the list view for convenience.
*   **Session Monitor Link**: Direct access to the live session tracker for real-time security auditing.

---

## 4. Technical Implementation
*   **Reactive State Dependency**: Uses a centralized `edits` object to track changes before they are committed via the `updateSchool` API.
*   **Normalization Logic**: Automatically converts promo codes to `UPPERCASE` before submission to avoid schema mismatches on the backend.
*   **Error Boundaries**: Categorizes update failures using the `ToastCtx`, providing clear feedback if a field (like Email) fails backend validation.

---

## Developer Takeaways
1.  **Wallet Transparency**: The `billingDate` is calculated on-the-fly (+30 days from `lastBillingDate`). Ensure the backend correctly updates `lastBillingDate` during cron jobs for this UI to remain accurate.
2.  **Edit Persistence**: If a user cancels an edit, the state is re-hydrated from the original `school` object to prevent inconsistent UI states.
3.  **Session Defaults**: If `sessionDurationHours` is not set by the admin, the system defaults to `24` hours as per the `load` function logic.
