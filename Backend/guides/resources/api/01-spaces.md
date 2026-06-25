# Spaces API

Base path: `/school/:schoolId/resources/spaces`

---

## 1. List Space Categories

```
GET /school/:schoolId/resources/spaces/categories
```

**Auth:** Not required

**Expected Response (200):**
```json
{
  "success": true,
  "categories": ["Classroom", "Lab", "Office", "Library"]
}
```

**Test Case:**
```yaml
name: "List space categories"
request:
  method: GET
  url: "/school/school-123/resources/spaces/categories"
expect:
  status: 200
  body:
    success: true
    categories: array
```

---

## 2. Create Space Category

```
POST /school/:schoolId/resources/spaces/categories
```

**Auth:** Required (`TenantContext`)

**Request Body:**
```json
{
  "name": "Gymnasium",
  "isDefault": false
}
```

| Field | Type | Required | Default |
|-------|------|----------|---------|
| `name` | string | Yes | - |
| `isDefault` | bool | No | `false` |

**Expected Response (200):**
```json
{
  "success": true,
  "category": {
    "name": "Gymnasium",
    "isDefault": false
  }
}
```

**Test Case:**
```yaml
name: "Create space category"
request:
  method: POST
  url: "/school/school-123/resources/spaces/categories"
  body:
    name: "Gymnasium"
    isDefault: false
expect:
  status: 200
  body:
    success: true
    category.name: "Gymnasium"
```

---

## 3. Delete Space Category

```
DELETE /school/:schoolId/resources/spaces/categories/:categoryName
```

**Auth:** Required (`TenantContext`)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `schoolId` | string | School identifier |
| `categoryName` | string | Category to delete |

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Category deleted successfully"
}
```

**Test Case:**
```yaml
name: "Delete space category"
request:
  method: DELETE
  url: "/school/school-123/resources/spaces/categories/Gymnasium"
expect:
  status: 200
  body:
    success: true
    message: "Category deleted successfully"
```

---

## 4. List Spaces

```
GET /school/:schoolId/resources/spaces
```

**Auth:** Not required

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `category` | string | No | Filter by category name |
| `simple` | string | No | `"true"` returns only `name` field |

**Expected Response (200) - Full:**
```json
{
  "success": true,
  "data": [
    {
      "name": "Classroom-A",
      "category": "Classroom",
      "description": "Primary classroom",
      "budget": 50000.0,
      "createdAt": "2026-01-01T00:00:00Z"
    }
  ]
}
```

**Expected Response - Simple (`?simple=true`):**
```json
{
  "success": true,
  "data": [
    { "name": "Classroom-A" },
    { "name": "Lab-1" }
  ]
}
```

**Test Cases:**
```yaml
name: "List all spaces"
request:
  method: GET
  url: "/school/school-123/resources/spaces"
expect:
  status: 200
  body:
    success: true
    data: array

name: "List spaces filtered by category"
request:
  method: GET
  url: "/school/school-123/resources/spaces?category=Classroom"
expect:
  status: 200
  body:
    success: true

name: "List spaces simple"
request:
  method: GET
  url: "/school/school-123/resources/spaces?simple=true"
expect:
  status: 200
  body:
    success: true
    data: array
    data[0].name: string
```

---

## 5. Create Space by Category

```
POST /school/:schoolId/resources/spaces/:category
```

**Auth:** Required (`TenantContext`)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `schoolId` | string | School identifier |
| `category` | string | Category name (must pre-exist) |

**Request Body:**
```json
{
  "spaceName": "Lab-Physics",
  "description": "Physics laboratory"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `spaceName` | string | Yes | Unique space name |
| `description` | string | No | Optional description |

**Validation Rule:** The `category` must exist in the school's space categories. A `400` error is returned if the category does not exist.

**Expected Response (200):**
```json
{
  "success": true,
  "space": {
    "name": "Lab-Physics",
    "category": "Lab",
    "description": "Physics laboratory"
  }
}
```

**Error Response (400 - Category not found):**
```json
{
  "success": false,
  "message": "Space category 'Lab' does not exist"
}
```

**Test Cases:**
```yaml
name: "Create space with valid category"
prerequisites:
  - Create category "Lab" if not exists
request:
  method: POST
  url: "/school/school-123/resources/spaces/Lab"
  body:
    spaceName: "Lab-Physics"
    description: "Physics laboratory"
expect:
  status: 200
  body:
    success: true
    space.name: "Lab-Physics"

name: "Create space with invalid category"
request:
  method: POST
  url: "/school/school-123/resources/spaces/NonExistent"
  body:
    spaceName: "Test"
expect:
  status: 400
  body:
    success: false
    message: "Space category 'NonExistent' does not exist"
```

---

## 6. Get Space Details

```
GET /school/:schoolId/resources/spaces/detail/:spaceName
```

**Auth:** Not required

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `schoolId` | string | School identifier |
| `spaceName` | string | Name of the space |

**Expected Response (200):**
```json
{
  "success": true,
  "space": {
    "name": "Lab-Physics",
    "category": "Lab",
    "description": "Physics laboratory",
    "budget": 50000.0,
    "createdAt": "2026-01-01T00:00:00Z"
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "message": "Space not found"
}
```

**Test Cases:**
```yaml
name: "Get existing space details"
request:
  method: GET
  url: "/school/school-123/resources/spaces/detail/Lab-Physics"
expect:
  status: 200
  body:
    success: true
    space.name: "Lab-Physics"

name: "Get non-existent space"
request:
  method: GET
  url: "/school/school-123/resources/spaces/detail/NonExistent"
expect:
  status: 404
  body:
    success: false
    message: "Space not found"
```

---

## 7. Update Space

```
PUT /school/:schoolId/resources/spaces/detail/:spaceName
```

**Auth:** Required (`TenantContext`)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `schoolId` | string | School identifier |
| `spaceName` | string | Name of the space to update |

**Request Body (any JSON fields to update):**
```json
{
  "description": "Updated description",
  "budget": 75000.0
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Space updated successfully"
}
```

**Test Case:**
```yaml
name: "Update space"
request:
  method: PUT
  url: "/school/school-123/resources/spaces/detail/Lab-Physics"
  body:
    description: "Updated physics lab"
expect:
  status: 200
  body:
    success: true
    message: "Space updated successfully"
```

---

## 8. Delete Space

```
DELETE /school/:schoolId/resources/spaces/detail/:spaceName
```

**Auth:** Required (`TenantContext`)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `schoolId` | string | School identifier |
| `spaceName` | string | Name of the space to delete |

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Space deleted successfully"
}
```

**Test Case:**
```yaml
name: "Delete space"
request:
  method: DELETE
  url: "/school/school-123/resources/spaces/detail/Lab-Physics"
expect:
  status: 200
  body:
    success: true
    message: "Space deleted successfully"
```

---

## 9. Get Space Budget

```
GET /school/:schoolId/resources/spaces/detail/:spaceName/budget
```

**Auth:** Not required

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `schoolId` | string | School identifier |
| `spaceName` | string | Space name |

**Expected Response (200):**
```json
{
  "success": true,
  "budget": 50000.0,
  "spaceName": "Lab-Physics"
}
```

**Error Response (200 - Space not found):**
```json
{
  "success": false,
  "message": "Space not found"
}
```

**Test Case:**
```yaml
name: "Get space budget"
request:
  method: GET
  url: "/school/school-123/resources/spaces/detail/Lab-Physics/budget"
expect:
  status: 200
  body:
    success: true
    budget: number
    spaceName: "Lab-Physics"
```

---

## 10. Update Space Budget

```
PUT /school/:schoolId/resources/spaces/detail/:spaceName/budget
```

**Auth:** Required (`TenantContext`)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `schoolId` | string | School identifier |
| `spaceName` | string | Space name |

**Request Body:**
```json
{
  "budget": 75000.0
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `budget` | number | No | New budget value. If omitted, sets to `null`. |

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Budget updated successfully"
}
```

**Test Case:**
```yaml
name: "Update space budget"
request:
  method: PUT
  url: "/school/school-123/resources/spaces/detail/Lab-Physics/budget"
  body:
    budget: 75000.0
expect:
  status: 200
  body:
    success: true
    message: "Budget updated successfully"
```

---

## 11. Get Space Materials

```
GET /school/:schoolId/resources/spaces/:spaceName/materials
```

**Auth:** Not required

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `schoolId` | string | School identifier |
| `spaceName` | string | Space name |

**Expected Response (200):**
```json
{
  "success": true,
  "materials": [
    {
      "name": "Microscope",
      "quantity": 10,
      "unitPrice": 5000.0,
      "unit": "pcs",
      "requiredCount": 15
    }
  ],
  "summary": {
    "totalValue": 50000.0,
    "deficitValue": 25000.0,
    "deficitCount": 1,
    "totalCount": 1,
    "budget": 50000.0
  }
}
```

**Summary Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `totalValue` | number | Sum of all (quantity * unitPrice) |
| `deficitValue` | number | Sum of (requiredCount - quantity) * unitPrice for items where requiredCount > quantity |
| `deficitCount` | number | Count of items where requiredCount > quantity |
| `totalCount` | number | Total number of materials assigned |
| `budget` | number | Space budget (nullable) |

**Test Case:**
```yaml
name: "Get space materials with summary"
prerequisites:
  - Assign at least 1 material to the space
request:
  method: GET
  url: "/school/school-123/resources/spaces/Lab-Physics/materials"
expect:
  status: 200
  body:
    success: true
    materials: array
    summary.totalValue: number
    summary.deficitCount: number
    summary.totalCount: number
```

---

## 12. Assign Materials to Space

```
POST /school/:schoolId/resources/spaces/:spaceName/materials
```

**Auth:** Required (`TenantContext`)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `schoolId` | string | School identifier |
| `spaceName` | string | Space name |

**Request Body (array of material objects):**
```json
[
  {
    "materialName": "Microscope",
    "quantity": 5,
    "requiredCount": 10
  }
]
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Materials assigned successfully"
}
```

**Events Published:** `SpaceUpdated`, `MaterialUpdated`

**Test Case:**
```yaml
name: "Assign materials to space"
prerequisites:
  - Create material "Microscope" if not exists
request:
  method: POST
  url: "/school/school-123/resources/spaces/Lab-Physics/materials"
  body:
    - materialName: "Microscope"
      quantity: 5
      requiredCount: 10
expect:
  status: 200
  body:
    success: true
    message: "Materials assigned successfully"
```

---

## 13. Remove Material from Space

```
DELETE /school/:schoolId/resources/spaces/:spaceName/materials/:materialName
```

**Auth:** Required (`TenantContext`)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `schoolId` | string | School identifier |
| `spaceName` | string | Space name |
| `materialName` | string | Material to remove |

**Request Body:**
```json
{
  "quantity": 3
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `quantity` | integer | Yes | Amount to remove from space |

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Material removed from space"
}
```

**Events Published:** `SpaceUpdated`, `MaterialUpdated`

**Test Case:**
```yaml
name: "Remove material from space"
request:
  method: DELETE
  url: "/school/school-123/resources/spaces/Lab-Physics/materials/Microscope"
  body:
    quantity: 3
expect:
  status: 200
  body:
    success: true
    message: "Material removed from space"
```

---

## 14. Transfer Material Between Spaces

```
POST /school/:schoolId/resources/spaces/:spaceName/materials/:materialName/transfer
```

**Auth:** Required (`TenantContext`)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `schoolId` | string | School identifier |
| `spaceName` | string | Source space name |
| `materialName` | string | Material to transfer |

**Request Body:**
```json
{
  "toSpace": "Lab-Chemistry",
  "quantity": 5
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `toSpace` | string | Yes | Destination space name |
| `quantity` | integer | Yes | Amount to transfer |

**Expected Response (200):**
```json
{
  "success": true,
  "data": { ... }
}
```

**Events Published:** `SpaceUpdated` (source), `SpaceUpdated` (destination), `MaterialUpdated`

**Test Case:**
```yaml
name: "Transfer material between spaces"
prerequisites:
  - Both source and destination spaces exist
  - Source space has enough quantity
request:
  method: POST
  url: "/school/school-123/resources/spaces/Lab-Physics/materials/Microscope/transfer"
  body:
    toSpace: "Lab-Chemistry"
    quantity: 2
expect:
  status: 200
  body:
    success: true
```

---

## 15. Clone Space

```
POST /school/:schoolId/resources/spaces/:spaceName/clone
```

**Auth:** Required (`TenantContext`)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `schoolId` | string | School identifier |
| `spaceName` | string | Source space to clone |

**Request Body:**
```json
{
  "newSpaceName": "Lab-Physics-2"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `newSpaceName` | string | Yes | Name for the cloned space |

**Expected Response (200):**
```json
{
  "success": true,
  "space": {
    "name": "Lab-Physics-2",
    "category": "Lab",
    "description": "Physics laboratory"
  }
}
```

**Validation:** `newSpaceName` is required. Returns `400` if missing.

**Test Case:**
```yaml
name: "Clone space"
request:
  method: POST
  url: "/school/school-123/resources/spaces/Lab-Physics/clone"
  body:
    newSpaceName: "Lab-Physics-2"
expect:
  status: 200
  body:
    success: true
    space.name: "Lab-Physics-2"

name: "Clone space missing newSpaceName"
request:
  method: POST
  url: "/school/school-123/resources/spaces/Lab-Physics/clone"
  body: {}
expect:
  status: 400
  body:
    success: false
```

---

## 16. Get All Spaces Materials

```
GET /school/:schoolId/resources/spaces/materials/all
```

**Auth:** Not required

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `schoolId` | string | School identifier |

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "Lab-Physics": [ ... ],
    "Lab-Chemistry": [ ... ]
  }
}
```

**Test Case:**
```yaml
name: "Get all spaces materials"
request:
  method: GET
  url: "/school/school-123/resources/spaces/materials/all"
expect:
  status: 200
  body:
    success: true
```

---

## 17. Public - Get Spaces

```
GET /school/:schoolId/resources/public/spaces
```

**Auth:** API Key required (`api_key_auth` middleware)

**Required Scope:** `read:students`

**Expected Response (200):**
```json
{
  "success": true,
  "data": [
    { "name": "Classroom-A", "category": "Classroom" }
  ]
}
```

**Error Response (403 - Missing scope):**
```json
{
  "success": false,
  "message": "Missing required scope: read:students"
}
```

**Test Cases:**
```yaml
name: "Public spaces with valid API key and scope"
request:
  method: GET
  url: "/school/school-123/resources/public/spaces"
  headers:
    X-API-Key: "valid-api-key"
expect:
  status: 200
  body:
    success: true
    data: array

name: "Public spaces with missing API key"
request:
  method: GET
  url: "/school/school-123/resources/public/spaces"
expect:
  status: 401 or 403

name: "Public spaces with insufficient scope"
request:
  method: GET
  url: "/school/school-123/resources/public/spaces"
  headers:
    X-API-Key: "key-without-scope"
expect:
  status: 403
  body:
    success: false
    message: "Missing required scope: read:students"
```