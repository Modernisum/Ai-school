# Responsibility Management APIs - Expected Responses

## Authentication Requirements
- **Auth Type:** RLS (Row Level Security)
- **Required Headers:**
  - `X-School-ID`: Valid school identifier
  - `X-Admin-ID`: Valid admin identifier within the school
- **Permissions:** School administrators with responsibility management privileges

## 1. GET /api/responsibility/:schoolId - List Responsibilities
**Purpose:** Retrieve all responsibilities for a school with optional filtering

### Request Parameters
- **Path:** `schoolId` (string) - School identifier
- **Query Parameters (optional):**
  - `employeeType` (string) - Filter by employee type (teacher, staff, etc.)
  - `simple` (boolean) - Return simplified response with only ID and name
  - `paginated` (boolean) - Enable pagination
  - `page` (integer) - Page number (when paginated=true)
  - `limit` (integer) - Items per page (when paginated=true)
  - `idsOnly` (boolean) - Return only responsibility IDs

### Success Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "responsibilityId": "responsibility-001",
      "name": "Class Monitor",
      "description": "Responsible for maintaining classroom discipline",
      "employeeType": "teacher",
      "priority": "medium",
      "estimatedHoursPerWeek": 5,
      "compensation": 0,
      "startDate": "2026-01-01",
      "endDate": "2026-12-31",
      "isActive": true,
      "createdAt": "2026-01-01T10:00:00Z",
      "updatedAt": "2026-01-01T10:00:00Z",
      "createdBy": "admin-001"
    }
  ]
}
```

### Paginated Success Response (200 OK)
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "pages": 5
  }
}
```

### Error Responses
- **400 Bad Request:** Invalid query parameters
- **401 Unauthorized:** Missing or invalid RLS headers
- **404 Not Found:** School not found

## 2. POST /api/responsibility/:schoolId - Create Responsibility
**Purpose:** Create a new responsibility definition

### Request Body
```json
{
  "name": "Class Monitor",
  "description": "Responsible for maintaining classroom discipline",
  "employeeType": "teacher",
  "priority": "medium",
  "estimatedHoursPerWeek": 5,
  "compensation": 0,
  "startDate": "2026-01-01",
  "endDate": "2026-12-31",
  "isActive": true
}
```

### Success Response (201 Created)
```json
{
  "success": true,
  "data": {
    "responsibilityId": "responsibility-001",
    "name": "Class Monitor",
    "description": "Responsible for maintaining classroom discipline",
    "employeeType": "teacher",
    "priority": "medium",
    "estimatedHoursPerWeek": 5,
    "compensation": 0,
    "startDate": "2026-01-01",
    "endDate": "2026-12-31",
    "isActive": true,
    "createdAt": "2026-01-01T10:00:00Z",
    "updatedAt": "2026-01-01T10:00:00Z",
    "createdBy": "admin-001"
  }
}
```

### Error Responses
- **400 Bad Request:** Missing required fields or validation errors
- **401 Unauthorized:** Missing or invalid RLS headers
- **409 Conflict:** Responsibility with same name already exists

## 3. GET /api/responsibility/:schoolId/:responsibilityId - Get Responsibility Definition
**Purpose:** Retrieve detailed information about a specific responsibility

### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "responsibilityId": "responsibility-001",
    "name": "Class Monitor",
    "description": "Responsible for maintaining classroom discipline",
    "employeeType": "teacher",
    "priority": "medium",
    "estimatedHoursPerWeek": 5,
    "compensation": 0,
    "startDate": "2026-01-01",
    "endDate": "2026-12-31",
    "isActive": true,
    "createdAt": "2026-01-01T10:00:00Z",
    "updatedAt": "2026-01-01T10:00:00Z",
    "createdBy": "admin-001",
    "assignedEmployees": [
      {
        "employeeId": "employee-001",
        "employeeName": "John Doe",
        "assignmentDate": "2026-01-15",
        "status": "active"
      }
    ]
  }
}
```

### Error Responses
- **401 Unauthorized:** Missing or invalid RLS headers
- **404 Not Found:** Responsibility not found

## 4. PATCH /api/responsibility/:schoolId/:responsibilityId - Update Responsibility
**Purpose:** Update an existing responsibility definition

### Request Body (partial update)
```json
{
  "name": "Class Monitor - Updated",
  "description": "Updated responsibility description",
  "priority": "high",
  "estimatedHoursPerWeek": 8
}
```

### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "responsibilityId": "responsibility-001",
    "name": "Class Monitor - Updated",
    "description": "Updated responsibility description",
    "employeeType": "teacher",
    "priority": "high",
    "estimatedHoursPerWeek": 8,
    "compensation": 0,
    "startDate": "2026-01-01",
    "endDate": "2026-12-31",
    "isActive": true,
    "updatedAt": "2026-01-02T14:30:00Z"
  }
}
```

### Error Responses
- **400 Bad Request:** Invalid update data
- **401 Unauthorized:** Missing or invalid RLS headers
- **404 Not Found:** Responsibility not found

## 5. DELETE /api/responsibility/:schoolId/:responsibilityId - Delete Responsibility
**Purpose:** Delete a responsibility definition

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Responsibility deleted successfully"
}
```

### Error Responses
- **401 Unauthorized:** Missing or invalid RLS headers
- **404 Not Found:** Responsibility not found
- **409 Conflict:** Responsibility has active assignments

## 6. GET /api/responsibility/:schoolId/:responsibilityId/analytics - Get Responsibility Analytics
**Purpose:** Get analytics and metrics for a specific responsibility

### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "responsibilityId": "responsibility-001",
    "name": "Class Monitor",
    "metrics": {
      "totalAssignments": 15,
      "activeAssignments": 12,
      "completionRate": 85.5,
      "averageHoursPerWeek": 4.8,
      "totalCompensation": 0,
      "satisfactionScore": 4.2
    },
    "trends": {
      "assignmentsLast30Days": 5,
      "completionRateTrend": "increasing"
    }
  }
}
```

## 7. GET /api/responsibility/:schoolId/overview/analytics - Get Overview Analytics
**Purpose:** Get overview analytics for all responsibilities in a school

### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "totalResponsibilities": 45,
    "activeResponsibilities": 38,
    "totalAssignments": 215,
    "averageAssignmentsPerResponsibility": 4.8,
    "totalEstimatedHoursPerWeek": 225,
    "utilizationRate": 78.3,
    "byEmployeeType": {
      "teacher": 25,
      "staff": 15,
      "administrator": 5
    },
    "byPriority": {
      "high": 10,
      "medium": 25,
      "low": 10
    }
  }
}
```

## 8. GET /api/responsibility/:schoolId/employees/:employeeId/responsibilities - List Employee Responsibilities
**Purpose:** Get all responsibilities assigned to a specific employee

### Success Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "responsibilityId": "responsibility-001",
      "name": "Class Monitor",
      "assignmentDate": "2026-01-15",
      "status": "active",
      "hoursThisWeek": 5,
      "completionPercentage": 80
    }
  ]
}
```

## 9. POST /api/responsibility/:schoolId/responsibilities/:responsibilityId/bulk-assign - Bulk Assign Responsibility
**Purpose:** Assign responsibility to multiple employees at once

### Request Body
```json
{
  "employeeIds": ["employee-001", "employee-002", "employee-003"],
  "assignmentDate": "2026-01-15",
  "notes": "Bulk assignment for new semester"
}
```

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Responsibility assigned to 3 employees",
  "data": {
    "assignedCount": 3,
    "failedCount": 0,
    "failedEmployees": []
  }
}
```

## 10. GET /api/responsibility/:schoolId/responsibilities/:responsibilityId/history - Get Responsibility History
**Purpose:** Get assignment history for a responsibility

### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "responsibilityId": "responsibility-001",
    "assignments": [
      {
        "assignmentId": "assignment-001",
        "employeeId": "employee-001",
        "employeeName": "John Doe",
        "assignmentDate": "2026-01-15",
        "removalDate": null,
        "status": "active",
        "assignedBy": "admin-001"
      }
    ]
  }
}
```

## 11. GET /api/responsibility/:schoolId/responsibilities/:responsibilityId/versions - Get Responsibility Versions
**Purpose:** Get version history of responsibility definition changes

### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "responsibilityId": "responsibility-001",
    "versions": [
      {
        "version": 2,
        "changes": {
          "name": "Class Monitor → Class Monitor - Updated",
          "priority": "medium → high"
        },
        "updatedBy": "admin-001",
        "updatedAt": "2026-01-02T14:30:00Z"
      },
      {
        "version": 1,
        "changes": "Initial creation",
        "updatedBy": "admin-001",
        "updatedAt": "2026-01-01T10:00:00Z"
      }
    ]
  }
}
```

## 12. POST /api/responsibility/:schoolId/responsibilities/:responsibilityId/rollback/:version - Rollback Responsibility
**Purpose:** Rollback responsibility to a previous version

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Responsibility rolled back to version 2"
}
```

## 13. GET /api/responsibility/:schoolId/metrics/utilization - Get Utilization Metrics
**Purpose:** Get utilization metrics for responsibilities

### Query Parameters
- `startDate` (required) - Start date in YYYY-MM-DD format
- `endDate` (required) - End date in YYYY-MM-DD format

### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "period": {
      "startDate": "2026-01-01",
      "endDate": "2026-01-31"
    },
    "utilizationRate": 78.3,
    "totalHoursLogged": 1250,
    "totalHoursEstimated": 1600,
    "byResponsibility": [
      {
        "responsibilityId": "responsibility-001",
        "name": "Class Monitor",
        "utilizationRate": 85.5,
        "hoursLogged": 85,
        "hoursEstimated": 100
      }
    ]
  }
}
```

## 14. GET /api/responsibility/:schoolId/reports/utilization/:startDate/:endDate - Generate Utilization Report
**Purpose:** Generate detailed utilization report

### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "reportId": "report-001",
    "type": "utilization",
    "period": {
      "startDate": "2026-01-01",
      "endDate": "2026-01-31"
    },
    "generatedAt": "2026-02-01T10:00:00Z",
    "summary": {
      "totalResponsibilities": 45,
      "totalHoursLogged": 1250,
      "averageUtilization": 78.3,
      "mostUtilized": "responsibility-001",
      "leastUtilized": "responsibility-045"
    },
    "details": [...]
  }
}
```

## 15. GET /api/responsibility/:schoolId/export/csv - Export Responsibilities CSV
**Purpose:** Export all responsibilities as CSV file

### Success Response (200 OK)
- **Content-Type:** `text/csv`
- **Content-Disposition:** `attachment; filename="responsibilities_2026-01-01.csv"`
- **Body:** CSV file content

## Error Response Patterns

### 400 Bad Request (Validation Error)
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "name",
      "message": "Name is required"
    },
    {
      "field": "estimatedHoursPerWeek",
      "message": "Must be a positive number"
    }
  ]
}
```

### 401 Unauthorized (Missing RLS Headers)
```json
{
  "success": false,
  "message": "Missing or invalid X-School-ID or X-Admin-ID headers"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Responsibility not found"
}
```

### 409 Conflict (Duplicate)
```json
{
  "success": false,
  "message": "Responsibility with name 'Class Monitor' already exists"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error"
}
```

## Testing Notes
1. **Dependencies:** Requires existing school and admin IDs
2. **Test Data:** Create test responsibilities before testing assignment endpoints
3. **Order:** Test CRUD operations in sequence (create → read → update → delete)
4. **Bulk Operations:** Test with both valid and invalid employee IDs
5. **Reports:** Date parameters must be in YYYY-MM-DD format

## Performance Expectations
- List endpoints: < 500ms for up to 1000 responsibilities
- Analytics endpoints: < 1000ms for 30-day period
- Bulk operations: < 2000ms for up to 100 employees
- CSV export: < 3000ms for up to 5000 records