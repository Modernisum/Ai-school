# 🛡️ VIDHYAM — Global Project & Company Rules (System Core)

> **Project:** Vidhyam School Management System
> **Nature of Document:** Theoretical Guidelines & Strict Functional Boundaries
> **Directive for AI Agents:** This is your core programming. Internalize these concepts silently. Apply them to every plan, code generation, and debugging task without explicitly mentioning them.

---

## 🏛️ 1. Core Architectural Philosophy
- **No Reinventing the Wheel:** If a pattern exists in the codebase for fetching data, managing state, or UI design, you MUST strictly follow it. Do not introduce new patterns, libraries, or structural changes without explicit permission.
- **Centralized Communication:** All communication between the frontend/mobile app and the backend MUST go through the established "Central API Services" (e.g., `baseApi`, `api_service.dart`). Ad-hoc API calls from isolated components are strictly forbidden.

## 🔐 2. The Multi-Tenant Rule (School Isolation - 🔴 CRITICAL)
Vidhyam is a multi-school platform. **Data Isolation is absolute.**
- **The 'schoolId' Mandate:** Every single action—whether viewing, creating, updating, or deleting data—MUST be strictly scoped to a specific `schoolId`. 
- **Zero Cross-Pollination:** Under no circumstances should data from one school leak into another. Every API request and database query MUST include and enforce the `schoolId` filter.

## 🛡️ 3. Security & Authentication Strictness
- **Zero Trust Boundaries:** No page, screen, or backend API endpoint is allowed to be accessed without a strict Authentication (Auth) Check.
- **Secret Management:** Hardcoded API keys, passwords, database URLs, or sensitive tokens are strictly banned. Always utilize secure environment variables.
- **Never Trust User Input:** Always validate and sanitize inputs on the backend.
 **Prevent SQLi:** Use Prepared Statements / Parameterized Queries only.**Prevent XSS:** Implement strict Output Encoding and Content Security Policy (CSP).
- **File Uploads:** Validate file headers, restrict extensions, and rename uploaded files.**Rate Limiting:** Protect all endpoints from automated bot attacks using rate limits or CAPTCHA.**Use Frameworks:** Rely on built-in security features of the framework rather than custom regex.

## ⚙️ 4. System Stability & Error Handling
- **No Sudden Crashes:** Backend and frontend logic must be written to prevent sudden panics or crashes (e.g., absolutely NO raw `.unwrap()` or `.expect()` in Rust without proper fallback handling).
- **Predictable Responses:** If data is missing or a calculation fails, the system must degrade gracefully and return a structured, readable error message to the user rather than failing silently or crashing.

## 🧩 5. Modularity and features Division
- **Feature Independence:** Every feature (e.g., Student Management, Employee Payroll, Inventory) is an independent module. 
- **Strict Boundaries:** The internal logic of one feature must not tightly couple with another. If cross-feature communication is required, it must happen through defined Service channels, not by directly altering another module's core files.
- **System test:**
    - **backend ke ander db schema ko test karne ke liya schema.rs se test ho vaha se sari information nikali ja sakti hai 
    backend mai testing ke liya apki bin folder ke ander check karna chiya .
