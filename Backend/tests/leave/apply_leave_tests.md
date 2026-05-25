# Leave API — Apply & List Tests

> **⚠️ BUG FIX**: All routes moved from `/api/leave/{schoolId}` to `/api/school/{schoolId}/leave/` (correct nesting)

---

## Actual Route Table

| # | Endpoint | Method | Handler |
|---|----------|--------|---------|
| 1 | `/api/school/:schoolId/leave/` | POST | `create_leave` |
| 2 | `/api/school/:schoolId/leave/` | GET | `list_leaves` |
| 3 | `/api/school/:schoolId/leave/balance/:employeeId` | GET | `get_leave_balance` |

---

## Test: Apply for Leave

- **Endpoint**: `POST /api/school/689225/leave/`
- **Expected**: 200

```bash
curl -s -X POST http://localhost:8080/api/school/689225/leave/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "EMP001",
    "leave_type": "sick",
    "from_date": "2026-05-01",
    "to_date": "2026-05-02",
    "reason": "Medical appointment",
    "contact_during_leave": "+911234567891"
  }' | jq .
```

---

## Test: List Leave Applications

- **Endpoint**: `GET /api/school/689225/leave/`
- **Expected**: 200

```bash
curl -s http://localhost:8080/api/school/689225/leave/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" | jq .
```

---

## Test: List Leave Applications (filtered)

- **Endpoint**: `GET /api/school/689225/leave/`
- **Query**: `?filters=[{"field":"status","op":"eq","value":"pending"}]&sort=created_at:desc`
- **Expected**: 200

```bash
FILTERS='[{"field":"status","op":"eq","value":"pending"}]'
curl -s -G "http://localhost:8080/api/school/689225/leave/" \
  --data-urlencode "filters=$FILTERS" \
  --data-urlencode "sort=created_at:desc" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" | jq .
```

---

## Test: Get Leave Balance

- **Endpoint**: `GET /api/school/689225/leave/balance/EMP001`
- **Expected**: 200

```bash
curl -s http://localhost:8080/api/school/689225/leave/balance/EMP001 \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" | jq .
```

```json
{
  "success": true,
  "data": {
    "total_balance": 24,
    "used": 3,
    "available": 21,
    "sick_balance": 12,
    "casual_balance": 12
  }
}
```

---

## ⚠️ Issues Found

| # | Issue | Severity |
|---|-------|----------|
| 1 | **Wrong URL prefix** — was `/api/leave/...`, correct is `/api/school/{schoolId}/leave/` | **Fixed** |
