# QR, Mobile, and Offline Sync API

Covers classroom QR generation, geofenced mobile attendance, and offline biometric sync.

## POST generate QR attendance token

- **Endpoint:** `POST /api/school/:schoolId/attendance/qr`
- **Handler:** `attendance::generate_qr_attendance`
- **Request body:**
```json
{
  "school_id": "SCH-00021",
  "class_id": "class_10a",
  "session_id": "session_morning_10a",
  "expires_in_minutes": 5
}
```
- **Success response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "qr_code": "iVBORw0KGgoAAAANSUhEUgAA...",
    "token": "QR_ATT_TOKEN_88291881",
    "expires_at": "2026-06-20T08:30:00Z",
    "class_id": "class_10a",
    "session_id": "session_morning_10a"
  }
}
```
- **Error response:** `400 BAD_REQUEST` if `payload.school_id != schoolId`.
- **Workflow rules:** Token is stored through `create_qr_token`; QR payload uses `attendance://<schoolId>/<classId>?token=...&expires=...`.

### TC_ATTENDANCE_QR_001 Generate QR success

```bash
curl -s -X POST "$BASE_URL/api/school/SCH-00021/attendance/qr" \
  -H "$AUTH_HEADER" -H "Content-Type: application/json" \
  -d '{"school_id":"SCH-00021","class_id":"class_10a","expires_in_minutes":5}' \
  | jq -e '.success == true and (.data.qr_code | length > 0) and (.data.token | length > 0)'
```

### TC_ATTENDANCE_QR_002 Generate QR school mismatch

```bash
curl -s -X POST "$BASE_URL/api/school/SCH-00021/attendance/qr" \
  -H "$AUTH_HEADER" -H "Content-Type: application/json" \
  -d '{"school_id":"SCH-99999","class_id":"class_10a"}' \
  | jq -e '.success == false and .message == "School ID mismatch"'
```

## POST mobile QR attendance

- **Endpoint:** `POST /api/school/:schoolId/attendance/user`
- **Handler:** `attendance::mobile_mark_attendance`
- **Request body:**
```json
{
  "token": "QR_ATT_TOKEN_88291881",
  "user_id": "STD-00001",
  "role": "student",
  "latitude": 28.6139,
  "longitude": 77.2090,
  "device_id": "device_123",
  "accuracy": 12.5
}
```
- **Success response:** `200 OK`
```json
{
  "success": true,
  "message": "Attendance marked successfully via mobile",
  "data": {
    "status": "present",
    "date": "2026-06-20",
    "reason": "Mobile attendance via QR code",
    "location": { "latitude": 28.6139, "longitude": 77.2090, "accuracy": 12.5 }
  },
  "location_verified": true,
  "distance_meters": 18.4
}
```
- **Error response:** `400 BAD_REQUEST` for invalid/expired/used token or location outside max distance.
- **Workflow rules:** Token is consumed once. Distance max is currently `500m` from `school_location` config.

### TC_ATTENDANCE_QR_003 Mobile QR attendance success

```bash
curl -s -X POST "$BASE_URL/api/school/SCH-00021/attendance/user" \
  -H "$AUTH_HEADER" -H "Content-Type: application/json" \
  -d '{
    "token":"QR_ATT_TOKEN_88291881",
    "user_id":"STD-00001",
    "role":"student",
    "latitude":28.6139,
    "longitude":77.2090,
    "accuracy":12.5
  }' | jq -e '.success == true and .location_verified == true and (.distance_meters | type == "number")'
```

## POST offline attendance sync

- **Endpoint:** `POST /api/school/:schoolId/attendance/offline-sync`
- **Handler:** `attendance::offline_sync_attendance`
- **Request body:**
```json
{
  "records": [
    {
      "userId": "STD-00001",
      "role": "student",
      "date": "2026-06-19",
      "status": "present",
      "in_time": "08:55:00",
      "out_time": "15:30:00",
      "reason": "Biometric terminal",
      "location": { "latitude": 28.6139, "longitude": 77.2090 },
      "device_id": "biometric_terminal_east",
      "sync_timestamp": 1781990000
    }
  ],
  "device_id": "biometric_terminal_east",
  "sync_timestamp": 1781990000
}
```
- **Success response:** `200 OK`
```json
{
  "success": true,
  "message": "Processed 2 records",
  "results": [
    { "user_id": "STD-00001", "date": "2026-06-19", "success": true, "data": {} },
    { "user_id": "STD-99999", "date": "2026-06-19", "success": false, "error": "Invalid role 'x'..." }
  ],
  "device_id": "biometric_terminal_east",
  "sync_timestamp": 1781990000
}
```
- **Workflow rules:** Invalid record role does not fail the whole request; it adds `success:false` in `results`.

### TC_ATTENDANCE_QR_004 Offline sync success

```bash
curl -s -X POST "$BASE_URL/api/school/SCH-00021/attendance/offline-sync" \
  -H "$AUTH_HEADER" -H "Content-Type: application/json" \
  -d '{
    "records":[{"userId":"STD-00001","role":"student","date":"2026-06-19","status":"present"}],
    "device_id":"biometric_terminal_east",
    "sync_timestamp":1781990000
  }' | jq -e '.success == true and (.results | type == "array")'
```
