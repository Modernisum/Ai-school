# People API — Bulk Import Tests

## Test: Bulk Import Students

- **Endpoint**: `POST /api/people/TEST001/students/bulk`
- **Body**: `{ "students": [...] }`
- **Expected**: 200, success with import count

```bash
curl -s -X POST http://localhost:8080/api/people/TEST001/students/bulk \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" \
  -H "Content-Type: application/json" \
  -d '{
    "students": [
      {"name":"Alice","class_name":"10-A","phone":"+911111111111"},
      {"name":"Bob","class_name":"10-A","phone":"+911111111112"},
      {"name":"Charlie","class_name":"9-B","phone":"+911111111113"}
    ]
  }' | jq .
```

---

## Test: Bulk Import Employees

- **Endpoint**: `POST /api/people/TEST001/employees/bulk`
- **Body**: `{ "employees": [...] }`
- **Expected**: 200

```bash
curl -s -X POST http://localhost:8080/api/people/TEST001/employees/bulk \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" \
  -H "Content-Type: application/json" \
  -d '{
    "employees": [
      {"name":"Dr. Smith","employee_type":"teacher","phone":"+911111111114","subject":"Biology"},
      {"name":"Prof. Jones","employee_type":"teacher","phone":"+911111111115","subject":"History"},
      {"name":"Admin Staff","employee_type":"admin","phone":"+911111111116"}
    ]
  }' | jq .
```

---

## Test: Bulk Import Students (with invalid data)

- **Endpoint**: `POST /api/people/TEST001/students/bulk`
- **Body**: `{ "students": [{ "name": "" }] }` (empty name)
- **Expected**: 400, validation errors

```bash
curl -s -X POST http://localhost:8080/api/people/TEST001/students/bulk \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" \
  -H "Content-Type: application/json" \
  -d '{"students":[{"name":"","class_name":""}]}' | jq .
```

---

## Test: Bulk Import (cross-tenant rejection)

- **Endpoint**: `POST /api/people/WRONG_SCHOOL/students/bulk`
- **Headers**: `X-School-ID: TEST001`
- **Expected**: 403

```bash
curl -s -X POST http://localhost:8080/api/people/WRONG_SCHOOL/students/bulk \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" \
  -H "Content-Type: application/json" \
  -d '{"students":[{"name":"Bad","phone":"+911111111117"}]}' | jq .
```
