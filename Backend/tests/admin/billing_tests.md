# Admin API — Billing & Support Tests

## Test: Get Wallet Ledger

- **Endpoint**: `GET /api/admin/schools/TEST001/billing/ledger`
- **Expected**: 200

```bash
curl -s http://localhost:8080/api/admin/schools/TEST001/billing/ledger \
  -H "Authorization: Bearer $SA_TOKEN" | jq .
```

---

## Test: Process Refund

- **Endpoint**: `POST /api/admin/schools/TEST001/billing/refund`
- **Expected**: 200

```bash
curl -s -X POST http://localhost:8080/api/admin/schools/TEST001/billing/refund \
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

- **Endpoint**: `POST /api/admin/support/SUPPORT_ID/resolve`
- **Expected**: 200

```bash
curl -s -X POST http://localhost:8080/api/admin/support/1/resolve \
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

## Test: Manual Backup

- **Endpoint**: `POST /api/admin/backup`
- **Expected**: 200

```bash
curl -s -X POST http://localhost:8080/api/admin/backup \
  -H "Authorization: Bearer $SA_TOKEN" | jq .
```

---

## Test: Export Data

- **Endpoint**: `GET /api/admin/export?school_id=TEST001&format=csv`
- **Expected**: 200

```bash
curl -s "http://localhost:8080/api/admin/export?school_id=TEST001&format=csv" \
  -H "Authorization: Bearer $SA_TOKEN" | jq .
```
