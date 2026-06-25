# Responsibility Assignments API Contract

Covers `bulk_assign_responsibility`, `bulk_remove_responsibility`, `bulk_update_responsibility`, `list_employee_responsibilities`, `list_student_responsibilities`, `list_space_responsibilities`, `search_responsibilities`.

---

## `POST /api/school/:schoolId/operations/responsibility/:responsibilityId/bulk-assign`

- Handler: `rust/src/domain/operations/responsibility.rs::bulk_assign_responsibility`
- Purpose: Assign a responsibility to multiple employees at once. Optionally attach space IDs.
- Auth/Tenant: Requires authenticated tenant context. `admin_id` is used as assigner.
- Notifications: Sends email notifications to assigned employees via `ResponsibilityNotificationService`.
- WebSocket: Publishes a `BulkUpdate` event to Redis.

### Request

Path params:

- `schoolId`: school/tenant identifier.
- `responsibilityId`: responsibility to assign.

Body:

```json
{
  "employeeIds": ["EMP-001", "EMP-002"],
  "spaceIds": ["CLS_10A", "LAB_PHYSICS"]
}
```

### Expected success response

`200 OK`

```json
{
  "success": true,
  "message": "Bulk assignment completed for 2 employees",
  "warnings": []
}
```

### Expected error response (missing employeeIds)

`400 BAD_REQUEST`

```json
{
  "success": false,
  "message": "employeeIds array is required"
}
```

### Expected error response (server error)

`500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "<error message>"
}
```

### Important rules

- `employeeIds` is required and must be a non-empty array.
- `spaceIds` is optional.
- Each employee gets the same set of `spaceIds`.
- Internally calls `bulk_update_responsibility` service method.
- `warnings` array contains any soft failures (e.g., employee already assigned).
- Emails are sent to each assigned employee with responsibility name.

### Test cases

#### Bulk assign to multiple employees

- Type: positive
- Request: `POST /api/school/SCH-001/operations/responsibility/RES-001/bulk-assign`
- Body: `{ "employeeIds": ["EMP-001", "EMP-002"] }`
- Expected HTTP status: `200`
- Expected response: `success: true`, `message` mentions employee count.
- Database/state assertion: `responsibility_assignments` rows created for both employees.
- Side effect: WebSocket event published, email notifications queued.

#### Bulk assign with spaces

- Type: positive
- Request body: `{ "employeeIds": ["EMP-001"], "spaceIds": ["CLS_10A", "LAB_PHYSICS"] }`
- Expected HTTP status: `200`
- Database/state assertion: Assignments include space references.

#### Missing employeeIds

- Type: negative
- Request body: `{ "spaceIds": ["CLS_10A"] }`
- Expected HTTP status: `400`
- Expected response: `{ success: false, message: "employeeIds array is required" }`

#### Empty employeeIds

- Type: boundary
- Request body: `{ "employeeIds": [] }`
- Expected HTTP status: `400`
- Expected response: `{ success: false, message: "employeeIds array is required" }`

---

## `DELETE /api/school/:schoolId/operations/responsibility/:responsibilityId/bulk-remove`

- Handler: `rust/src/domain/operations/responsibility.rs::bulk_remove_responsibility`
- Purpose: Remove a responsibility from multiple employees.
- Auth/Tenant: Requires authenticated tenant context. `admin_id` is used as remover.
- Notifications: Sends email notifications to affected employees.
- WebSocket: Publishes a `BulkUpdate` event with type `bulk_remove`.

### Request

Path params:

- `schoolId`: school/tenant identifier.
- `responsibilityId`: responsibility to remove.

Body:

```json
{
  "employeeIds": ["EMP-001", "EMP-002"]
}
```

### Expected success response

`200 OK`

```json
{
  "success": true,
  "message": "Bulk removal completed for 2 employees"
}
```

### Expected error response (missing employeeIds)

`400 BAD_REQUEST`

```json
{
  "success": false,
  "message": "employeeIds array is required"
}
```

### Important rules

- Individual failures are silently skipped — `success_count` only counts successful removals.
- Emails are sent regardless of success count.
- `employeeIds` is required and must be non-empty.

### Test cases

#### Bulk remove from employees

- Type: positive
- Preconditions: `RES-001` is assigned to `EMP-001` and `EMP-002`.
- Request: `DELETE /api/school/SCH-001/operations/responsibility/RES-001/bulk-remove`
- Body: `{ "employeeIds": ["EMP-001", "EMP-002"] }`
- Expected HTTP status: `200`
- Expected response: `success: true`, `message` mentions 2 employees.
- Database/state assertion: Assignments removed from `responsibility_assignments`.
- Side effect: WebSocket event published, email notifications queued.

#### Partial removal (some not assigned)

- Type: boundary
- Preconditions: `RES-001` is assigned only to `EMP-001`.
- Request body: `{ "employeeIds": ["EMP-001", "EMP-002"] }`
- Expected HTTP status: `200`
- Expected response: `message` mentions 1 employee successfully removed.
- Database/state assertion: Only `EMP-001` assignment removed.

---

## `PUT /api/school/:schoolId/operations/responsibility/:responsibilityId/bulk-update`

- Handler: `rust/src/domain/operations/responsibility.rs::bulk_update_responsibility`
- Purpose: Update responsibility assignments for multiple employees with per-employee space IDs.
- Auth/Tenant: Requires authenticated tenant context.

### Request

Path params:

- `schoolId`: school/tenant identifier.
- `responsibilityId`: responsibility to update.

Body:

```json
{
  "updates": [
    {
      "employeeId": "EMP-001",
      "spaceIds": ["CLS_10A", "LAB_PHYSICS"]
    },
    {
      "employeeId": "EMP-002",
      "spaceIds": ["CLS_10B"]
    }
  ]
}
```

### Expected success response

`200 OK`

```json
{
  "success": true,
  "message": "Bulk update completed for 2 employees",
  "warnings": []
}
```

### Expected error response (missing updates)

`400 BAD_REQUEST`

```json
{
  "success": false,
  "message": "updates array is required"
}
```

### Expected error response (server error)

`500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "<error message>"
}
```

### Important rules

- `updates` is required and must be a non-empty array.
- Each update entry must have `employeeId` and `spaceIds`.
- Unlike `bulk-assign`, each employee can have different space IDs.

### Test cases

#### Bulk update with different spaces

- Type: positive
- Request: `PUT /api/school/SCH-001/operations/responsibility/RES-001/bulk-update`
- Body: `{ "updates": [{ "employeeId": "EMP-001", "spaceIds": ["CLS_10A"] }, { "employeeId": "EMP-002", "spaceIds": ["CLS_10B"] }] }`
- Expected HTTP status: `200`
- Expected response: `success: true`, `message` mentions 2 employees.
- Database/state assertion: Each employee's space assignments updated accordingly.

#### Missing updates array

- Type: negative
- Request body: `{}`
- Expected HTTP status: `400`
- Expected response: `{ success: false, message: "updates array is required" }`

---

## `GET /api/school/:schoolId/operations/responsibility/employees/:employeeId/responsibilities`

- Handler: `rust/src/domain/operations/responsibility.rs::list_employee_responsibilities`
- Purpose: List all responsibilities assigned to a specific employee.
- Auth/Tenant: Scoped to `schoolId` and `employeeId`.

### Request

Path params:

- `schoolId`: school/tenant identifier.
- `employeeId`: employee identifier.

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": [
    {
      "responsibilityId": "RES-001",
      "name": "Class 10-A Teacher",
      "employeeType": "teacher",
      "weeklyPeriods": 30,
      "spaceIds": ["CLS_10A"]
    }
  ]
}
```

### Expected error response

`500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "<error message>"
}
```

### Test cases

#### List employee responsibilities

- Type: positive
- Preconditions: `EMP-001` has `RES-001` and `RES-002` assigned.
- Request: `GET /api/school/SCH-001/operations/responsibility/employees/EMP-001/responsibilities`
- Expected HTTP status: `200`
- Expected response: `data` array contains 2 responsibilities.

#### Employee with no responsibilities

- Type: positive
- Preconditions: `EMP-003` has no assignments.
- Expected HTTP status: `200`
- Expected response: `{ success: true, data: [] }`

---

## `GET /api/school/:schoolId/operations/responsibility/students/:studentId/responsibilities`

- Handler: `rust/src/domain/operations/responsibility.rs::list_student_responsibilities`
- Purpose: List all responsibilities associated with a student (via their class/space).
- Auth/Tenant: Scoped to `schoolId` and `studentId`.

### Request

Path params:

- `schoolId`: school/tenant identifier.
- `studentId`: student identifier.

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": [
    {
      "responsibilityId": "RES-001",
      "name": "Class 10-A Teacher",
      "employeeType": "teacher",
      "employeeName": "Sunita Rao"
    }
  ]
}
```

### Expected error response

`500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "<error message>"
}
```

### Test cases

#### List student responsibilities

- Type: positive
- Preconditions: `STD-001` is in class `CLS_10A` which has `RES-001` assigned.
- Request: `GET /api/school/SCH-001/operations/responsibility/students/STD-001/responsibilities`
- Expected HTTP status: `200`
- Expected response: `data` contains responsibilities linked to student's spaces.

#### Student with no space/responsibility

- Type: positive
- Expected HTTP status: `200`
- Expected response: `{ success: true, data: [] }`

---

## `GET /api/school/:schoolId/operations/responsibility/spaces/:spaceId/responsibilities`

- Handler: `rust/src/domain/operations/responsibility.rs::list_space_responsibilities`
- Purpose: List all responsibilities assigned to a specific space, classified as mandatory/optional.
- Auth/Tenant: Scoped to `schoolId` and `spaceId`.

### Request

Path params:

- `schoolId`: school/tenant identifier.
- `spaceId`: space identifier (e.g., `CLS_10A`, `LAB_PHYSICS`).

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": [
    {
      "responsibilityId": "RES-001",
      "name": "Class 10-A Teacher",
      "classification": "mandatory",
      "employeeName": "Sunita Rao"
    }
  ]
}
```

### Expected error response

`500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "<error message>"
}
```

### Test cases

#### List space responsibilities with classification

- Type: positive
- Request: `GET /api/school/SCH-001/operations/responsibility/spaces/CLS_10A/responsibilities`
- Expected HTTP status: `200`
- Expected response: `data` includes `classification` field (mandatory/optional).

#### Empty space

- Type: positive
- Expected HTTP status: `200`
- Expected response: `{ success: true, data: [] }`

---

## `GET /api/school/:schoolId/operations/responsibility/search`

- Handler: `rust/src/domain/operations/responsibility.rs::search_responsibilities`
- Purpose: Search responsibilities by name with pagination.
- Auth/Tenant: Scoped to `schoolId`.

### Request

Path params:

- `schoolId`: school/tenant identifier.

Query params:

| Param | Type | Default | Description |
|---|---|---|---|
| `q` | string | `""` | Search query (matches name via LIKE %q%) |
| `page` | integer | `1` | Page number |
| `limit` | integer | `20` | Items per page |

### Expected success response (with results)

`200 OK`

```json
{
  "success": true,
  "data": [
    {
      "responsibilityId": "RES-001",
      "name": "Class 10-A Teacher",
      "description": "Primary class educator"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  }
}
```

### Expected success response (empty query)

`200 OK`

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "pages": 0
  }
}
```

### Expected error response

`500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "<error message>"
}
```

### Important rules

- Empty query `q` returns empty results immediately without hitting the database.
- Search uses `LIKE %pattern%` with `%` and `_` characters escaped.

### Test cases

#### Search by name

- Type: positive
- Request: `GET /api/school/SCH-001/operations/responsibility/search?q=Teacher`
- Expected HTTP status: `200`
- Expected response: `data` contains responsibilities with "Teacher" in name.

#### Search with empty query

- Type: boundary
- Request: `GET /api/school/SCH-001/operations/responsibility/search?q=`
- Expected HTTP status: `200`
- Expected response: `{ success: true, data: [], pagination: { total: 0, pages: 0 } }`

#### Paginated search

- Type: positive
- Request: `GET /api/school/SCH-001/operations/responsibility/search?q=Teacher&page=1&limit=2`
- Expected HTTP status: `200`
- Expected response: `pagination.limit == 2`.