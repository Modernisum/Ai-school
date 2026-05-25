# Finance API — Fees Tests

All routes are nested under `/api/school/{schoolId}/finance/`.

---

## Actual Route Table

| # | Endpoint | Method | Description |
|---|----------|--------|-------------|
| 1 | `/api/school/:schoolId/finance/fees` | GET | List school fee templates |
| 2 | `/api/school/:schoolId/finance/fees` | POST | Create a new school fee template |
| 3 | `/api/school/:schoolId/finance/fees/pending` | GET | List pending fees (supports min_percentage & class filtering) |
| 4 | `/api/school/:schoolId/finance/fees/student/:studentId/add` | POST | Add fee to a student's billing record |
| 5 | `/api/school/:schoolId/finance/fees/student/:studentId` | GET | Get a student's current fee status |
| 6 | `/api/school/:schoolId/finance/fees/student/:studentId/ai-reminder` | GET | Generate AI-powered payment reminder text |
| 7 | `/api/school/:schoolId/finance/fees/student/:studentId/discount` | POST | Apply fee discount to a student's record |
| 8 | `/api/school/:schoolId/finance/fees/student/:studentId/pay` | POST | Record a payment made by a student |

---

## Test: List Fees

- **Endpoint**: `GET /api/school/689225/finance/fees`
- **Response Code**: `200 OK`

```bash
curl -s "http://localhost:8080/api/school/689225/finance/fees" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225"
```

### JSON Response
```json
{
  "data": [],
  "success": true
}
```

---

## Test: Add Fee to Student

- **Endpoint**: `POST /api/school/689225/finance/fees/student/S000009/add`
- **Response Code**: `200 OK`

```bash
curl -s -X POST "http://localhost:8080/api/school/689225/finance/fees/student/S000009/add" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000.00,
    "feeId": "tuition"
  }'
```

### JSON Response
```json
{
  "data": {
    "pendingAmount": 1000.0,
    "studentId": "S000009",
    "totalFees": 1000.0
  },
  "success": true
}
```

---

## Test: Get Student Fee Details

- **Endpoint**: `GET /api/school/689225/finance/fees/student/S000009`
- **Response Code**: `200 OK`

```bash
curl -s "http://localhost:8080/api/school/689225/finance/fees/student/S000009" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225"
```

### JSON Response
```json
{
  "data": {
    "discount": 0.0,
    "pendingAmount": 1000.0,
    "studentId": "S000009",
    "totalFees": 1000.0
  },
  "success": true
}
```

---

## Test: Generate AI Fee Reminder

- **Endpoint**: `GET /api/school/689225/finance/fees/student/S000009/ai-reminder`
- **Response Code**: `200 OK`

```bash
curl -s "http://localhost:8080/api/school/689225/finance/fees/student/S000009/ai-reminder" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225"
```

### JSON Response
```json
{
  "data": {
    "message": "AI Reminder (polite): Dear Parent of Student, we noticed an outstanding balance of ₹1000.00. Please clear this at your earliest convenience. Thank you!",
    "risk_score": 0.0,
    "student_id": "S000009",
    "success": true,
    "tone": "polite"
  },
  "success": true
}
```

---

## Test: Apply Fee Discount

- **Endpoint**: `POST /api/school/689225/finance/fees/student/S000009/discount`
- **Response Code**: `200 OK`

```bash
curl -s -X POST "http://localhost:8080/api/school/689225/finance/fees/student/S000009/discount" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" \
  -H "Content-Type: application/json" \
  -d '{
    "discount_amount": 200.00,
    "reason": "Scholarship discount"
  }'
```

### JSON Response
```json
{
  "data": {
    "discount": 200.0,
    "pendingAmount": 800.0,
    "studentId": "S000009",
    "totalFees": 1000.0
  },
  "success": true
}
```

---

## Test: Pay Student Fee

- **Endpoint**: `POST /api/school/689225/finance/fees/student/S000009/pay`
- **Response Code**: `200 OK`

```bash
curl -s -X POST "http://localhost:8080/api/school/689225/finance/fees/student/S000009/pay" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500.00,
    "payment_method": "upi",
    "transaction_id": "txn_fin_001"
  }'
```

### JSON Response
```json
{
  "data": {
    "pendingAmount": 300.0,
    "studentId": "S000009",
    "totalFees": 1000.0
  },
  "success": true
}
```
