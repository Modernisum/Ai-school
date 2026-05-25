# AI API — Chat Tests

> **⚠️ BUG FIX**: All routes moved from `/api/ai/{schoolId}` to `/api/school/{schoolId}/ai/` (correct nesting)

---

## Actual Route Table

| # | Endpoint | Method | Handler |
|---|----------|--------|---------|
| 1 | `/api/school/:schoolId/ai/chat/*` | * | `ai::ai_routes()` (nested) |
| 2 | `/api/school/:schoolId/ai/content/generate/exam` | POST | `generate_exam_questions` |
| 3 | `/api/school/:schoolId/ai/content/generate/lesson-plan` | POST | `generate_lesson_plan` |
| 4 | `/api/school/:schoolId/ai/content/generate/study-materials` | POST | `generate_study_materials` |
| 5 | `/api/school/:schoolId/ai/content/generate/practice-problems` | POST | `generate_practice_problems` |
| 6 | `/api/school/:schoolId/ai/content/summarize` | POST | `summarize_content` |
| 7 | `/api/school/:schoolId/ai/content/enhanced/generate-exam` | POST | `enhanced_generate_exam` |

---

## Test: AI Query

- **Endpoint**: `POST /api/school/689225/ai/chat/query`
- **Body**: `{ "query": "What is the total number of active students?" }`
- **Expected**: 200, AI response

```bash
curl -s -X POST http://localhost:8080/api/school/689225/ai/chat/query \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" \
  -H "Content-Type: application/json" \
  -d '{"query":"What is the total number of active students in class 10-A?"}' | jq .
```

---

## Test: AI Query (rate limited)

- **Endpoint**: `POST /api/school/689225/ai/chat/query`
- **Expected**: 429 on 21st request within 1 minute

```bash
for i in {1..21}; do
  echo "Request $i:"
  curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8080/api/school/689225/ai/chat/query \
    -H "Authorization: Bearer $TOKEN" \
    -H "X-School-ID: 689225" \
    -H "Content-Type: application/json" \
    -d '{"query":"test"}'
  echo ""
done
```

---

## Test: Get AI Chat History

- **Endpoint**: `GET /api/school/689225/ai/chat/history`
- **Expected**: 200

```bash
curl -s http://localhost:8080/api/school/689225/ai/chat/history \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" | jq .
```

---

## ⚠️ Issues Found

| # | Issue | Severity |
|---|-------|----------|
| 1 | **Wrong URL prefix** — was `/api/ai/...`, correct is `/api/school/{schoolId}/ai/` | **Fixed** |
| 2 | **`/monitoring/dashboard`, `/usage`, `/costs`, `/providers/comparison`, `/trends`, `/operations/top`** — these routes are NOT in domain/ai.rs | **Removed** |
| 3 | AI routes are inside a nested `chat/*` router — actual prefix is `/api/school/:schoolId/ai/chat/...` | **Fixed** |
