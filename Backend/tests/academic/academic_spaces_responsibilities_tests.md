# Academic API — Spaces and Responsibilities Tests

This file tests the intersection of Spaces and Responsibilities in the academic context, specifically Syllabus and Chapters.

> Base URL: `/api/school/{schoolId}/academic`

---

## Actual Route Table

| # | Endpoint | Method | Handler |
|---|----------|--------|---------|
| 1 | `/api/school/:schoolId/academic/syllabus/:responsibilityId` | GET | `get_syllabus` |
| 2 | `/api/school/:schoolId/academic/syllabus/:responsibilityId/plot` | POST | `plot_annual` |
| 3 | `/api/school/:schoolId/academic/syllabus/:responsibilityId/micro-plan` | POST | `micro_plan_periods` |
| 4 | `/api/school/:schoolId/academic/syllabus/chapter/:chapterId` | PATCH | `update_chapter_plan` |
| 5 | `/api/school/:schoolId/academic/period-plans/today` | GET | `get_daily_todo` |

---

## Test: Get Syllabus for a Responsibility

- **Endpoint**: `GET /api/school/689225/academic/syllabus/math-teaching-001`
- **Expected**: 200

```bash
curl -s http://localhost:8080/api/school/689225/academic/syllabus/math-teaching-001 \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" | jq .
```

---

## Test: Plot Annual Syllabus (AI)

- **Endpoint**: `POST /api/school/689225/academic/syllabus/math-teaching-001/plot`
- **Expected**: 200

```bash
curl -s -X POST http://localhost:8080/api/school/689225/academic/syllabus/math-teaching-001/plot \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" \
  -H "Content-Type: application/json" \
  -d '{
    "academicYear": 2026,
    "spaceId": "class-1-b-6892"
  }' | jq .
```

---

## Test: Get Daily Period Plans (Todo)

- **Endpoint**: `GET /api/school/689225/academic/period-plans/today`
- **Expected**: 200

```bash
curl -s http://localhost:8080/api/school/689225/academic/period-plans/today \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" | jq .
```

---

## Test: Add Chapter to Responsibility

- **Endpoint**: `POST /api/school/689225/academic/exams/responsibility/:responsibilityId/chapters`
- **Note**: This endpoint is usually handled via specific repo calls, but let's assume it's part of the Responsibility management flow.

```bash
curl -s -X POST http://localhost:8080/api/school/689225/academic/exams/responsibility/math-teaching-001/chapters \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Algebraic Expressions",
    "description": "Introduction to variables and constants",
    "sequenceOrder": 1,
    "weightage": 5
  }' | jq .
```
