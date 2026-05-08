# People API — Employees CRUD Tests

Base path: `GET/POST /api/people/:schoolId/employees`

## Test: List Employees (all)

- **Endpoint**: `GET /api/people/TEST001/employees`
- **Expected**: 200, paginated employee list

```bash
curl -s "http://localhost:8080/api/people/TEST001/employees" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" | jq .
```

---

## Test: List Employees (filtered by type)

- **Endpoint**: `GET /api/people/TEST001/employees`
- **Query**: `?filters=[{"field":"employee_type","op":"eq","value":"teacher"}]`
- **Expected**: 200, only teachers

```bash
FILTERS='[{"field":"employee_type","op":"eq","value":"teacher"}]'
curl -s -G "http://localhost:8080/api/people/TEST001/employees" \
  --data-urlencode "filters=$FILTERS" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" | jq .
```

---

## Test: List Employees (by date range)

- **Endpoint**: `GET /api/people/TEST001/employees`
- **Query**: `?from=2026-01-01&to=2026-12-31&sort=created_at:desc`
- **Expected**: 200

```bash
curl -s "http://localhost:8080/api/people/TEST001/employees?from=2026-01-01&to=2026-12-31&sort=created_at:desc" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" | jq .
```

---

## Test: Create Employee

- **Endpoint**: `POST /api/people/TEST001/employees`
- **Expected**: 201

```bash
curl -s -X POST http://localhost:8080/api/people/TEST001/employees \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Teacher",
    "employee_type": "teacher",
    "phone": "+911234567899",
    "email": "teacher@test.com",
    "subject": "Physics",
    "status": "active"
  }' | jq .
```

---

## Test: Get Single Employee

- **Endpoint**: `GET /api/people/TEST001/employees/EMP001`
- **Expected**: 200

```bash
curl -s http://localhost:8080/api/people/TEST001/employees/EMP001 \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" | jq .
```

---

## Test: Update Employee

- **Endpoint**: `PUT /api/people/TEST001/employees/EMP001`
- **Expected**: 200

```bash
curl -s -X PUT http://localhost:8080/api/people/TEST001/employees/EMP001 \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" \
  -H "Content-Type: application/json" \
  -d '{"subject":"Chemistry","salary":50000}' | jq .
```

---

## Test: Delete Employee

- **Endpoint**: `DELETE /api/people/TEST001/employees/EMP001`
- **Expected**: 200

```bash
curl -s -X DELETE http://localhost:8080/api/people/TEST001/employees/EMP001 \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" | jq .
```
