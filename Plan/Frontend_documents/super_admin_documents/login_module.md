# Super Admin Architecture Details: Login Module

This document details the authentication and security entry point for the Super Admin platform.

---

## 1. Overview
The Login module is the protective gateway for the restricted Super Admin console. It is a standalone page designed to authenticate the platform owner before granting access to sensitive school data and financial metrics.

**Location**: `src/pages/Login.jsx`

---

## 2. Authentication Flow
The module implements a standard credential-based authentication handshake:

1.  **Credential Entry**: The user provides a `username` and `password`.
2.  **API Handshake**: Calls `adminLogin(username, password)` from `src/api.js`.
3.  **Token Persistence**: Upon success, the backend returns an authentication token (typically saved in `localStorage` as `sa_token` via the API utility).
4.  **Redirection**: Successful login triggers a `replace` navigation to `/dashboard`, preventing the user from navigating back to the login screen using the browser's back button.

---

## 3. Key UI Features
*   **Password Visibility Toggle**: Allows the user to unmask the password field for verification before submission.
*   **Interactive Feedback**: 
    *   **Loading State**: Disables the login button and shows a spinner during the async auth request.
    *   **Error Messaging**: Categorizes failures (e.g., "Login failed" vs. "Connection failed — is the backend running?") to help with debugging.
*   **Aesthetics**: Uses a custom `login-bg` with radial gradients and `framer-motion` entrance animations for a premium look.

---

## 4. Technical Implementation
*   **State Management**: Uses local `useState` for form fields, loading, and error states.
*   **API Wrapper**: Relies on the centralized `adminLogin` function which handles the `fetch` logic and status code parsing.
*   **Security Note**: The page includes a small hint for default credentials (`superadmin` / `superadmin123`) which should be removed or changed in a production environment.

---

## Developer Takeaways
1.  **Token Dependency**: The rest of the app relies on the `sa_token` initialized here. If this token isn't properly stored, subsequent `authFetch` calls from other modules will fail.
2.  **Backend Connectivity**: The "Connection failed" error is a common diagnostic tool to check if the Rust backend is active on port 8080.
3.  **Routing**: The `PrivateLayout` in `App.jsx` uses the `RequireAuth` wrapper to ensure this page is the only one accessible without a valid token.
