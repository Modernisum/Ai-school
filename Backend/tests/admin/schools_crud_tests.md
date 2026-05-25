# Admin API — Super Admin Tests

> **⚠️ BUG FIX**: Several routes had wrong methods and paths. Updated to match actual `admin.rs` routes.

---

## Actual Route Table

| # | Method | URL | Handler |
|---|--------|-----|---------|
| 1 | POST | `/api/admin/login` | `admin_login` |
| 2 | GET | `/api/admin/profile` | `get_admin_profile` |
| 3 | POST | `/api/admin/update-credentials` | `update_admin_credentials` |
| 4 | GET | `/api/admin/stats` | `get_admin_dashboard_stats` |
| 5 | GET | `/api/admin/stats/advanced` | `get_admin_stats_advanced` |
| 6 | GET | `/api/admin/churn-radar` | `get_churn_radar` |
| 7 | GET | `/api/admin/promos` | `list_promo_codes` |
| 8 | POST | `/api/admin/promos` | `create_promo_code` |
| 9 | GET | `/api/admin/promos/:promoId/usage` | `get_promo_usage` |
| 10 | GET | `/api/admin/config/:key` | `get_config` |
| 11 | POST | `/api/admin/config` | `update_config` |
| 12 | GET | `/api/admin/schools` | `list_all_schools` |
| 13 | GET | `/api/admin/schools/export/all` | `export_all_schools` |
| 14 | GET/PUT/DELETE | `/api/admin/schools/:schoolId` | `get_school` / `update_school` / `delete_school` |
| 15 | PATCH | `/api/admin/schools/:schoolId/status` | `set_school_status` |
| 16 | PATCH | `/api/admin/schools/:schoolId/password` | `change_school_password` |
| 17 | PATCH | `/api/admin/schools/:schoolId/session` | `set_session_duration` |
| 18 | GET/DELETE | `/api/admin/schools/:schoolId/sessions` | `get_school_sessions` / `expire_school_sessions` |
| 19 | POST/DELETE | `/api/admin/schools/:schoolId/notify` | `send_notification` / `clear_notification` |
| 20 | POST | `/api/admin/schools/:schoolId/apply-promo` | `apply_promo_to_school` |
| 21 | GET | `/api/admin/schools/:schoolId/ledger` | `get_wallet_ledger` |
| 22 | POST | `/api/admin/schools/:schoolId/refund` | `process_refund` |
| 23 | GET | `/api/admin/schools/:schoolId/export` | `export_school` |
| 24 | POST | `/api/admin/schools/:schoolId/import` | `import_school` |
| 25 | GET | `/api/admin/support` | `list_support_requests` |
| 26 | PATCH | `/api/admin/support/:id/resolve` | `resolve_support_request` |
| 27 | POST | `/api/admin/backup` | `manual_backup` |
| 28 | POST/DELETE | `/api/admin/notify/global` | `send_global_notification` / `clear_global_notification` |

Requires super admin token (`$SA_TOKEN`):

```bash
export SA_TOKEN=$(curl -s -X POST http://localhost:8080/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin@123"}' | jq -r '.token')
```

---

## Test: List All Schools

- **Endpoint**: `GET /api/admin/schools`
- **Expected**: 200

```bash
curl -s http://localhost:8080/api/admin/schools \
  -H "Authorization: Bearer $SA_TOKEN" | jq .
```

---

## Test: List Schools (filtered by status)

- **Endpoint**: `GET /api/admin/schools`
- **Query**: `?filters=[{"field":"status","op":"eq","value":"active"}]`
- **Expected**: 200

```bash
curl -s -G "http://localhost:8080/api/admin/schools" \
  --data-urlencode 'filters=[{"field":"status","op":"eq","value":"active"}]' \
  -H "Authorization: Bearer $SA_TOKEN" | jq .
```

---

## Test: Export All Schools

- **Endpoint**: `GET /api/admin/schools/export/all`
- **Expected**: 200

```bash
curl -s http://localhost:8080/api/admin/schools/export/all \
  -H "Authorization: Bearer $SA_TOKEN" | jq .
```

---

## Test: Get School Detail

- **Endpoint**: `GET /api/admin/schools/689225`
- **Expected**: 200

```bash
curl -s http://localhost:8080/api/admin/schools/689225 \
  -H "Authorization: Bearer $SA_TOKEN" | jq .
```

---

## Test: Update School

- **Endpoint**: `PUT /api/admin/schools/689225`
- **Expected**: 200

```bash
curl -s -X PUT http://localhost:8080/api/admin/schools/689225 \
  -H "Authorization: Bearer $SA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated School Name","address":"123 New St"}' | jq .
```

---

## Test: Set School Status

- **Endpoint**: `PATCH /api/admin/schools/689225/status`
- **Body**: `{ "status": "suspended" }`
- **Expected**: 200

```bash
curl -s -X PATCH http://localhost:8080/api/admin/schools/689225/status \
  -H "Authorization: Bearer $SA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"suspended"}' | jq .
```

---

## Test: Change School Password

- **Endpoint**: `PATCH /api/admin/schools/689225/password`
- **Expected**: 200

```bash
curl -s -X PATCH http://localhost:8080/api/admin/schools/689225/password \
  -H "Authorization: Bearer $SA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"new_password":"newSecurePass789"}' | jq .
```

---

## Test: Set Session Duration

- **Endpoint**: `PATCH /api/admin/schools/689225/session`
- **Body**: `{ "duration_hours": 8 }`
- **Expected**: 200

```bash
curl -s -X PATCH http://localhost:8080/api/admin/schools/689225/session \
  -H "Authorization: Bearer $SA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"duration_hours":8}' | jq .
```

---

## Test: Get School Sessions

- **Endpoint**: `GET /api/admin/schools/689225/sessions`
- **Expected**: 200

```bash
curl -s http://localhost:8080/api/admin/schools/689225/sessions \
  -H "Authorization: Bearer $SA_TOKEN" | jq .
```

---

## Test: Expire All Sessions

- **Endpoint**: `DELETE /api/admin/schools/689225/sessions`
- **Expected**: 200

```bash
curl -s -X DELETE http://localhost:8080/api/admin/schools/689225/sessions \
  -H "Authorization: Bearer $SA_TOKEN" | jq .
```

---

## Test: Delete School

- **Endpoint**: `DELETE /api/admin/schools/689225`
- **Expected**: 200

```bash
curl -s -X DELETE http://localhost:8080/api/admin/schools/689225 \
  -H "Authorization: Bearer $SA_TOKEN" | jq .
```

---

## Test: Send Notification to School

- **Endpoint**: `POST /api/admin/schools/689225/notify`
- **Expected**: 200

```bash
curl -s -X POST http://localhost:8080/api/admin/schools/689225/notify \
  -H "Authorization: Bearer $SA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"Maintenance scheduled tonight","type":"info"}' | jq .
```

---

## Test: Clear Notification

- **Endpoint**: `DELETE /api/admin/schools/689225/notify`
- **Expected**: 200

```bash
curl -s -X DELETE http://localhost:8080/api/admin/schools/689225/notify \
  -H "Authorization: Bearer $SA_TOKEN" | jq .
```

---

## Test: Apply Promo to School

- **Endpoint**: `POST /api/admin/schools/689225/apply-promo`
- **Expected**: 200

```bash
curl -s -X POST http://localhost:8080/api/admin/schools/689225/apply-promo \
  -H "Authorization: Bearer $SA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"promo_code":"WELCOME50"}' | jq .
```

---

## Test: Export School Data

- **Endpoint**: `GET /api/admin/schools/689225/export`
- **Expected**: 200

```bash
curl -s "http://localhost:8080/api/admin/schools/689225/export" \
  -H "Authorization: Bearer $SA_TOKEN" | jq .
```

---

## Test: Import School Data

- **Endpoint**: `POST /api/admin/schools/689225/import`
- **Expected**: 200

```bash
curl -s -X POST http://localhost:8080/api/admin/schools/689225/import \
  -H "Authorization: Bearer $SA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"data":{"schools":[{"name":"Imported School"}]}}' | jq .
```

---

## Test: Non-Admin Access Rejected

- **Endpoint**: `GET /api/admin/schools`
- **Headers**: Regular school token
- **Expected**: 403

```bash
curl -s http://localhost:8080/api/admin/schools \
  -H "Authorization: Bearer $TOKEN" | jq .
```

---

## ⚠️ Issues Fixed

| # | Issue | Severity |
|---|-------|----------|
| 1 | **`PATCH /api/admin/schools/689225`** with status change — actual route is `PATCH /api/admin/schools/:schoolId/status` | **Fixed** |
| 2 | **`POST .../change-password`** — actual method is `PATCH` at `/password` | **Fixed** |
| 3 | **`POST .../session-duration`** — actual route is `PATCH /admin/schools/:schoolId/session` | **Fixed** |
| 4 | **`POST .../expire-sessions`** — actual route is `DELETE /admin/schools/:schoolId/sessions` | **Fixed** |
| 5 | Missing: login, profile, stats, session-GET, notify, apply-promo, ledger, refund, export, import, delete school, export all | **Added** |
