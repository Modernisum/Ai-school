# AI API — Exam & Task Generation Tests

## Test: AI Generate Exam Paper

- **Endpoint**: `POST /api/ai/TEST001/exam/generate`
- **Expected**: 200

```bash
curl -s -X POST http://localhost:8080/api/ai/TEST001/exam/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Mathematics",
    "class_name": "10-A",
    "chapters": ["Algebra","Geometry","Trigonometry"],
    "difficulty": "medium",
    "question_count": 20,
    "total_marks": 100,
    "duration_minutes": 180
  }' | jq .
```

---

## Test: AI Generate Tasks

- **Endpoint**: `POST /api/ai/TEST001/tasks/generate`
- **Body**: `{ "employee_id": "EMP001" }`
- **Expected**: 200

```bash
curl -s -X POST http://localhost:8080/api/ai/TEST001/tasks/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" \
  -H "Content-Type: application/json" \
  -d '{"employee_id":"EMP001"}' | jq .
```

---

## Test: AI Reorganize Tasks

- **Endpoint**: `POST /api/ai/TEST001/tasks/reorganize`
- **Body**: `{ "employee_id": "EMP001" }`
- **Expected**: 200

```bash
curl -s -X POST http://localhost:8080/api/ai/TEST001/tasks/reorganize \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" \
  -H "Content-Type: application/json" \
  -d '{"employee_id":"EMP001"}' | jq .
```

---

## Test: AI Usage Trends

- **Endpoint**: `GET /api/ai/TEST001/trends`
- **Query**: `?period=monthly&limit=12`
- **Expected**: 200

```bash
curl -s "http://localhost:8080/api/ai/TEST001/trends?period=monthly&limit=12" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" | jq .
```

---

## Test: Top AI Operations

- **Endpoint**: `GET /api/ai/TEST001/operations/top`
- **Query**: `?limit=5`
- **Expected**: 200

```bash
curl -s "http://localhost:8080/api/ai/TEST001/operations/top?limit=5" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" | jq .
```
