# School & Setup Route Documentation

---

## School — `src/routes/school.rs`

**Tables:** `schools`, `auth`  
**Auth:** Bearer token required for write routes

| # | Method | URL | Handler | Description |
|---|---|---|---|---|
| 1 | `GET` | `/api/school/:school_id` | `get_school_details` | School profile fetch karo |
| 2 | `PUT` | `/api/school/:school_id` | `update_school_self` | School apna profile update kare (Bearer auth) |
| 3 | `PATCH` | `/api/school/:school_id` | `change_password_self` | School apna password change kare (Bearer auth) |

---

### Route 1: Get School Details
```
GET /api/school/:school_id
→ SELECT * FROM schools WHERE school_id = $1
```
**Response:**
```json
{ "success": true, "data": { "schoolId": "...", "schoolName": "...", ... } }
```

---

### Route 2: Update School Self-Profile

```
PUT /api/school/:school_id
Headers: Authorization: Bearer <accessToken>
Body: { "schoolName": "New Name", "phone": "9876543210", ... }
```

**Workflow:**
```
1. Extract Bearer token from Authorization header
   → Missing token → 401 Unauthorized

2. Merge payload into schools.data JSONB:
   UPDATE schools
   SET data = COALESCE(data, '{}'::jsonb) || $1::jsonb,
       updated_at = NOW()
   WHERE school_id = $2

3. If "schoolName" present → also update dedicated column:
   UPDATE schools SET school_name = $1 WHERE school_id = $2
```

**Response:**
```json
{ "success": true, "message": "School profile updated successfully" }
```

---

### Route 3: Change Password (Self)

```
PUT /api/school/:school_id/password
Headers: Authorization: Bearer <accessToken>
Body: { "newPassword": "mynewpwd123" }
```

**Workflow:**
```
1. Bearer token check → 401 if missing
2. newPassword length check → 400 if < 6 chars
3. bcrypt hash with cost=10
4. UPDATE auth SET password = $1, updated_at = NOW()
   WHERE school_id = $2
```

**Response:**
```json
{ "success": true, "message": "Password updated successfully" }
```

---

## Setup — `src/routes/setup.rs`

**Service:** `src/services/setup_service.rs`  
**Purpose:** School registration + initial configuration

| # | Method | URL | Handler | Description |
|---|---|---|---|---|
| 1 | `GET` | `/api/setup/:school_id` | `get_setup` | School ka current setup data lo |
| 2 | `POST` | `/api/setup/school` | `setup_school_handler` | Naya school register karo |

---

### Route 1: Get Setup Data
```
GET /api/setup/:school_id
→ Returns school metadata + configuration state
```

---

### Route 2: Setup School (Register) ⭐

```
POST /api/setup/school
Body:
{
  "schoolName": "Sunrise Public School",
  "password": "initial123",
  "address": "Delhi, India",
  "phone": "9876543210",
  "email": "admin@sunrise.com",
  ...
}
```

**Workflow — 3 Steps:**
```
Step 1: setup_service.setup_school(payload)
  → Creates school record in `schools` table
  → Creates password hash in `auth` table
  → Creates default spaces/items/materials
  → Returns { schoolId, schoolCode }

Step 2: Auto-Login
  → Immediately calls auth_service.login({ schoolId, password, userType: "school-admin" })
  → Generates accessToken (1 hour validity)

Step 3: Return combined response
```

**Success Response (with auto-login):**
```json
{
  "success": true,
  "schoolId": "sunrise-public-school",
  "schoolCode": "SPS001",
  "accessToken": "abc123hex...",
  "message": "School setup completed and signed in automatically"
}
```

**Fallback (if auto-login fails):**
```json
// Returns raw setup result without accessToken
{ "schoolId": "...", "schoolCode": "..." }
```

> **Key feature:** School creation + login is a single API call — frontend gets `accessToken` immediately after setup.
