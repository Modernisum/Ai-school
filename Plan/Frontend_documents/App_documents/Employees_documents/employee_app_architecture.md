# Employee App Architecture: Employee Portal

This document details the architecture and implementation status of the **Employee** (Teacher/Staff) mobile application.

---

## 🏗️ Technical Foundation
*   **Framework**: Flutter (Dart)
*   **State Management**: `provider` pattern for dependency injection.
*   **Networking**: Standard `http` package for RESTful communication.
*   **Persistent Security**: `flutter_secure_storage` for storing JWT tokens and user metadata.

---

## 🔐 Auth Logic & Permissions
The app uses a secure OTP-based handshake optimized for staff mobility.

1.  **Identity Verification**:
    *   Role: Hardcoded to `employee`.
    *   Endpoint: `/622079/mobile/login` (Note: Base URL varies during development).
2.  **Token Management**:
    *   Upon valid OTP entry, the backend issues a JWT.
    *   The app stores both the `jwt_token` and the `user_role` in the secure vault.
3.  **Automatic Re-authentication**:
    *   The `AuthChecker` in `main.dart` ensures that if a token is valid, the "Employee" skips the login screen entirely.

---

## 📂 Internal Modules
*   **`api_service.dart`**: Contains the core networking logic. It handles JSON serialization/deserialization and manages the secure storage lifecycle (`isLoggedIn`, `logout`).
*   **`login_screen.dart`**: Implements a stateful UI for the 2-step OTP flow. It uses Material 3 components for a modern look.
*   **`home_screen.dart`**: Current landing page for verified employees. This acts as a placeholder for future features like Attendance Marking, Leave Management, and Grade Entry.

---

## 🚀 Development Configuration
*   **Base URL**: Currently configured to `http://192.168.92.128:8080/268863/mobile` (Local IP testing).
*   **Branding**: Fully themed as "Employee Portal" with school-centric iconography.

---

## ⚠️ Known Implementation Gaps
*   **Permission Deficit**: `AndroidManifest.xml` needs the `INTERNET` permission added for release builds.
*   **Functional Parity**: The app is currently a "Shell" providing authentication. Deep integration with `employee_logic` on the backend (Salary slips, Class schedules) is pending.

---

## Developer Takeaways
1.  **Cross-App Consistency**: This app shares 99% of its architectural DNA with the `chatra` app, making it extremely easy to maintain updates across both portals.
2.  **Security Notice**: Local development URLs are hardcoded in the `ApiService`. These must be moved to an environmental configuration (`ENV`) before deployment.
3.  **Role Guard**: The backend strictly validates the `employee` role during the `/verify` stage to prevent students from accessing staff portals.
