# Operations API — Tasks Tests

> **⚠️ BUG FIX**: All routes moved from `/api/operations/{schoolId}` to `/api/school/{schoolId}/operations/` (correct nesting)

---

## Actual Route Table

| # | Endpoint | Method | Handler |
|---|----------|--------|---------|
| 1 | `/api/school/:schoolId/operations/tasks` | GET | `list_tasks` |
| 2 | `/api/school/:schoolId/operations/tasks/:taskId/status` | PUT | `update_task_status` |

---

## Test: List Tasks

- **Endpoint**: `GET /api/school/689225/operations/tasks`
- **Expected**: 200

```bash
curl -s "http://localhost:8080/api/school/689225/operations/tasks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" | jq .
```

---

## Test: List Tasks (filtered by assignee)

- **Endpoint**: `GET /api/school/689225/operations/tasks`
- **Query**: `?filters=[{"field":"assigned_to","op":"eq","value":"EMP001"}]`
- **Expected**: 200

```bash
FILTERS='[{"field":"assigned_to","op":"eq","value":"EMP001"}]'
curl -s -G "http://localhost:8080/api/school/689225/operations/tasks" \
  --data-urlencode "filters=$FILTERS" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" | jq .
```

---

## Test: Update Task Status

- **Endpoint**: `PUT /api/school/689225/operations/tasks/{taskId}/status`
- **Expected**: 200

```bash
curl -s -X PUT http://localhost:8080/api/school/689225/operations/tasks/1/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" \
  -H "Content-Type: application/json" \
  -d '{"status":"in_progress"}' | jq .
```

---

## ⚠️ Issues Found

| # | Issue | Severity |
|---|-------|----------|
| 1 | **Wrong URL prefix** — was `/api/operations/...`, correct is `/api/school/{schoolId}/operations/` | **Fixed** |
| 2 | **Tasks have only 2 routes in code**: GET list + PUT update status. `POST create`, `GET detail`, `PUT complete`, `DELETE` routes do NOT exist in domain/operations.rs | **Removed** |
| 3 | AI task generation (`/ai/generate`, `/ai/reorganize`) are also in operations domain | Low |
