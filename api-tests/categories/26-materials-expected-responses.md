# Academic Materials APIs - Expected Responses

This document outlines the expected responses for Academic Materials API endpoints.

## Authentication Requirements
- **RLS Authentication Required:** Yes
- **Required Headers:**
  - `X-School-ID`: School identifier
  - `X-Admin-ID`: Admin user identifier
- **Access Level:** School admin or inventory managers

## 1. GET /api/materials/:schoolId - List All Materials

**Query Parameters:**
- `search` (optional): Search term for material name or description
- `filter` (optional): Filter by category (e.g., "Books", "Lab Equipment")
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Items per page (default: 20)

**Expected Successful Response:**
- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Response Body Structure:**
```json
{
  "success": true,
  "data": [
    {
      "materialName": "Mathematics Textbook",
      "category": "Books",
      "quantity": 50,
      "unitPrice": 250.00,
      "description": "Class 10 Mathematics textbook for CBSE curriculum",
      "supplier": "NCERT Publications",
      "minimumStockLevel": 10,
      "reorderPoint": 15,
      "storageLocation": "Library Shelf A3",
      "isConsumable": false,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "metadata": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  },
  "dashboard": {
    "totalMaterials": 15,
    "lowStockCount": 3,
    "totalValue": 12500.00,
    "categories": {
      "Books": 8,
      "Lab Equipment": 4,
      "Stationery": 3
    }
  }
}
```

**Validation Criteria:**
- Should return 200 OK status
- Should include paginated list of materials
- Should include dashboard statistics
- Should handle search and filter parameters
- Should generate signed URLs for attachments if present

**Error Responses:**
- **401 Unauthorized:** Missing or invalid RLS headers
- **400 Bad Request:** Invalid query parameters

## 2. GET /api/materials/:schoolId/:materialName - Get Material Details

**Expected Successful Response:**
- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Response Body Structure:**
```json
{
  "success": true,
  "data": {
    "materialName": "Mathematics Textbook",
    "category": "Books",
    "quantity": 50,
    "unitPrice": 250.00,
    "description": "Class 10 Mathematics textbook for CBSE curriculum",
    "supplier": "NCERT Publications",
    "minimumStockLevel": 10,
    "reorderPoint": 15,
    "storageLocation": "Library Shelf A3",
    "isConsumable": false,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z",
    "history": [
      {
        "action": "CREATED",
        "quantityChange": 50,
        "performedBy": "admin_001",
        "timestamp": "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

**Validation Criteria:**
- Should return 200 OK status
- Should include complete material details
- Should include transaction history if available
- Should generate signed URL for attachment if present

**Error Responses:**
- **404 Not Found:** Material not found
- **401 Unauthorized:** Missing or invalid RLS headers

## 3. POST /api/materials/:schoolId - Create New Material

**Request Body Structure:**
```json
{
  "materialName": "Mathematics Textbook",
  "category": "Books",
  "quantity": 50,
  "unitPrice": 250.00,
  "description": "Class 10 Mathematics textbook for CBSE curriculum",
  "supplier": "NCERT Publications",
  "minimumStockLevel": 10,
  "reorderPoint": 15,
  "storageLocation": "Library Shelf A3",
  "isConsumable": false
}
```

**Expected Successful Response:**
- **Status Code:** 201 Created
- **Content-Type:** application/json
- **Response Body Structure:**
```json
{
  "success": true,
  "data": {
    "materialName": "Mathematics Textbook",
    "category": "Books",
    "quantity": 50,
    "unitPrice": 250.00,
    "description": "Class 10 Mathematics textbook for CBSE curriculum",
    "supplier": "NCERT Publications",
    "minimumStockLevel": 10,
    "reorderPoint": 15,
    "storageLocation": "Library Shelf A3",
    "isConsumable": false,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

**Validation Criteria:**
- Should return 201 Created status
- Should include created material object
- Should validate required fields
- Should set default values for optional fields

**Error Responses:**
- **400 Bad Request:** Missing required fields, invalid data format
- **409 Conflict:** Material with same name already exists
- **401 Unauthorized:** Missing or invalid RLS headers

## 4. PUT /api/materials/:schoolId/:materialName - Update Material

**Request Body Structure:**
```json
{
  "quantity": 45,
  "unitPrice": 260.00,
  "description": "Updated Class 10 Mathematics textbook with latest syllabus",
  "minimumStockLevel": 12
}
```

**Expected Successful Response:**
- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Response Body Structure:**
```json
{
  "success": true,
  "message": "Material updated successfully"
}
```

**Validation Criteria:**
- Should return 200 OK status
- Should update only provided fields
- Should maintain audit trail of changes
- Should validate quantity cannot be negative

**Error Responses:**
- **404 Not Found:** Material not found
- **400 Bad Request:** Invalid data format
- **401 Unauthorized:** Missing or invalid RLS headers

## 5. DELETE /api/materials/:schoolId/:materialName - Delete Material

**Expected Successful Response:**
- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Response Body Structure:**
```json
{
  "success": true,
  "message": "Material deleted successfully"
}
```

**Validation Criteria:**
- Should return 200 OK status
- Should remove material from inventory
- Should maintain audit trail of deletion

**Error Responses:**
- **404 Not Found:** Material not found
- **401 Unauthorized:** Missing or invalid RLS headers
- **403 Forbidden:** Material cannot be deleted (e.g., has associated transactions)

## 6. POST /api/materials/:schoolId/bulk - Bulk Import Materials

**Request Body Structure:**
```json
{
  "materials": [
    {
      "materialName": "Science Lab Kit",
      "category": "Lab Equipment",
      "quantity": 20,
      "unitPrice": 1200.00
    },
    {
      "materialName": "Art Supplies Pack",
      "category": "Stationery",
      "quantity": 100,
      "unitPrice": 150.00
    }
  ]
}
```

**Expected Successful Response:**
- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Response Body Structure:**
```json
{
  "success": true,
  "message": "2 materials imported, 0 failed",
  "results": [
    {
      "row": 1,
      "status": "success"
    },
    {
      "row": 2,
      "status": "success"
    }
  ],
  "successCount": 2,
  "failCount": 0
}
```

**Validation Criteria:**
- Should return 200 OK status
- Should process materials in bulk
- Should report success/failure for each row
- Should skip duplicates or report conflicts

**Error Responses:**
- **400 Bad Request:** Invalid JSON format, missing materials array
- **401 Unauthorized:** Missing or invalid RLS headers

## Testing Notes

1. **Inventory Management:** Materials track quantity, pricing, and stock levels
2. **Stock Alerts:** System should flag materials below minimum stock level
3. **Audit Trail:** All material changes should be logged
4. **Attachment Support:** Materials can have associated files (manuals, images)
5. **Category Management:** Materials organized by categories for reporting
6. **Consumable vs Non-Consumable:** Different tracking for consumable items

## Success Criteria

1. ✅ All 6 endpoints return expected HTTP status codes
2. ✅ Response structures match documented schemas
3. ✅ Material creation returns valid material data
4. ✅ Bulk import processes multiple materials correctly
5. ✅ RLS headers are properly validated
6. ✅ Error handling works for invalid inputs
7. ✅ Pagination works for material listing
8. ✅ Dashboard statistics are accurate