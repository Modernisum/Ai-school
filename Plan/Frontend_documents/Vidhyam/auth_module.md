# Frontend Architecture Details: Auth Module

This document outlines the detailed breakdown of the `src/features/auth` feature module within the Vidhyam frontend application. It handles user login, session verification, and the initial massive school setup process.

---

## 1. Directory Structure
`src/features/auth/`
*   `components/` -> Contains global functional wrappers (e.g., `SessionHandler.jsx`).
*   `pages/` -> Contains the UI views for login and the multi-step school setup process.

**(Note: This module does not use RTK Query. It relies entirely on native browser `fetch` and `localStorage` for state persistence.)**

---

## 2. API Integration & Logic Flow

### A. `components/SessionHandler.jsx`
This is a critical HOC (Higher-Order Component) or wrapper used to enforce protected routes.
*   **Core Logic**: 
    1. Checks if `accessToken` exists in `localStorage`.
    2. Continually pings the backend every 5 minutes (`setInterval`) to `/auth/school/verify-token` to check if the token is still mathematically valid and not revoked on the server.
    3. If the token is missing or invalid, it triggers a Framer Motion `showDialog` modal overlaying the screen, forcing the user to "Return to Login".
    4. Handles a race condition (`isFirstCheck` ref) to prevent falsely expiring sessions during rapid redirects from the `setup.jsx` flow.
*   **Impact**: Any route wrapped in this component is strictly protected on the client side.

### B. `pages/login.jsx` (AuthPage)
The main entry point for existing school admins.
*   **Core Logic**: Takes `schoolId` and `password`. On success, stores `accessToken` and `schoolId` in `localStorage` and immediately navigates to `/dashboard/home`.
*   **API Usage**:
    *   `POST /auth/school/login` (Standard login)
    *   `POST /auth/school/support` (Forgot Password / Support request flow)
*   **Components/UI**: Animated glassmorphism background. Includes a "Support Request Modal" if the user forgets their credentials, which pings the super admin for recovery.

### C. `pages/setup.jsx` (SchoolSetup)
A massive 4-step onboarding wizard for creating a brand new school.
*   **Core Logic**: Uses a single `step` integer state to manage conditional Framer Motion renders. It holds a large `form` object in state tracking nearly 15 fields.
*   **API Usage**:
    *   `GET /geo/countries`, `GET /geo/states/:id`, `GET /geo/districts/:id` (Populates cascading location dropdowns natively from the backend geography routes).
    *   `POST /setup/school` (Final submission).
*   **Workflow Steps**:
    1.  **Institution Identity**: Name, Year Established, Dynamic list of Directors.
    2.  **Academic Structure**: Board (CBSE, ICSE, etc.), Medium, Class Level (Primary, High School, etc.).
    3.  **Campus Location**: Cascading dropdowns (Country -> State -> District) + Pincode.
    4.  **Security Setup**: Master password creation.
*   **Data Persistence**: If successful, it automatically populates `localStorage` with `schoolName`, `schoolAddress`, `boardName`, `medium`, `maxClassLevel`, `schoolId`, and `accessToken` so the dashboard boots instantly without requiring a second login.

---

## Developer Takeaways
1.  **Token Storage Strategy**: Vidhyam heavily relies on `localStorage` for session retention. Ensure no XSS vulnerabilities leak `localStorage`.
2.  **Missing Global Context**: Instead of storing user data in a React Context or Redux slice during login/setup, it dumps everything directly into `localStorage`. Other components (like Exams or Headers) manually read `localStorage.getItem('boardName')` to function. This works but can lead to UI desyncs if data changes. Consider migrating auth variables to the Redux `app/store.js` as a global slice in the future for reactivity.
