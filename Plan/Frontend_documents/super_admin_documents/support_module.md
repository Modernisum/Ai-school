# Super Admin Architecture Details: Support Module

This document details the internal helpdesk system for school-to-platform communication.

---

## 1. Overview
The Support module provides a streamlined interface for the Super Admin to respond to school technical issues, primarily account recovery (forgotten IDs or passwords) and general assistance.

**Location**: `src/pages/SupportPage.jsx`

---

## 2. Helpdesk Flow
The module follows a "Queue-based" architecture:

1.  **Inbound Ingest**: Schools submit help requests via an unauthenticated or context-limited portal (received on the backend).
2.  **Triage View**: Super Admins see requests sorted by time, with clear **School Names** and **Contact Info**.
3.  **Status Coloring**:
    *   **Pending (Warning Badge)**: Active issues requiring intervention.
    *   **Resolved (Active Badge)**: Completed items.
4.  **Temporal Tracking**: Relative time markers (e.g., `45m ago`) help prioritize urgent requests.

---

## 3. Resolution Logic
*   **Auditability**: Resolved requests are kept in the list but with reduced opacity (0.7) and disabled action buttons to maintain a history while focusing on current tasks.
*   **Handshake**: Resolving a request triggers the `resolveSupportRequest(id)` API call.

---

## 4. UI/UX Features
*   **Empty State Management**: A "CheckCircle" view appears when no requests are pending, reducing clutter for the Super Admin.
*   **Busy Indicators**: Per-item loader icons ensure the Admin knows the server is processing a "Mark as Resolved" action for a specific ticket.

---

## Technical Implementation
*   **Reactive Filtering**: While not explicitly shown in code, the `listSupportRequests` typically filters for recent or pending items to keep the dashboard performant.
*   **AnimatePresence**: Handles smooth card removal when a request is archived or resolved.

---

## Developer Takeaways
1.  **Contact Directness**: The `contactInfo` field is a free-text field; ensure the school-side form prompts for a phone or secondary email.
2.  **Resolution Linkage**: Currently, resolving a ticket is a manual toggle. Future enhancement: Link "Resolve" automatically when a password is reset in the Schools module.
3.  **History Retention**: Backend cleanup of resolved tickets should be part of a periodic maintenance task to prevent the `requests` array from growing indefinitely.
