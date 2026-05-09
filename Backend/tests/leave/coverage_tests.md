# Leave API — Coverage & Conditional Approval Tests

## Test: Conditional Approval

- **Endpoint**: `POST /api/leave/689225/LEAVE_ID/conditional/approve`
- **Expected**: 200

```bash
curl -s -X POST http://localhost:8080/api/leave/689225/1/conditional/approve \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" \
  -H "Content-Type: application/json" \
  -d '{
    "conditions": {
      "find_replacement": true,
      "complete_pending_tasks": true,
      "handover_notes": true
    }
  }' | jq .
```

---

## Test: Get Notifications

- **Endpoint**: `GET /api/leave/689225/notifications?unread_only=true`
- **Expected**: 200

```bash
curl -s "http://localhost:8080/api/leave/689225/notifications?unread_only=true" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" | jq .
```

---

## Test: Mark Notification Read

- **Endpoint**: `POST /api/leave/689225/notifications/NOTIF_ID/read`
- **Expected**: 200

```bash
curl -s -X POST http://localhost:8080/api/leave/689225/notifications/1/read \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" | jq .
```

---

## Test: Leave Conflict Check

- **Endpoint**: `POST /api/leave/689225/conflicts`
- **Expected**: 200

```bash
curl -s -X POST http://localhost:8080/api/leave/689225/conflicts \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" \
  -H "Content-Type: application/json" \
  -d '{
    "user_ids": ["EMP001","EMP002"],
    "from_date": "2026-05-01",
    "to_date": "2026-05-02"
  }' | jq .
```
