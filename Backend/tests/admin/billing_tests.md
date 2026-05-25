# Admin API — Billing & Support Tests

> **⚠️ BUG FIX**: Ledger/refund routes had extra `/billing` segment (actual routes are `/api/admin/schools/:schoolId/ledger` and `/refund`). Export route was wrong path.

---

## Actual Route Table (relevant subset)

| # | Method | URL | Handler |
|---|--------|-----|---------|
| 1 | GET | `/api/admin/churn-radar` | `get_churn_radar` |
| 2 | GET | `/api/admin/schools/:schoolId/ledger` | `get_wallet_ledger` |
| 3 | POST | `/api/admin/schools/:schoolId/refund` | `process_refund` |
| 4 | GET | `/api/admin/promos` | `list_promo_codes` |
| 5 | POST | `/api/admin/promos` | `create_promo_code` |
| 6 | GET | `/api/admin/promos/:promoId/usage` | `get_promo_usage` |
| 7 | GET | `/api/admin/support` | `list_support_requests` |
| 8 | PATCH | `/api/admin/support/:id/resolve` | `resolve_support_request` |
| 9 | POST | `/api/admin/backup` | `manual_backup` |
| 10 | GET | `/api/admin/schools/:schoolId/export` | `export_school` |
| 11 | POST | `/api/admin/notify/global` | `send_global_notification` |
| 12 | DELETE | `/api/admin/notify/global` | `clear_global_notification` |

---

## Test: Get Wallet Ledger

- **Endpoint**: `GET /api/admin/schools/689225/ledger`
- **Expected**: 200

```bash
curl -s http://localhost:8080/api/admin/schools/689225/ledger \
  -H "Authorization: Bearer $SA_TOKEN" | jq .
```

---

## Test: Process Refund

- **Endpoint**: `POST /api/admin/schools/689225/refund`
- **Expected**: 200

```bash
curl -s -X POST http://localhost:8080/api/admin/schools/689225/refund \
  -H "Authorization: Bearer $SA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 5000,
    "reason": "Duplicate payment",
    "transaction_ref": "txn_abc123"
  }' | jq .
```

---

## Test: Get Churn Radar

- **Endpoint**: `GET /api/admin/churn-radar`
- **Expected**: 200

```bash
curl -s http://localhost:8080/api/admin/churn-radar \
  -H "Authorization: Bearer $SA_TOKEN" | jq .
```

---

## Test: List Support Requests

- **Endpoint**: `GET /api/admin/support`
- **Expected**: 200

```bash
curl -s http://localhost:8080/api/admin/support \
  -H "Authorization: Bearer $SA_TOKEN" | jq .
```

---

## Test: Resolve Support Request

- **Endpoint**: `PATCH /api/admin/support/1/resolve`
- **Expected**: 200

```bash
curl -s -X PATCH http://localhost:8080/api/admin/support/1/resolve \
  -H "Authorization: Bearer $SA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"resolution":"Issue resolved","resolved_by":"admin"}' | jq .
```

---

## Test: List Promos

- **Endpoint**: `GET /api/admin/promos`
- **Expected**: 200

```bash
curl -s http://localhost:8080/api/admin/promos \
  -H "Authorization: Bearer $SA_TOKEN" | jq .
```

---

## Test: Create Promo

- **Endpoint**: `POST /api/admin/promos`
- **Expected**: 201

```bash
curl -s -X POST http://localhost:8080/api/admin/promos \
  -H "Authorization: Bearer $SA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "WELCOME50",
    "discount_percent": 50,
    "max_redemptions": 200,
    "valid_until": "2026-12-31",
    "min_wallet_balance": 0
  }' | jq .
```

---

## Test: Get Promo Usage

- **Endpoint**: `GET /api/admin/promos/{promoId}/usage`
- **Expected**: 200

```bash
curl -s http://localhost:8080/api/admin/promos/1/usage \
  -H "Authorization: Bearer $SA_TOKEN" | jq .
```

---

## Test: Manual Backup

- **Endpoint**: `POST /api/admin/backup`
- **Expected**: 200

```bash
curl -s -X POST http://localhost:8080/api/admin/backup \
  -H "Authorization: Bearer $SA_TOKEN" | jq .
```

---

## Test: Export Data

- **Endpoint**: `GET /api/admin/schools/689225/export`
- **Expected**: 200

```bash
curl -s "http://localhost:8080/api/admin/schools/689225/export" \
  -H "Authorization: Bearer $SA_TOKEN" | jq .
```

---

## Test: Send Global Notification

- **Endpoint**: `POST /api/admin/notify/global`
- **Expected**: 200

```bash
curl -s -X POST http://localhost:8080/api/admin/notify/global \
  -H "Authorization: Bearer $SA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"System maintenance tonight","type":"warning"}' | jq .
```

---

## Test: Clear Global Notification

- **Endpoint**: `DELETE /api/admin/notify/global`
- **Expected**: 200

```bash
curl -s -X DELETE http://localhost:8080/api/admin/notify/global \
  -H "Authorization: Bearer $SA_TOKEN" | jq .
```

---

## ⚠️ Issues Fixed

| # | Issue | Severity |
|---|-------|----------|
| 1 | **`/billing/ledger`** — actual route is `/admin/schools/:schoolId/ledger` (no `/billing`) | **Fixed** |
| 2 | **`/billing/refund`** — actual route is `/admin/schools/:schoolId/refund` (no `/billing`) | **Fixed** |
| 3 | **`POST /support/:id/resolve`** — actual method is `PATCH` | **Fixed** |
| 4 | **`GET /admin/export`** — actual route is `GET /admin/schools/:schoolId/export` | **Fixed** |
| 5 | Missing: promo usage, global notify, global notify clear | **Added** |
