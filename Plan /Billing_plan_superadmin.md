# B2B SaaS Billing Engine — Implementation Plan

## The Business Model (SaaS Provider Perspective)
You (the Super Admin) are the **Company** providing this School Management Software as a Service (SaaS). 
You manage multiple **Client Schools**. You bill these schools based on how many strictly **Active Students** they have in their database.

Instead of hunting down monthly subscription payments manually, the software uses a **Prepaid Wallet Architecture**. Client schools must keep a positive balance in their wallet to continue using your software. 

### Key Features of Your Billing Engine:
1. **Per-Student Pricing:** You can set a custom monthly rate per student for each school (e.g., ₹50/student/month for School A, ₹40 for School B).
2. **Daily Micro-Deductions:** Every night, the system counts how many active students a school has and deducts 1 day's worth of cost from their wallet. 
   *(Formula: `Active Students * Per-Student Rate / 30 days`)*
3. **Automated Suspension (Dunning):** 
   - When a school's wallet is running low (e.g., reaches 95% consumed / 3 days left), they get a **Low Balance Warning Notification** upon login.
   - When the wallet hits `₹0`, the system automatically blocks their login with a message: *"Insufficient Balance. Please recharge your account."*
4. **Promo / Referral Codes:** You can generate codes like `WELCOME30` to give new schools 1 month free, or a flat ₹5000 credit. New schools can also automatically get a 1-month grace period before billing starts.
5. **Clear Password Handover:** When you onboard a new school from the Super Admin panel, the generated admin password will clearly display on the screen so you can securely hand it over to the school principal.

---

## Technical Architecture

### 1. Database Schema Additions
We are adding a "Ledger" to make your billing bulletproof and strictly auditable.

```sql
-- Update the Client Schools table
ALTER TABLE schools
  ADD COLUMN wallet_balance NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN per_student_rate NUMERIC(10, 2) NOT NULL DEFAULT 50.00, -- Company sets this
  ADD COLUMN billing_status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'warning', 'suspended'
  ADD COLUMN trial_ends_at TIMESTAMPTZ DEFAULT NULL; -- When billing starts

-- The Ledger: Tracks every rupee entering or leaving the system
CREATE TABLE billing_ledger (
  id SERIAL PRIMARY KEY,
  school_id VARCHAR(255) REFERENCES schools(school_id),
  amount NUMERIC(15, 2) NOT NULL, -- Negative for nightly charge, Positive for recharge payment
  transaction_type VARCHAR(50) NOT NULL, -- 'nightly_usage', 'recharge', 'promo_credit'
  description TEXT,
  balance_after NUMERIC(15, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Promotional/Referral Codes system
CREATE TABLE promo_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  credit_amount NUMERIC(10, 2) DEFAULT 0.00,
  free_days INTEGER DEFAULT 0,
  max_uses INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ DEFAULT NULL
);
```

### 2. The Nightly Cron Job (The "Cashier")
You need a background process running on your Rust backend that acts as your automated cashier.
1. Run exactly at `00:00:00` every night.
2. Filter for all schools where `status = 'active'` and `trial_ends_at < NOW()`.
3. Count the exact number of active students for that school in the DB.
4. Calculate the nightly deduction.
5. Deduct from `schools.wallet_balance` and write a record to `billing_ledger`.
6. **Check thresholds:**
   - If balance < 3 days of runway -> Set `billing_status = 'warning'`.
   - If balance <= 0 -> Set `is_blocked = true` and `billing_status = 'suspended'`.

---

## New Application Features

### A. Your Super Admin Panel (Company Dashboard)
1. **Revenue Dashboard:** See total MRR (Monthly Recurring Revenue), total active students across all schools, and schools at risk of suspension.
2. **Recharge Wallet UI:** When a school pays you (via bank/UPI), you click "Add Funds" on their profile. This adds POSITIVE money to their ledger, restarting their access instantly if they were suspended.
3. **Set School Rate:** Set `₹50` for one school, `₹100` for another.
4. **Promo Code Generator:** Create new referral/discount codes to attract new client schools.

### B. Client School App (What the School Sees)
1. **Authentication Gate:** The `/api/auth/login` endpoint strictly checks `billing_status`. If `suspended`, it halts the login process.
2. **Billing Tab:** A purely informative page for the school owner to see:
   - Their current Wallet Balance.
   - Estimated days remaining before zero.
   - Ledger History (so they see exactly "-₹150 deducted for 90 active students").
3. **Warning Modals:** Persistent pop-up to the Principal when `billing_status = 'warning'`.

## Action Plan

### Core Engineering Shift: Strict Modular Monolith
To ensure the system is easy to split later if you decide to host the Super Admin backend elsewhere, we will keep **one single Rust backend project** for now, but we will strictly separate the code into isolated modules. 

1. **Main School API (`src/routes/` & `src/services/`)**: Dedicated only to serving School Principals, Teachers, and Students.
2. **Super Admin Module (`src/super_admin/`)**: A completely separate folder inside the backend containing all Super Admin routes, models, and the Nightly Cashier service. It will have minimal dependencies on the main school code.

### Step-by-Step Execution:
1. **DB Setup**: Add `billing_ledger`, `promo_codes`, and alter [schools](file:///home/shivnk/.gemini/antigravity/playground/deep-helix/Ai-school/Backend/src/routes/admin.rs#114-124) using raw SQL queries.
2. **Modular Code Extraction**: Consolidate [admin.rs](file:///home/shivnk/.gemini/antigravity/playground/deep-helix/Ai-school/Backend/src/routes/admin.rs) and [admin_service.rs](file:///home/shivnk/.gemini/antigravity/playground/deep-helix/Ai-school/Backend/src/services/admin_service.rs) into a highly isolated folder structure within the backend, preparing it for easy extraction in the future.
3. **The Nightly Cashier**: Build a Tokio background task inside the backend that executes the daily metering and deductions every 24 hours.
4. **Auth Rejection**: Update the Auth logic in the Main School routes to block suspended schools if their wallet hits zero.
5. **Super Admin UI Update**: Add a visual "Billing & Revenue" module to your Super Admin Vite application.
