# Responsibility Management APIs - Expected Responses

## Authentication Requirements
- **Auth Type:** RLS (Row Level Security)
- **Required Headers:**
  - `X-School-ID`: Valid school identifier
  - `X-Admin-ID`: Valid admin identifier within the school
- **Permissions:** School administrators with responsibility management privileges

---

## API Overview

| # | Method | Route | Purpose |
|---|--------|-------|---------|
| 1 | GET | `/api/responsibility/:schoolId` | List responsibilities with filters |
| 2 | POST | `/api/responsibility/:schoolId` | Create responsibility |
| 3 | GET | `/api/responsibility/:schoolId/:responsibilityId` | Get single responsibility |
| 4 | PATCH | `/api/responsibility/:schoolId/:responsibilityId` | Update responsibility |
| 5 | DELETE | `/api/responsibility/:schoolId/:responsibilityId` | Delete responsibility |
| 6 | GET | `/api/responsibility/:schoolId/:responsibilityId/analytics` | Get responsibility analytics |
| 7 | GET | `/api/responsibility/:schoolId/overview/analytics` | Get school-wide analytics |
| 8 | GET | `/api/responsibility/:schoolId/employees/:employeeId/responsibilities` | Get employee's responsibilities |
| 9 | POST | `/api/responsibility/:schoolId/responsibilities/:responsibilityId/bulk-assign` | Bulk assign employees |
| 10 | GET | `/api/responsibility/:schoolId/metrics/utilization` | Get utilization metrics |

> **Note:** Pagination, sorting, CSV export, version history, and rollback are handled on the **frontend**. The backend returns the full filtered dataset.

---

## 1. GET /api/responsibility/:schoolId - List Responsibilities
**Purpose:** Retrieve all responsibilities for a school with optional filters for analytics and display

### Request Parameters
- **Path:** `schoolId` (string) - School identifier
- **Query Parameters (optional):**
  - `employeeType` (string) - Filter by employee type (`teacher`, `staff`, `administrator`)
  - `isActive` (boolean) - Filter by active status (`true` / `false`)
  - `priority` (string) - Filter by priority level (`high`, `medium`, `low`)
  - `startDate` (string `YYYY-MM-DD`) - Filter responsibilities starting from this date
  - `endDate` (string `YYYY-MM-DD`) - Filter responsibilities ending before this date
  - `simple` (boolean) - Return simplified response with only `id` and `name` (for dropdowns)
  - `idsOnly` (boolean) - Return only responsibility IDs (for lightweight lookups)

> **Removed:** `paginated`, `page`, `limit` — pagination is handled by the frontend.

### Success Response (200 OK) - Full List
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

### Success Response (200 OK) - Simple Mode (`?simple=true`)
```json
{
  "success": true,
  "data": [
    { "responsibilityId": "responsibility-001", "name": "Class Monitor" }
  ]
}
```

### Success Response (200 OK) - IDs Only (`?idsOnly=true`)
```json
{
  "success": true,
  "data": ["responsibility-001", "responsibility-002"]
}
```

### Error Responses
- **400 Bad Request:** Invalid query parameters (e.g., bad date format)
- **401 Unauthorized:** Missing or invalid RLS headers
- **404 Not Found:** School not found

---

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

---

## 3. GET /api/responsibility/:schoolId/:responsibilityId - Get Responsibility Definition
**Purpose:** Retrieve detailed information about a specific responsibility including currently assigned employees

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

---

## 4. PATCH /api/responsibility/:schoolId/:responsibilityId - Update Responsibility
**Purpose:** Partial update of an existing responsibility definition

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

---

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

---

## 6. GET /api/responsibility/:schoolId/:responsibilityId/analytics - Get Responsibility Analytics
**Purpose:** Get analytics and metrics for a specific responsibility

### Query Parameters (optional)
- `startDate` (string `YYYY-MM-DD`) - Analytics period start
- `endDate` (string `YYYY-MM-DD`) - Analytics period end

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

---

## 7. GET /api/responsibility/:schoolId/overview/analytics - Get Overview Analytics
**Purpose:** Get school-wide aggregated analytics for all responsibilities

### Query Parameters (optional)
- `startDate` (string `YYYY-MM-DD`) - Analytics period start
- `endDate` (string `YYYY-MM-DD`) - Analytics period end
- `employeeType` (string) - Filter analytics by employee type
- `isActive` (boolean) - Include only active/inactive responsibilities

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

---

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

---

## 9. POST /api/responsibility/:schoolId/responsibilities/:responsibilityId/bulk-assign - Bulk Assign
**Purpose:** Assign a responsibility to multiple employees at once

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

---

## 10. GET /api/responsibility/:schoolId/metrics/utilization - Get Utilization Metrics
**Purpose:** Get utilization metrics for a date range (used by analytics/dashboard views)

### Query Parameters
- `startDate` (required) - Start date in `YYYY-MM-DD` format
- `endDate` (required) - End date in `YYYY-MM-DD` format
- `employeeType` (optional) - Filter by employee type

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

---

## Removed APIs (Handled by Frontend)

The following APIs were **removed** from the backend to reduce load. The frontend handles these using already-fetched data:

| Removed Route | Reason | Frontend Alternative |
|---|---|---|
| `GET .../versions` | Version history is a display concern | Frontend tracks local edit history |
| `POST .../rollback/:version` | Version rollback logic unnecessary | Frontend re-submits via PATCH |
| `GET .../history` | Assignment history available via list API | Frontend filters/sorts assignment data |
| `GET /reports/utilization/:startDate/:endDate` | Duplicates `/metrics/utilization` | Use `#10` with date params |
| `GET /export/csv` | CSV generation is a UI concern | Frontend generates CSV from list data |
| `paginated`, `page`, `limit` query params | Pagination is a UI concern | Frontend paginates fetched array |

---

## Error Response Patterns

### 400 Bad Request (Validation Error)
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "name", "message": "Name is required" },
    { "field": "estimatedHoursPerWeek", "message": "Must be a positive number" }
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

---

## Testing Notes
1. **Dependencies:** Requires existing school and admin IDs
2. **Test Data:** Create test responsibilities before testing assignment endpoints
3. **Order:** Test CRUD operations in sequence (create → read → update → delete)
4. **Filters:** Test GET list with each filter independently and in combination
5. **Bulk Operations:** Test with both valid and invalid employee IDs
6. **Date Filters:** All date parameters must be in `YYYY-MM-DD` format

## Performance Expectations
- List endpoints: < 500ms for up to 1000 responsibilities
- Analytics endpoints: < 1000ms for 30-day period
- Bulk operations: < 2000ms for up to 100 employees