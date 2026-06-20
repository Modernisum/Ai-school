# Leave Notifications and Feature Flags API

Covers leave notification reads and feature flag management.

## GET leave notifications

- **Endpoint:** `GET /api/school/:schoolId/attendance/leave/notifications?unread_only=true`
- **Handler:** `leave::get_notifications`
- **Query params:** `unread_only` boolean, optional, defaults to `false`
- **Success response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "notif1",
      "type": "leave_submitted",
      "title": "New Leave Request",
      "message": "Employee John Doe submitted a leave request",
      "timestamp": "2026-06-20T00:00:00Z",
      "read": false,
      "data": { "leaveId": "LV123" }
    }
  ]
}
```
- **Current-code note:** Placeholder implementation returns sample notifications.

### TC_ATTENDANCE_NOTIFY_001 List leave notifications success

```bash
curl -s -G "$BASE_URL/api/school/SCH-00021/attendance/leave/notifications" \
  -H "$AUTH_HEADER" --data-urlencode 'unread_only=true' \
  | jq -e '.success == true and (.data | type == "array")'
```

## POST mark notification read

- **Endpoint:** `POST /api/school/:schoolId/attendance/leave/notifications/:notificationId/read`
- **Handler:** `leave::mark_notification_read`
- **Success response:** `200 OK`
```json
{ "success": true }
```

### TC_ATTENDANCE_NOTIFY_002 Mark notification read success

```bash
curl -s -X POST "$BASE_URL/api/school/SCH-00021/attendance/leave/notifications/notif1/read" \
  -H "$AUTH_HEADER" | jq -e '.success == true'
```

## GET feature flags

- **Endpoint:** `GET /api/school/:schoolId/attendance/leave/feature-flags`
- **Handler:** `leave::get_feature_flags`
- **Success response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "enhanced_leave_system": true,
    "conditional_approvals": true,
    "real_time_notifications": true,
    "mobile_leave_submission": true,
    "workload_assessment": true,
    "responsibility_coverage": true
  }
}
```

### TC_ATTENDANCE_NOTIFY_003 Get feature flags success

```bash
curl -s -X GET "$BASE_URL/api/school/SCH-00021/attendance/leave/feature-flags" \
  -H "$AUTH_HEADER" | jq -e '.success == true and .data.enhanced_leave_system == true'
```

## POST update feature flags

- **Endpoint:** `POST /api/school/:schoolId/attendance/leave/feature-flags`
- **Handler:** `leave::update_feature_flags`
- **Request body:**
```json
{
  "enhanced_leave_system": true,
  "conditional_approvals": false,
  "real_time_notifications": true
}
```
- **Success response:** `200 OK`
```json
{ "success": true }
```

### TC_ATTENDANCE_NOTIFY_004 Update feature flags success

```bash
curl -s -X POST "$BASE_URL/api/school/SCH-00021/attendance/leave/feature-flags" \
  -H "$AUTH_HEADER" -H "Content-Type: application/json" \
  -d '{"enhanced_leave_system":true,"conditional_approvals":false}' \
  | jq -e '.success == true'
```
