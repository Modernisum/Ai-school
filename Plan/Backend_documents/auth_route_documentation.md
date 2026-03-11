# Auth Route Documentation

**File:** `src/routes/auth.rs`  
**Service:** `src/services/auth_service.rs`  
**Database Tables:** `auth`, `tokens`, `auth_logs`

---

## Routes Summary

| # | Method | URL | Handler | Description |
|---|---|---|---|---|
| 1 | `POST` | `/api/auth/login` | `login_handler` | School login (legacy alias) |
| 2 | `POST` | `/api/auth/school/login` | `login_handler` | School login (primary) |
| 3 | `POST` | `/api/auth/school/verify-token` | `verify_token_handler` | Token verify karo |
| 4 | `POST` | `/api/auth/school/logout` | `logout_handler` | Logout (token revoke) |
| 5 | `POST` | `/api/auth/school/set-security` | `set_security_handler` | Security question set karo |
| 6 | `POST` | `/api/auth/school/forgot-password` | `forgot_password_handler` | Temp password lo |
| 7 | `POST` | `/api/auth/school/change-password` | `change_password_handler` | Password change karo |
| 8 | `POST` | `/api/auth/school/verify-otp` | `verify_otp_handler` | Firebase OTP verify (legacy) |
| 9 | `POST` | `/api/auth/school/support` | `create_support_request` | Support ticket submit karo |

---

## Route 1: Login

### `POST /api/auth/school/login` (also: `POST /api/auth/login`)

School admin ya employee login karta hai.

**Request Body:**
```json
{
  "schoolId": "my-school",
  "password": "abc123",
  "userType": "admin"
}
```

**Internal Workflow:**
```
Request
  │
  ▼
auth_service.login(school_id, password, user_type)
  │
  ├─ schools table → billing check (billing_status, trial_ends_at, wallet_balance)
  │    Agar expired ya insufficient → 401
  │
  ├─ auth table → password verify (bcrypt hash ya plain text)
  │    Mismatch → 401
  │
  ├─ tokens table → naya token generate + save
  │    (64 char hex token_id, expires_at = 1 hour)
  │
  └─ auth_logs table → login action log
```

**Success Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "accessToken": "abc123hex...",
  "schoolId": "my-school",
  "expiresIn": "1h"
}
```

**Error Responses:**
| Status | Reason |
|---|---|
| `401` | Wrong password |
| `401` | Account blocked / trial expired / wallet empty |

---

## Route 2: Verify Token

### `POST /api/auth/verify`

Token valid hai ya nahi check karo.

**Request Body:**
```json
{ "token": "abc123hex..." }
```

**Internal Workflow:**
```
tokens table → token_id se search
  ├─ Not found → 401
  ├─ expires_at < NOW() → 401 (Expired)
  └─ status = 'revoked' → 401
```

**Success Response:**
```json
{
  "success": true,
  "message": "Token valid",
  "token": {
    "tokenId": "abc123...",
    "schoolId": "my-school",
    "userType": "admin",
    "status": "active",
    "expiresAt": "2026-03-11T02:00:00Z"
  }
}
```

---

## Route 3: Logout

### `POST /api/auth/logout`

Token revoke karta hai — session khatam ho jaata hai.

**Request Body:**
```json
{ "token": "abc123hex..." }
```

**DB Action:**
```sql
UPDATE tokens SET status = 'revoked' WHERE token_id = $1
```

**Success Response:**
```json
{ "success": true, "message": "Logged out, token revoked" }
```

---

## Route 4: Set Security Question

### `POST /api/auth/security`

Password recovery ke liye security question + answer set karo.

**Request Body:**
```json
{
  "schoolId": "my-school",
  "question": "Tumhara pehla school kaunsa tha?",
  "answer": "Delhi Public School"
}
```

**DB Action:**
- Answer ko **bcrypt hash** karke save karta hai
```sql
UPDATE auth SET security_question = $1, security_answer_hash = $2
WHERE school_id = $3
```

**Success Response:**
```json
{ "success": true, "message": "Security question set" }
```

---

## Route 5: Forgot Password

### `POST /api/auth/forgot-password`

Security answer verify karke **temporary password** generate karta hai.

**Request Body:**
```json
{
  "schoolId": "my-school",
  "answer": "Delhi Public School"
}
```

**Internal Workflow:**
```
auth table → security_answer_hash verify
  │
  ├─ Wrong answer → 401
  │
  └─ Correct → 8 char random temp password generate
                UPDATE auth SET password = temp_pass, password_temp = TRUE
                Return tempPassword to user
```

**Success Response:**
```json
{
  "success": true,
  "message": "Temporary password generated. Use it to login and change your password.",
  "tempPassword": "aB3xK9mZ"
}
```

> ⚠️ `password_temp = TRUE` set hota hai — user ko next login par password change karna hoga.

---

## Route 6: Change Password

### `POST /api/auth/change-password`

Purana password verify karke naya set karta hai.

**Request Body:**
```json
{
  "schoolId": "my-school",
  "oldPassword": "aB3xK9mZ",
  "newPassword": "MyNewPass@123"
}
```

**Internal Workflow:**
```
auth table → old password verify (bcrypt/plain)
  │
  ├─ Wrong → 401
  │
  └─ Correct → bcrypt hash new password
               UPDATE auth SET password = hash, password_temp = FALSE
```

**Success Response:**
```json
{ "success": true, "message": "Password updated successfully" }
```

---

## Route 7: Verify OTP (Legacy/Firebase)

### `POST /api/auth/verify-otp`

Firebase OTP token verify — migration ke liye rakha gaya hai.

**Request Body:**
```json
{ "idToken": "firebase-id-token-here" }
```

> ⚠️ Yeh route abhi actual Firebase validation nahi karta — sirf token present hai ya nahi check karta hai. Legacy support ke liye hai.

**Success Response:**
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "user": { "uid": "migrated-user-uid", "email": "migrated@school.com" }
}
```

---

## Helper Functions

| Function | Kya karta hai |
|---|---|
| `normalize_id(id)` | school_id ko lowercase + spaces → dashes |
| `generate_random_password(len)` | Random alphanumeric password generate |
| `generate_token_id()` | 64-char hex token (32 random bytes) |
| `verify_password(stored, candidate)` | bcrypt ya plain text dono handle karta hai |

---

## Database Tables

### `auth`
| Column | Purpose |
|---|---|
| `school_id` | School identifier |
| `password` | bcrypt hash ya plain text |
| `password_temp` | `TRUE` agar temp password use ho raha hai |
| `security_question` | Recovery question |
| `security_answer_hash` | bcrypt hash of answer |

### `tokens`
| Column | Purpose |
|---|---|
| `token_id` | 64-char hex — access token |
| `school_id` | Linked school |
| `user_type` | `admin` / `student` / `employee` |
| `status` | `active` / `revoked` |
| `expires_at` | 1 hour from login |

### `auth_logs`
| Column | Purpose |
|---|---|
| `school_id` | Which school |
| `action` | `login` / `logout` |
| `details` | Extra info |

---

## Layer Architecture

```
Route (auth.rs)
  └─► AuthService (auth_service.rs)
         └─► Repository (postgres.rs)
                └─► auth + tokens + auth_logs tables
```
