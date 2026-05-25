# Operations API — Responsibilities Tests

> Base URL: `/api/school/{schoolId}/operations/responsibility`
> Auth: Bearer token via admin login

---

## Actual Route Table

| # | Endpoint | Method | Handler |
|---|----------|--------|---------|
| 1 | `/api/school/:schoolId/operations/responsibility/` | GET | `list_responsibilities` |
| 2 | `/api/school/:schoolId/operations/responsibility/` | POST | `create_responsibility` |
| 3 | `/api/school/:schoolId/operations/responsibility/overview/analytics` | GET | `overview_analytics` |
| 4 | `/api/school/:schoolId/operations/responsibility/export/csv` | GET | `export_responsibilities_csv` |
| 5 | `/api/school/:schoolId/operations/responsibility/import/csv` | POST | `import_responsibilities_csv` |
| 6 | `/api/school/:schoolId/operations/responsibility/students/:studentId/responsibilities` | GET | `list_student_responsibilities` |
| 7 | `/api/school/:schoolId/operations/responsibility/:responsibilityId` | GET | `get_responsibility_definition` |
| 8 | `/api/school/:schoolId/operations/responsibility/:responsibilityId` | PATCH | `update_responsibility_definition` |
| 9 | `/api/school/:schoolId/operations/responsibility/:responsibilityId` | DELETE | `delete_responsibility_definition` |
| 10 | `/api/school/:schoolId/operations/responsibility/employees/:employeeId/responsibilities` | GET | `list_employee_responsibilities` |
| 11 | `/api/school/:schoolId/operations/responsibility/spaces/:spaceId/responsibilities` | GET | `list_space_responsibilities` |
| 12 | `/api/school/:schoolId/operations/responsibility/search` | GET | `search_responsibilities` |
| 13 | `/api/school/:schoolId/operations/responsibility/:responsibilityId/analytics` | GET | `responsibility_analytics` |
| 14 | `/api/school/:schoolId/operations/responsibility/metrics/*` | GET | Various metric endpoints |
| 15 | `/api/school/:schoolId/operations/responsibility/generate-salaries/:month/:year` | POST | `generate_salaries` |
| 16 | `/api/school/:schoolId/operations/responsibility/ws/*` | WS | WebSocket events |
| 17 | `/api/school/:schoolId/operations/responsibility/reports/*/:startDate/:endDate` | GET | Various report endpoints |
| 18 | `/api/school/:schoolId/operations/responsibility/sync-student-fees` | POST | `sync_student_fees` |
| 19 | `/api/school/:schoolId/operations/tasks` | GET | `list_tasks` |
| 20 | `/api/school/:schoolId/operations/tasks/:taskId/status` | PUT | `update_task_status` |

---

## Gap 1: Teacher Dashboard Analytics

### Test: Overview Analytics

- **Endpoint**: `GET /api/school/689225/operations/responsibility/overview/analytics`
- **Expected**: 200 with JSON containing `total_responsibilities`, `total_spaces`, `workload_percentage`

```bash
curl -s "http://localhost:8080/api/school/689225/operations/responsibility/overview/analytics" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" | jq .
```

### Test: Employee Responsibilities

- **Endpoint**: `GET /api/school/689225/operations/responsibility/employees/EMP001/responsibilities`
- **Expected**: 200 with list of responsibilities

```bash
curl -s "http://localhost:8080/api/school/689225/operations/responsibility/employees/EMP001/responsibilities" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" | jq .
```

---

## Gap 2: Salary Generation

### Test: Generate Salary

- **Endpoint**: `POST /api/school/689225/operations/responsibility/generate-salaries/5/2026`
- **Expected**: 200 with breakdown per responsibility

```bash
curl -s -X POST "http://localhost:8080/api/school/689225/operations/responsibility/generate-salaries/5/2026" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" \
  -H "Content-Type: application/json" \
  -d "{}" | jq .
```

---

## Gap 3: Student Fee Breakdown

### Test: Student Responsibilities

- **Endpoint**: `GET /api/school/689225/operations/responsibility/students/STU001/responsibilities`
- **Expected**: 200 with list of responsibilities consumed by student

```bash
curl -s "http://localhost:8080/api/school/689225/operations/responsibility/students/STU001/responsibilities" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" | jq .
```

---

## Gap 4: Space Requirement Vacancy

### Test: Responsibility Analytics

- **Endpoint**: `GET /api/school/689225/operations/responsibility/{respId}/analytics`
- **Expected**: 200 with assigned employees, active spaces, coverage data

```bash
curl -s "http://localhost:8080/api/school/689225/operations/responsibility/1/analytics" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" | jq .
```

---

## Gap 5: CSV / PDF Export

### Test: CSV Export

- **Endpoint**: `GET /api/school/689225/operations/responsibility/export/csv`
- **Expected**: 200 with `Content-Type: text/csv`

```bash
curl -s -o responsibilities.csv \
  "http://localhost:8080/api/school/689225/operations/responsibility/export/csv" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" \
  -w "\nHTTP Status: %{http_code}\n"
```

---

## Gap 6: WebSocket Real-time

### Test: WebSocket Connection

- **Endpoint**: `ws://localhost:8080/api/school/689225/operations/responsibility/ws`
- **Expected**: Connection established, events received

```bash
wscat -c "ws://localhost:8080/api/school/689225/operations/responsibility/ws?token=$TOKEN"
```

---

## ⚠️ Issues Found

| # | Issue | Severity |
|---|-------|----------|
| 1 | **`TEST001` used instead of `689225`** throughout original doc | **Fixed** |
| 2 | Missing from docs: responsibility CRUD, import, search, metrics endpoints, space-responsibilities, bulk operations, history/versions/rollback, alerts | Low |
