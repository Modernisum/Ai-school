# 💳 Chapter 7: Finance Domain Manual

Is manual mein student fee billing parameters, Razorpay payment gateway configuration, webhook verify process, aur promotional coupons management ko explain kiya gaya hai.

---

## 📖 Quick Navigation - Endpoint Documentation

| File | Endpoints Covered |
|------|-------------------|
| [01-fee-templates.md](./01-fee-templates.md) | `GET/POST /fees` - Fee template CRUD |
| [02-student-billing.md](./02-student-billing.md) | `GET /fees/pending`, `GET /fees/student/:studentId`, `GET /user/fees/:studentId`, `POST /fees/student/:studentId/add`, `POST /fees/student/:studentId/pay`, `POST /fees/student/:studentId/discount` |
| [03-ai-reminder.md](./03-ai-reminder.md) | `GET /fees/student/:studentId/ai-reminder` - AI fee reminder |
| [04-custom-fees.md](./04-custom-fees.md) | `GET/POST /fees/custom`, `DELETE /fees/custom/:feeId`, `POST /fees/custom/:feeId/apply` |
| [05-coupons.md](./05-coupons.md) | `GET/POST /coupons`, `POST /coupons/validate`, `DELETE /coupons/:couponId`, `PUT /coupons/:couponId/block`, `POST /coupons/:couponId/use` |
| [06-payment.md](./06-payment.md) | `POST /payment/:schoolId/create-order`, `POST /payment/webhook`, `POST /user/order` |

---

## 📖 Overview aur Features (Udeshya aur Suvidhayein)

### 🎯 Feature Purpose (Kyun banaya gaya hai)
Fee collection, billing, salary payout, aur expenses track karta hai. Iska udeshya school ka accounting process aur online payments ko fully automate karna hai.

Finance domain school fee calculations, invoicing, online payment integrations, aur promo discounts ko handle karta hai:
- **Fee Templates:** Regular tuition fees, transport fees, ya administrative fee structures ko configure karta hai.
- **Custom Invoices:** Ad-hoc extra charges (jaise lab damage, picnic fees) create karke target classes par apply karta hai.
- **Student Billing Ledgers:** Pending fee charges show karta hai, manual cash payments update karta hai, aur balance calculate karta hai.
- **AI Reminders:** Har parent ke liye personalized payment alerts/reminders generate karta hai.
- **Referral Coupons:** Promo coupon codes design, validate, block aur redeem karne ka process handle karta hai.
- **Online Payments (Razorpay):** Razorpay checkout order flow generate karta hai aur signature-verified webhooks se transaction verification automates karta hai.

---

## 🏗️ Architecture aur Data Flow

### 🛠️ Tech Stack aur Dependencies
- **Framework:** Axum
- **Database:** Postgres (sqlx) with strict transaction isolation for financial data.
- **Integrations:** Razorpay API (reqwest), Stripe.

### 🌊 Deep Code aur Data Flow
1. **Request:** Parent fees pay karne ke liye payment shuru karta hai.
2. **Service Logic:** `services/finance/` invoice generate karta hai aur Razorpay API se connect karta hai.
3. **External:** Razorpay payment process karke callback/webhook bhejta hai.
4. **Database:** Webhook handler database mein transaction aur fee installment status change karta hai.
5. **Response:** Fee receipt download ke liye generate hoti hai.

### Code Map
- **Route Module:** `rust/src/domain/finance/mod.rs`
- **Handler Files:** `rust/src/domain/finance/fees.rs`, `rust/src/domain/finance/payment.rs`
- **Service Traits:** `rust/src/services/traits/fee.rs` (FeeService, CouponService)
- **Service Impl:** `rust/src/services/finance/fee_service.rs` (PostgresFeeService)
- **Repository Traits:** `rust/src/repository/traits/fee.rs`, `rust/src/repository/traits/coupon.rs`
- **Repository Impl:** `rust/src/repository/finance/fee_repo.rs`, `rust/src/repository/finance/coupon_repo.rs`, `rust/src/repository/finance/transaction_repo.rs`
- **Models:** `rust/src/models/finance.rs` (CreateOrderRequest, PendingFeesQuery)
- **Error Types:** `rust/src/error.rs` (AppError enum)
- **Database Tables:** `fee_templates`, `student_invoices`, `custom_fees`, `student_custom_fees`, `coupons`, `student_coupons`, `transactions`

### Complete Route Map
```
/api/school/:schoolId/finance/
├── fees
│   ├── GET                   → list fee templates
│   ├── POST                  → create fee template
│   ├── /pending
│   │   └── GET               → list pending fees (with ?minPercentage & ?className)
│   ├── /student/:studentId
│   │   ├── GET               → get student billing
│   │   ├── /ai-reminder
│   │   │   └── GET           → AI fee reminder
│   │   ├── /add
│   │   │   └── POST          → add ad-hoc fee to student
│   │   ├── /pay
│   │   │   └── POST          → log manual payment
│   │   └── /discount
│   │       └── POST          → apply discount
│   └── /custom
│       ├── GET               → list custom fees
│       ├── POST              → create custom fee
│       ├── /:feeId
│       │   ├── DELETE        → delete custom fee
│       │   └── /apply
│       │       └── POST      → apply custom fee to classes
├── coupons
│   ├── GET                   → list coupons
│   ├── POST                  → create coupon
│   ├── /validate
│   │   └── POST              → validate coupon code
│   ├── /:couponId
│   │   ├── DELETE            → delete coupon
│   │   ├── /block
│   │   │   └── PUT           → block/unblock coupon
│   │   └── /use
│   │       └── POST          → redeem coupon
├── payment
│   ├── /:schoolId/create-order
│   │   └── POST              → create Razorpay order
│   └── /webhook
│       └── POST              → Razorpay webhook handler
└── user
    ├── /fees/:studentId
    │   └── GET               → user portal billing
    └── /order
        └── POST              → user portal payment order
```

### Route Registration (mod.rs)
```rust
pub fn routes(state: AppState) -> Router<AppState> {
    Router::new()
        .nest(
            "/school/:schoolId/finance",
            Router::new()
                .route("/fees", get(fees::get_school_fees).post(fees::create_school_fee))
                .route("/fees/pending", get(fees::get_pending_fees))
                .route("/fees/student/:studentId", get(fees::get_student_fee))
                .route("/user/fees/:studentId", get(fees::get_student_fee))
                .route("/fees/student/:studentId/ai-reminder", get(fees::generate_fee_reminder))
                .route("/fees/student/:studentId/add", post(fees::add_fee_to_student_route))
                .route("/fees/student/:studentId/pay", post(fees::pay_fee))
                .route("/fees/student/:studentId/discount", post(fees::apply_discount))
                .route("/fees/custom", get(fees::list_custom_fees).post(fees::create_custom_fee))
                .route("/fees/custom/:feeId", delete(fees::delete_custom_fee))
                .route("/fees/custom/:feeId/apply", post(fees::apply_custom_fee))
                .route("/coupons", get(fees::list_coupons).post(fees::create_coupon))
                .route("/coupons/validate", post(fees::validate_coupon))
                .route("/coupons/:couponId", delete(fees::delete_coupon))
                .route("/coupons/:couponId/block", put(fees::block_coupon))
                .route("/coupons/:couponId/use", post(fees::use_coupon))
                .nest("/payment", payment::router())
                .route("/user/order", post(payment::create_order))
        )
        .with_state(state)
}
```

---

## 🚦 Developer Laws (Do's aur Don'ts - Kya karein aur kya na karein)

- **DO:** Always verify Razorpay signatures using HMAC-SHA256 before registering a transaction as `completed` or updating student billing ledger states.
- **DO:** Implement idempotent query filters inside `/payment/webhook` to ignore repeated callbacks if Razorpay delivers duplicate events.
- **DON'T:** Never hardcode key secrets. Webhook verification secrets must be configured inside environment keys (`RAZORPAY_WEBHOOK_SECRET`).
- **DON'T:** Never authorize manual discount operations exceeding the student's total outstanding balance.

---

## 🕒 Update History aur Status (Badlavo ki History)

- **Idempotency checks:** Settle payments handler `/payment/webhook` now records processed webhook identifiers in a PostgreSQL lookup index. If a webhook with the same Razorpay transaction hash is received, it returns a 200 response immediately without repeating database invoice credit mutations.
- **2026-06-21:** Comprehensive endpoint documentation with expected responses and Rust test cases created for all 22 finance endpoints. See individual .md files above.
