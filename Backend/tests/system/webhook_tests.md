# System API — Webhooks Tests

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

## Test: Update Webhook

- **Endpoint**: `PUT /api/school/689225/system/webhooks/WEBHOOK_ID`
- **Expected**: 200

```bash
curl -s -X PUT http://localhost:8080/api/school/689225/system/webhooks/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"is_active":false}' | jq .
```

---

## Test: Test Webhook (ping)

- **Endpoint**: `POST /api/school/689225/system/webhooks/WEBHOOK_ID/test`
- **Expected**: 200

```bash
curl -s -X POST http://localhost:8080/api/school/689225/system/webhooks/1/test \
  -H "Authorization: Bearer $TOKEN" | jq .
```

---

## Test: Delete Webhook

- **Endpoint**: `DELETE /api/school/689225/system/webhooks/WEBHOOK_ID`
- **Expected**: 200

```bash
curl -s -X DELETE http://localhost:8080/api/school/689225/system/webhooks/1 \
  -H "Authorization: Bearer $TOKEN" | jq .
```

---

## Test: Notification Webhook — Fire on Notification Create

- **Trigger**: `POST /api/school/689225/notifications`
- **Endpoint receives**: HTTP POST to registered webhook URL
- **Event**: `notification.general`

### Setup

1. Register a webhook subscribing to `notification.*` events:

```bash
curl -s -X POST http://localhost:8080/api/school/689225/system/webhooks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Notification Webhook",
    "url": "https://example.com/webhooks/notification",
    "events": ["notification.general","notification.complaint","notification.attendance"],
    "secret": "whsec_notif123",
    "is_active": true
  }' | jq .
```

### Fire Notification

```bash
curl -s -X POST http://localhost:8080/api/school/689225/notifications \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-001",
    "category": "complaint",
    "severity": "warning",
    "title": "New Complaint Filed",
    "message": "Student X has filed a complaint about bus delay",
    "data": { "complaintId": "123", "type": "transport" }
  }' | jq .
```

Expected: Webhook endpoint receives HTTP POST with payload containing the notification data and `X-Vidhyam-Signature` header.

---

## Test: Notification API Endpoints

### List Notifications

```bash
curl -s "http://localhost:8080/api/school/689225/notifications?limit=10&offset=0" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### Unread Count

```bash
curl -s "http://localhost:8080/api/school/689225/notifications/unread-count" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### Mark All Read

```bash
curl -s -X POST "http://localhost:8080/api/school/689225/notifications/mark-all-read" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### Mark Single Read

```bash
curl -s -X POST "http://localhost:8080/api/school/689225/notifications/1/read" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### Delete Notification

```bash
curl -s -X DELETE "http://localhost:8080/api/school/689225/notifications/1" \
  -H "Authorization: Bearer $TOKEN" | jq .
```
