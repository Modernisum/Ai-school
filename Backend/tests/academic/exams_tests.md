# Academic API — Exams Tests

## Test: Generate Exam Paper

- **Endpoint**: `POST /api/academic/689225/generate-paper`
- **Body**: exam generation params
- **Expected**: 200

```bash
curl -s -X POST http://localhost:8080/api/academic/689225/generate-paper \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Mathematics",
    "class_name": "10-A",
    "chapters": ["Algebra","Geometry"],
    "difficulty": "medium",
    "total_marks": 100,
    "duration_minutes": 180
  }' | jq .
```

---

## Test: Approve Exam

- **Endpoint**: `POST /api/academic/689225/exams`
- **Expected**: 200

```bash
curl -s -X POST http://localhost:8080/api/academic/689225/exams \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" \
  -H "Content-Type: application/json" \
  -d '{
    "exam_name": "Mid-Term Math",
    "class_name": "10-A",
    "subject": "Mathematics",
    "exam_date": "2026-05-15",
    "total_marks": 100
  }' | jq .
```

---

## Test: List Upcoming Exams

- **Endpoint**: `GET /api/academic/689225/exams/upcoming`
- **Expected**: 200

```bash
curl -s http://localhost:8080/api/academic/689225/exams/upcoming \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" | jq .
```

---

## Test: Get Chapter Names

- **Endpoint**: `GET /api/academic/689225/subjects/Mathematics/chapters`
- **Expected**: 200, chapter list

```bash
curl -s http://localhost:8080/api/academic/689225/subjects/Mathematics/chapters \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" | jq .
```
