# 💳 Chapter 7: Finance Domain Manual

This manual student fee billing parameters, Razorpay payment gateway configurations, webhook verify process, aur promotional coupons management ko explain karta hai.

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


- **Route Module:** `src/domain/finance/mod.rs`
- **Handler Files:** `src/domain/finance/fees.rs`, `src/domain/finance/payment.rs`
- **Services:** `src/services/finance/`
- **Repositories:** `src/repository/finance/`
- **Database Tables:** `fee_templates`, `student_billing`, `coupons`, `online_transactions`

```mermaid
sequenceDiagram
    autonumber
    actor Parent as Student Parent
    participant Checkout as Payment Handlers (Axum)
    participant Razorpay as Razorpay API Gateway
    participant Webhook as Webhook Handler (Axum)
    database DB as Postgres Database

    Parent->>Checkout: POST /payment/create-order {"amount": 1500, "feeId": "tuition_june"}
    Checkout->>Razorpay: Create Order Request
    Razorpay-->>Checkout: Order ID (order_XYZ123)
    Checkout-->>Parent: Return Order ID to trigger checkout
    Razorpay->>Webhook: POST /payment/webhook (HMAC signature included)
    Note over Webhook: Validate signature via RAZORPAY_WEBHOOK_SECRET.<br/>Check for duplicate event transactions.
    Webhook->>DB: Settle invoice and insert transaction log
    Webhook-->>Razorpay: 200 OK
```

---

## 🚦 Developer Laws (Do's aur Don'ts - Kya karein aur kya na karein)

- **DO:** Always verify Razorpay signatures using HMAC-SHA256 before registering a transaction as `completed` or updating student billing ledger states.
- **DO:** Implement idempotent query filters inside `/payment/webhook` to ignore repeated callbacks if Razorpay delivers duplicate events.
- **DON'T:** Never hardcode key secrets. Webhook verification secrets must be configured inside environment keys (`RAZORPAY_WEBHOOK_SECRET`).
- **DON'T:** Never authorize manual discount operations exceeding the student's total outstanding balance.

---

## 🔌 API Reference aur Specs (API Ki Jankari)

### 1. General Fee Templates

#### A. List Fee Templates
- **Endpoint:** `GET /api/school/:schoolId/finance/fees`
- **Success Response:**
  ```json
  {
    "success": true,
    "data": [
      {
        "feeId": "FEETMP-102",
        "feeName": "Standard 10 Tuition Fee",
        "amount": 12000.0,
        "frequency": "quarterly"
      }
    ]
  }
  ```

#### B. Create New Fee Template
- **Endpoint:** `POST /api/school/:schoolId/finance/fees`
- **Request Body:**
  ```json
  {
    "feeName": "Standard 10 Tuition Fee",
    "amount": 12000.0,
    "frequency": "quarterly"
  }
  ```
- **Success Response:**
  ```json
  {
    "success": true,
    "data": {
      "feeId": "FEETMP-102"
    }
  }
  ```

---

### 2. Student Billing Ledgers

#### A. List Students with Outstanding Fees
- **Endpoint:** `GET /api/school/:schoolId/finance/fees/pending`
- **Query Parameters:**
  - `minPercentage` (float, required): Minimum percentage of unpaid fees (e.g. `0.2` for 20%+ unpaid).
  - `className` (string, optional): Filter by class.
- **Success Response:**
  ```json
  {
    "success": true,
    "data": [
      {
        "studentId": "STD-99882",
        "name": "Jane Doe",
        "className": "10-A",
        "totalCharged": 15000.0,
        "totalPaid": 10000.0,
        "pendingAmount": 5000.0
      }
    ]
  }
  ```

#### B. Get Student Billing Details
- **Endpoint:** `GET /api/school/:schoolId/finance/fees/student/:studentId`
- **Success Response:**
  ```json
  {
    "success": true,
    "data": {
      "studentId": "STD-99882",
      "totalCharged": 15000.0,
      "totalPaid": 10000.0,
      "transactions": [
        { "transactionId": "TXN-8812", "amount": 5000.0, "status": "settled", "date": "2026-05-10" }
      ]
    }
  }
  ```

#### C. Fetch Student Billing (User Access Portal)
- **Endpoint:** `GET /api/school/:schoolId/finance/user/fees/:studentId`

#### D. Generate AI personalized Fee Reminder
- **Endpoint:** `GET /api/school/:schoolId/finance/fees/student/:studentId/ai-reminder`
- **Success Response:**
  ```json
  {
    "success": true,
    "data": {
      "reminderMessage": "Dear parent, this is a friendly reminder that an outstanding tuition fee balance of INR 5,000.00 is due for Jane Doe (10-A). Kripya use portal par online bhugtan karein."
    }
  }
  ```

#### E. Charge Ad-Hoc Fee
- **Endpoint:** `POST /api/school/:schoolId/finance/fees/student/:studentId/add`
- **Request Body:**
  ```json
  {
    "amount": 800.0,
    "feeType": "lab_breakage",
    "description": "Broke chemistry flask on 2026-06-05"
  }
  ```

#### F. Log Manual Student Cash Payment
- **Endpoint:** `POST /api/school/:schoolId/finance/fees/student/:studentId/pay`
- **Request Body:**
  ```json
  {
    "amount": 2500.0,
    "paymentMode": "cash",
    "referenceNumber": "MANUAL-0081"
  }
  ```

#### G. Grant Discount / Waiver
- **Endpoint:** `POST /api/school/:schoolId/finance/fees/student/:studentId/discount`
- **Request Body:**
  ```json
  {
    "amount": 500.0,
    "reason": "Economic waiver concession"
  }
  ```

---

### 3. Custom Fee Invoices

#### A. Define Custom Fee
- **Endpoint:** `POST /api/school/:schoolId/finance/fees/custom`
- **Request Body:**
  ```json
  {
    "feeName": "Annual Sports Fee",
    "amount": 1500.0
  }
  ```

#### B. Apply Custom Fee to Target Classes
- **Endpoint:** `POST /api/school/:schoolId/finance/fees/custom/:feeId/apply`
- **Request Body:**
  ```json
  {
    "targetClasses": ["10-A", "10-B"]
  }
  ```

---

### 4. Referral Coupons

#### A. Create Referral Coupon
- **Endpoint:** `POST /api/school/:schoolId/finance/coupons`
- **Request Body:**
  ```json
  {
    "code": "REF-JANE-99",
    "discountValue": 1000.0,
    "maxUses": 1,
    "expiryDate": "2026-08-31"
  }
  ```

#### B. Validate Coupon
- **Endpoint:** `POST /api/school/:schoolId/finance/coupons/validate`
- **Request Body:**
  ```json
  {
    "code": "REF-JANE-99",
    "studentId": "STD-00921"
  }
  ```
- **Success Response:**
  ```json
  {
    "success": true,
    "data": {
      "code": "REF-JANE-99",
      "isValid": true,
      "discountValue": 1000.0
    }
  }
  ```

#### C. Block/Unblock Coupon
- **Endpoint:** `PUT /api/school/:schoolId/finance/coupons/:couponId/block`
- **Request Body:**
  ```json
  {
    "isBlocked": true
  }
  ```

#### D. Redeem Coupon
- **Endpoint:** `POST /api/school/:schoolId/finance/coupons/:couponId/use`
- **Request Body:**
  ```json
  {
    "studentId": "STD-00921"
  }
  ```

---

### 5. Online Payment Processing (Razorpay)

#### A. Create Online Payment Order
- **Endpoint:** `POST /api/school/:schoolId/finance/payment/:schoolId/create-order`
- **Request Body:**
  ```json
  {
    "amount": 5000.0,
    "currency": "INR",
    "studentId": "STD-99882",
    "feeType": "regular",
    "feeId": "tuition_june"
  }
  ```
- **Success Response:**
  ```json
  {
    "success": true,
    "data": {
      "orderId": "order_XYZ789123",
      "amount": 5000.0,
      "currency": "INR"
    }
  }
  ```

#### B. Razorpay Payment Webhook Settlement
- **Endpoint:** `POST /api/school/:schoolId/finance/payment/webhook`
- **Headers:** `x-razorpay-signature: <hmacSha256Signature>`
- **Request Body:** Standard Razorpay Event Payload (`payment.captured`)
- **Success Response:** Status `200 OK` with payload `"OK"` or `"Duplicate webhook - already processed"`.

#### C. User Dashboard Order Generation
- **Endpoint:** `POST /api/school/:schoolId/finance/user/order`

---

## 🕒 Update History aur Status (Badlavo ki History)

*Is section mein hum saare bade badlavo, design decisions, aur future plans ko track karte hain.*

- **Idempotency checks:** Settle payments handler `/payment/webhook` now records processed webhook identifiers in a PostgreSQL lookup index. If a webhook with the same Razorpay transaction hash is received, it returns a 200 response immediately without repeating database invoice credit mutations.
