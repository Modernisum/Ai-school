# System API — Webhooks Tests

> **⚠️ BUG FIX**: Notification API endpoints are under `/api/school/{schoolId}/system/notifications/`, not `/api/school/{schoolId}/notifications`

---

## Actual Route Table

| # | Endpoint | Method | Handler |
|---|----------|--------|---------|
| 1 | `/api/school/:schoolId/system/webhooks` | POST | `register_webhook` |
| 2 | `/api/school/:schoolId/system/webhooks` | GET | `list_webhooks` |
| 3 | `/api/school/:schoolId/system/webhooks/:webhookId` | DELETE | `delete_webhook` |
| 4 | `/api/school/:schoolId/system/webhooks/:webhookId/logs` | GET | `get_webhook_logs` |
| 5 | `/api/school/:schoolId/system/notifications/` | GET | list notifications |
| 6 | `/api/school/:schoolId/system/notifications/unread-count` | GET | unread count |
| 7 | `/api/school/:schoolId/system/notifications/mark-all-read` | POST | mark all read |
| 8 | `/api/school/:schoolId/system/notifications/:id/read` | POST | mark single read |
| 9 | `/api/school/:schoolId/system/notifications/:id` | DELETE | delete notification |

---

## Test: List Webhooks

- **Endpoint**: `GET /api/school/689225/system/webhooks`
- **Expected**: 200

```bash
curl -s http://localhost:8080/api/school/689225/system/webhooks \
  -H "Authorization: Bearer $TOKEN" | jq .
```

---

## Test: Create Webhook

- **Endpoint**: `POST /api/school/689225/system/webhooks`
- **Expected**: 201

```bash
curl -s -X POST http://localhost:8080/api/school/689225/system/webhooks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Attendance Webhook",
    "url": "https://example.com/webhooks/attendance",
    "events": ["attendance.marked","attendance.bulk_marked"],
    "secret": "whsec_abc123",
    "is_active": true
  }' | jq .
```

---

## Test: Delete Webhook

- **Endpoint**: `DELETE /api/school/689225/system/webhooks/{webhookId}`
- **Expected**: 200

```bash
curl -s -X DELETE http://localhost:8080/api/school/689225/system/webhooks/1 \
  -H "Authorization: Bearer $TOKEN" | jq .
```

---

## Test: Get Webhook Logs

- **Endpoint**: `GET /api/school/689225/system/webhooks/{webhookId}/logs`
- **Expected**: 200

```bash
curl -s http://localhost:8080/api/school/689225/system/webhooks/1/logs \
  -H "Authorization: Bearer $TOKEN" | jq .
```

---

## Notification Endpoints (under system module)

### List Notifications

- **Endpoint**: `GET /api/school/689225/system/notifications?limit=10&offset=0`
- **Expected**: 200

```bash
curl -s "http://localhost:8080/api/school/689225/system/notifications?limit=10&offset=0" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### Unread Count

- **Endpoint**: `GET /api/school/689225/system/notifications/unread-count`
- **Expected**: 200

```bash
curl -s "http://localhost:8080/api/school/689225/system/notifications/unread-count" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### Mark All Read

- **Endpoint**: `POST /api/school/689225/system/notifications/mark-all-read`
- **Expected**: 200

```bash
curl -s -X POST "http://localhost:8080/api/school/689225/system/notifications/mark-all-read" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### Mark Single Read

- **Endpoint**: `POST /api/school/689225/system/notifications/{id}/read`
- **Expected**: 200

```bash
curl -s -X POST "http://localhost:8080/api/school/689225/system/notifications/1/read" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### Delete Notification

- **Endpoint**: `DELETE /api/school/689225/system/notifications/{id}`
- **Expected**: 200

```bash
curl -s -X DELETE "http://localhost:8080/api/school/689225/system/notifications/1" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

---

## ⚠️ Issues Found

| # | Issue | Severity |
|---|-------|----------|
| 1 | **Notification paths wrong** — were `/api/school/689225/notifications`, correct is `/api/school/689225/system/notifications/...` | **Fixed** |
| 2 | Missing: webhook logs endpoint | **Added** |
