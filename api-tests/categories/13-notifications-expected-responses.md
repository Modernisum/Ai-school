# Notification Management APIs - Expected Responses

## Authentication Requirements
- **School-level notifications**: RLS authentication (X-School-ID, X-Admin-ID headers)
- **Super Admin notifications**: Bearer token authentication (Authorization: Bearer {{superAdminToken}})

## 1. GET /api/school/:schoolId/notification - Get School Notification
### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": {
    "id": "notif_123456789",
    "title": "System Maintenance",
    "message": "The system will undergo maintenance from 2 AM to 4 AM tonight.",
    "type": "info",
    "priority": "medium",
    "created_at": "2024-04-12T10:30:00Z",
    "expires_at": "2024-12-31T23:59:59Z",
    "read": false
  }
}
```

### Error Responses
- **HTTP 404**: No notification found for this school
- **HTTP 401**: Missing or invalid RLS headers

## 2. DELETE /api/school/:schoolId/notification - Clear School Notification
### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "message": "Notification cleared successfully"
}
```

### Error Responses
- **HTTP 404**: No notification to clear
- **HTTP 401**: Missing or invalid RLS headers

## 3. GET /api/global/notification - Get Global Notification
### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": {
    "id": "global_notif_987654321",
    "title": "New Feature Released",
    "message": "We have released a new attendance tracking feature. Check it out!",
    "type": "success",
    "priority": "high",
    "created_at": "2024-04-10T09:15:00Z",
    "expires_at": "2024-12-31T23:59:59Z"
  }
}
```

### Error Responses
- **HTTP 404**: No global notification found
- **HTTP 401**: Missing or invalid RLS headers

## 4. GET /api/leave/:schoolId/notifications - Get Leave Notifications
### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": {
    "pending_approvals": 3,
    "upcoming_leaves": 5,
    "notifications": [
      {
        "id": "leave_notif_001",
        "type": "leave_approval_request",
        "title": "Leave Approval Required",
        "message": "John Doe has requested leave from 2024-04-15 to 2024-04-17",
        "leave_id": "leave_12345",
        "employee_id": "emp_67890",
        "employee_name": "John Doe",
        "created_at": "2024-04-12T14:30:00Z",
        "read": false
      },
      {
        "id": "leave_notif_002",
        "type": "leave_approved",
        "title": "Leave Approved",
        "message": "Your leave request for April 15-17 has been approved",
        "leave_id": "leave_12346",
        "created_at": "2024-04-12T11:45:00Z",
        "read": true
      }
    ]
  }
}
```

### Error Responses
- **HTTP 401**: Missing or invalid RLS headers
- **HTTP 500**: Server error

## 5. POST /api/leave/:schoolId/notifications/:notificationId/read - Mark Notification as Read
### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

### Error Responses
- **HTTP 404**: Notification not found
- **HTTP 401**: Missing or invalid RLS headers

## 6. POST /api/admin/schools/:schoolId/notify - Send School Notification (Super Admin)
### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": {
    "id": "notif_987654321",
    "title": "System Maintenance",
    "message": "The system will undergo maintenance from 2 AM to 4 AM tonight.",
    "type": "info",
    "priority": "medium",
    "created_at": "2024-04-12T18:55:00Z",
    "expires_at": "2024-12-31T23:59:59Z"
  }
}
```

### Error Responses
- **HTTP 401**: Missing or invalid super admin token
- **HTTP 404**: School not found
- **HTTP 400**: Invalid notification data

## 7. DELETE /api/admin/schools/:schoolId/notify - Clear School Notification (Super Admin)
### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "message": "School notification cleared successfully"
}
```

### Error Responses
- **HTTP 401**: Missing or invalid super admin token
- **HTTP 404**: School or notification not found

## 8. POST /api/admin/notify/global - Send Global Notification (Super Admin)
### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": {
    "id": "global_notif_123456789",
    "title": "New Feature Released",
    "message": "We have released a new attendance tracking feature. Check it out!",
    "type": "success",
    "priority": "high",
    "created_at": "2024-04-12T18:56:00Z",
    "expires_at": "2024-12-31T23:59:59Z"
  }
}
```

### Error Responses
- **HTTP 401**: Missing or invalid super admin token
- **HTTP 400**: Invalid notification data

## 9. DELETE /api/admin/notify/global - Clear Global Notification (Super Admin)
### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "message": "Global notification cleared successfully"
}
```

### Error Responses
- **HTTP 401**: Missing or invalid super admin token
- **HTTP 404**: No global notification to clear

## Notification Types Reference
| Type | Description | Priority Levels |
|------|-------------|-----------------|
| `info` | General information | low, medium, high |
| `success` | Success/confirmation | medium, high |
| `warning` | Warning/alert | medium, high |
| `error` | Error/critical | high |
| `leave_approval_request` | Leave approval needed | high |
| `leave_approved` | Leave approved notification | medium |
| `leave_rejected` | Leave rejected notification | medium |

## Test Data Dependencies
1. **School ID**: Must be valid and exist in the database
2. **Admin ID**: Must have appropriate permissions for the school
3. **Super Admin Token**: Valid bearer token with super admin privileges
4. **Notification ID**: For read/mark operations, must exist in the system

## Testing Notes
1. **Notification Persistence**: School notifications persist until cleared or expired
2. **Global vs School**: Global notifications are system-wide, school notifications are tenant-specific
3. **Read Status**: Leave notifications track read/unread status per user
4. **Priority Handling**: High priority notifications should appear first in lists
5. **Expiration**: Notifications with expired timestamps should not be returned

## Success Criteria
1. ✅ School notifications can be retrieved and cleared with RLS authentication
2. ✅ Global notifications can be retrieved by any authenticated user
3. ✅ Super admin can send notifications to specific schools
4. ✅ Super admin can send global notifications to all schools
5. ✅ Leave notifications track approval requests and status updates
6. ✅ Notification read status can be updated
7. ✅ Appropriate error responses for missing/invalid authentication
8. ✅ Notification types and priorities are properly handled