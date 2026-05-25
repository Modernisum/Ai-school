# Academic API — Exams Tests

> Base URL: `/api/school/{schoolId}/academic`
> Note: Legacy compat routes have been removed.

---

## Actual Route Table

| # | Endpoint | Method | Handler |
|---|----------|--------|---------|
| 1 | `/api/school/:schoolId/academic/exams` | POST | `create_exam` |
| 2 | `/api/school/:schoolId/academic/exams` | GET | `list_exams` |
| 3 | `/api/school/:schoolId/academic/exams/:examId/sections` | POST/GET | exam section CRUD (uses `spaceId` and `responsibilityId`) |
| 4 | `/api/school/:schoolId/academic/exams/ai/generate` | POST | `ai_generate_exam` |
| 5 | `/api/school/:schoolId/academic/exams/checker/*` | * | Checker workflow |

---

## Test: Create Exam

- **Endpoint**: `POST /api/school/689225/academic/exams`
- **Expected**: 201

```bash
curl -s -X POST http://localhost:8080/api/school/689225/academic/exams \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mid-Term Academic",
    "quarter": "Q1",
    "startDate": "2026-05-15",
    "endDate": "2026-05-20",
    "examType": "MAIN"
  }' | jq .
```

---

## Test: Create Exam Section (using Space and Responsibility)

- **Endpoint**: `POST /api/school/689225/academic/exams/:examId/sections`
- **Expected**: 201

```bash
curl -s -X POST http://localhost:8080/api/school/689225/academic/exams/1/sections \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" \
  -H "Content-Type: application/json" \
  -d '{
    "spaceId": "class-1-b-6892",
    "responsibilityId": "math-teaching-001",
    "totalMarks": 100,
    "syllabus": ["Algebra", "Geometry"]
  }' | jq .
```

---

## Test: List All Exams

- **Endpoint**: `GET /api/school/689225/academic/exams`
- **Expected**: 200

```bash
curl -s http://localhost:8080/api/school/689225/academic/exams \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" | jq .
```

---

## Test: Get Exam Sections

- **Endpoint**: `GET /api/school/689225/academic/exams/1/sections`
- **Expected**: 200

```bash
curl -s http://localhost:8080/api/school/689225/academic/exams/1/sections \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" | jq .
```
