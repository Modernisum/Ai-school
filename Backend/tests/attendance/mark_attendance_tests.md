# Attendance API — Mark Attendance Tests

## Test: Mark Present

- **Endpoint**: `POST /api/attendance/TEST001/student/STU001/present`
- **Expected**: 200

```bash
curl -s -X POST http://localhost:8080/api/attendance/TEST001/student/STU001/present \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-04-26"}' | jq .
```

---

## Test: Mark Absent

- **Endpoint**: `POST /api/attendance/TEST001/student/STU001/absent`
- **Expected**: 200

```bash
curl -s -X POST http://localhost:8080/api/attendance/TEST001/student/STU001/absent \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-04-26","reason":"Medical"}' | jq .
```

---

## Test: Mark Holiday

- **Endpoint**: `POST /api/attendance/TEST001/student/STU001/holiday`
- **Expected**: 200

```bash
curl -s -X POST http://localhost:8080/api/attendance/TEST001/student/STU001/holiday \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-04-26"}' | jq .
```

---

## Test: Bulk Mark Attendance

- **Endpoint**: `POST /api/attendance/TEST001/bulk-attendance`
- **Expected**: 200

```bash
curl -s -X POST http://localhost:8080/api/attendance/TEST001/bulk-attendance \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-04-26",
    "records": [
      {"student_id": "STU001", "status": "present"},
      {"student_id": "STU002", "status": "present"},
      {"student_id": "STU003", "status": "absent"}
    ]
  }' | jq .
```

---

## Test: Get Attendance by Date

- **Endpoint**: `GET /api/attendance/TEST001/date/2026-04-26`
- **Expected**: 200

```bash
curl -s http://localhost:8080/api/attendance/TEST001/date/2026-04-26 \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" | jq .
```

---

## Test: Get Student Attendance

- **Endpoint**: `GET /api/attendance/TEST001/student/STU001`
- **Expected**: 200

```bash
curl -s http://localhost:8080/api/attendance/TEST001/student/STU001 \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" | jq .
```

---

## Test: Get Class Attendance

- **Endpoint**: `GET /api/attendance/TEST001/class-attendance?class_name=10-A&date=2026-04-26`
- **Expected**: 200

```bash
curl -s "http://localhost:8080/api/attendance/TEST001/class-attendance?class_name=10-A&date=2026-04-26" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" | jq .
```

---

## Test: Update Attendance

- **Endpoint**: `PUT /api/attendance/TEST001/student/STU001/2026-04-26`
- **Expected**: 200

```bash
curl -s -X PUT http://localhost:8080/api/attendance/TEST001/student/STU001/2026-04-26 \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" \
  -H "Content-Type: application/json" \
  -d '{"status":"present"}' | jq .
```
