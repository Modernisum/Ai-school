# Attendance Automation API

Covers automatic teacher assignment for attendance gaps.

## GET auto assign teacher

- **Endpoint:** `GET /api/school/:schoolId/attendance/auto-assign-teacher`
- **Handler:** `attendance_automation::auto_assign_teacher`
- **Success response:** `200 OK`
```json
{
  "success": true,
  "date": "2026-06-20",
  "assignments": [
    {
      "className": "10-A",
      "period": 2,
      "assignedEmployeeId": "EMP-00302",
      "reason": "Teacher absent"
    }
  ],
  "unmarked_classes": 1
}
```
- **Workflow rules:** Uses current UTC date and day-of-week as repository parameters. `unmarked_classes` equals the number of returned assignments.

### TC_ATTENDANCE_AUTO_001 Auto assign teacher success

```bash
curl -s -X GET "$BASE_URL/api/school/SCH-00021/attendance/auto-assign-teacher" \
  -H "$AUTH_HEADER" | jq -e '.success == true and (.assignments | type == "array") and .unmarked_classes == (.assignments | length)'
```
