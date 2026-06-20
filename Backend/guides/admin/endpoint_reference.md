# Platform Admin Endpoint Reference

Source routes:

- `rust/src/domain/admin/mod.rs`
- `rust/src/domain/admin/auth.rs`
- `rust/src/domain/admin/billing.rs`
- `rust/src/domain/admin/promo.rs`
- `rust/src/domain/admin/system.rs`
- `rust/src/domain/admin/school.rs`
- `rust/src/domain/admin/support.rs`
- `rust/src/domain/cms/mod.rs`
- `rust/src/domain/cms/cms.rs`

All endpoints below are mounted under `/api/admin` because `domain::create_router` nests domain routes under `/api` in `rust/src/domain/mod.rs`.

## Common auth and response shape

Protected admin endpoints require:

```http
Authorization: Bearer <adminAccessToken>
```

`POST /api/admin/login` is public and does not require this header.

Most successful admin endpoints use:

```json
{
  "success": true,
  "data": {}
}
```

Most error responses use:

```json
{
  "success": false,
  "message": "Human readable error"
}
```

Current implementation notes for freshers:

- Admin routes have an admin rate limiter. Manual API tests may need spacing or a higher test limit.
- Validation errors usually return `400 BAD_REQUEST` with `success:false`.
- `POST /api/admin/schools/:schoolId/refund` currently returns `500 INTERNAL_SERVER_ERROR` for an invalid amount because the handler uses `err_json!`; treat this as a known current-code behavior.
- `GET /api/admin/config/:key` returns `data` as the config value string, not an object.
- `POST /api/admin/promos` returns `data` containing `{ success: true, message: ... }` because the service returns a wrapped success object and the handler wraps it again with `ok_json!`.
- Export endpoints return JSON file attachments with `Content-Disposition` instead of the normal envelope.

## Route coverage

| Area | Routes | Test ids |
|---|---|---|
| Auth | `/login`, `/profile`, `/update-credentials` | `TC_ADMIN_AUTH_001` to `TC_ADMIN_AUTH_008` |
| Stats | `/stats`, `/stats/advanced`, `/churn-radar` | `TC_ADMIN_STATS_001` to `TC_ADMIN_STATS_003` |
| Promos | `/promos`, `/promos/:promoId/usage`, `/schools/:schoolId/apply-promo` | `TC_ADMIN_PROMOS_001` to `TC_ADMIN_PROMOS_007` |
| Config | `/config/:key`, `/config` | `TC_ADMIN_CONFIG_001` to `TC_ADMIN_CONFIG_003` |
| Schools | school CRUD, status, password, sessions, notify, ledger, refund, export, import | `TC_ADMIN_SCHOOLS_001` to `TC_ADMIN_SCHOOLS_021` |
| Support | `/support`, `/support/:id/resolve` | `TC_ADMIN_SUPPORT_001` to `TC_ADMIN_SUPPORT_002` |
| System | `/backup`, `/notify/global` | `TC_ADMIN_SYSTEM_001` to `TC_ADMIN_SYSTEM_003` |
| CMS admin | blog, testimonials, school requests | `TC_ADMIN_CMS_001` to `TC_ADMIN_CMS_008` |
| Negative auth | missing/invalid bearer token | `TC_ADMIN_NEGATIVE_001` to `TC_ADMIN_NEGATIVE_003` |

---

## 1. Auth

### 1.1 `POST /api/admin/login`

Handler: `auth::admin_login`

Auth: None

Request body:

```json
{
  "username": "superadmin",
  "password": "admin@123"
}
```

Expected success response: `200 OK`

```json
{
  "success": true,
  "accessToken": "base64(username:timestamp:SUPER_ADMIN_SECRET)",
  "message": "Super admin login successful"
}
```

Expected validation errors:

```json
{
  "success": false,
  "message": "username required"
}
```

```json
{
  "success": false,
  "message": "password required"
}
```

Expected invalid credential error: `401 UNAUTHORIZED`

```json
{
  "success": false,
  "message": "Invalid super admin credentials"
}
```

### 1.2 `GET /api/admin/profile`

Handler: `auth::get_admin_profile`

Auth: Admin bearer token

Expected success response: `200 OK`

```json
{
  "success": true,
  "data": {
    "username": "superadmin",
    "profileImageUrl": null
  }
}
```

Expected errors:

```json
{
  "success": false,
  "message": "Missing admin token"
}
```

```json
{
  "success": false,
  "message": "Admin not found"
}
```

### 1.3 `POST /api/admin/update-credentials`

Handler: `auth::update_admin_credentials`

Auth: Admin bearer token

Request body:

```json
{
  "currentUsername": "superadmin",
  "currentPassword": "admin@123",
  "newUsername": "superadmin",
  "newPassword": "newSecurePassword123",
  "profileImageUrl": "https://example.com/avatar.png"
}
```

Expected success response: `200 OK`

```json
{
  "success": true,
  "data": "Super admin credentials updated successfully"
}
```

Expected validation error: `400 BAD_REQUEST`

```json
{
  "success": false,
  "message": "newUsername and newPassword are required"
}
```

Expected service error: `400 BAD_REQUEST`

```json
{
  "success": false,
  "message": "Authorization failed: Invalid current credentials"
}
```

---

## 2. Dashboard, stats, and churn

### 2.1 `GET /api/admin/stats`

Handler: `billing::get_admin_dashboard_stats`

Auth: Admin bearer token

Expected success response: `200 OK`

```json
{
  "success": true,
  "data": {
    "totals": {
      "schools": 42,
      "students": 15902,
      "teachers": 340,
      "wallet": "250000.00"
    },
    "registrations": [
      {
        "month": "2026-05",
        "count": 4
      }
    ]
  }
}
```

Expected error response: `500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "database error details"
}
```

### 2.2 `GET /api/admin/stats/advanced`

Handler: `billing::get_admin_stats_advanced`

Auth: Admin bearer token

Expected success response: `200 OK`

```json
{
  "success": true,
  "data": {
    "activeSessionsCount": 124,
    "averageResponseTimeMs": 34,
    "dbPoolConnections": 8,
    "redisPoolConnections": 3
  }
}
```

The exact `data` object comes from `services/admin/super_admin_repo.get_admin_stats`.

Expected error response: `500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "stats service error"
}
```

### 2.3 `GET /api/admin/churn-radar`

Handler: `billing::get_churn_radar`

Auth: Admin bearer token

Expected success response: `200 OK`

```json
{
  "success": true,
  "data": {
    "highRiskSchoolsCount": 3,
    "details": [
      {
        "schoolId": "SCH-00021",
        "schoolName": "Vidhyam High School",
        "daysSinceLastAdminLogin": 45,
        "riskScore": 85
      }
    ]
  }
}
```

Expected error response: `500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "churn radar service error"
}
```

---

## 3. Promo codes

### 3.1 `GET /api/admin/promos`

Handler: `promo::list_promo_codes`

Auth: Admin bearer token

Expected success response: `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": 29,
      "code": "BACKTOSCHOOL26",
      "credit_amount": "100.00",
      "free_days": 0,
      "discount_percentage": "15.00",
      "expires_at": "2026-12-31T23:59:59Z",
      "max_uses": 100,
      "used_count": 12,
      "active": true
    }
  ]
}
```

Expected error response: `500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "promo list failed"
}
```

### 3.2 `POST /api/admin/promos`

Handler: `promo::create_promo_code`

Auth: Admin bearer token

Request body:

```json
{
  "code": "BACKTOSCHOOL26",
  "creditAmount": "100.00",
  "freeDays": 0,
  "discountPercentage": "15.00",
  "expiresAt": "2026-12-31T23:59:59Z",
  "maxUses": 100
}
```

Expected success response: `200 OK`

```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Promo code BACKTOSCHOOL26 created successfully"
  }
}
```

Expected validation errors: `400 BAD_REQUEST`

```json
{
  "success": false,
  "message": "Promo code must not be empty"
}
```

```json
{
  "success": false,
  "message": "Invalid credit amount format"
}
```

Expected service error: `500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "promo creation failed"
}
```

### 3.3 `GET /api/admin/promos/:promoId/usage`

Handler: `promo::get_promo_usage`

Auth: Admin bearer token

Path params:

| Param | Type | Description |
|---|---|---|
| `promoId` | integer | Promo row id |

Expected success response: `200 OK`

```json
{
  "success": true,
  "data": {
    "id": 29,
    "code": "BACKTOSCHOOL26",
    "used_count": 12,
    "remaining_uses": 88,
    "max_uses": 100
  }
}
```

Expected error response: `500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "promo usage lookup failed"
}
```

### 3.4 `POST /api/admin/schools/:schoolId/apply-promo`

Handler: `promo::apply_promo_to_school`

Auth: Admin bearer token

Path params:

| Param | Type | Description |
|---|---|---|
| `schoolId` | string | School tenant id |

Request body:

```json
{
  "code": "BACKTOSCHOOL26"
}
```

Expected success response: `200 OK`

```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Promo applied successfully"
  }
}
```

Expected validation error: `400 BAD_REQUEST`

```json
{
  "success": false,
  "message": "Promo code required"
}
```

Expected service error: `500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "promo apply failed"
}
```

---

## 4. System config

### 4.1 `GET /api/admin/config/:key`

Handler: `system::get_config`

Auth: Admin bearer token

Path params:

| Param | Type | Description |
|---|---|---|
| `key` | string | Global config key |

Expected success response: `200 OK`

```json
{
  "success": true,
  "data": "false"
}
```

Expected error response: `500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "Config key 'maintenance_mode' not found"
}
```

### 4.2 `POST /api/admin/config`

Handler: `system::update_config`

Auth: Admin bearer token

Request body:

```json
{
  "key": "maintenance_mode",
  "value": "true"
}
```

Expected success response: `200 OK`

```json
{
  "success": true,
  "data": "Config updated"
}
```

Expected validation error: `400 BAD_REQUEST`

```json
{
  "success": false,
  "message": "key is required"
}
```

Expected service error: `500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "config update failed"
}
```

---

## 5. School tenant management

### 5.1 `GET /api/admin/schools`

Handler: `school::list_all_schools`

Auth: Admin bearer token

Query params:

| Param | Type | Description |
|---|---|---|
| `simple` | boolean | Optional. `true` returns only `schoolId` and `schoolName` |

Expected success response without `simple=true`: `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "schoolId": "SCH-00021",
      "schoolName": "Vidhyam High School",
      "status": "active",
      "created_at": "2026-01-10T12:00:00Z"
    }
  ]
}
```

Expected success response with `simple=true`: `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "schoolId": "SCH-00021",
      "schoolName": "Vidhyam High School"
    }
  ]
}
```

Expected error response: `500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "school list failed"
}
```

### 5.2 `GET /api/admin/schools/export/all`

Handler: `system::export_all_schools`

Auth: Admin bearer token

Expected success response: `200 OK`

Headers:

```http
Content-Type: application/json
Content-Disposition: attachment; filename="all_schools_backup_YYYYMMDD.json"
```

Body:

```json
{
  "exportedAt": "2026-06-19T00:00:00Z",
  "exportVersion": "1.0",
  "totalSchools": 2,
  "schools": [
    {
      "school": {
        "schoolId": "SCH-00021",
        "schoolName": "Vidhyam High School"
      },
      "students": [],
      "employees": []
    }
  ]
}
```

Expected error response: `500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "export failed"
}
```

### 5.3 `GET /api/admin/schools/:schoolId`

Handler: `school::get_school`

Auth: Admin bearer token

Path params:

| Param | Type | Description |
|---|---|---|
| `schoolId` | string | School tenant id |

Expected success response: `200 OK`

```json
{
  "success": true,
  "data": {
    "schoolId": "SCH-00021",
    "schoolName": "Vidhyam High School",
    "status": "active",
    "contactEmail": "admin@vidhyam.com",
    "sessionDurationHours": 72
  }
}
```

Expected error response: `500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "School SCH-00021 not found"
}
```

### 5.4 `PUT /api/admin/schools/:schoolId`

Handler: `school::update_school`

Auth: Admin bearer token

Path params:

| Param | Type | Description |
|---|---|---|
| `schoolId` | string | School tenant id |

Request body:

```json
{
  "schoolName": "Vidhyam High School - East Wing",
  "contactEmail": "east@vidhyam.com"
}
```

Expected success response: `200 OK`

```json
{
  "success": true,
  "data": "School updated"
}
```

Expected error response: `500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "school update failed"
}
```

### 5.5 `DELETE /api/admin/schools/:schoolId`

Handler: `school::delete_school`

Auth: Admin bearer token

Path params:

| Param | Type | Description |
|---|---|---|
| `schoolId` | string | School tenant id |

Expected success response: `200 OK`

```json
{
  "success": true,
  "data": "School and all related data deleted"
}
```

Expected error response: `500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "school delete failed"
}
```

### 5.6 `PATCH /api/admin/schools/:schoolId/status`

Handler: `school::set_school_status`

Auth: Admin bearer token

Path params:

| Param | Type | Description |
|---|---|---|
| `schoolId` | string | School tenant id |

Request body:

```json
{
  "status": "blocked"
}
```

Allowed status values:

- `active`
- `blocked`
- `inactive`

Expected success response: `200 OK`

```json
{
  "success": true,
  "data": "School status set to blocked"
}
```

Expected validation error: `400 BAD_REQUEST`

```json
{
  "success": false,
  "message": "status must be active|blocked|inactive"
}
```

Expected service error: `500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "school status update failed"
}
```

### 5.7 `PATCH /api/admin/schools/:schoolId/password`

Handler: `school::change_school_password`

Auth: Admin bearer token

Path params:

| Param | Type | Description |
|---|---|---|
| `schoolId` | string | School tenant id |

Request body:

```json
{
  "newPassword": "adminHardResetPassword123"
}
```

Expected success response: `200 OK`

```json
{
  "success": true,
  "data": "Password updated"
}
```

Expected validation error: `400 BAD_REQUEST`

```json
{
  "success": false,
  "message": "newPassword required"
}
```

Expected service error: `500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "password reset failed"
}
```

### 5.8 `PATCH /api/admin/schools/:schoolId/session`

Handler: `school::set_session_duration`

Auth: Admin bearer token

Path params:

| Param | Type | Description |
|---|---|---|
| `schoolId` | string | School tenant id |

Request body:

```json
{
  "hours": 72
}
```

Allowed range:

- `hours` must be between `1` and `8760`

Expected success response: `200 OK`

```json
{
  "success": true,
  "data": "Session duration set to 72 hours"
}
```

Expected validation error: `400 BAD_REQUEST`

```json
{
  "success": false,
  "message": "hours must be 1–8760"
}
```

Expected service error: `500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "session duration update failed"
}
```

### 5.9 `GET /api/admin/schools/:schoolId/sessions`

Handler: `school::get_school_sessions`

Auth: Admin bearer token

Path params:

| Param | Type | Description |
|---|---|---|
| `schoolId` | string | School tenant id |

Expected success response: `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "sessionId": "SES-1001",
      "userId": "USR-10",
      "createdAt": "2026-06-19T10:00:00Z",
      "lastSeenAt": "2026-06-19T10:30:00Z"
    }
  ]
}
```

Expected error response: `500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "session lookup failed"
}
```

### 5.10 `DELETE /api/admin/schools/:schoolId/sessions`

Handler: `school::expire_school_sessions`

Auth: Admin bearer token

Path params:

| Param | Type | Description |
|---|---|---|
| `schoolId` | string | School tenant id |

Expected success response: `200 OK`

```json
{
  "success": true,
  "data": "14 sessions expired"
}
```

Expected error response: `500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "session expiry failed"
}
```

### 5.11 `POST /api/admin/schools/:schoolId/notify`

Handler: `school::send_notification`

Auth: Admin bearer token

Path params:

| Param | Type | Description |
|---|---|---|
| `schoolId` | string | School tenant id |

Request body:

```json
{
  "title": "System Update Complete",
  "message": "We have successfully updated the online attendance registers.",
  "type": "info"
}
```

`type` can be `info`, `warning`, or `error`. Missing fields use defaults:

- `title`: `Message from Admin`
- `message`: empty string
- `type`: `info`

Expected success response: `200 OK`

```json
{
  "success": true,
  "data": "Notification sent"
}
```

Expected error response: `500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "notification update failed"
}
```

### 5.12 `DELETE /api/admin/schools/:schoolId/notify`

Handler: `school::clear_notification`

Auth: Admin bearer token

Path params:

| Param | Type | Description |
|---|---|---|
| `schoolId` | string | School tenant id |

Expected success response: `200 OK`

```json
{
  "success": true,
  "data": "Notification cleared"
}
```

Expected error response: `500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "notification clear failed"
}
```

### 5.13 `GET /api/admin/schools/:schoolId/ledger`

Handler: `billing::get_wallet_ledger`

Auth: Admin bearer token

Path params:

| Param | Type | Description |
|---|---|---|
| `schoolId` | string | School tenant id |

Expected success response: `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "transactionId": "TXN_002881",
      "amount": "25000.00",
      "type": "subscription_fee",
      "timestamp": "2026-06-01T08:00:00Z",
      "description": "Monthly subscription"
    }
  ]
}
```

Expected error response: `500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "ledger lookup failed"
}
```

### 5.14 `POST /api/admin/schools/:schoolId/refund`

Handler: `billing::process_refund`

Auth: Admin bearer token

Path params:

| Param | Type | Description |
|---|---|---|
| `schoolId` | string | School tenant id |

Request body:

```json
{
  "amount": "5000.00",
  "description": "Overcharged billing error in May invoice."
}
```

Expected success response: `200 OK`

```json
{
  "success": true,
  "data": {
    "success": true,
    "newBalance": "245000.00",
    "message": "Refund of ₹5000.00 processed for school SCH-00021"
  }
}
```

Expected validation error: `500 INTERNAL_SERVER_ERROR` in current implementation

```json
{
  "success": false,
  "message": "Invalid amount format"
}
```

Expected service error: `500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "refund failed"
}
```

### 5.15 `GET /api/admin/schools/:schoolId/export`

Handler: `system::export_school`

Auth: Admin bearer token

Path params:

| Param | Type | Description |
|---|---|---|
| `schoolId` | string | School tenant id |

Expected success response: `200 OK`

Headers:

```http
Content-Type: application/json
Content-Disposition: attachment; filename="school_SCH-00021_backup.json"
```

Body:

```json
{
  "exportedAt": "2026-06-19T00:00:00Z",
  "exportVersion": "1.0",
  "school": {
    "schoolId": "SCH-00021",
    "schoolName": "Vidhyam High School"
  },
  "students": [],
  "employees": [],
  "classes": [],
  "subjects": [],
  "fees": [],
  "attendance": [],
  "announcements": [],
  "events": [],
  "complains": [],
  "spaces": []
}
```

Expected error response: `500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "school export failed"
}
```

### 5.16 `POST /api/admin/schools/:schoolId/import`

Handler: `system::import_school`

Auth: Admin bearer token

Path params:

| Param | Type | Description |
|---|---|---|
| `schoolId` | string | School tenant id |

Request body:

```json
{
  "exportVersion": "1.0",
  "school": {
    "schoolId": "SCH-00021",
    "schoolName": "Vidhyam High School"
  },
  "students": [
    {
      "student_id": "STD-00001",
      "name": "Sample Student"
    }
  ],
  "employees": [],
  "billingLedgers": []
}
```

Expected success response: `200 OK`

```json
{
  "success": true,
  "data": {
    "success": true,
    "imported": 1,
    "message": "Imported 1 records for school SCH-00021"
  }
}
```

Expected validation error: `500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "Invalid backup file: missing exportVersion"
}
```

Expected service error: `500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "school import failed"
}
```

---

## 6. Support tickets

### 6.1 `GET /api/admin/support`

Handler: `support::list_support_requests`

Auth: Admin bearer token

Expected success response: `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "school_name": "Vidhyam High School",
      "contact_info": "admin@vidhyam.com",
      "message": "Login issue on student portal",
      "status": "open",
      "created_at": "2026-06-19T10:00:00Z",
      "resolved_at": null
    }
  ]
}
```

Expected error response: `500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "support request lookup failed"
}
```

### 6.2 `PATCH /api/admin/support/:id/resolve`

Handler: `support::resolve_support_request`

Auth: Admin bearer token

Path params:

| Param | Type | Description |
|---|---|---|
| `id` | integer | Support request id |

Expected success response: `200 OK`

```json
{
  "success": true,
  "data": "Request marked as resolved"
}
```

Expected error response: `500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "support request resolution failed"
}
```

---

## 7. Global system actions

### 7.1 `POST /api/admin/backup`

Handler: `system::manual_backup`

Auth: Admin bearer token

Expected success response: `200 OK`

```json
{
  "success": true,
  "data": "Manual backup completed successfully"
}
```

Expected error response: `500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "backup failed"
}
```

### 7.2 `POST /api/admin/notify/global`

Handler: `system::send_global_notification`

Auth: Admin bearer token

Request body:

```json
{
  "message": "Scheduled maintenance tomorrow morning between 04:00 and 06:00 UTC.",
  "title": "Maintenance Notice",
  "type": "warning"
}
```

Missing fields use defaults:

- `title`: `Global Message`
- `message`: empty string
- `type`: `info`

Expected success response: `200 OK`

```json
{
  "success": true,
  "data": "Global update sent"
}
```

Expected error response: `500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "global notification update failed"
}
```

### 7.3 `DELETE /api/admin/notify/global`

Handler: `system::clear_global_notification`

Auth: Admin bearer token

Expected success response: `200 OK`

```json
{
  "success": true,
  "data": "Global notifications cleared"
}
```

Expected error response: `500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "global notification clear failed"
}
```

---

## 8. CMS admin

CMS admin routes are nested from `rust/src/domain/cms/admin_routes`.

### 8.1 `POST /api/admin/cms/blog`

Handler: `cms::create_blog_post`

Auth: Admin bearer token

Request body:

```json
{
  "title": "Empowering Education via AI Timetabling",
  "slug": "empowering-education-via-ai-timetabling",
  "excerpt": "Short summary",
  "content": "Full HTML or Markdown content here...",
  "cover_image_url": "https://example.com/cover.png",
  "author_name": "Platform Team",
  "category": "AI",
  "tags": ["AI", "Timetabling", "EdTech"],
  "seo_title": "AI Timetabling",
  "seo_description": "SEO description",
  "is_published": true
}
```

Accepted fields are defined in `models/cms.rs::CreateBlogRequest`.

Expected success response: `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "00000000-0000-0000-0000-000000000001"
  }
}
```

Expected error response: `500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "blog creation failed"
}
```

### 8.2 `PUT /api/admin/cms/blog/:id`

Handler: `cms::update_blog_post`

Auth: Admin bearer token

Path params:

| Param | Type | Description |
|---|---|---|
| `id` | UUID | Blog post id |

Request body: same shape as `POST /api/admin/cms/blog`.

Expected success response: `200 OK`

```json
{
  "success": true,
  "message": "Blog post updated"
}
```

Expected error response: `500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "blog update failed"
}
```

### 8.3 `DELETE /api/admin/cms/blog/:id`

Handler: `cms::delete_blog_post`

Auth: Admin bearer token

Path params:

| Param | Type | Description |
|---|---|---|
| `id` | UUID | Blog post id |

Expected success response: `200 OK`

```json
{
  "success": true,
  "message": "Blog post deleted"
}
```

Expected error response: `500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "blog deletion failed"
}
```

### 8.4 `POST /api/admin/cms/testimonials`

Handler: `cms::create_testimonial`

Auth: Admin bearer token

Request body:

```json
{
  "client_name": "Dr. Sarah Paul",
  "client_title": "Principal, St. Xavier School",
  "school_name": "St. Xavier School",
  "avatar_url": "https://example.com/avatar.png",
  "rating": 5,
  "content": "Vidhyam has resolved all our scheduling conflicts!",
  "is_featured": true,
  "display_order": 1,
  "is_published": true
}
```

Accepted fields are defined in `models/cms.rs::CreateTestimonialRequest`.

Expected success response: `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "00000000-0000-0000-0000-000000000002"
  }
}
```

Expected error response: `500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "testimonial creation failed"
}
```

### 8.5 `PUT /api/admin/cms/testimonials/:id`

Handler: `cms::update_testimonial`

Auth: Admin bearer token

Path params:

| Param | Type | Description |
|---|---|---|
| `id` | UUID | Testimonial id |

Request body: same shape as `POST /api/admin/cms/testimonials`.

Expected success response: `200 OK`

```json
{
  "success": true,
  "message": "Testimonial updated"
}
```

Expected error response: `500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "testimonial update failed"
}
```

### 8.6 `DELETE /api/admin/cms/testimonials/:id`

Handler: `cms::delete_testimonial`

Auth: Admin bearer token

Path params:

| Param | Type | Description |
|---|---|---|
| `id` | UUID | Testimonial id |

Expected success response: `200 OK`

```json
{
  "success": true,
  "message": "Testimonial deleted"
}
```

Expected error response: `500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "testimonial deletion failed"
}
```

### 8.7 `GET /api/admin/cms/school-requests`

Handler: `cms::list_school_access_requests`

Auth: Admin bearer token

Expected success response: `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "00000000-0000-0000-0000-000000000003",
      "school_name": "New School",
      "contact_name": "Rahul Sharma",
      "email": "rahul@school.com",
      "phone": "9876543210",
      "employee_count": 40,
      "student_count": 800,
      "message": "We want to onboard Vidhyam.",
      "status": "pending",
      "created_at": "2026-06-19T10:00:00Z",
      "admin_notes": null
    }
  ]
}
```

Expected error response: `500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "school access request lookup failed"
}
```

### 8.8 `PUT /api/admin/cms/school-requests/:id`

Handler: `cms::update_school_access_request`

Auth: Admin bearer token

Path params:

| Param | Type | Description |
|---|---|---|
| `id` | UUID | School access request id |

Request body:

```json
{
  "status": "approved",
  "admin_notes": "Approved after phone verification."
}
```

Expected success response: `200 OK`

```json
{
  "success": true,
  "message": "Request updated"
}
```

Expected error response: `500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "school access request update failed"
}
```
