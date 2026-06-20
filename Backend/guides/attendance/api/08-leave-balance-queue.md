# Leave Balance, Queue, and Details API

Covers leave balance, pending queue, and leave detail lookup.

## GET leave balance

- **Endpoint:** `GET /api/school/:schoolId/attendance/leave/balance/:employeeId`
- **Handler:** `leave::get_leave_balance`
- **Path params:** `schoolId`, `employeeId`
- **Success response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "employeeId": "EMP-00001",
    "casual": { "total": 12, "used": 2, "remaining": 10 },
    "sick": { "total": 10, "used": 1, "remaining": 9 },
    "annual": { "total": 30, "used": 5, "remaining": 25 },
    "emergency": { "total": 5, "used": 0, "remaining": 5 }
  }
}
```
- **Current-code note:** This is a placeholder implementation and should later query `leave_quotas`.

### TC_ATTENDANCE_LEAVEBAL_001 Leave balance success

```bash
curl -s -X GET "$BASE_URL/api/school/SCH-00021/attendance/leave/balance/EMP-00001" \
  -H "$AUTH_HEADER" | jq -e '.success == true and .data.employeeId == "EMP-00001"'
```

## GET leave queue

- **Endpoint:** `GET /api/school/:schoolId/attendance/leave/queue?status=pending`
- **Handler:** `leave::get_leave_queue`
- **Query params:** `status` optional
- **Success response:** `200 OK`
```json
{
  "success": true,
  "data": [
    { "id": 123, "status": "pending", "fromDate": "2026-06-12", "toDate": "2026-06-15" }
  ]
}
```
- **Workflow rules:** If `status` is provided, leaves are filtered by exact string match.

### TC_ATTENDANCE_LEAVEBAL_002 Leave queue success

```bash
curl -s -G "$BASE_URL/api/school/SCH-00021/attendance/leave/queue" \
  -H "$AUTH_HEADER" --data-urlencode 'status=pending' \
  | jq -e '.success == true and (.data | type == "array")'
```

## GET leave details

- **Endpoint:** `GET /api/school/:schoolId/attendance/leave/details/:leaveId`
- **Handler:** `leave::get_leave_details`
- **Success response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": 123,
    "leaveId": "LV_8821",
    "status": "pending",
    "fromDate": "2026-06-12",
    "toDate": "2026-06-15"
  }
}
```
- **Error response:** `500 INTERNAL_SERVER_ERROR` in current handler when leave is not found.

### TC_ATTENDANCE_LEAVEBAL_003 Leave details success

```bash
curl -s -X GET "$BASE_URL/api/school/SCH-00021/attendance/leave/details/LV_8821" \
  -H "$AUTH_HEADER" | jq -e '.success == true and .data.leaveId == "LV_8821"'
```
