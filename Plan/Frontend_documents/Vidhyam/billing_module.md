# Frontend Architecture Details: Billing & Fees Module

This document outlines the detailed breakdown of the `src/features/billing` feature module within the Vidhyam frontend application. It manages student fee collection, custom school-wide fees (fines/events), and an employee referral coupon system.

---

## 1. Directory Structure
`src/features/billing/`
*   `components/` -> Contains visual and functional UI components (Cards, Tables, Modals) specifically for billing.
*   `pages/` -> Contains the primary view wrappers for the module (`fees.jsx`, `referralCoupons.jsx`).

**(Note: Like the Auth module, this module strictly uses native browser `fetch` for all API calls. There is no RTK Query integration.)**

---

## 2. API Integration & Pages (`pages/`)

### A. `fees.jsx` (Fees Management Dashboard)
A dual-tab management screen for handling standard student fees and generating custom ad-hoc fees.
*   **Core Logic**: 
    1. Fetches global student lists inside `useEffect`.
    2. Has a sophisticated `Create Custom Fee` modal that allows applying fines/fees globally to the whole school, specifically to certain classes, or specifically to individually selected students using checkboxes.
    3. Handles late payment penalties (`penaltyPerDay`) dynamically.
*   **API Usage**:
    *   `GET /fees/:schoolId` (Retrieves ledger of all standard student payments)
    *   `GET /fees/:schoolId/custom` (Retrieves list of active custom/adhoc fees)
    *   `GET /students/:schoolId/students` (Retrieves targetable students)
    *   `POST /fees/:schoolId/custom`
    *   `POST /fees/:schoolId/custom/:feeId/apply` (Triggers bulk assignment of the newly created fee)
    *   `DELETE /fees/:schoolId/custom/:feeId`
*   **Components/UI**: Heavy usage of Lucide icons, Framer Motion for modals, and dynamic responsive grid stats. Custom CSS tables (`dark-table`) are utilized.

### B. `referralCoupons.jsx` (Discount & Reward System)
A system linking promotional codes to student fee discounts and tracking employee commissions.
*   **Core Logic**: Handles creating fixed (₹) or percentage (%) based coupons. Admins can assign an `employeeId` to a coupon, meaning if a student uses this code, the assigned employee earns an `employeeReward`.
*   **API Usage**:
    *   `GET /fees/:schoolId/coupons`
    *   `GET /employee/:schoolId/employees`
    *   `POST /fees/:schoolId/coupons`
    *   `PUT /fees/:schoolId/coupons/:couponId/block` (Toggles active/blocked state)
    *   `DELETE /fees/:schoolId/coupons/:couponId`
*   **Components/UI**: Displays coupons as grid cards with real-time tracking of `currentUses / maxUses` and status badges.

---

## 3. Local Components (`components/`)

### A. `FeesListAndPayment.jsx`
*   **`FeesListBox`**: A memoized table component rendering the student ledger. It features a graphical `progress-bar` showing percentage of total fees paid and localized CSS-in-JS style tags (`<style jsx>`).
*   **`StudentPaymentModal`**: A robust payment recording modal. It features "Quick Amount" buttons (e.g., clicking '50%' auto-fills half the pending due) and supports logging Cash, Card, UPI, Net Banking, or Cheque transactions alongside Transaction IDs.

### B. `FeesModals.jsx`
*   **`CreateFeesModal`**: A standard form for categorizing new fees (Tuition, Transport, Library, etc.) and defining their frequency (Monthly, Yearly, One-time).
*   **`AssignFeesModal`**: A form to apply existing fee structures to specific classes or specific sections (e.g. Class 10 Section A).

### C. Statistics Cards (`TotalFeesCard.jsx`, `ActiveFeesCard.jsx`, `PendingFeesCard.jsx`)
*   *(Not fully analyzed inside but verified to exist)* Lightweight presentation components likely rendering the dashboard metric blocks visible at the top of the Fees page. 

---

## Developer Takeaways
1.  **State Duplication**: The `fees.jsx` page fetches the entire Student and Employee rosters again just to populate dropdowns. If a global Redux slice were used, this data could be cached once preventing heavy database hits on every page load.
2.  **CSS-in-[JS/JSX]**: Some components (`FeesListAndPayment.jsx`) are using local `<style jsx>` injected directly into the React render tree. Be cautious as this breaks out of standard Tailwind CSS conventions used elsewhere in the app.
