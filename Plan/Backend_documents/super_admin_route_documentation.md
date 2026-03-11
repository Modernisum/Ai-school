# Super Admin Route Documentation

**File:** `src/super_admin/routes.rs`  
**Service:** `src/super_admin/service.rs` (`AdminService`)  
**Table:** `super_admin`, `schools`, `auth`, `tokens`, `promo_codes`, `school_promo_codes`, `support_requests`  
**Auth:** All routes (except login, support create, school notification) require `Bearer <admin_token>`

---

## Auth Mechanism

Har protected route mein `require_admin!` macro use hota hai:
```
1. Authorization header → Bearer token extract
2. AdminService.verify_admin_token(token) → JWT verify
3. Token invalid → 401 Unauthorized
4. Token valid → svc (AdminService) return karo
```

---

## Routes Summary

| # | Method | URL | Auth | Handler | Description |
|---|---|---|---|---|---|
| **── Auth ──** |||||
| 1 | `POST` | `/api/admin/login` | ❌ Public | `admin_login` | Super admin login |
| **── School Management ──** |||||
| 2 | `GET` | `/api/admin/schools` | ✅ Admin | `list_all_schools` | Sabhi schools list |
| 3 | `GET` | `/api/admin/schools/:school_id` | ✅ Admin | `get_school` | Single school full data |
| 4 | `PUT` | `/api/admin/schools/:school_id` | ✅ Admin | `update_school` | School data update |
| 5 | `DELETE` | `/api/admin/schools/:school_id` | ✅ Admin | `delete_school` | School + all data delete |
| 6 | `PUT` | `/api/admin/schools/:school_id/status` | ✅ Admin | `set_school_status` | Block/activate/inactive |
| 7 | `PUT` | `/api/admin/schools/:school_id/password` | ✅ Admin | `change_school_password` | Reset school password |
| **── Session Management ──** |||||
| 8 | `PUT` | `/api/admin/schools/:school_id/session` | ✅ Admin | `set_session_duration` | Session hours set karo |
| 9 | `POST` | `/api/admin/schools/:school_id/expire-sessions` | ✅ Admin | `expire_school_sessions` | All tokens revoke |
| 10 | `GET` | `/api/admin/schools/:school_id/sessions` | ✅ Admin | `get_school_sessions` | Active sessions list |
| **── Notifications ──** |||||
| 11 | `POST` | `/api/admin/schools/:school_id/notify` | ✅ Admin | `send_notification` | School ko notification bhejo |
| 12 | `DELETE` | `/api/admin/schools/:school_id/notify` | ✅ Admin | `clear_notification` | Notification clear karo |
| 13 | `GET` | `/api/schools/:school_id/notification` | ❌ Public | `get_school_notification` | School apni notification dekhe |
| 14 | `DELETE` | `/api/schools/:school_id/notification` | ❌ Public | `clear_school_notification` | School apni notification clear kare |
| **── Backup / Export / Import ──** |||||
| 15 | `GET` | `/api/admin/schools/:school_id/export` | ✅ Admin | `export_school` | Single school JSON backup |
| 16 | `GET` | `/api/admin/export` | ✅ Admin | `export_all_schools` | Sabhi schools ka backup |
| 17 | `POST` | `/api/admin/schools/:school_id/import` | ✅ Admin | `import_school` | School data import/restore |
| 18 | `POST` | `/api/admin/backup` | ✅ Admin | `manual_backup` | Manual system backup trigger |
| **── Support Requests ──** |||||
| 19 | `POST` | `/api/support` | ❌ Public | `create_support_request` | School support ticket banao |
| 20 | `GET` | `/api/admin/support` | ✅ Admin | `list_support_requests` | Sabhi tickets list |
| 21 | `PUT` | `/api/admin/support/:id` | ✅ Admin | `resolve_support_request` | Ticket resolve karo |
| **── Promo Codes ──** |||||
| 22 | `POST` | `/api/admin/promo` | ✅ Admin | `create_promo_code` | Promo code banao |
| 23 | `GET` | `/api/admin/promo` | ✅ Admin | `list_promo_codes` | Promo codes list |
| 24 | `GET` | `/api/admin/promo/:promo_id/usage` | ✅ Admin | `get_promo_usage` | Promo ka usage dekho |
| 25 | `POST` | `/api/admin/schools/:school_id/promo` | ✅ Admin | `apply_promo_to_school` | School par promo apply karo |

---

## Route Details

### Route 1: Admin Login (No Auth Required)
```
POST /api/admin/login
Body: { "username": "superadmin", "password": "adminpass" }

→ AdminService.admin_login(username, password)
  → SELECT * FROM super_admin WHERE username=$1
  → bcrypt verify password
  → Generate JWT token
  
Response: { "success": true, "accessToken": "jwt_token", "message": "Super admin login successful" }
```

---

### Route 5: Delete School (Cascade)
```
DELETE /api/admin/schools/:school_id
→ Deletes school + ALL related data (students, employees, fees, attendance...)
→ Uses CASCADE delete or manual cleanup
```

---

### Route 6: Set School Status
```
PUT /api/admin/schools/:school_id/status
Body: { "status": "blocked" }   // "active" | "blocked" | "inactive"

Validation: Only 3 valid values → 400 for anything else
→ UPDATE schools SET billing_status = $1 WHERE school_id = $2
```

---

### Route 8: Set Session Duration
```
PUT /api/admin/schools/:school_id/session
Body: { "hours": 1 }   // Must be 1–8760 (max 1 year)

→ UPDATE schools SET session_duration_hours = $1 WHERE school_id = $2
```

---

### Route 9: Expire Sessions (Force Logout)
```
POST /api/admin/schools/:school_id/expire-sessions
→ UPDATE tokens SET status='revoked', expires_at=NOW()
  WHERE school_id=$1 AND status='active'
→ Returns count of revoked sessions
```

---

### Route 11: Send Notification to School
```
POST /api/admin/schools/:school_id/notify
Body: {
  "title": "System Maintenance",
  "message": "Server will be down from 2-4 AM",
  "type": "warning"   // "info" | "warning" | "error"
}

→ UPDATE schools SET notification = { title, message, type, sentAt, dismissible: true }
  WHERE school_id = $1
```

---

### Route 15 & 16: Export School Data (JSON Backup)
```
GET /api/admin/schools/:school_id/export
→ Collects all school data from DB
→ Returns file download: school_{school_id}_backup.json

GET /api/admin/export
→ Collects ALL schools data
→ Returns file download: all_schools_backup_{date}.json
```

---

### Route 19: Create Support Request (Public — No Auth)
```
POST /api/support
Body: {
  "schoolName": "Sunrise Public School",
  "contactInfo": "admin@sunrise.com",
  "message": "Need help with fee module"
}

Validation: schoolName + message required → 400 if missing
→ INSERT INTO support_requests (school_name, contact_info, message, status)
  VALUES ($1, $2, $3, 'open')
```

---

### Route 22: Create Promo Code
```
POST /api/admin/promo
Body: {
  "code": "LAUNCH50",
  "creditAmount": "500.00",
  "freeDays": 30,
  "maxUses": 100,
  "discountPercentage": "50.00",
  "expiresAt": "2026-12-31T00:00:00Z"
}

Validation:
- code cannot be empty → 400
- creditAmount must parse as decimal → 400

→ INSERT INTO promo_codes (code, credit_amount, free_days, discount_percentage, expires_at, max_uses)
```

---

### Route 25: Apply Promo to School
```
POST /api/admin/schools/:school_id/promo
Body: { "code": "LAUNCH50" }

→ Validates promo (not expired, max_uses not exceeded)
→ INSERT INTO school_promo_codes (school_id, promo_id, applied_at)
→ UPDATE schools SET active_promo_id = $1, promo_expires_at = $2 WHERE school_id = $3
→ Optionally adds wallet credit or free days to school billing
```

---

## Layer Architecture

```
Route (super_admin/routes.rs)
  └─► AdminService (super_admin/service.rs)
         ├─► super_admin table (auth)
         ├─► schools table (management)
         ├─► tokens table (sessions)
         ├─► promo_codes + school_promo_codes
         └─► support_requests
```

---

## Security Model

| Role | Access |
|---|---|
| **Super Admin** | All admin routes (Bearer JWT required) |
| **School** | Own notification read/clear only |
| **Public** | Login + Support request creation only |
