# Attendance Reports API

Covers advanced attendance stats and report endpoints.

## GET school attendance stats

- **Endpoint:** `GET /api/school/:schoolId/attendance?date=2026-06-20&period=day&className=10-A`
- **Handler:** `attendance::get_school_attendance`
- **Query params:**
  - `date` optional, defaults to today
  - `period` optional: `day`, `week`, `month`, `year`
  - `incoming_after`, `outgoing_before` optional
  - `user_type`, `className`, `spaceName`, `userIds`, `fields` optional
- **Success response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "period": { "start": "2026-06-20", "end": "2026-06-20" },
    "summary": {
      "total_users": 40,
      "total_present": 36,
      "total_absent": 3,
      "total_leave": 1,
      "attendance_percentage": 90.0
    },
    "records": []
  }
}
```

### TC_ATTENDANCE_REPORTS_001 School stats success

```bash
curl -s -G "$BASE_URL/api/school/SCH-00021/attendance" \
  -H "$AUTH_HEADER" \
  --data-urlencode 'date=2026-06-20' --data-urlencode 'period=day' \
  | jq -e '.success == true and .data.summary.total_users != null'
```

## GET student attendance report

- **Endpoint:** `GET /api/school/:schoolId/attendance/reports/student?studentId=STD-00001&startDate=2026-06-01&endDate=2026-06-30`
- **Handler:** `attendance::get_student_report`
- **Query params:** `studentId`, `startDate`, `endDate`
- **Success response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "studentId": "STD-00001",
    "period": { "start": "2026-06-01", "end": "2026-06-30" },
    "summary": { "present": 20, "absent": 2, "leave": 1 },
    "records": []
  }
}
```

### TC_ATTENDANCE_REPORTS_002 Student report success

```bash
curl -s -G "$BASE_URL/api/school/SCH-00021/attendance/reports/student" \
  -H "$AUTH_HEADER" \
  --data-urlencode 'studentId=STD-00001' \
  --data-urlencode 'startDate=2026-06-01' \
  --data-urlencode 'endDate=2026-06-30' \
  | jq -e '.success == true and .data.studentId == "STD-00001"'
```

## GET class attendance report

- **Endpoint:** `GET /api/school/:schoolId/attendance/reports/class?className=10-A&startDate=2026-06-01&endDate=2026-06-30`
- **Handler:** `attendance::get_class_report`
- **Success response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "className": "10-A",
    "period": { "start": "2026-06-01", "end": "2026-06-30" },
    "records": []
  }
}
```

### TC_ATTENDANCE_REPORTS_003 Class report success

```bash
curl -s -G "$BASE_URL/api/school/SCH-00021/attendance/reports/class" \
  -H "$AUTH_HEADER" \
  --data-urlencode 'className=10-A' \
  --data-urlencode 'startDate=2026-06-01' \
  --data-urlencode 'endDate=2026-06-30' \
  | jq -e '.success == true and .data.className == "10-A"'
```

## GET employee report

- **Endpoint:** `GET /api/school/:schoolId/attendance/reports/employee?employeeId=EMP-00001&startDate=2026-06-01&endDate=2026-06-30`
- **Handler:** `attendance::get_employee_report`
- **Status:** `IMPLEMENTATION_PENDING`
- **Current success response:** `200 OK`
```json
{
  "success": true,
  "message": "Employee report endpoint - implementation pending",
  "data": {
    "employee_id": "EMP-00001",
    "period": { "start_date": "2026-06-01", "end_date": "2026-06-30" }
  }
}
```

### TC_ATTENDANCE_REPORTS_004 Employee report placeholder

```bash
curl -s -G "$BASE_URL/api/school/SCH-00021/attendance/reports/employee" \
  -H "$AUTH_HEADER" \
  --data-urlencode 'employeeId=EMP-00001' \
  --data-urlencode 'startDate=2026-06-01' \
  --data-urlencode 'endDate=2026-06-30' \
  | jq -e '.success == true and (.message | contains("pending"))'
```

## POST custom report

- **Endpoint:** `POST /api/school/:schoolId/attendance/reports/custom`
- **Handler:** `attendance::generate_custom_report`
- **Status:** `IMPLEMENTATION_PENDING`
- **Request body:**
```json
{
  "report_type": "monthly_attendance",
  "start_date": "2026-06-01",
  "end_date": "2026-06-30",
  "filters": { "className": "10-A" }
}
```
- **Current success response:** `200 OK`
```json
{
  "success": true,
  "message": "Custom report generation endpoint - implementation pending",
  "data": {
    "report_type": "monthly_attendance",
    "period": { "start_date": "2026-06-01", "end_date": "2026-06-30" },
    "filters": { "className": "10-A" }
  }
}
```

### TC_ATTENDANCE_REPORTS_005 Custom report placeholder

```bash
curl -s -X POST "$BASE_URL/api/school/SCH-00021/attendance/reports/custom" \
  -H "$AUTH_HEADER" -H "Content-Type: application/json" \
  -d '{"report_type":"monthly_attendance","start_date":"2026-06-01","end_date":"2026-06-30","filters":{"className":"10-A"}}' \
  | jq -e '.success == true and (.message | contains("pending"))'
```
