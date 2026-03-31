# Automated Systems API Documentation

This document describes the newly implemented automated inventory management and role generation systems.

## 1. Automated Inventory Management

### Create Space with Automatic Allocation
**Endpoint:** `POST /api/spaces/:school_id/spaces`
**Handler:** `create_space`

When a new space is created, the system automatically:
1. Generates a systematic name: `{category} {number}` (e.g., "classroom 1").
2. Allocates default materials based on the category (classroom, laboratory, library, etc.).
3. Stores per-piece prices, total costs, and maintains material metadata.
4. Validates that the combination of `category + number` is unique for the school.

**Request Payload:**
```json
{
  "categoryId": 1, 
  "spaceName": "Nursery Room", 
  "spaceNumber": "101",
  "capacity": 30
}
```
*Note: `spaceNumber` is optional. If not provided, it auto-increments based on existing spaces in that category.*

**Response:**
```json
{
  "spaceId": "SP123456",
  "spaceName": "Nursery Room",
  "name": "classroom 101",
  "spaceCategory": "classroom",
  "allocatedMaterials": [
    {
      "materialName": "Ceiling Fan",
      "quantity": 4,
      "unitPrice": 2500,
      "description": "High-speed ceiling fan"
    },
    ...
  ]
}
```

### Materials Dashboard
**Endpoint:** `GET /api/materials/:school_id/dashboard`
**Description:** Provides a comprehensive view of inventory across all spaces.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "materialId": "ceiling_fan",
      "materialName": "Ceiling Fan",
      "description": "High-speed ceiling fan",
      "totalQuantity": 40,
      "unitPrice": 2500,
      "totalInventoryValue": 100000,
      "createdAt": "2026-03-29T10:00:00Z",
      "spaceDistribution": [
        {
          "spaceId": "SP123456",
          "spaceName": "Nursery Room",
          "allocatedQuantity": 4,
          "installationDate": "2026-03-29T10:00:00Z",
          "status": "Installed"
        }
      ]
    }
  ]
}
```

## 2. Automated Role Generation

### Sync Roles with Subjects
**Endpoint:** `POST /api/responsibility/:school_id/sync`
**Description:** Scans all subjects and creates corresponding teaching roles.

**Logic:**
1. Scans all subjects in all classes.
2. Creates roles with format: `{Subject} Teacher - {Class}` (e.g., "Mathematics Teacher - Class 10").
3. Initializes `required_employee` count to 0.
4. Maintains audit trail of the sync operation.

**Response:**
```json
{
  "success": true,
  "message": "Roles synced with subjects successfully"
}
```

## 4. Performance Benchmarks

Based on architectural analysis and database optimizations:

| Operation | Estimated Latency | Notes |
|---|---|---|
| Space Creation | 150ms - 300ms | Includes DB transaction, uniqueness validation, and ~10-15 material insertions. |
| Materials Dashboard | 200ms - 400ms | Aggregates data from `materials` and `space_materials` (optimized with indexes). |
| Role Sync (50 subjects) | 500ms - 1s | Batch scan and conditional creation in a single transaction. |

**Optimizations:**
- Composite Index on `(school_id, space_category, space_number)` for fast uniqueness check.
- Transaction-level batching for material allocation.
- Audit logs are non-blocking where possible.
