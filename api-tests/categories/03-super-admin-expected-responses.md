# Super Admin APIs - Expected Responses

This document outlines the expected responses for Super Admin API endpoints.

## Authentication Requirements
- **Bearer Token Authentication Required:** Yes
- **Required Header:** `Authorization: Bearer <token>`
- **Access Level:** Super Admin only
- **Token Source:** Obtained via `/api/admin/login` endpoint

## 1. POST /api/admin/login - Admin Login

**Request Body:**
```json
{
  "username": "superadmin",
  "password": "password123"
}
```

**Expected Successful Response:**
- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Response Body Structure:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "admin": {
    "username": "superadmin",
    "email": "admin@modernschool.com",
    "role": "super_admin",
    "permissions": ["manage_schools", "view_analytics", "manage_promos"],
    "created_at": "2024-01-01T00:00:00Z"
  },
  "expires_in": 86400
}
```

**Validation Criteria:**
- Token should be a valid JWT token
- Admin object should contain username and role
- Token expiration should be provided

**Error Responses:**
- **401 Unauthorized:** Invalid credentials
- **400 Bad Request:** Missing username or password

## 2. GET /api/admin/profile - Get Admin Profile

**Expected Successful Response:**
- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Response Body Structure:**
```json
{
  "success": true,
  "admin": {
    "username": "superadmin",
    "email": "admin@modernschool.com",
    "role": "super_admin",
    "permissions": ["manage_schools", "view_analytics", "manage_promos"],
    "created_at": "2024-01-01T00:00:00Z",
    "last_login": "2024-01-15T10:30:00Z",
    "login_count": 42
  }
}
```

**Validation Criteria:**
- Should return admin profile based on token
- Should include permissions array
- Should include login statistics

## 3. POST /api/admin/update-credentials - Update Admin Credentials

**Request Body:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "NewPassword123!",
  "confirmPassword": "NewPassword123!"
}
```

**Expected Successful Response:**
- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Response Body:**
```json
{
  "success": true,
  "message": "Password updated successfully"
}
```

**Validation Criteria:**
- Should validate current password
- Should enforce password strength rules
- Should match newPassword and confirmPassword

## 4. GET /api/admin/stats - Admin Dashboard Stats

**Expected Successful Response:**
- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Response Body Structure:**
```json
{
  "success": true,
  "stats": {
    "total_schools": 150,
    "active_schools": 142,
    "suspended_schools": 8,
    "total_students": 22500,
    "total_employees": 3750,
    "revenue_today": 187500.00,
    "revenue_month": 5625000.00,
    "pending_support_requests": 12,
    "ai_queries_today": 1305,
    "storage_used_gb": 125.5,
    "uptime_days": 45
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Validation Criteria:**
- All counts should be non-negative integers
- Revenue should be decimal values
- Should include timestamp

## 5. GET /api/admin/schools - List All Schools

**Expected Successful Response:**
- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Response Body Structure:**
```json
{
  "success": true,
  "schools": [
    {
      "id": "school_001",
      "name": "Modern School Delhi",
      "address": "Delhi, India",
      "contact": "contact@modernschool.edu",
      "status": "active",
      "student_count": 150,
      "employee_count": 25,
      "created_at": "2024-01-01T00:00:00Z",
      "last_active": "2024-01-15T09:30:00Z"
    },
    {
      "id": "school_002",
      "name": "Modern School Mumbai",
      "address": "Mumbai, India",
      "contact": "mumbai@modernschool.edu",
      "status": "active",
      "student_count": 180,
      "employee_count": 30,
      "created_at": "2024-01-02T00:00:00Z",
      "last_active": "2024-01-15T10:15:00Z"
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "per_page": 20,
    "total_pages": 8
  }
}
```

**Validation Criteria:**
- Should support pagination
- Each school should have basic info and counts
- Should include status field

## 6. GET /api/admin/schools/:schoolId - Get School Details

**Expected Successful Response:**
- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Response Body Structure:**
```json
{
  "success": true,
  "school": {
    "id": "school_001",
    "name": "Modern School Delhi",
    "address": "Delhi, India",
    "contact": "contact@modernschool.edu",
    "status": "active",
    "plan": "premium",
    "storage_limit_mb": 5000,
    "storage_used_mb": 1250,
    "student_count": 150,
    "employee_count": 25,
    "created_at": "2024-01-01T00:00:00Z",
    "last_active": "2024-01-15T09:30:00Z",
    "billing_info": {
      "current_balance": 12500.00,
      "last_payment": "2024-01-10T14:30:00Z",
      "next_billing": "2024-02-01T00:00:00Z"
    },
    "settings": {
      "session_duration_hours": 8,
      "max_employees": 50,
      "max_students": 200
    }
  }
}
```

**Validation Criteria:**
- Should return comprehensive school details
- Should include billing and settings information
- Should match requested school ID

## 7. School Management Operations

### PUT /api/admin/schools/:schoolId - Update School
**Expected Response:** 200 OK with updated school object

### DELETE /api/admin/schools/:schoolId - Delete School
**Expected Response:** 200 OK with confirmation message

### PATCH /api/admin/schools/:schoolId/status - Set School Status
**Expected Response:** 200 OK with updated status

## 8. Export/Import Operations

### GET /api/admin/schools/export/all - Export All Schools
**Expected Response:**
- **Status Code:** 200 OK
- **Content-Type:** application/zip or application/json
- **Response Body:** ZIP file or JSON array containing all school data

### GET /api/admin/schools/:schoolId/export - Export Single School
**Expected Response:** JSON object containing complete school data

### POST /api/admin/schools/:schoolId/import - Import School Data
**Expected Response:** 200 OK with import statistics

## 9. Support Management

### GET /api/admin/support - List Support Requests
**Expected Response:**
```json
{
  "success": true,
  "requests": [
    {
      "id": "sup_001",
      "school_id": "school_001",
      "school_name": "Modern School Delhi",
      "subject": "Login issue",
      "description": "Unable to login to admin panel",
      "status": "open",
      "priority": "high",
      "created_at": "2024-01-15T09:30:00Z",
      "updated_at": "2024-01-15T09:30:00Z"
    }
  ]
}
```

## 10. Backup Operations

### POST /api/admin/backup - Manual Backup
**Expected Response:**
```json
{
  "success": true,
  "backup_id": "backup_20240115_103000",
  "filename": "backup_20240115_103000.zip",
  "size_mb": 125.5,
  "created_at": "2024-01-15T10:30:00Z"
}
```

## Common Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token",
    "details": "Token verification failed"
  }
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions",
    "details": "Requires super_admin role"
  }
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "School not found",
    "details": "School ID 'school_999' does not exist"
  }
}
```

## Testing Notes

1. **Token Management:** Always obtain token via login endpoint first
2. **Permission Testing:** Test with invalid tokens and missing authorization headers
3. **Data Validation:** Verify all numeric fields are correct types
4. **Pagination:** Test with page and per_page parameters
5. **Error Handling:** Test all error scenarios (404, 403, 400, 401)
6. **Performance:** Monitor response times for large datasets (schools list)

## Security Considerations

1. Tokens should expire after reasonable time (24 hours)
2. Password changes should require current password
3. Sensitive operations (delete, export) should have additional confirmation
4. Audit logs should track all super admin actions
5. Rate limiting should be applied to prevent abuse