# Responsibility Supplemental APIs - Expected Responses

This document outlines the expected responses for the supplemental Responsibility Management APIs, including metrics and reporting.

## 1. List Space Responsibilities
`GET /api/responsibility/:schoolId/spaces/:spaceId/responsibilities`

**Expected Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "responsibility_id": "resp_001",
      "title": "Room Maintenance",
      "assigned_to": "Employee Name",
      "status": "active"
    }
  ]
}
```

## 2. metrics & Analytics
`GET /api/responsibility/:schoolId/metrics/space-distribution`

**Expected Success Response (200 OK):**
```json
{
  "success": true,
  "metrics": {
    "total_spaces": 25,
    "assigned_spaces": 20,
    "unassigned_spaces": 5,
    "distribution": {
      "academic": 15,
      "administrative": 5,
      "infrastructure": 5
    }
  }
}
```

## 3. Bulk Operations
`DELETE /api/responsibility/:schoolId/responsibilities/:responsibilityId/bulk-remove`

**Expected Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Employees successfully removed from responsibility",
  "removed_count": 2
}
```

## 4. versioning & Rollback
`GET /api/responsibility/:schoolId/responsibilities/:responsibilityId/versions`

**Expected Success Response (200 OK):**
```json
{
  "success": true,
  "versions": [
    {
      "version_id": 2,
      "created_at": "2024-04-18T10:00:00Z",
      "updated_by": "admin_01"
    },
    {
      "version_id": 1,
      "created_at": "2024-01-01T09:00:00Z",
      "updated_by": "system"
    }
  ]
}
```

## 5. Reports
`GET /api/responsibility/:schoolId/reports/utilization/:startDate/:endDate/pdf`

**Expected Response (200 OK):**
- **Content-Type:** `application/pdf`
- **Body:** Binary PDF data stream.
