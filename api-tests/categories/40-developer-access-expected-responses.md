# Developer Access APIs - Expected Responses

## Authentication Requirements
- **X-School-ID**: Required for all endpoints
- **X-Admin-ID**: Required for all endpoints
- **Permissions**: Super admin or security admin role required for approval/revocation

## 1. POST /api/developer-access/:developerId/request - Request Access

### Request Body
```json
{
  "developer_email": "developer@example.com",
  "target_school_id": "SCH001",
  "requested_role": "data-analyst",
  "justification": "Need access to student performance data for analytics dashboard development",
  "requested_tables": ["students", "attendance", "exam_results"],
  "duration_minutes": 480
}
```

### Successful Response (201 Created)
```json
{
  "success": true,
  "message": "Access request submitted successfully",
  "request": {
    "request_id": 101,
    "developer_id": "DEV001",
    "target_school_id": "SCH001",
    "requested_role": "data-analyst",
    "status": "pending",
    "justification": "Need access to student performance data for analytics dashboard development",
    "created_at": "2024-03-15T10:30:00Z",
    "expires_at": "2024-03-22T10:30:00Z"
  }
}
```

## 2. POST /api/developer-access/requests/:requestId/approve - Approve Access Request

### Request Body
```json
{
  "approver_id": "admin123",
  "approver_email": "admin@school.com",
  "approval_notes": "Access approved for analytics project",
  "override_duration_minutes": 720
}
```

### Successful Response (200 OK)
```json
{
  "success": true,
  "message": "Access request approved",
  "data": {
    "grant_id": 201,
    "developer_id": "DEV001",
    "school_id": "SCH001",
    "role": "data-analyst",
    "approved_by": "admin123",
    "approved_at": "2024-03-15T11:00:00Z",
    "expires_at": "2024-04-14T11:00:00Z",
    "tables": ["students", "attendance", "exam_results"]
  }
}
```

## 3. POST /api/developer-access/grants/:grantId/revoke - Revoke Access

### Request Body
```json
{
  "revoker_id": "admin123",
  "revoker_email": "admin@school.com",
  "reason": "Project completed, access no longer required"
}
```

### Successful Response (200 OK)
```json
{
  "success": true,
  "message": "Access revoked successfully"
}
```

## 4. GET /api/developer-access/requests/pending - Get Pending Requests

### Successful Response (200 OK)
```json
{
  "success": true,
  "requests": [
    {
      "request_id": 102,
      "developer_id": "DEV002",
      "developer_email": "dev2@example.com",
      "target_school_id": "SCH001",
      "requested_role": "read-only",
      "justification": "Debugging production issue",
      "status": "pending",
      "created_at": "2024-03-14T09:15:00Z",
      "requested_tables": ["logs", "errors"]
    },
    {
      "request_id": 103,
      "developer_id": "DEV003",
      "developer_email": "dev3@example.com",
      "target_school_id": "SCH001",
      "requested_role": "admin",
      "justification": "System maintenance",
      "status": "pending",
      "created_at": "2024-03-13T14:30:00Z",
      "requested_tables": ["*"]
    }
  ]
}
```

## 5. GET /api/developer-access/:developerId - Get Developer Access

### Successful Response (200 OK)
```json
{
  "success": true,
  "access": {
    "developer_id": "DEV001",
    "current_role": "data-analyst",
    "active_until": "2024-04-14T11:00:00Z",
    "schools_with_access": ["SCH001"],
    "total_requests": 5,
    "approved_requests": 3,
    "active_grants": [
      {
        "grant_id": 201,
        "school_id": "SCH001",
        "role": "data-analyst",
        "approved_at": "2024-03-01T10:00:00Z",
        "expires_at": "2024-04-14T11:00:00Z",
        "tables": ["students", "attendance", "exam_results"]
      }
    ]
  }
}
```

## 6. GET /api/developer-access/:developerId/activity - Get Developer Activity

### Successful Response (200 OK)
```json
{
  "success": true,
  "activities": [
    {
      "activity_id": 301,
      "developer_id": "DEV001",
      "action_type": "query",
      "target_school_id": "SCH001",
      "details": {
        "table": "students",
        "operation": "SELECT",
        "rows_returned": 150
      },
      "ip_address": "192.168.1.50",
      "user_agent": "PostmanRuntime/7.36.0",
      "created_at": "2024-03-15T11:30:00Z"
    },
    {
      "activity_id": 302,
      "developer_id": "DEV001",
      "action_type": "access_request",
      "target_school_id": "SCH001",
      "details": {
        "request_id": 101,
        "status": "approved"
      },
      "ip_address": "192.168.1.50",
      "user_agent": "Chrome/122.0.0.0",
      "created_at": "2024-03-14T15:45:00Z"
    }
  ]
}
```

## 7. POST /api/developer-access/:developerId/emergency - Emergency Access

### Request Body
```json
{
  "developer_email": "emergency@example.com",
  "target_school_id": "SCH001",
  "requested_role": "emergency",
  "justification": "Production system down, need immediate access to diagnose",
  "requested_tables": ["system_logs", "error_logs", "database_tables"],
  "duration_minutes": 60
}
```

### Successful Response (201 Created)
```json
{
  "success": true,
  "message": "Emergency access requested",
  "request": {
    "request_id": 104,
    "developer_id": "DEV001",
    "target_school_id": "SCH001",
    "requested_role": "emergency",
    "status": "pending",
    "justification": "Production system down, need immediate access to diagnose",
    "created_at": "2024-03-15T12:00:00Z",
    "expires_at": "2024-03-15T13:00:00Z"
  }
}
```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Invalid developer email format"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "Insufficient permissions to approve access requests"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Developer not found"
}
```

### 409 Conflict
```json
{
  "success": false,
  "error": "Active access grant already exists for this developer"
}
```

## Testing Notes
1. **Roles**: Valid roles: "read-only", "data-analyst", "admin", "emergency"
2. **Duration**: Default 8 hours (480 minutes), emergency access 1 hour
3. **Tables**: Can specify specific tables or "*" for all tables
4. **Approval**: Requires elevated permissions
5. **Audit**: All access requests and grants are logged

## Security Considerations
1. Developer access is time-limited and scope-limited
2. Emergency access requires additional approval workflow
3. All developer activities are logged and monitored
4. Access can be revoked at any time
5. Sensitive data access requires additional justification

## Performance Expectations
- Access request processing: < 200ms
- Grant approval: < 500ms
- Activity logging: < 100ms per action
- Access validation: < 50ms per request