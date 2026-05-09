# Finance API — Fees Tests

## Test: List Fees

- **Endpoint**: `GET /api/finance/689225/fees`
- **Expected**: 200, paginated fee list

```bash
curl -s "http://localhost:8080/api/finance/689225/fees" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" | jq .
```

---

## Test: List Fees (filtered by status)

- **Endpoint**: `GET /api/finance/689225/fees`
- **Query**: `?filters=[{"field":"status","op":"eq","value":"pending"}]`
- **Expected**: 200, only pending fees

```bash
FILTERS='[{"field":"status","op":"eq","value":"pending"}]'
curl -s -G "http://localhost:8080/api/finance/689225/fees" \
  --data-urlencode "filters=$FILTERS" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" | jq .
```

---

## Test: Create Fee

- **Endpoint**: `POST /api/finance/689225/fees`
- **Expected**: 201

```bash
curl -s -X POST http://localhost:8080/api/finance/689225/fees \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "STU001",
    "fee_type": "tuition",
    "amount": 15000.00,
    "due_date": "2026-05-01",
    "status": "pending"
  }' | jq .
```

---

## Test: Get Student Fees

- **Endpoint**: `GET /api/finance/689225/fees/student/STU001`
- **Expected**: 200

```bash
curl -s http://localhost:8080/api/finance/689225/fees/student/STU001 \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" | jq .
```

---

## Test: Record Payment

- **Endpoint**: `POST /api/finance/689225/payments`
- **Expected**: 200

```bash
curl -s -X POST http://localhost:8080/api/finance/689225/payments \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "STU001",
    "amount": 15000.00,
    "payment_method": "razorpay",
    "transaction_id": "txn_abc123"
  }' | jq .
```

---

## Test: Fee Analytics

- **Endpoint**: `GET /api/finance/689225/fees/analytics`
- **Expected**: 200, summary stats

```bash
curl -s http://localhost:8080/api/finance/689225/fees/analytics \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" | jq .
```
