# Dashboard APIs - Expected Responses

This document outlines the expected responses for dashboard API endpoints.

## Authentication Requirements
- **RLS Authentication Required:** Yes
- **Required Headers:**
  - `X-School-ID`: School identifier
  - `X-Admin-ID`: Admin user identifier
- **Access Level:** School admin or higher

## 1. GET /api/dashboard/:schoolId/stats - School Dashboard Stats

**Expected Successful Response:**
- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Response Body Structure:**
```json
{
  "total_students": 150,
  "total_employees": 25,
  "total_classes": 12,
  "total_subjects": 45,
  "today_attendance_percentage": 92.5,
  "pending_leaves": 3,
  "pending_complaints": 2,
  "upcoming_events": 5,
  "revenue_today": 12500.00,
  "revenue_month": 250000.00,
  "active_sessions": 42,
  "storage_used_mb": 1250,
  "storage_total_mb": 5000,
  "ai_queries_today": 87
}
```

**Validation Criteria:**
- All numeric fields should be non-negative integers or floats
- `today_attendance_percentage` should be between 0-100
- Should include school-specific statistics

**Error Responses:**
- **401 Unauthorized:** Missing or invalid RLS headers
- **404 Not Found:** School ID not found
- **403 Forbidden:** Admin doesn't have access to this school

## 2. GET /api/dashboard/:schoolId/leaves/proxy-suggestions - Leave Proxy Suggestions

**Expected Successful Response:**
- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Response Body Structure:**
```json
{
  "suggestions": [
    {
      "employee_id": "emp_001",
      "employee_name": "John Doe",
      "role": "Teacher",
      "subject": "Mathematics",
      "availability_score": 0.85,
      "previous_proxy_count": 2,
      "current_workload": "medium"
    },
    {
      "employee_id": "emp_002",
      "employee_name": "Jane Smith",
      "role": "Teacher",
      "subject": "Science",
      "availability_score": 0.72,
      "previous_proxy_count": 1,
      "current_workload": "low"
    }
  ],
  "total_suggestions": 2,
  "generated_at": "2024-01-01T12:00:00Z"
}
```

**Validation Criteria:**
- Should return array of suggestions (can be empty)
- Each suggestion should have employee details
- `availability_score` should be between 0-1
- Should include timestamp

**Error Responses:**
- **401 Unauthorized:** Missing or invalid RLS headers
- **404 Not Found:** School ID not found
- **400 Bad Request:** Invalid parameters

## Common Response Patterns

### Successful Response Pattern
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### Error Response Pattern
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Missing X-School-ID header",
    "details": null
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

## Performance Expectations

1. **Response Time:** < 500ms for dashboard stats
2. **Data Freshness:** Statistics should be current (within last 5 minutes)
3. **Cache Headers:** May include caching headers for performance

## Testing Scenarios

### Scenario 1: Valid School Admin Access
- Headers: Valid X-School-ID and X-Admin-ID
- Expected: 200 OK with complete dashboard data

### Scenario 2: Invalid School ID
- Headers: Valid but non-existent school ID
- Expected: 404 Not Found

### Scenario 3: Missing Authentication Headers
- Headers: Missing X-School-ID or X-Admin-ID
- Expected: 401 Unauthorized

### Scenario 4: Insufficient Permissions
- Headers: Valid but admin doesn't have dashboard access
- Expected: 403 Forbidden

## Data Validation Rules

1. **Student Count:** Should match actual student records in database
2. **Attendance Percentage:** Calculated as (present_students / total_students) * 100
3. **Revenue Values:** Should be formatted as decimal with 2 decimal places
4. **Timestamps:** Should be in ISO 8601 format (UTC)

## Notes for Testers

1. Use the `{{schoolId}}` and `{{adminId}}` environment variables for testing
2. Verify that statistics are school-specific (not global)
3. Check that proxy suggestions are relevant to the school's employees
4. Monitor response times for performance testing
5. Test with different school sizes (small, medium, large) if possible