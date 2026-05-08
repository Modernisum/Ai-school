# People API — Students CRUD Tests

Base path: `GET/POST /api/people/:schoolId/students`

## Test: List Students (all)

- **Endpoint**: `GET /api/people/TEST001/students`
- **Expected**: 200, paginated student list

```bash
curl -s "http://localhost:8080/api/people/TEST001/students" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" | jq .
```

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "student_id": "STU001",
      "name": "John Doe",
      "class_name": "10-A",
      "status": "active"
    }
  ],
  "pagination": { "page": 1, "per_page": 25, "total": 150, "total_pages": 6 }
}
```

---

## Test: List Students (filtered + paginated)

- **Endpoint**: `GET /api/people/TEST001/students`
- **Query**: `?filters=[{"field":"status","op":"eq","value":"active"}]&page=1&per_page=10&sort=name:asc`
- **Expected**: 200, only active students, sorted by name

```bash
FILTERS='[{"field":"status","op":"eq","value":"active"}]'
curl -s -G "http://localhost:8080/api/people/TEST001/students" \
  --data-urlencode "filters=$FILTERS" \
  --data-urlencode "page=1" \
  --data-urlencode "per_page=10" \
  --data-urlencode "sort=name:asc" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" | jq .
```

---

## Test: List Students (full-text search)

- **Endpoint**: `GET /api/people/TEST001/students`
- **Query**: `?search=John`
- **Expected**: 200, students matching "John"

```bash
curl -s "http://localhost:8080/api/people/TEST001/students?search=John" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" | jq .
```

---

## Test: List Students (sparse fields)

- **Endpoint**: `GET /api/people/TEST001/students`
- **Query**: `?fields=id,name,class_name`
- **Expected**: 200, only id/name/class_name fields

```bash
curl -s "http://localhost:8080/api/people/TEST001/students?fields=id,name,class_name" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" | jq .
```

---

## Test: Create Student

- **Endpoint**: `POST /api/people/TEST001/students`
- **Body**: valid student payload
- **Expected**: 201, created student

```bash
curl -s -X POST http://localhost:8080/api/people/TEST001/students \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Student",
    "class_name": "9-B",
    "phone": "+911234567890",
    "email": "new.student@test.com",
    "status": "active"
  }' | jq .
```

---

## Test: Get Single Student

- **Endpoint**: `GET /api/people/TEST001/students/STU001`
- **Expected**: 200

```bash
curl -s http://localhost:8080/api/people/TEST001/students/STU001 \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" | jq .
```

---

## Test: Update Student

- **Endpoint**: `PUT /api/people/TEST001/students/STU001`
- **Expected**: 200

```bash
curl -s -X PUT http://localhost:8080/api/people/TEST001/students/STU001 \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Name","class_name":"10-B"}' | jq .
```

---

## Test: Delete Student

- **Endpoint**: `DELETE /api/people/TEST001/students/STU001`
- **Expected**: 200

```bash
curl -s -X DELETE http://localhost:8080/api/people/TEST001/students/STU001 \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" | jq .
```

---

## Test: Cross-Tenant Access (should fail)

- **Endpoint**: `GET /api/people/WRONG_SCHOOL/students/STU001`
- **Headers**: `X-School-ID: TEST001`
- **Expected**: 403 FORBIDDEN

```bash
curl -s http://localhost:8080/api/people/WRONG_SCHOOL/students/STU001 \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" | jq .
```
