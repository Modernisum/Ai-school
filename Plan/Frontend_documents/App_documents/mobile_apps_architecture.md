# Mobile Applications Architecture: Shared Infrastructure

This document provides a deep-dive analysis of the mobile ecosystem (`chatra` & `employee`), focusing on shared patterns, networking, and platform-specific configurations discovered during the deep audit.

---

## 🏗️ 1. Cloned Architecture Pattern
The `chatra` (Student) and `employee` (Teacher/Staff) apps are built using an identical architectural clone pattern. This suggests a highly maintainable but segregated client strategy.

### Shared Logic Structure
| File | Responsibility | Consistency |
| :--- | :--- | :--- |
| `main.dart` | `MultiProvider` initialization & Auth Checking. | 100% Identical |
| `api_service.dart` | JWT storage & Networking logic. | 95% Match (URL differences) |
| `login_screen.dart` | Dual-phase OTP validation. | 90% Match (Role differences) |
| `home_screen.dart` | Post-auth Success Placeholder. | 100% Identical |

---

## 🔐 2. Authentication & Data Security
*   **Role Isolation**: Roles are hardcoded in the `login_screen.dart` (`student` for Chatra, `employee` for Employee).
*   **JWT Handshake**: Both apps use the `/mobile/login` and `/mobile/verify` endpoints.
*   **Persistence**: Success tokens are stored in **Secure Storage** (Keychain/Keystore), ensuring that session data is encrypted at the OS level.

---

## 🌐 3. Networking Findings
During the deep recheck, specific development-time configurations were identified:

*   **Chatra URL**: `http://10.0.2.2:8080/622079/mobile` (Optimized for Android Emulator).
*   **Employee URL**: `http://192.168.92.128:8080/268863/mobile` (Optimized for Physical Device testing via Local IP).
*   **School Instance Isolation**: Each app is currently pointed to a different school instance ID (`622079` vs `268863`).

---

## ⚠️ 4. Technical Constraints & Critical Findings
*   **Missing Network Permissions**: The `AndroidManifest.xml` files for both apps are missing the `<uses-permission android:name="android.permission.INTERNET" />` tag. 
    > [!WARNING]
    > While these apps work in `debug` mode (where Flutter injects permissions), they will fail to connect to the backend in `profile` or `release` builds until this permission is explicitly added to the manifest.
*   **SDK Versions**: Both apps are targeting Flutter SDK `^3.11.0` or higher, ensuring compatibility with modern material design standards.

---

## 🚀 5. Implementation Roadmap
Based on the current code state (MVP Level):
1.  **Shared Library**: Recommend move shared logic (`api_service`, `models`) into a single Flutter package to avoid code duplication.
2.  **UI Specialization**: Start implementing role-specific dashboards (Attendance for Students vs. Management for Teachers).
3.  **App Manifest Audit**: Inject necessary permissions (Internet, Camera for profiles, etc.).

---

## Developer Takeaways
*   The apps are currently in the **"Auth-Verify"** phase. Core academic features (Lessons, Exams, Fees) are not yet implemented in the mobile clients.
*   The architecture is ready for scale, but requires the manifest fixes before any testing on a staging/production server.
