# Super Admin Architecture Details: Billing Module

This document outlines the Billing and Revenue management module within the Super Admin application.

---

## 1. Overview
The Billing module is designed for the platform owner to manage the SaaS revenue model. It handles per-school pricing, wallet balances, and promotional incentives.

**Location**: `src/pages/Billing/BillingPage.jsx`

---

## 2. Key Features

### A. Revenue Dashboard (MRR & Liabilities)
*   **MRR Calculation**: Dynamically estimates Monthly Recurring Revenue based on `perStudentRate` across active schools.
*   **Wallet Liabilities**: Tracks the total credit held by schools in their wallets, representing the platform's financial liability.
*   **Risk Monitoring**: Flags schools with `warning` or `suspended` billing status due to insufficient balance.

### B. School Wallet Management
A central ledger for all registered schools:
*   **Billing Status**: Visual badges for `active`, `warning` (low balance), and `suspended` (zero/negative balance).
*   **Pricing Control**: Super Admins can set a custom `perStudentRate` for individual schools or apply a global rate change across the entire platform.
*   **Wallet Tracking**: Real-time display of current wallet balances with red highlighting for negative/zero states.

### C. Promo Code System (Advanced)
A management interface for creating and tracking marketing incentives, managed in `src/pages/PromoPage.jsx`.
*   **Multiple Incentive Types**: 
    *   **Credit Injection**: Define codes that add a specific monetary amount (₹) to a school's wallet.
    *   **Relative Discounts**: Apply `discountPercentage` to billing cycles.
    *   **Trial Extensions**: Codes can grant a set number of `freeDays`.
*   **Usage Constraints**: Set `maxUses` and optional `expiresAt` date/time for campaigns.
*   **Auditing**: Deep usage tracking shows exactly which schools applied which code and at what timestamp.

---

## 3. API Integration (`api.js`)
The module uses the following admin-scoped endpoints:

*   **Schools Data**: `GET /api/admin/schools` (`listSchools`)
*   **Pricing Updates**: `PUT /api/admin/schools/:id` (`updateSchool`)
*   **Promo Management**:
    *   `GET /api/admin/promos` (`listPromos`)
    *   `POST /api/admin/promos` (`createPromo`)

---

## 4. Technical Implementation
*   **State Management**: Uses local React state (`useState`). It does not use Redux, keeping the architecture simpler for admin-only tasks.
*   **Authentication**: Every request is wrapped in `authFetch`, which automatically includes the `sa_token` from `localStorage` in the `Authorization` header.
*   **UI/UX**: 
    *   Heavy use of **Framer Motion** for smooth transitions and modal animations.
    *   Responsive tables and stat cards for high-density data.
    *   Validation logic for credit amounts and promo codes to prevent malformed data.

---

## Developer Takeaways
1.  **Direct API Interaction**: Unlike the main app which uses RTK Query, Super Admin calls `api.js` functions directly. This is efficient for the lower complexity of the admin dashboard but requires manual loading/error state management.
2.  **Pricing Flexibility**: The `applyToAll` flag in school updates is a critical feature for global price hikes or standardizations.
