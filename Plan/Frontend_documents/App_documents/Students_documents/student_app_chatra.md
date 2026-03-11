# Student App Architecture: Chatra Portal

This document details the architecture and current implementation status of the **Chatra** (Student) mobile application.

---

## 🏗️ Technology Stack
*   **Framework**: Flutter (Dart)
*   **State Management**: `provider`
*   **Networking**: `http`
*   **Security**: `flutter_secure_storage` (Keychain for iOS, Keystore for Android)

---

## 🔐 Authentication Flow (Mobile OTP)
The app implements a "WhatsApp-style" persistent authentication flow designed for students.

1.  **Request OTP**:
    *   **Input**: Mobile Number.
    *   **Logic**: Calls `/mobile/login` endpoint on the backend.
    *   **Role**: Hardcoded to `student` for this specific client.
2.  **Verify OTP**:
    *   **Input**: 4-digit OTP (Default `1234` for testing).
    *   **Logic**: Calls `/mobile/verify` endpoint.
    *   **Secure Persistence**: Upon success, a backend-issued JWT token is saved to `flutter_secure_storage`.
3.  **Auth Checker**:
    *   The `AuthChecker` widget wraps the `MaterialApp` entry point.
    *   On launch, it reads the secure storage; if a token exists, the user is automatically navigated to the **Dashboard**.

---

## 📂 Project Structure & Implementation
The application logic is currently contained in four core files:

*   **`main.dart`**: Entry point and Provider initialization.
*   **`api_service.dart`**: Centralized networking logic.
    *   `baseUrl`: Configured for local development (`10.0.2.2:8080` for Android Emulator).
    *   Path: `/api/622079/mobile/` (Instance-specific mobile API path).
*   **`login_screen.dart`**: Dual-phase UI (Mobile Input → OTP Input).
*   **`home_screen.dart`**: Placeholder Dashboard for authenticated users.

---

## 🚀 Current Status
- [x] Flutter Project Initialization.
- [x] Dependency configuration (`http`, `storage`, `provider`).
- [x] OTP Sending Logic.
- [x] OTP Verification & JWT Storage.
- [x] Auto-login (Session Persistence) mechanism.
- [ ] Academic Feature integration (Attendance, Fees, Exams).
- [ ] Push Notification system.

---

## Developer Takeaways
1.  **Testing**: For local testing on a physical device, the `baseUrl` in `api_service.dart` must be updated to the host machine's IP address.
2.  **Role Isolation**: The app is purpose-built for the `student` role. While similar to the `employee` (Teacher/Staff) app, it uses a dedicated instance path in the API.
3.  **Styling**: Uses a clean, Material-based theme with `blue` and `green` accents consistent with the Vidhyam platform identity.
