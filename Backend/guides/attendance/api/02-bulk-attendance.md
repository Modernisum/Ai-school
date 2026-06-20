# Bulk and Class Attendance API

Covers bulk attendance submission and class-level attendance lookup.

## POST bulk attendance

- **Endpoint:** `POST /api/school/:schoolId/attendance/bulk`
- **Handler:** `attendance::bulk_mark_attendance`
- **Auth:** Bearer token + tenant context.
- **Request body:**
```json
{
  "date": "2026-06-20",
  "role": "student",
  "className": "10-A",
  "attendances": [
    { "id": "STD-00001", "status": "present", "inTime": "08:55" },
    { "userId": "STD-00002", "status": "absent", "note": "Fever" },
    { "user_id": "STD-00003", "status": "late" }
  ]
}
```
- **Success response:** `200 OK`
```json
{
  "success": true,
  "marked": 3,
  "failed": 0,
  "total": 3,
  "details": [
    { "userId": "STD-00001", "status": "ok" },
    { "userId": "STD-00002", "status": "ok" },
    { "userId": "STD-00003", "status": "ok" }
  ]
}
```
- **Error response:** invalid role returns `400 BAD_REQUEST` with `VALIDATION_ERR`; repository failures return `500`.
- **Workflow rules:** Each attendance item may use `id`, `userId`, or `user_id`. Missing user id increments `failed`.

### TC_ATTENDANCE_BULK_001 Bulk attendance success

```bash
curl -s -X POST "$BASE_URL/api/school/SCH-00021/attendance/bulk" \
  -H "$AUTH_HEADER" -H "Content-Type: application/json" \
  -d '{
    "date":"2026-06-20",
    "role":"student",
    "className":"10-A",
    "attendances":[{"id":"STD-00001","status":"present"},{"userId":"STD-00002","status":"absent"}]
  }' | jq -e '.success == true and .marked + .failed == .total'
```

### TC_ATTENDANCE_BULK_002 Bulk attendance invalid role

```bash
curl -s -X POST "$BASE_URL/api/school/SCH-00021/attendance/bulk" \
  -H "$AUTH_HEADER" -H "Content-Type: application/json" \
  -d '{"date":"2026-06-20","role":"parent","attendances":[]}' \
  | jq -e '.success == false and .error_code == "VALIDATION_ERR"'
```

## GET class attendance

- **Endpoint:** `GET /api/school/:schoolId/attendance/class?className=10-A&date=2026-06-20`
- **Handler:** `attendance::get_class_attendance`
- **Query params:**
  - `className` string, required
  - `date` string, required
- **Success response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "userId": "STD-00001",
      "studentName": "Aarav Sharma",
      "status": "present",
      "inTime": "08:55:00",
      "outTime": "15:30:00",
      "totalTime": "6h 35m"
    }
  ]
}
```

### TC_ATTENDANCE_BULK_003 Class attendance success

```bash
curl -s -G "$BASE_URL/api/school/SCH-00021/attendance/class" \
  -H "$AUTH_HEADER" \
  --data-urlencode 'className=10-A' \
  --data-urlencode 'date=2026-06-20' \
  | jq -e '.success == true and (.data | type == "array")'
```
