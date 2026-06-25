# Core Attendance API

Covers daily attendance CRUD and basic reads from `rust/src/domain/attendance/attendance.rs`.

Base prefix:

```text
POST /api/school/:schoolId/attendance/:role/:userId/present
POST /api/school/:schoolId/attendance/:role/:userId/holiday
PUT  /api/school/:schoolId/attendance/:role/:userId/:date
DELETE /api/school/:schoolId/attendance/:role/:userId/:date
GET  /api/school/:schoolId/attendance/:role/:userId
GET  /api/school/:schoolId/attendance/student/date/:date
```

Common auth:

```http
Authorization: Bearer <token>
X-School-ID: SCH-00021
```

Allowed `role`: `student` or `employee`. Invalid role returns `400 BAD_REQUEST` with `error_code: VALIDATION_ERR`.

## POST mark present

- **Endpoint:** `POST /api/school/:schoolId/attendance/:role/:userId/present`
- **Handler:** `attendance::mark_present`
- **Path params:** `schoolId`, `role`, `userId`
- **Request body:**
```json
{
  "status": "present",
  "remarks": "Arrived via bus route A",
  "date": "2026-06-20",
  "inTime": "08:55:00",
  "outTime": "15:30:00"
}
```
- **Success response:** `200 OK`
```json
{
  "success": true,
  "message": "Attendance marked present",
  "data": {
    "status": "present",
    "date": "2026-06-20",
    "inTime": { "_seconds": 1781995500, "_nanoseconds": 0 },
    "outTime": { "_seconds": 1782018600, "_nanoseconds": 0 },
    "createdAt": {},
    "updatedAt": {}
  }
}
```
- **Error response:** `400/500`
```json
{ "success": false, "error_code": "VALIDATION_ERR", "message": "Invalid role 'x'. Must be 'student' or 'employee'." }
```
- **Workflow rules:** Missing `date` defaults to today. Missing `status` defaults to `present`.

### TC_ATTENDANCE_CORE_001 Mark present success

```bash
curl -s -X POST "$BASE_URL/api/school/SCH-00021/attendance/student/STD-00001/present" \
  -H "$AUTH_HEADER" -H "X-School-ID: SCH-00021" \
  -H "Content-Type: application/json" \
  -d '{"status":"present","date":"2026-06-20"}' | jq -e '.success == true and .message == "Attendance marked present"'
```

### TC_ATTENDANCE_CORE_002 Mark present invalid role

```bash
curl -s -X POST "$BASE_URL/api/school/SCH-00021/attendance/parent/STD-00001/present" \
  -H "$AUTH_HEADER" -H "Content-Type: application/json" \
  -d '{"status":"present"}' | jq -e '.success == false and .error_code == "VALIDATION_ERR"'
```

## POST mark holiday

- **Endpoint:** `POST /api/school/:schoolId/attendance/:role/:userId/holiday`
- **Handler:** `attendance::mark_holiday`
- **Request body:**
```json
{ "date": "2026-08-15", "description": "Independence Day" }
```
- **Success response:** `200 OK`
```json
{
  "success": true,
  "message": "Holiday posted",
  "data": { "status": "holiday", "date": "2026-08-15", "description": "Independence Day" }
}
```
- **Error response:** `400 BAD_REQUEST`
```json
{ "success": false, "error_code": "VALIDATION_ERR", "message": "date is required for holiday" }
```

### TC_ATTENDANCE_CORE_003 Mark holiday success

```bash
curl -s -X POST "$BASE_URL/api/school/SCH-00021/attendance/student/STD-00001/holiday" \
  -H "$AUTH_HEADER" -H "Content-Type: application/json" \
  -d '{"date":"2026-08-15","description":"Independence Day"}' | jq -e '.success == true and .data.status == "holiday"'
```

## PUT update attendance

- **Endpoint:** `PUT /api/school/:schoolId/attendance/:role/:userId/:date`
- **Handler:** `attendance::update_attendance`
- **Request body:**
```json
{
  "status": "half_day",
  "outTime": "12:30:00",
  "reason": "Medical appointment"
}
```
- **Success response:** `200 OK`
```json
{
  "success": true,
  "message": "Attendance updated",
  "data": {
    "status": "half_day",
    "date": "2026-06-20",
    "outTime": "2026-06-20T12:30:00Z",
    "totalTime": "3h 35m",
    "reason": "Medical appointment"
  }
}
```
- **Error response:** `400 BAD_REQUEST`
```json
{ "success": false, "error_code": "VALIDATION_ERR", "message": "outTime is required" }
```
- **Workflow rules:** Existing record for the date must exist.

### TC_ATTENDANCE_CORE_004 Update attendance success

```bash
curl -s -X PUT "$BASE_URL/api/school/SCH-00021/attendance/student/STD-00001/2026-06-20" \
  -H "$AUTH_HEADER" -H "Content-Type: application/json" \
  -d '{"status":"half_day","outTime":"12:30:00"}' | jq -e '.success == true and .data.outTime != null'
```

## DELETE attendance record

- **Endpoint:** `DELETE /api/school/:schoolId/attendance/:role/:userId/:date`
- **Handler:** `attendance::delete_attendance`
- **Success response:** `200 OK`
```json
{ "success": true, "message": "Attendance deleted successfully" }
```
- **Workflow rules:** Deletes attendance row and writes attendance history.

### TC_ATTENDANCE_CORE_005 Delete attendance success

```bash
curl -s -X DELETE "$BASE_URL/api/school/SCH-00021/attendance/student/STD-00001/2026-06-20" \
  -H "$AUTH_HEADER" | jq -e '.success == true'
```

## GET user attendance history

- **Endpoint:** `GET /api/school/:schoolId/attendance/:role/:userId`
- **Handler:** `attendance::list_attendance`
- **Success response:** `200 OK`
```json
{
  "success": true,
  "data": [
    { "date": "2026-06-20", "status": "present", "userId": "STD-00001" }
  ]
}
```

### TC_ATTENDANCE_CORE_006 List user attendance success

```bash
curl -s -X GET "$BASE_URL/api/school/SCH-00021/attendance/student/STD-00001" \
  -H "$AUTH_HEADER" | jq -e '.success == true and (.data | type == "array")'
```

## GET present student IDs by date

- **Endpoint:** `GET /api/school/:schoolId/attendance/student/date/:date`
- **Handler:** `attendance::list_attendance_by_date`
- **Success response:** `200 OK`
```json
{
  "success": true,
  "date": "2026-06-20",
  "presentIds": ["STD-00001", "STD-00002"]
}
```

### TC_ATTENDANCE_CORE_007 List present student IDs success

```bash
curl -s -X GET "$BASE_URL/api/school/SCH-00021/attendance/student/date/2026-06-20" \
  -H "$AUTH_HEADER" | jq -e '.success == true and (.presentIds | type == "array")'
```
