# System API — Webhooks Tests

## Test: List Webhooks

- **Endpoint**: `GET /api/system/TEST001/webhooks`
- **Expected**: 200

```bash
curl -s http://localhost:8080/api/system/TEST001/webhooks \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" | jq .
```

---

## Test: Create Webhook

- **Endpoint**: `POST /api/system/TEST001/webhooks`
- **Expected**: 201

```bash
curl -s -X POST http://localhost:8080/api/system/TEST001/webhooks \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" \
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

- **Endpoint**: `PUT /api/system/TEST001/webhooks/WEBHOOK_ID`
- **Expected**: 200

```bash
curl -s -X PUT http://localhost:8080/api/system/TEST001/webhooks/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" \
  -H "Content-Type: application/json" \
  -d '{"is_active":false}' | jq .
```

---

## Test: Test Webhook (ping)

- **Endpoint**: `POST /api/system/TEST001/webhooks/WEBHOOK_ID/test`
- **Expected**: 200

```bash
curl -s -X POST http://localhost:8080/api/system/TEST001/webhooks/1/test \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" | jq .
```

---

## Test: Delete Webhook

- **Endpoint**: `DELETE /api/system/TEST001/webhooks/WEBHOOK_ID`
- **Expected**: 200

```bash
curl -s -X DELETE http://localhost:8080/api/system/TEST001/webhooks/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" | jq .
```
