# Attendance API — QR Attendance Tests

## Test: Generate QR Token

- **Endpoint**: `POST /api/attendance/689225/qr-attendance`
- **Body**: `{ "duration_minutes": 15, "class_name": "10-A" }`
- **Expected**: 200, token + URL

```bash
curl -s -X POST http://localhost:8080/api/attendance/689225/qr-attendance \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" \
  -H "Content-Type: application/json" \
  -d '{"duration_minutes":15,"class_name":"10-A"}' | jq .
```

```json
{
  "success": true,
  "data": {
    "token": "qr_token_abc123",
    "expires_at": "2026-04-26T10:15:00Z",
    "class_name": "10-A"
  }
}
```

---

## Test: Mark Mobile Attendance (with QR token)

- **Endpoint**: `POST /api/attendance/689225/mobile-attendance`
- **Expected**: 200

```bash
curl -s -X POST http://localhost:8080/api/attendance/689225/mobile-attendance \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "STU001",
    "status": "present",
    "latitude": 28.6139,
    "longitude": 77.2090,
    "qr_token": "qr_token_abc123"
  }' | jq .
```

---

## Test: Mark Mobile Attendance (without QR token — location only)

- **Endpoint**: `POST /api/attendance/689225/mobile-attendance`
- **Expected**: 200 (uses geofence fallback)

```bash
curl -s -X POST http://localhost:8080/api/attendance/689225/mobile-attendance \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "STU001",
    "status": "present",
    "latitude": 28.6139,
    "longitude": 77.2090
  }' | jq .
```

---

## Test: Offline Sync Attendance

- **Endpoint**: `POST /api/attendance/689225/offline-sync`
- **Expected**: 200

```bash
curl -s -X POST http://localhost:8080/api/attendance/689225/offline-sync \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" \
  -H "Content-Type: application/json" \
  -d '{
    "records": [
      {"student_id":"STU001","status":"present","marked_at":"2026-04-26T09:00:00Z"},
      {"student_id":"STU002","status":"absent","marked_at":"2026-04-26T09:01:00Z"}
    ]
  }' | jq .
```

---

## Test: QR Token Expired

- **Endpoint**: `POST /api/attendance/689225/mobile-attendance`
- **Body**: expired QR token
- **Expected**: 400

```bash
curl -s -X POST http://localhost:8080/api/attendance/689225/mobile-attendance \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "STU001",
    "status": "present",
    "latitude": 28.6139,
    "longitude": 77.2090,
    "qr_token": "expired_token"
  }' | jq .
```
