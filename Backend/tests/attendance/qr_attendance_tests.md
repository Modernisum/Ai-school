# Attendance API — QR Attendance & Mobile Tests

This document describes the testing scenarios, usage instructions, internal database data flows, and sample responses for all QR-based, location-verified, and offline-synchronization attendance endpoints.

---

## Route Table

| # | Endpoint | Method | Handler | Description |
|---|----------|--------|---------|-------------|
| 1 | `/api/school/:schoolId/attendance/qr` | POST | `generate_qr_attendance` | Generates a dynamic QR code token for a class session. |
| 2 | `/api/school/:schoolId/attendance/mobile` | POST | `mobile_mark_attendance` | Marks attendance from a student mobile device by scanning QR token and verifying location. |
| 3 | `/api/school/:schoolId/attendance/offline-sync` | POST | `offline_sync_attendance` | Uploads offline attendance logs collected locally when internet was unavailable. |

---

## 1. Generate QR Code Session

### Description & Use Case
Used by teachers / admins in a classroom to display a dynamic QR code on a screen. Students scan this QR code to mark their attendance in real-time.

### Data Flow & Logic
1. Generates a unique UUID token for the session.
2. Persists the token to `attendance_qr_tokens` table along with target `class_id` and expiration timestamp (defaulting to 30 minutes).
3. Constructs a structured deep link URI: `attendance://{schoolId}/{classId}?token={token}&expires={timestamp}`.
4. Uses `qrcode` library to generate the QR image, encodes it into a PNG byte stream, and encodes that stream into a **Base64 string**.
5. Returns the Base64 image string so the frontend can render the image directly.

### Curl Command
```bash
curl -s -X POST http://localhost:8080/api/school/689225/attendance/qr \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "school_id": "689225",
    "class_id": "10-A",
    "expires_in_minutes": 15
  }' | jq .
```

### Exact Response
```json
{
  "success": true,
  "data": {
    "class_id": "10-A",
    "expires_at": "2026-05-25T10:07:59.581934500+00:00",
    "qr_code": "iVBORw0KGgoAAAANSUhEUgAAAWg...",
    "session_id": null,
    "token": "0cfa7663-f397-492a-a6b5-27df4305971e"
  }
}
```

---

## 2. Mark Mobile Attendance

### Description & Use Case
Used by a student (via Student App) to check in by scanning the QR code displayed in class. It uses double-verification: token validity + GPS geofencing.

### Data Flow & Logic
1. **Token Validation**: Queries `attendance_qr_tokens` to ensure the token exists, is unused (`is_used = FALSE`), and hasn't expired (`expires_at > NOW()`).
2. Marks the token as used by setting `is_used = TRUE`, `used_by = user_id`, and `used_at = NOW()`.
3. **Geofencing Verification**: Reads the school location coordinates from `system_config` table (using `config_key = 'school_location'`).
4. Computes the distance between student's coordinates (`latitude`, `longitude`) and school coordinates using the **Haversine formula**.
5. Rejects the transaction if the calculated distance is greater than the configured threshold (e.g. 500 meters).
6. Calls `mark_attendance` service to create a present log in the `attendance` table if verification succeeds.

### Curl Command
```bash
curl -s -X POST http://localhost:8080/api/school/689225/attendance/mobile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "0cfa7663-f397-492a-a6b5-27df4305971e",
    "user_id": "S000003",
    "role": "student",
    "latitude": 0.0,
    "longitude": 0.0,
    "accuracy": 10.0
  }' | jq .
```

### Exact Response
```json
{
  "success": true,
  "message": "Attendance marked successfully via mobile",
  "data": {
    "createdAt": {},
    "date": "2026-05-25",
    "inTime": {},
    "in_time": "09:52",
    "location": {
      "accuracy": 10.0,
      "latitude": 0.0,
      "longitude": 0.0
    },
    "reason": "Mobile attendance via QR code",
    "status": "present",
    "updatedAt": {}
  },
  "location_verified": true,
  "distance_meters": 0.0
}
```

---

## 3. Offline Sync Attendance

### Description & Use Case
Enables mobile applications or local biometric devices to function offline without internet. When connection is restored, the client uploads the cached attendance logs.

### Data Flow & Logic
1. Receives an array of `records` containing individual user attendance entries with dates, statuses, times, and device metadata.
2. Loops through the records, performing basic role validation on each.
3. Invokes the `mark_attendance` service for each record individually.
4. Collects results in a results array (with success/failure states for each `user_id` + `date` pair), ensuring that failure of one user's sync does not fail the entire batch.
5. Returns a summary payload indicating the overall status.

### Curl Command
```bash
curl -s -X POST http://localhost:8080/api/school/689225/attendance/offline-sync \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "records": [
      { "user_id": "S000003", "role": "student", "date": "2026-05-26", "status": "present", "in_time": "08:55" },
      { "user_id": "S000004", "role": "student", "date": "2026-05-26", "status": "absent" }
    ],
    "device_id": "device_test_123",
    "sync_timestamp": 1716630000
  }' | jq .
```

### Exact Response
```json
{
  "success": true,
  "message": "Processed 2 records",
  "sync_timestamp": 1716630000,
  "device_id": "device_test_123",
  "results": [
    {
      "user_id": "S000003",
      "date": "2026-05-26",
      "success": true,
      "data": {
        "createdAt": {},
        "date": "2026-05-26",
        "inTime": {},
        "in_time": "08:55",
        "status": "present",
        "updatedAt": {}
      }
    },
    {
      "user_id": "S000004",
      "date": "2026-05-26",
      "success": true,
      "data": {
        "createdAt": {},
        "date": "2026-05-26",
        "status": "absent",
        "updatedAt": {}
      }
    }
  ]
}
```
