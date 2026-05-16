# Operations API — Responsibilities Tests

> Base URL: `/api/school/{schoolId}/operations/responsibility`
> Auth: Bearer token via admin login

---

## Gap 1: Teacher Dashboard Analytics

### Test: Overview Analytics (used by Teacher Dashboard)

- **Endpoint**: `GET /api/school/{schoolId}/operations/responsibility/overview/analytics`
- **Expected**: 200 with JSON containing `total_responsibilities`, `total_spaces`, `workload_percentage`

```bash
curl -s "http://localhost:8080/api/school/TEST001/operations/responsibility/overview/analytics" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" | jq .
```

### Test: Employee Responsibilities (used by Teacher Dashboard class cards)

- **Endpoint**: `GET /api/school/{schoolId}/operations/responsibility/employees/{employeeId}/responsibilities`
- **Expected**: 200 with list of responsibilities + `space_ids` each

```bash
curl -s "http://localhost:8080/api/school/TEST001/operations/responsibility/employees/EMP001/responsibilities" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" | jq .
```

---

## Gap 2: Salary Generation

### Test: Generate Salary

- **Endpoint**: `POST /api/school/{schoolId}/operations/responsibility/generate-salaries/{month}/{year}`
- **Expected**: 200 with breakdown per responsibility

```bash
curl -s -X POST "http://localhost:8080/api/school/TEST001/operations/responsibility/generate-salaries/5/2026" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" \
  -H "Content-Type: application/json" \
  -d "{}" | jq .
```

---

## Gap 3: Student Fee Breakdown

### Test: Student Responsibilities

- **Endpoint**: `GET /api/school/{schoolId}/operations/responsibility/students/{studentId}/responsibilities`
- **Expected**: 200 with list of responsibilities consumed by student

```bash
curl -s "http://localhost:8080/api/school/TEST001/operations/responsibility/students/STU001/responsibilities" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" | jq .
```

---

## Gap 4: Space Requirement Vacancy

### Test: List Spaces (vacancy computed client-side)

- **Endpoint**: `GET /api/school/{schoolId}/resources/spaces/`
- **Expected**: 200 with all spaces

```bash
curl -s "http://localhost:8080/api/school/TEST001/resources/spaces" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" | jq .
```

### Test: Responsibility Analytics (vacancy/coverage data)

- **Endpoint**: `GET /api/school/{schoolId}/operations/responsibility/{respId}/analytics`
- **Expected**: 200 with assigned employees, active spaces, coverage data

```bash
curl -s "http://localhost:8080/api/school/TEST001/operations/responsibility/1/analytics" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" | jq .
```

---

## Gap 5: Material ↔ Space Bridge

### Test: List Materials

- **Endpoint**: `GET /api/school/{schoolId}/resources/materials/`
- **Expected**: 200 with inventory list (includes `space_count` when available)

```bash
curl -s "http://localhost:8080/api/school/TEST001/resources/materials" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" | jq .
```

### Test: Assign Materials to Space

- **Endpoint**: `POST /api/school/{schoolId}/resources/spaces/{spaceName}/materials`
- **Expected**: 200

```bash
curl -s -X POST "http://localhost:8080/api/school/TEST001/resources/spaces/Class-1-B/materials" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" \
  -H "Content-Type: application/json" \
  -d "{\"materials\":[{\"name\":\"Whiteboard Marker\",\"quantity\":5}]}" | jq .
```

---

## Gap 6: WebSocket Real-time

### Test: WebSocket Connection

- **Endpoint**: `ws://localhost:8080/api/school/{schoolId}/operations/responsibility/ws`
- **Expected**: Connection established, events received on create/assign

```bash
# Requires wscat: npm install -g wscat
wscat -c "ws://localhost:8080/api/school/TEST001/operations/responsibility/ws?token=$TOKEN"
```

---

## Gap 7: CSV / PDF Export

### Test: CSV Export

- **Endpoint**: `GET /api/school/{schoolId}/operations/responsibility/export/csv`
- **Expected**: 200 with `Content-Type: text/csv` and attachment header

```bash
curl -s -o responsibilities.csv \
  "http://localhost:8080/api/school/TEST001/operations/responsibility/export/csv" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" \
  -w "\nHTTP Status: %{http_code}\n"
```

### Test: PDF Report

- **Endpoint**: `GET /api/school/{schoolId}/operations/responsibility/reports/{reportType}/{startDate}/{endDate}/pdf`
- **Expected**: 200 with PDF binary

```bash
curl -s -o utilization_report.pdf \
  "http://localhost:8080/api/school/TEST001/operations/responsibility/reports/utilization/2026-01-01/2026-12-31/pdf" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" \
  -w "\nHTTP Status: %{http_code}\n"
file utilization_report.pdf
```
