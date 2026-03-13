# Billing Module Version 2.0: Advanced Financial Automation

## Phase 1: Automated PDF Receipts & Receipts Logic
- [x] Install/Verify `jspdf` and `jspdf-autotable` in Vidhyam frontend.
- [x] Implement `ReceiptService` utility for consistent PDF generation.
- [x] Add "Download Receipt" button to [FeesListAndPayment.jsx](file:///C:/Users/ok/modernisum/Ai-school/Vidhyam/src/features/billing/components/FeesListAndPayment.jsx).
- [x] Auto-trigger download upon successful Razorpay payment.

## Phase 2: Dynamic Late Fees Calculation
- [x] Implement [calculatePenalty](file:///C:/Users/ok/modernisum/Ai-school/Vidhyam/src/features/billing/pages/fees.jsx#130-140) utility in [fees.jsx](file:///C:/Users/ok/modernisum/Ai-school/Vidhyam/src/features/billing/pages/fees.jsx).
- [x] Update UI to highlight overdue fees with penalty details.
- [x] Modify [createRazorpayOrder](file:///C:/Users/ok/modernisum/Ai-school/Apps/chatra/lib/api_service.dart#81-101) payload in [billingApi.js](file:///C:/Users/ok/modernisum/Ai-school/Vidhyam/src/features/billing/api/billingApi.js) to include calculated penalties.
- [x] Update backend [pay_fee](file:///C:/Users/ok/modernisum/Ai-school/Backend/src/services/operations_service.rs#341-385) logic to record `penalty_accrued`.

## Phase 3: Super Admin Refunds & Wallet Adjustments
- [x] Add "Process Refund" tool to Super Admin [BillingPage.jsx](file:///C:/Users/ok/modernisum/Ai-school/SuperAdmin/src/pages/Billing/BillingPage.jsx).
- [x] Implement backend [process_refund](file:///C:/Users/ok/modernisum/Ai-school/Backend/src/super_admin/service.rs#184-223) endpoint in [AdminService](file:///C:/Users/ok/modernisum/Ai-school/Backend/src/super_admin/service.rs#5-8).
- [x] Add "Wallet Ledger" view for specific schools in Super Admin.

## Phase 4: Mobile Integration (Chatra App)
- [x] Research `Chatra/lib` structure and current Auth flow.
- [x] Create [fees_screen.dart](file:///C:/Users/ok/modernisum/Ai-school/Apps/chatra/lib/fees_screen.dart) with pending fees list.
- [x] Integrate `razorpay_flutter` package.
- [x] Connect mobile checkout to existing backend order creation.

## Phase 5: AI Predictive Analytics (Fee Defaulters)
- [x] Update [analytics_engine.rs](file:///C:/Users/ok/modernisum/Ai-school/Backend/src/logic/analytics_engine.rs) to process `custom_fee_records`.
- [x] Implement prediction model for "High Probability Defaulters".
- [x] Create Dashboard Alert notification system for defaulters.
