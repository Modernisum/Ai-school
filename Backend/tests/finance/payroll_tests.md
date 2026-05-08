# Finance API — Payroll Tests

## Test: List Payroll Records

- **Endpoint**: `GET /api/finance/TEST001/payroll`
- **Expected**: 200

```bash
curl -s "http://localhost:8080/api/finance/TEST001/payroll" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" | jq .
```

---

## Test: List Payroll (filtered by month)

- **Endpoint**: `GET /api/finance/TEST001/payroll`
- **Query**: `?from=2026-04-01&to=2026-04-30`
- **Expected**: 200

```bash
curl -s "http://localhost:8080/api/finance/TEST001/payroll?from=2026-04-01&to=2026-04-30" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" | jq .
```

---

## Test: Create Payroll Entry

- **Endpoint**: `POST /api/finance/TEST001/payroll`
- **Expected**: 201

```bash
curl -s -X POST http://localhost:8080/api/finance/TEST001/payroll \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": "EMP001",
    "month": "2026-04",
    "base_salary": 50000.00,
    "deductions": 2000.00,
    "bonus": 5000.00,
    "status": "pending"
  }' | jq .
```

---

## Test: Mark Payroll Paid

- **Endpoint**: `POST /api/finance/TEST001/payroll/PAYROLL_ID/process`
- **Expected**: 200

```bash
curl -s -X POST http://localhost:8080/api/finance/TEST001/payroll/1/process \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" \
  -H "Content-Type: application/json" \
  -d '{"status":"paid"}' | jq .
```
