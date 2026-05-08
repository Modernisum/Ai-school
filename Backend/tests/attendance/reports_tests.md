# Attendance API — Reports Tests

## Test: Daily Attendance Report

- **Endpoint**: `GET /api/attendance/TEST001/reports/daily/2026-04-26`
- **Expected**: 200

```bash
curl -s http://localhost:8080/api/attendance/TEST001/reports/daily/2026-04-26 \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" | jq .
```

---

## Test: Monthly Attendance Report

- **Endpoint**: `GET /api/attendance/TEST001/reports/monthly?month=2026-04`
- **Expected**: 200

```bash
curl -s "http://localhost:8080/api/attendance/TEST001/reports/monthly?month=2026-04" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" | jq .
```

---

## Test: Custom Date Range Report

- **Endpoint**: `GET /api/attendance/TEST001/reports/custom?from=2026-04-01&to=2026-04-26`
- **Expected**: 200

```bash
curl -s "http://localhost:8080/api/attendance/TEST001/reports/custom?from=2026-04-01&to=2026-04-26" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" | jq .
```

---

## Test: Advanced Attendance Analytics

- **Endpoint**: `GET /api/attendance/TEST001/analytics`
- **Expected**: 200, detailed analytics

```bash
curl -s http://localhost:8080/api/attendance/TEST001/analytics \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" | jq .
```

---

## Test: Generate Custom Report

- **Endpoint**: `POST /api/attendance/TEST001/reports/custom`
- **Expected**: 200

```bash
curl -s -X POST http://localhost:8080/api/attendance/TEST001/reports/custom \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" \
  -H "Content-Type: application/json" \
  -d '{
    "report_type": "student_wise",
    "from_date": "2026-04-01",
    "to_date": "2026-04-26",
    "format": "json"
  }' | jq .
```
