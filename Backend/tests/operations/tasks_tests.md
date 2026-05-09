# Operations API — Tasks Tests

## Test: List Tasks

- **Endpoint**: `GET /api/operations/689225/tasks`
- **Expected**: 200

```bash
curl -s "http://localhost:8080/api/operations/689225/tasks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" | jq .
```

---

## Test: List Tasks (filtered by assignee)

- **Endpoint**: `GET /api/operations/689225/tasks`
- **Query**: `?filters=[{"field":"assigned_to","op":"eq","value":"EMP001"}]`
- **Expected**: 200

```bash
FILTERS='[{"field":"assigned_to","op":"eq","value":"EMP001"}]'
curl -s -G "http://localhost:8080/api/operations/689225/tasks" \
  --data-urlencode "filters=$FILTERS" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" | jq .
```

---

## Test: Create Task

- **Endpoint**: `POST /api/operations/689225/tasks`
- **Expected**: 201

```bash
curl -s -X POST http://localhost:8080/api/operations/689225/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Submit monthly report",
    "assigned_to": "EMP001",
    "deadline": "2026-05-05",
    "priority": "high",
    "status": "pending"
  }' | jq .
```

---

## Test: Get Task Detail

- **Endpoint**: `GET /api/operations/689225/tasks/1`
- **Expected**: 200

```bash
curl -s http://localhost:8080/api/operations/689225/tasks/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" | jq .
```

---

## Test: Update Task

- **Endpoint**: `PUT /api/operations/689225/tasks/1`
- **Expected**: 200

```bash
curl -s -X PUT http://localhost:8080/api/operations/689225/tasks/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" \
  -H "Content-Type: application/json" \
  -d '{"status":"in_progress"}' | jq .
```

---

## Test: Complete Task

- **Endpoint**: `PUT /api/operations/689225/tasks/1/complete`
- **Expected**: 200

```bash
curl -s -X PUT http://localhost:8080/api/operations/689225/tasks/1/complete \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" | jq .
```

---

## Test: Delete Task

- **Endpoint**: `DELETE /api/operations/689225/tasks/1`
- **Expected**: 200

```bash
curl -s -X DELETE http://localhost:8080/api/operations/689225/tasks/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" | jq .
```

---

## Test: List Tasks (by date range)

- **Endpoint**: `GET /api/operations/689225/tasks?from=2026-04-01&to=2026-05-31`
- **Expected**: 200

```bash
curl -s "http://localhost:8080/api/operations/689225/tasks?from=2026-04-01&to=2026-05-31" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" | jq .
```
