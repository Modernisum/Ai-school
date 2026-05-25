# AI API — Exam & Task Generation Tests

> **⚠️ BUG FIX**: All routes moved from `/api/ai/{schoolId}` to `/api/school/{schoolId}/ai/` (correct nesting)

---

## Actual Route Table

| # | Endpoint | Method | Handler |
|---|----------|--------|---------|
| 1 | `/api/school/:schoolId/ai/content/generate/exam` | POST | `generate_exam_questions` |
| 2 | `/api/school/:schoolId/ai/content/generate/lesson-plan` | POST | `generate_lesson_plan` |
| 3 | `/api/school/:schoolId/ai/content/generate/study-materials` | POST | `generate_study_materials` |
| 4 | `/api/school/:schoolId/ai/content/generate/practice-problems` | POST | `generate_practice_problems` |
| 5 | `/api/school/:schoolId/ai/content/summarize` | POST | `summarize_content` |
| 6 | `/api/school/:schoolId/ai/content/enhanced/generate-exam` | POST | `enhanced_generate_exam` |

---

## Test: AI Generate Exam Paper

- **Endpoint**: `POST /api/school/689225/ai/content/generate/exam`
- **Expected**: 200

```bash
curl -s -X POST http://localhost:8080/api/school/689225/ai/content/generate/exam \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" \
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

## Test: AI Generate Lesson Plan

- **Endpoint**: `POST /api/school/689225/ai/content/generate/lesson-plan`
- **Expected**: 200

```bash
curl -s -X POST http://localhost:8080/api/school/689225/ai/content/generate/lesson-plan \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Physics",
    "class_name": "11-A",
    "topic": "Newton Laws"
  }' | jq .
```

---

## Test: AI Generate Study Materials

- **Endpoint**: `POST /api/school/689225/ai/content/generate/study-materials`
- **Expected**: 200

```bash
curl -s -X POST http://localhost:8080/api/school/689225/ai/content/generate/study-materials \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Chemistry",
    "class_name": "11-A",
    "chapters": ["Thermodynamics"]
  }' | jq .
```

---

## Test: AI Summarize Content

- **Endpoint**: `POST /api/school/689225/ai/content/summarize`
- **Expected**: 200

```bash
curl -s -X POST http://localhost:8080/api/school/689225/ai/content/summarize \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Long text to summarize..."
  }' | jq .
```

---

## ⚠️ Issues Found

| # | Issue | Severity |
|---|-------|----------|
| 1 | **Wrong URL prefix** — was `/api/ai/...`, correct is `/api/school/{schoolId}/ai/` | **Fixed** |
| 2 | **`/tasks/generate`, `/tasks/reorganize`** — these are in `domain/operations.rs` (not AI). AI routes use `/content/generate/...` | **Fixed** |
| 3 | **`/trends`, `/operations/top`** — these routes don't exist in domain/ai.rs | **Removed** |
