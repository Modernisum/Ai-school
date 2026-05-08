# Academic API — Classes Tests

## Test: List Classes

- **Endpoint**: `GET /api/academic/TEST001/classes`
- **Expected**: 200, class list

```bash
curl -s http://localhost:8080/api/academic/TEST001/classes \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" | jq .
```

---

## Test: Create Class

- **Endpoint**: `POST /api/academic/TEST001/classes`
- **Body**: `{ "className": "12-C" }`
- **Expected**: 201

```bash
curl -s -X POST http://localhost:8080/api/academic/TEST001/classes \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" \
  -H "Content-Type: application/json" \
  -d '{"className":"12-C"}' | jq .
```

---

## Test: Delete Class

- **Endpoint**: `DELETE /api/academic/TEST001/classes/CLASS_ID`
- **Expected**: 200

```bash
curl -s -X DELETE http://localhost:8080/api/academic/TEST001/classes/12-C \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" | jq .
```

---

## Test: List Subjects

- **Endpoint**: `GET /api/academic/TEST001/subjects`
- **Expected**: 200

```bash
curl -s http://localhost:8080/api/academic/TEST001/subjects \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" | jq .
```

---

## Test: Add Subject

- **Endpoint**: `POST /api/academic/TEST001/subjects`
- **Body**: `{ "name": "Computer Science", "class_name": "12-C" }`
- **Expected**: 201

```bash
curl -s -X POST http://localhost:8080/api/academic/TEST001/subjects \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" \
  -H "Content-Type: application/json" \
  -d '{"name":"Computer Science","class_name":"12-C"}' | jq .
```

---

## Test: Delete Subject

- **Endpoint**: `DELETE /api/academic/TEST001/subjects/SUBJECT_ID`
- **Expected**: 200

```bash
curl -s -X DELETE http://localhost:8080/api/academic/TEST001/subjects/CS \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" | jq .
```
