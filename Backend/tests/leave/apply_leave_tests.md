# Leave API Tests

## Test: Apply for Leave

- **Endpoint**: `POST /api/leave/TEST001`
- **Expected**: 200

```bash
curl -s -X POST http://localhost:8080/api/leave/TEST001 \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" \
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

- **Endpoint**: `GET /api/leave/TEST001`
- **Expected**: 200

```bash
curl -s http://localhost:8080/api/leave/TEST001 \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" | jq .
```

---

## Test: List Leave Applications (filtered)

- **Endpoint**: `GET /api/leave/TEST001`
- **Query**: `?filters=[{"field":"status","op":"eq","value":"pending"}]&sort=created_at:desc`
- **Expected**: 200

```bash
FILTERS='[{"field":"status","op":"eq","value":"pending"}]'
curl -s -G "http://localhost:8080/api/leave/TEST001" \
  --data-urlencode "filters=$FILTERS" \
  --data-urlencode "sort=created_at:desc" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" | jq .
```

---

## Test: Get Leave Balance

- **Endpoint**: `GET /api/leave/TEST001/balance/EMP001`
- **Expected**: 200

```bash
curl -s http://localhost:8080/api/leave/TEST001/balance/EMP001 \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" | jq .
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
