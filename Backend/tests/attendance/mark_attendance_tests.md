# Attendance API — Mark Attendance Tests

This document describes the testing scenarios, usage instructions, internal database data flows, and sample responses for all mark-related attendance endpoints.

---

## Route Table

| # | Endpoint | Method | Handler | Description |
|---|----------|--------|---------|-------------|
| 1 | `/api/school/:schoolId/attendance/:role/:userId/present` | POST | `mark_present` | Mark a student or employee as present for a date. |
| 2 | `/api/school/:schoolId/attendance/:role/:userId/holiday` | POST | `mark_holiday` | Mark a student or employee as holiday for a date. |
| 3 | `/api/school/:schoolId/attendance/:role/:userId/:date` | PUT | `update_attendance` | Update attendance status, times, and reason. |
| 4 | `/api/school/:schoolId/attendance/:role/:userId` | GET | `list_attendance` | List attendance logs for a specific user. |
| 5 | `/api/school/:schoolId/attendance/:role/date/:date` | GET | `list_attendance_by_date` | Retrieve list of present user IDs on a specific date. |
| 6 | `/api/school/:schoolId/attendance/bulk` | POST | `bulk_mark_attendance` | Bulk mark attendance for a class or department. |
| 7 | `/api/school/:schoolId/attendance/class` | GET | `get_class_attendance` | Get attendance state of all students in a class. |
| 8 | `/api/school/:schoolId/attendance/auto-assign-teacher` | GET | `auto_assign_teacher` | Auto-assign teachers to classes based on current attendance. |
| 9 | `/api/school/:schoolId/attendance/:role/:userId/:date` | DELETE | `delete_attendance` | Delete attendance entry for a user on a given date. |

---

## 1. Mark Present

### Description & Use Case
Used to mark a specific user (student or employee) as present on a specific date. It records entry (`in_time`) and logs a reason.

### Data Flow & Logic
1. Reads `schoolId` from the route params to establish database client context.
2. Extracts payload: `date` (YYYY-MM-DD), `in_time` (optional), and `reason` (optional). If `status` is omitted, it defaults to `"present"`.
3. Performs an upsert operation (`INSERT ON CONFLICT`) on the `attendance` table.
4. **Unique Constraint Target**: `ON CONFLICT (school_id, role, user_id, date)`. If a record already exists, it updates `status`, `in_time`, `out_time`, and `total_time` using the `EXCLUDED` values.

### Curl Command
```bash
curl -s -X POST http://localhost:8080/api/school/689225/attendance/student/S000003/present \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-05-25",
    "in_time": "09:00",
    "reason": "Regular"
  }' | jq .
```

### Exact Response
```json
{
  "success": true,
  "message": "Attendance marked present",
  "data": {
    "createdAt": {},
    "date": "2026-05-25",
    "inTime": {
      "_nanoseconds": 0,
      "_seconds": 1779699600
    },
    "in_time": "09:00",
    "reason": "Regular",
    "status": "present",
    "updatedAt": {}
  }
}
```

---

## 2. Mark Holiday

### Description & Use Case
Used to mark a student or employee as on holiday or school/office closed.

### Data Flow & Logic
1. Inserts/Upserts into the `attendance` table.
2. Explicitly forces the status to `"holiday"`.
3. Adheres to unique constraint `ON CONFLICT (school_id, role, user_id, date) DO UPDATE`.

### Curl Command
```bash
curl -s -X POST http://localhost:8080/api/school/689225/attendance/student/S000003/holiday \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-05-25",
    "reason": "National Holiday"
  }' | jq .
```

---

## 3. Update Attendance

### Description & Use Case
Used by administrators to adjust attendance details manually, e.g. marking as absent, adding checkout times (`out_time`), or updating reason details.

### Data Flow & Logic
1. Path params supply `school_id`, `role`, `user_id`, and `date`.
2. Body payload supplies new fields like `status` (present, absent, late, holiday, halfday), `out_time` (formatted as HH:MM or ISO timestamp), and `reason`.
3. Performs an database query to locate the record and update it, returning the modified record.

### Curl Command
```bash
curl -s -X PUT http://localhost:8080/api/school/689225/attendance/student/S000003/2026-05-25 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "absent",
    "reason": "Sick Leave",
    "out_time": "14:00"
  }' | jq .
```

### Exact Response
```json
{
  "success": true,
  "message": "Attendance updated",
  "data": {
    "date": "2026-05-25",
    "inTime": "2026-05-25T09:00:00Z",
    "month": 5,
    "outTime": "2026-05-25T14:00:00Z",
    "reason": "Sick Leave",
    "status": "absent",
    "totalTime": "5h 0m",
    "year": 2026
  }
}
```

---

## 4. List Attendance Logs

### Description & Use Case
Used to retrieve history of attendance logs of a single student or employee.

### Data Flow & Logic
1. Selects all rows from `attendance` matching the `school_id`, `role`, and `user_id`.
2. Computes the month and year from the `date` dynamically to display month/year filter details on the frontend.

### Curl Command
```bash
curl -s http://localhost:8080/api/school/689225/attendance/student/S000003 \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### Exact Response
```json
{
  "success": true,
  "data": [
    {
      "date": "2026-05-25",
      "inTime": "2026-05-25T09:00:00Z",
      "month": 5,
      "outTime": "2026-05-25T14:00:00Z",
      "status": "present",
      "totalTime": "5h 0m",
      "year": 2026
    }
  ]
}
```

---

## 5. List Attendance By Date

### Description & Use Case
Lists all students/employees who were present on a specific date. Useful for daily roll call visualization.

### Data Flow & Logic
1. Query selects all `user_id` values from the `attendance` table matching the specific `school_id`, `role` (e.g. `student`), `date`, and `status = 'present'`.
2. Groups them and returns an array of `presentIds`.

### Curl Command
```bash
curl -s http://localhost:8080/api/school/689225/attendance/student/date/2026-05-25 \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### Exact Response
```json
{
  "success": true,
  "date": "2026-05-25",
  "presentIds": [
    "S000003",
    "S000004"
  ]
}
```

---

## 6. Bulk Mark Attendance

### Description & Use Case
Used by teachers/admins to submit roll call for an entire class at once, saving network roundtrips.

### Data Flow & Logic
1. Processes an array of `attendances` containing `user_id`, `status` and an optional `note` / `reason`.
2. Wraps the updates inside a **database transaction** (`tx.begin()`).
3. Runs insertion for each record in the list. If it encounters a conflict on `(school_id, role, user_id, date)`, it overrides it.
4. Returns count of successfully marked records, along with a details list and any failure logs.

### Curl Command
```bash
curl -s -X POST http://localhost:8080/api/school/689225/attendance/bulk \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-05-25",
    "role": "student",
    "class_name": "10-A",
    "attendances": [
      { "user_id": "S000003", "status": "present", "note": "Bulk update" },
      { "user_id": "S000004", "status": "present" }
    ]
  }' | jq .
```

### Exact Response
```json
{
  "success": true,
  "total": 2,
  "marked": 2,
  "failed": 0,
  "details": [
    { "userId": "S000003", "status": "ok" },
    { "userId": "S000004", "status": "ok" }
  ]
}
```

---

## 7. Get Class Attendance

### Description & Use Case
Used to fetch details of all students within a particular class along with their attendance state for a given day.

### Data Flow & Logic
1. Joins the `attendance` table with the `students` table to fetch names and class names.
2. In case a student doesn't have an attendance record for that day, we fetch their basic details and set the status to absent/unmarked.
3. Fixes employee names by reading from the JSONB `data->>'name'` column.
4. Filters the query by fallback `s.class_name` to retrieve entries even when `class_name` column in `attendance` table is NULL.

### Curl Command
```bash
curl -s "http://localhost:8080/api/school/689225/attendance/class?class_name=10-A&date=2026-05-25" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### Exact Response
```json
{
  "success": true,
  "data": [
    {
      "userId": "S000003",
      "studentName": "Rahul Sharma",
      "status": "absent",
      "inTime": null,
      "outTime": null,
      "totalTime": ""
    },
    {
      "userId": "S000004",
      "studentName": "Priya Patel",
      "status": "present",
      "inTime": null,
      "outTime": null,
      "totalTime": null
    }
  ]
}
```

---

## 8. Auto-Assign Teacher

### Description & Use Case
Automatically assigns proxy or default teachers to class schedules for classes whose regular teachers are absent or unmarked today.

### Data Flow & Logic
1. Compares active classes with present teachers.
2. If class teacher is absent/unmarked on this date, searches for available teachers with no active class assignments.
3. Automatically maps student class names via `c.name = s.class_name` to assign teachers.

### Curl Command
```bash
curl -s http://localhost:8080/api/school/689225/attendance/auto-assign-teacher \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### Exact Response
```json
{
  "success": true,
  "date": "2026-05-25",
  "unmarked_classes": 22,
  "assignments": [
    {
      "classId": "class-1",
      "className": "Class 1",
      "status": "no_teacher_found",
      "teacherId": null
    },
    {
      "classId": "class-10",
      "className": "Class 10",
      "status": "no_teacher_found",
      "teacherId": null
    }
  ]
}
```

---

## 9. Delete Attendance

### Description & Use Case
Deletes a specific attendance log entry. Mainly used to clear test records or reset a day.

### Data Flow & Logic

2. Deletes row directly.

### Curl Command
```bash
curl -s -X DELETE http://localhost:8080/api/school/689225/attendance/student/S000003/2026-05-25 \
;hg```

### Exact Response
```json
{
  "success": true,
  "message": "Attendance deleted successfully"
}
```
