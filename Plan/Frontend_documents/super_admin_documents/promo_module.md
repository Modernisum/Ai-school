# Super Admin Architecture Details: Promo Module

This document outlines the marketing and incentive infrastructure within the Super Admin console.

---

## 1. Overview
The Promo module is designed to manage institutional growth and user retention via specialized codes. It provides a granular control plane for defining, distributing, and auditing promotional incentives.

**Location**: `src/pages/PromoPage.jsx`

---

## 2. Multi-Tiered Incentive Logic
Unlike simple coupons, the system supports three distinct types of incentives that can be mixed in a single code:

*   **Credit Injection (`creditAmount`)**: Adds a specific monetary value (₹) directly to a school's wallet upon activation.
*   **Recurring Discount (`discountPercentage`)**: Reduces the monthly billing amount.
*   **Trial Extension (`freeDays`)**: Extends the school's active period by a set number of days without charge.

---

## 3. Lifecycle & Usage Constraints
To prevent abuse, each promo code is governed by several metadata fields:

*   **Code Normalization**: Codes are automatically converted to `UPPERCASE` to ensure case-insensitive application.
*   **Usage Ceiling (`maxUses`)**: Defines the total number of times a code can be applied globally.
*   **Dynamic Progress Tracking**: The UI features a real-time progress bar (`currentUses / maxUses`) for active monitoring of campaign saturation.
*   **Temporal Expiry (`expiresAt`)**: An optional field that renders a code invalid after a specific date/time.

---

## 4. Auditing & Transparency
A key feature of the Promo module is the **Usage Modal** (`getPromoUsage`):
*   **Historical Log**: Clicking the "Layers" icon shows every school that has successfully applied the code.
*   **Temporal Precision**: Displays the exact `appliedAt` timestamp, allowing admins to map promo usage to marketing campaigns.

---

## Technical Implementation
*   **Framer Motion Modals**: High-performance entry/exit animations for "Create Promo" and "Usage History" dialogs.
*   **Inline Progress Logic**: Uses raw CSS width percentages `Math.min(100, (p.currentUses / p.maxUses) * 100)%` for immediate visual feedback.
*   **Contextual Toasts**: Every creation and usage-fetch action is verified via the `ToastCtx` to ensure the Admin is informed of success or failure.

---

## Developer Takeaways
1.  **Usage Auditing**: The `usageData` table is critical for financial reconciliations to understand where credits are being disbursed.
2.  **Incentive Fallback**: If a code has no incentives (all values = 0), the UI explicitly flags it as "No Incentive" to prevent dead codes from being distributed.
3.  **Scalability**: Usage data is fetched on-demand per code rather than pre-loaded, which keeps the main promo list fast even with thousands of redemptions.
