# Super Admin Frontend Architecture: Master Overview

This document serves as the central index for the Super Admin platform's frontend architecture, linking to specialized module documentations.

---

## 🏗️ Core Architecture
The Super Admin platform is a standalone React application designed for platform-wide governance. It is decoupled from the main Vidhyam school app to ensure security and administrative isolation.

### Key Architectural Traits
*   **Authentication**: Managed via `sa_token` in local storage, enforced by a `RequireAuth` higher-order component.
*   **State Management**: Uses local React state (`useState`) and context (`ToastCtx`) for a lightweight, performant administrative interface.
*   **UI System**: Glassmorphic design with `framer-motion` for transitions and `lucide-react` for iconography.
*   **API Intergration**: Direct integration with a custom `api.js` handler for administrative endpoints.

---

## 📂 Module Documentation Index

### 🔐 Authentication
*   [**Login Module**](./login_module.md): Gateway and secure token management.

### 📊 Analytics & Monitoring
*   [**Dashboard Module**](./dashboard_module.md): Platform-wide KPIs, growth metrics, and monthly registration trends.
*   [**Session Monitor**](./sessions_module.md): Real-time user session tracking and emergency lockouts.

### 🏫 School Management
*   [**Schools List**](./schools_list_module.md): Central hub for auditing, blocking, and auditing instance health.
*   [**School Detail**](./school_detail_module.md): Granular instance configuration (Session TTL, Profile updates).
*   [**School Setup**](./setup_module.md): Intelligent onboarding wizard with Geo-Sync dependency.

### 💰 Revenue & Incentives
*   [**Billing Module**](./super_admin_billing.md): MRR tracking, wallet liabilities, and school-level pricing.
*   [**Promo Module**](./promo_module.md): Advanced incentive engine (Credits, Discounts, Free Days) and usage auditing.

### 🛠️ Operations & Utility
*   [**Backup & Restore**](./backup_module.md): JSON-based data portability and manual system backup triggers.
*   [**Support Module**](./support_module.md): Integrated helpdesk for account recovery and assistance.

---

## 🚀 Developer Guidelines
*   **Security First**: Any new administrative action must be wrapped in the `authFetch` utility to ensure authorization.
*   **Geo Consistency**: Always sync the `geo.json` via the Backup module before making changes to location-dependent fields.
*   **Confirmations**: Destructive actions (Delete, Purge, Expire) MUST use confirmation guards and provide clear toast feedback.
