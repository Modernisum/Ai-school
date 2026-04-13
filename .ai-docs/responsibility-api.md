# Responsibility System API Documentation

## Overview
The Responsibility System manages employee responsibilities, assignments, analytics, and reporting. This document covers all API endpoints for the responsibility module.

## Base URL
```
/api/:schoolId/responsibility
```

## Authentication
All endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Common Response Format
```json
{
  "success": true,
  "data": {...},
  "message": "Operation successful"
}
```

Error response:
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## Endpoints

### 1. List Responsibilities
**GET** `/api/:schoolId/responsibility`

**Query Parameters:**
- `employee_type` (optional): Filter by employee type (e.g., "teacher", "staff")
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:**
```json
{
  "data": [
    {
      "responsibilityId": "resp_123",
      "name": "Class Teacher",
      "description": "Responsible for class management",
      "employeeType": "teacher",
      "spaceCategory": "classroom",
      "spaceIds": ["class_101", "class_102"],
      "monthlyPrice": 5000.0,
      "perDayPrice": 200.0,
      "studentFee": 100.0,
      "workLevel": "medium",
      "workPeriod": "monthly",
      "workAmount": 1.0,
      "createdAt": "2024-01-01T10:00:00Z",
      "updatedAt": "2024-01-01T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

### 2. Create Responsibility
**POST** `/api/:schoolId/responsibility`

**Request Body:**
```json
{
  "name": "Class Teacher",
  "description": "Responsible for class management",
  "employeeType": "teacher",
  "spaceCategory": "classroom",
  "spaceIds": ["class_101", "class_102"],
  "monthlyPrice": 5000.0,
  "perDayPrice": 200.0,
  "studentFee": 100.0,
  "workLevel": "medium",
  "workPeriod": "monthly",
  "workAmount": 1.0
}
```

**Response:**
```json
{
  "responsibilityId": "resp_123",
  "name": "Class Teacher",
  "description": "Responsible for class management",
  "employeeType": "teacher",
  "spaceCategory": "classroom",
  "spaceIds": ["class_101", "class_102"],
  "monthlyPrice": 5000.0,
  "perDayPrice": 200.0,
  "studentFee": 100.0,
  "workLevel": "medium",
  "workPeriod": "monthly",
  "workAmount": 1.0,
  "createdAt": "2024-01-01T10:00:00Z",
  "updatedAt": "2024-01-01T10:00:00Z"
}
```

### 3. Get Responsibility Details
**GET** `/api/:schoolId/responsibility/:responsibilityId`

**Response:**
```json
{
  "responsibilityId": "resp_123",
  "name": "Class Teacher",
  "description": "Responsible for class management",
  "employeeType": "teacher",
  "spaceCategory": "classroom",
  "spaceIds": ["class_101", "class_102"],
  "monthlyPrice": 5000.0,
  "perDayPrice": 200.0,
  "studentFee": 100.0,
  "workLevel": "medium",
  "workPeriod": "monthly",
  "workAmount": 1.0,
  "createdAt": "2024-01-01T10:00:00Z",
  "updatedAt": "2024-01-01T10:00:00Z"
}
```

### 4. Update Responsibility
**PUT** `/api/:schoolId/responsibility/:responsibilityId`

**Request Body:** (partial updates allowed)
```json
{
  "description": "Updated description",
  "monthlyPrice": 5500.0
}
```

**Response:** `204 No Content`

### 5. Delete Responsibility
**DELETE** `/api/:schoolId/responsibility/:responsibilityId`

**Response:** `204 No Content`

### 6. List Student Responsibilities
**GET** `/api/:schoolId/responsibility/student/:studentId`

**Query Parameters:**
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:**
```json
{
  "data": [
    {
      "responsibilityId": "resp_123",
      "name": "Class Teacher",
      "assignedDate": "2024-01-01T10:00:00Z",
      "employeeId": "emp_456",
      "employeeName": "John Doe",
      "spaceId": "class_101",
      "status": "active"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "pages": 1
  }
}
```

### 7. List Employee Responsibilities
**GET** `/api/:schoolId/responsibility/employee/:employeeId`

**Query Parameters:**
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:**
```json
{
  "data": [
    {
      "responsibilityId": "resp_123",
      "name": "Class Teacher",
      "assignedDate": "2024-01-01T10:00:00Z",
      "studentCount": 25,
      "spaceId": "class_101",
      "status": "active",
      "monthlyEarnings": 5000.0
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 8,
    "pages": 1
  }
}
```

### 8. Assign Responsibility to Employee
**POST** `/api/:schoolId/responsibility/:responsibilityId/assign`

**Request Body:**
```json
{
  "employeeId": "emp_456",
  "spaceId": "class_101",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31"
}
```

**Response:** `201 Created`

### 9. Bulk Assign Responsibilities
**POST** `/api/:schoolId/responsibility/bulk-assign`

**Request Body:**
```json
{
  "assignments": [
    {
      "responsibilityId": "resp_123",
      "employeeId": "emp_456",
      "spaceId": "class_101"
    },
    {
      "responsibilityId": "resp_124",
      "employeeId": "emp_457",
      "spaceId": "class_102"
    }
  ]
}
```

**Response:**
```json
{
  "successful": 2,
  "failed": 0,
  "errors": []
}
```

### 10. Get Responsibility Analytics
**GET** `/api/:schoolId/responsibility/:responsibilityId/analytics`

**Response:**
```json
{
  "responsibilityId": "resp_123",
  "name": "Class Teacher",
  "totalAssignments": 5,
  "activeAssignments": 3,
  "totalRevenue": 25000.0,
  "averageUtilization": 85.5,
  "employeeDistribution": {
    "teacher": 3,
    "staff": 2
  },
  "spaceUtilization": {
    "class_101": 90.0,
    "class_102": 80.0
  }
}
```

### 11. Get Overview Analytics
**GET** `/api/:schoolId/responsibility/analytics/overview`

**Query Parameters:**
- `time_range`: "7d", "30d", "90d" (default: "30d")

**Response:**
```json
{
  "totalResponsibilities": 45,
  "activeAssignments": 120,
  "totalRevenue": 450000.0,
  "utilizationRate": 78.5,
  "topResponsibilities": [
    {
      "name": "Class Teacher",
      "count": 25,
      "revenue": 125000.0
    }
  ],
  "trends": {
    "assignments": [10, 12, 15, 18, 20],
    "revenue": [10000, 12000, 15000, 18000, 20000]
  }
}
```

### 12. Export Responsibilities CSV
**GET** `/api/:schoolId/responsibility/export/csv`

**Response:** CSV file download

### 13. Import Responsibilities CSV
**POST** `/api/:schoolId/responsibility/import/csv`

**Content-Type:** `multipart/form-data`

**Form Data:**
- `file`: CSV file

**Response:**
```json
{
  "imported": 15,
  "skipped": 2,
  "errors": []
}
```

### 14. Generate Utilization Report (PDF)
**GET** `/api/:schoolId/reports/utilization/:startDate/:endDate/pdf`

**Response:** PDF file download

### 15. Generate Workload Report (PDF)
**GET** `/api/:schoolId/reports/workload/:startDate/:endDate/pdf`

**Response:** PDF file download

### 16. Generate Space Distribution Report (PDF)
**GET** `/api/:schoolId/reports/space-distribution/:startDate/:endDate/pdf`

**Response:** PDF file download

### 17. Generate Revenue Report (PDF)
**GET** `/api/:schoolId/reports/revenue/:startDate/:endDate/pdf`

**Response:** PDF file download

### 18. Get Assignment History
**GET** `/api/:schoolId/responsibility/history`

**Query Parameters:**
- `responsibility_id` (optional): Filter by responsibility
- `employee_id` (optional): Filter by employee
- `limit` (optional): Number of records (default: 50)

**Response:**
```json
{
  "data": [
    {
      "id": "hist_123",
      "responsibilityId": "resp_123",
      "employeeId": "emp_456",
      "action": "ASSIGN",
      "timestamp": "2024-01-01T10:00:00Z",
      "details": {
        "spaceId": "class_101",
        "startDate": "2024-01-01"
      }
    }
  ]
}
```

### 19. Get Responsibility Versions
**GET** `/api/:schoolId/responsibility/:responsibilityId/versions`

**Response:**
```json
{
  "data": [
    {
      "version": 2,
      "timestamp": "2024-01-02T10:00:00Z",
      "changes": {
        "monthlyPrice": {
          "from": 5000.0,
          "to": 5500.0
        }
      },
      "modifiedBy": "admin_123"
    }
  ]
}
```

### 20. Rollback Responsibility
**POST** `/api/:schoolId/responsibility/:responsibilityId/rollback/:version`

**Response:** `200 OK`

## Error Codes

| Code | Description |
|------|-------------|
| RESP_NOT_FOUND | Responsibility not found |
| EMP_NOT_FOUND | Employee not found |
| SPACE_NOT_FOUND | Space not found |
| DUPLICATE_ASSIGNMENT | Employee already assigned to this responsibility |
| VALIDATION_ERROR | Invalid request data |
| PERMISSION_DENIED | Insufficient permissions |

## Rate Limiting
- 100 requests per minute per IP
- 1000 requests per hour per user

## Caching
- List endpoints: 30 seconds cache
- Detail endpoints: 5 minutes cache
- Analytics endpoints: 1 hour cache

## WebSocket Updates
Real-time updates available via WebSocket:
```
ws://localhost:3000/ws/responsibility/:schoolId
```

Events:
- `responsibility.created`
- `responsibility.updated`
- `responsibility.deleted`
- `assignment.created`
- `assignment.updated`

## Testing
Use the following test data for development:
- School ID: `test_school_123`
- Responsibility ID: `test_resp_456`
- Employee ID: `test_emp_789`
- Student ID: `test_student_123`

## Version History
- v1.0 (2024-01-01): Initial release
- v1.1 (2024-02-01): Added pagination support
- v1.2 (2024-03-01): Added analytics endpoints
- v1.3 (2024-04-01): Added PDF report generation