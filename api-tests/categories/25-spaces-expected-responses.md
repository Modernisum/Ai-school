# Space & Material Management APIs - Expected Responses

This document outlines the expected responses for space and material management API endpoints.

## 1. GET /api/spaces/:schoolId/spaces - List Spaces

**Expected Response:**
- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Headers Required:** `X-School-ID`, `X-Admin-ID`
- **Query Parameters:**
  - `category` (optional): Filter by space category (e.g., "Classroom", "Laboratory", "Office")
  - `simple` (optional): If "true", returns only space names
- **Response Body Structure (Full Details):**
```json
{
  "success": true,
  "data": [
    {
      "space_id": "space_001",
      "name": "Classroom 101",
      "category": "Classroom",
      "capacity": 40,
      "area_sqft": 500,
      "floor": 1,
      "building": "Main Building",
      "status": "active",
      "assigned_to": "EMP001",
      "assigned_to_name": "John Doe",
      "materials_count": 12,
      "last_maintenance": "2024-01-15",
      "next_maintenance": "2024-07-15",
      "created_at": "2024-01-01T10:00:00Z",
      "updated_at": "2024-01-15T14:30:00Z"
    },
    {
      "space_id": "space_002",
      "name": "Science Lab",
      "category": "Laboratory",
      "capacity": 30,
      "area_sqft": 800,
      "floor": 2,
      "building": "Science Block",
      "status": "active",
      "assigned_to": "EMP002",
      "assigned_to_name": "Jane Smith",
      "materials_count": 25,
      "last_maintenance": "2024-02-01",
      "next_maintenance": "2024-08-01",
      "created_at": "2024-01-01T11:00:00Z",
      "updated_at": "2024-02-01T09:15:00Z"
    }
  ]
}
```

**Response Body Structure (Simple Mode):**
```json
{
  "success": true,
  "data": [
    {"name": "Classroom 101"},
    {"name": "Science Lab"},
    {"name": "Principal Office"}
  ]
}
```

**Validation Criteria:**
- Should return spaces filtered by category if provided
- Simple mode should return minimal data
- Should respect RLS (only spaces for the school)
- Should include pagination if many spaces

## 2. GET /api/spaces/:schoolId/categories - List Space Categories

**Expected Response:**
- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Headers Required:** `X-School-ID`, `X-Admin-ID`
- **Response Body Structure:**
```json
{
  "success": true,
  "categories": [
    {
      "category": "Classroom",
      "count": 25,
      "total_capacity": 1000,
      "average_area": 450
    },
    {
      "category": "Laboratory",
      "count": 5,
      "total_capacity": 150,
      "average_area": 750
    },
    {
      "category": "Office",
      "count": 10,
      "total_capacity": 50,
      "average_area": 300
    },
    {
      "category": "Library",
      "count": 1,
      "total_capacity": 100,
      "average_area": 1200
    },
    {
      "category": "Sports",
      "count": 3,
      "total_capacity": 200,
      "average_area": 1500
    }
  ]
}
```

**Validation Criteria:**
- Should return all space categories used in the school
- Should include statistics for each category
- Categories should be sorted by count descending

## 3. POST /api/spaces/:schoolId/spaces/:category - Create Space by Category

**Expected Response:**
- **Status Code:** 201 Created on success, 400 Bad Request for invalid data
- **Content-Type:** application/json
- **Headers Required:** `X-School-ID`, `X-Admin-ID`
- **Request Body:**
```json
{
  "space_name": "Classroom 102",
  "capacity": 45,
  "area_sqft": 550,
  "floor": 1,
  "building": "Main Building",
  "description": "New classroom for Grade 5"
}
```
- **Response Body Structure (Success):**
```json
{
  "success": true,
  "space": {
    "space_id": "space_003",
    "name": "Classroom 102",
    "category": "Classroom",
    "capacity": 45,
    "area_sqft": 550,
    "floor": 1,
    "building": "Main Building",
    "status": "active",
    "created_by": "admin001",
    "created_at": "2024-01-02T10:00:00Z",
    "qr_code_url": "/qr/space_003.png"
  },
  "message": "Space created successfully"
}
```

**Validation Criteria:**
- Should validate space name uniqueness within school
- Should validate capacity and area are positive numbers
- Should generate QR code for space identification
- Should set default status as "active"

## 4. GET /api/spaces/:schoolId/:spaceName - Get Space Details

**Expected Response:**
- **Status Code:** 200 OK if found, 404 Not Found if space doesn't exist
- **Content-Type:** application/json
- **Headers Required:** `X-School-ID`, `X-Admin-ID`
- **Response Body Structure (Success):**
```json
{
  "success": true,
  "space": {
    "space_id": "space_001",
    "name": "Classroom 101",
    "category": "Classroom",
    "capacity": 40,
    "area_sqft": 500,
    "floor": 1,
    "building": "Main Building",
    "status": "active",
    "description": "Primary classroom for Mathematics",
    "assigned_to": "EMP001",
    "assigned_to_name": "John Doe",
    "materials": [
      {
        "material_id": "mat_001",
        "name": "Whiteboard",
        "quantity": 2,
        "condition": "good",
        "last_checked": "2024-01-15"
      },
      {
        "material_id": "mat_002",
        "name": "Projector",
        "quantity": 1,
        "condition": "excellent",
        "last_checked": "2024-01-10"
      }
    ],
    "maintenance_history": [
      {
        "date": "2024-01-15",
        "type": "routine",
        "description": "Electrical checkup",
        "performed_by": "EMP005"
      }
    ],
    "utilization_stats": {
      "weekly_hours_used": 35,
      "utilization_rate": 87.5,
      "peak_hours": "10:00-12:00"
    },
    "created_at": "2024-01-01T10:00:00Z",
    "updated_at": "2024-01-15T14:30:00Z"
  }
}
```

**Validation Criteria:**
- Should return complete space details including materials and history
- Should include utilization statistics if available
- Should return 404 with appropriate message if space not found

## 5. PUT /api/spaces/:schoolId/:spaceName - Update Space

**Expected Response:**
- **Status Code:** 200 OK on success, 400 Bad Request for invalid data
- **Content-Type:** application/json
- **Headers Required:** `X-School-ID`, `X-Admin-ID`
- **Request Body:**
```json
{
  "capacity": 45,
  "area_sqft": 520,
  "floor": 2,
  "status": "under_maintenance",
  "description": "Updated after renovation"
}
```
- **Response Body Structure (Success):**
```json
{
  "success": true,
  "message": "Space updated successfully",
  "updated_fields": ["capacity", "area_sqft", "floor", "status", "description"],
  "space": {
    "space_id": "space_001",
    "name": "Classroom 101",
    "capacity": 45,
    "area_sqft": 520,
    "floor": 2,
    "status": "under_maintenance",
    "updated_at": "2024-01-02T14:30:00Z"
  }
}
```

**Validation Criteria:**
- Should validate updatable fields (cannot change space_id, name, category)
- Should track update history
- Should return list of updated fields
- Should validate status transitions

## 6. DELETE /api/spaces/:schoolId/:spaceName - Delete Space

**Expected Response:**
- **Status Code:** 200 OK on success, 400 Bad Request if space has dependencies
- **Content-Type:** application/json
- **Headers Required:** `X-School-ID`, `X-Admin-ID`
- **Response Body Structure (Success):**
```json
{
  "success": true,
  "message": "Space deleted successfully",
  "deleted_space": {
    "name": "Classroom 101",
    "category": "Classroom",
    "materials_reassigned": 12,
    "responsibilities_transferred": 3
  }
}
```

**Validation Criteria:**
- Should check for dependencies (materials, responsibilities, schedules)
- Should optionally reassign materials to other spaces
- Should return statistics about what was affected
- Should perform soft delete if configured

## 7. POST /api/spaces/:schoolId/:spaceName/materials - Assign Space Materials

**Expected Response:**
- **Status Code:** 200 OK on success, 400 Bad Request for invalid materials
- **Content-Type:** application/json
- **Headers Required:** `X-School-ID`, `X-Admin-ID`
- **Request Body:**
```json
[
  {
    "material_id": "mat_003",
    "quantity": 5
  },
  {
    "material_id": "mat_004",
    "quantity": 2
  }
]
```
- **Response Body Structure (Success):**
```json
{
  "success": true,
  "message": "Materials assigned successfully",
  "assigned_materials": [
    {
      "material_id": "mat_003",
      "name": "Chairs",
      "quantity": 5,
      "previous_space": null,
      "status": "assigned"
    },
    {
      "material_id": "mat_004",
      "name": "Tables",
      "quantity": 2,
      "previous_space": "Storage Room",
      "status": "transferred"
    }
  ],
  "space_capacity_check": {
    "current_materials_count": 19,
    "space_capacity_limit": 50,
    "within_limits": true
  }
}
```

**Validation Criteria:**
- Should validate material existence and availability
- Should check space capacity limits
- Should handle material transfers from other spaces
- Should update material location history

## Common Error Responses

**404 Not Found (Space Not Found):**
```json
{
  "success": false,
  "message": "Space not found"
}
```

**400 Bad Request (Validation Error):**
```json
{
  "success": false,
  "message": "Validation error: Capacity must be positive integer",
  "errors": {
    "capacity": ["must be positive integer"]
  }
}
```

**409 Conflict (Duplicate Space Name):**
```json
{
  "success": false,
  "message": "Space with this name already exists in this school"
}
```

**400 Bad Request (Space Has Dependencies):**
```json
{
  "success": false,
  "message": "Cannot delete space: 5 materials and 3 responsibilities are assigned to this space",
  "dependencies": {
    "materials_count": 5,
    "responsibilities_count": 3,
    "scheduled_events": 2
  }
}
```

**400 Bad Request (Capacity Exceeded):**
```json
{
  "success": false,
  "message": "Space capacity exceeded: Current 48/50, attempting to add 5 more materials",
  "current_count": 48,
  "capacity_limit": 50,
  "attempting_to_add": 5
}
```

## Space Status Lifecycle

1. **active** - Space is available for use
2. **under_maintenance** - Space is being repaired/renovated
3. **reserved** - Space is booked for specific period
4. **inactive** - Space is not in use (seasonal)
5. **decommissioned** - Space is permanently out of service

## Material Assignment Rules

1. Materials can be assigned to only one space at a time
2. Material quantity cannot exceed space capacity
3. Critical materials require supervisor approval for transfer
4. Material condition tracking is mandatory for high-value items