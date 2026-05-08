# Leave API — Coverage & Conditional Approval Tests

## Test: Conditional Approval

- **Endpoint**: `POST /api/leave/TEST001/LEAVE_ID/conditional/approve`
- **Expected**: 200

```bash
curl -s -X POST http://localhost:8080/api/leave/TEST001/1/conditional/approve \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" \
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

- **Endpoint**: `GET /api/leave/TEST001/notifications?unread_only=true`
- **Expected**: 200

```bash
curl -s "http://localhost:8080/api/leave/TEST001/notifications?unread_only=true" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" | jq .
```

---

## Test: Mark Notification Read

- **Endpoint**: `POST /api/leave/TEST001/notifications/NOTIF_ID/read`
- **Expected**: 200

```bash
curl -s -X POST http://localhost:8080/api/leave/TEST001/notifications/1/read \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" | jq .
```

---

## Test: Leave Conflict Check

- **Endpoint**: `POST /api/leave/TEST001/conflicts`
- **Expected**: 200

```bash
curl -s -X POST http://localhost:8080/api/leave/TEST001/conflicts \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" \
  -H "Content-Type: application/json" \
  -d '{
    "user_ids": ["EMP001","EMP002"],
    "from_date": "2026-05-01",
    "to_date": "2026-05-02"
  }' | jq .
```
