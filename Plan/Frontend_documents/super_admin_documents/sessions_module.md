# Super Admin Architecture Details: Session Monitor Module

This document details the real-time security and session auditing layer for school instances.

---

## 1. Overview
The Session Monitor allows Super Admins to oversee all active browser sessions for a specific school. It provides critical transparency into who is accessing the platform and from where.

**Location**: `src/pages/SessionsPage.jsx`

---

## 2. Real-Time Auditing
The monitor provides a high-fidelity view of current authentication tokens:
*   **Token Obfuscation**: Displays the `tokenId` prefix for identity verification while maintaining security by hiding the full token.
*   **User Role Tracking**: Identifies if the session belongs to a `Teacher`, `Admin`, or other roles.
*   **Temporal Breakdown**: 
    *   **Created At**: Exact timestamp of login.
    *   **Expires At**: Projected timestamp of session invalidation.

---

## 3. Expiry Visualization
The UI features a dynamic countdown system to help admins understand session longevity at a glance:
*   **Time Remaining**: Humand-readable countdown (e.g., `4h 12m`).
*   **Dynamic Progress Bars**: A visual percentage bar that shrinks as the session approaches its expiry time.
*   **Status Indicators**: Color-coded badges for `valid` (active) vs `expired` sessions.

---

## 4. Emergency Governance
*   **Expire All Sessions (`doExpireAll`)**: A "Nuclear Option" for security incidents. This action instantly invalidates every active token associated with the specific school, forcing a platform-wide logout for all their users.

---

## Technical Implementation
*   **Client-Side Calculations**: Uses `timeRemainingMs` helper to calculate progress bars dynamically without constant polling.
*   **Opacity Scaling**: Expired sessions are rendered with reduced opacity (0.5), allowing them to remain in the log for auditing purposes while being visually de-emphasized.
*   **Navigation**: Tightly integrated with the School Detail and Schools List via parameter-based routing (`/schools/:schoolId/sessions`).

---

## Developer Takeaways
1.  **TTL Awareness**: The "Time Left" indicator is directly affected by the `sessionDurationHours` set in the School Detail module.
2.  **Audit Logs**: Even "expired" sessions are kept in state until a page refresh, which is useful for tracing recent activity before a security breach.
3.  **Backend Verification**: The "Expire All" feature relies on a multi-record deletion/invalidation on the backend; ensure the API wrapper handles the confirmation receipt.
