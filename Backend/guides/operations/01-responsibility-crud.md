# Responsibility CRUD API Contract

Covers `list_responsibilities`, `create_responsibility`, `get_responsibility_definition`, `update_responsibility`, `delete_responsibility`, `export_responsibilities_csv`, `import_responsibilities_csv`.

---

## `GET /api/school/:schoolId/operations/responsibility`

- Handler: `rust/src/domain/operations/responsibility.rs::list_responsibilities`
- Purpose: List all responsibilities for a school with optional filtering, simple mode, pagination, and IDs-only mode.
- Auth/Tenant: Requires tenant context. Reads from `responsibilities` table scoped to `schoolId`.

### Request

Path params:

- `schoolId`: school/tenant identifier.

Query params (all optional):

| Param | Type | Default | Description |
|---|---|---|---|
| `employeeType` | string | — | Filter by employee type (e.g. `teacher`) |
| `simple` | boolean | `false` | Return only `responsibilityId` and `name` |
| `idsOnly` | boolean | `false` | Return only `responsibilityId` array |
| `paginated` | boolean | `false` | Enable pagination |
| `page` | integer | `1` | Page number (when paginated) |
| `limit` | integer | `20` | Items per page (when paginated) |

### Expected success response (full)

`200 OK`

```json
{
  "success": true,
  "data": [
    {
      "responsibilityId": "RES-001",
      "name": "Class 10-A Teacher",
      "description": "Primary class educator responsibility",
      "employeeType": "teacher",
      "weeklyPeriods": 30,
      "monthlySalary": 45000,
      "createdAt": "2026-01-15T10:30:00Z"
    }
  ]
}
```

### Expected success response (simple)

`200 OK`

```json
{
  "success": true,
  "data": [
    {
      "responsibilityId": "RES-001",
      "name": "Class 10-A Teacher"
    }
  ]
}
```

### Expected success response (idsOnly)

`200 OK`

```json
{
  "success": true,
  "data": ["RES-001", "RES-002"]
}
```

### Expected success response (paginated)

`200 OK`

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": { "page": 1, "limit": 20, "total": 45, "pages": 3 }
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

- Employee type `teacher` results are sorted to prioritize exact matches.
- `simple` and `idsOnly` modes are incompatible with `paginated` — they short-circuit before pagination logic.
- Empty list returns `{ "success": true, "data": [] }`.

### Test cases

#### List all responsibilities

- Type: positive
- Request: `GET /api/school/SCH-001/operations/responsibility`
- Expected HTTP status: `200`
- Expected response: `{ success: true, data: [...] }`
- Database/state assertion: Only responsibilities for `SCH-001` are returned.

#### List with employeeType filter

- Type: positive
- Request: `GET /api/school/SCH-001/operations/responsibility?employeeType=teacher`
- Expected HTTP status: `200`
- Expected response: `data` array contains only teacher-type responsibilities; teacher matches sorted to top.

#### List simple mode

- Type: positive
- Request: `GET /api/school/SCH-001/operations/responsibility?simple=true`
- Expected HTTP status: `200`
- Expected response: Each item has only `responsibilityId` and `name`.

#### List IDs only

- Type: positive
- Request: `GET /api/school/SCH-001/operations/responsibility?idsOnly=true`
- Expected HTTP status: `200`
- Expected response: `data` is an array of strings (responsibility IDs).

#### Paginated list

- Type: positive
- Request: `GET /api/school/SCH-001/operations/responsibility?paginated=true&page=1&limit=5`
- Expected HTTP status: `200`
- Expected response: `pagination` object present with `page`, `limit`, `total`, `pages`.

#### Empty list

- Type: positive
- Preconditions: No responsibilities exist for the school.
- Expected HTTP status: `200`
- Expected response: `{ success: true, data: [] }`

#### Tenant isolation

- Type: tenant-isolation
- Request: `GET /api/school/SCH-002/operations/responsibility`
- Expected HTTP status: `200`
- Database/state assertion: Only responsibilities from `SCH-002` are returned; `SCH-001` data is not visible.

---

## `POST /api/school/:schoolId/operations/responsibility`

- Handler: `rust/src/domain/operations/responsibility.rs::create_responsibility`
- Purpose: Create a new responsibility for the school.
- Auth/Tenant: Requires authenticated tenant context. `admin_id` from `TenantContext` is used as creator.

### Request

Path params:

- `schoolId`: school/tenant identifier.

Body:

```json
{
  "name": "Class 10-A Teacher",
  "description": "Primary class educator responsibility",
  "employeeType": "teacher",
  "weeklyPeriods": 30,
  "monthlySalary": 45000
}
```

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": {
    "responsibilityId": "RES-001",
    "name": "Class 10-A Teacher",
    "description": "Primary class educator responsibility",
    "employeeType": "teacher",
    "weeklyPeriods": 30,
    "monthlySalary": 45000,
    "createdAt": "2026-06-21T10:30:00Z"
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

- Creates a WebSocket event via `publish_responsibility_event` with `ResponsibilityEvent::Updated` (type: `responsibility_updated`, field: `created`).
- Notification is published to Redis channel `school:{schoolId}:responsibilities`.

### Test cases

#### Create responsibility

- Type: positive
- Request: `POST /api/school/SCH-001/operations/responsibility`
- Body: `{ "name": "Lab Assistant", "description": "Physics lab management", "employeeType": "support", "weeklyPeriods": 20 }`
- Expected HTTP status: `200`
- Expected response: `success: true`, `data.responsibilityId` is a non-empty string.
- Database/state assertion: New row in `responsibilities` table for `SCH-001`.
- Side effect: WebSocket event published to Redis.

#### Create with missing name

- Type: negative
- Request body: `{ "description": "No name provided" }`
- Expected HTTP status: `500`
- Expected response: `{ success: false, message: "<DB error>" }`

---

## `GET /api/school/:schoolId/operations/responsibility/:responsibilityId`

- Handler: `rust/src/domain/operations/responsibility.rs::get_responsibility_definition`
- Purpose: Get full responsibility definition by ID.
- Auth/Tenant: Reads from `responsibilities` table scoped to school.

### Request

Path params:

- `schoolId`: school/tenant identifier.
- `responsibilityId`: responsibility identifier.

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": {
    "responsibilityId": "RES-001",
    "name": "Class 10-A Teacher",
    "description": "Primary class educator responsibility",
    "employeeType": "teacher",
    "weeklyPeriods": 30,
    "monthlySalary": 45000,
    "createdAt": "2026-01-15T10:30:00Z",
    "updatedAt": "2026-03-20T14:00:00Z"
  }
}
```

### Expected error response (not found)

`404 NOT_FOUND`

```json
{
  "success": false,
  "message": "Responsibility not found"
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

### Test cases

#### Get existing responsibility

- Type: positive
- Request: `GET /api/school/SCH-001/operations/responsibility/RES-001`
- Expected HTTP status: `200`
- Expected response: `data.responsibilityId == "RES-001"`, `data.name` is non-empty.

#### Get non-existent responsibility

- Type: negative
- Request: `GET /api/school/SCH-001/operations/responsibility/RES-999`
- Expected HTTP status: `404`
- Expected response: `{ success: false, message: "Responsibility not found" }`

#### Wrong school responsibility

- Type: tenant-isolation
- Preconditions: `RES-001` exists under `SCH-001`.
- Request: `GET /api/school/SCH-002/operations/responsibility/RES-001`
- Expected HTTP status: `404`
- Expected response: `{ success: false, message: "Responsibility not found" }`

---

## `PATCH /api/school/:schoolId/operations/responsibility/:responsibilityId`

- Handler: `rust/src/domain/operations/responsibility.rs::update_responsibility`
- Purpose: Update an existing responsibility's fields.
- Auth/Tenant: Requires authenticated tenant context. `admin_id` is used as updater.

### Request

Path params:

- `schoolId`: school/tenant identifier.
- `responsibilityId`: responsibility identifier.

Body (partial update — send only fields to update):

```json
{
  "name": "Class 10-A Senior Teacher",
  "weeklyPeriods": 32
}
```

### Expected success response

`200 OK`

```json
{
  "success": true,
  "message": "Responsibility updated successfully"
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

#### Update name and periods

- Type: positive
- Request: `PATCH /api/school/SCH-001/operations/responsibility/RES-001`
- Body: `{ "name": "Updated Name", "weeklyPeriods": 35 }`
- Expected HTTP status: `200`
- Expected response: `{ success: true, message: "Responsibility updated successfully" }`
- Database/state assertion: `responsibilities` row updated with new name and weeklyPeriods.

#### Update non-existent responsibility

- Type: negative
- Request: `PATCH /api/school/SCH-001/operations/responsibility/RES-999`
- Body: `{ "name": "Ghost" }`
- Expected HTTP status: `500` (based on current handler behavior)
- Expected response: `{ success: false, message: "<error>" }`

---

## `DELETE /api/school/:schoolId/operations/responsibility/:responsibilityId`

- Handler: `rust/src/domain/operations/responsibility.rs::delete_responsibility`
- Purpose: Delete a responsibility from the school.
- Auth/Tenant: Requires authenticated tenant context. `admin_id` is used as deleter.

### Request

Path params:

- `schoolId`: school/tenant identifier.
- `responsibilityId`: responsibility identifier.

### Expected success response

`200 OK`

```json
{
  "success": true,
  "message": "Responsibility deleted successfully"
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

#### Delete existing responsibility

- Type: positive
- Preconditions: `RES-001` exists under `SCH-001`.
- Request: `DELETE /api/school/SCH-001/operations/responsibility/RES-001`
- Expected HTTP status: `200`
- Expected response: `{ success: true, message: "Responsibility deleted successfully" }`
- Database/state assertion: Row removed from `responsibilities` table.

#### Delete non-existent responsibility

- Type: negative
- Request: `DELETE /api/school/SCH-001/operations/responsibility/RES-999`
- Expected HTTP status: `500` (based on current handler behavior)
- Expected response: `{ success: false, message: "<error>" }`

---

## `GET /api/school/:schoolId/operations/responsibility/export/csv`

- Handler: `rust/src/domain/operations/responsibility.rs::export_responsibilities_csv`
- Purpose: Export all responsibilities as CSV file download.
- Auth/Tenant: Scoped to `schoolId`.

### Request

Path params:

- `schoolId`: school/tenant identifier.

### Expected success response

`200 OK`

- Headers:
  - `Content-Type: text/csv`
  - `Content-Disposition: attachment; filename="responsibilities.csv"`
- Body: CSV content (binary/text).

### Expected error response

`500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "<error message>"
}
```

### Test cases

#### Export CSV with data

- Type: positive
- Preconditions: At least one responsibility exists for the school.
- Request: `GET /api/school/SCH-001/operations/responsibility/export/csv`
- Expected HTTP status: `200`
- Expected response: CSV file download with `Content-Type: text/csv`.
- Response body: CSV header row + data rows.

#### Export CSV empty school

- Type: positive
- Preconditions: No responsibilities for the school.
- Expected HTTP status: `200`
- Expected response: CSV file with only header row.

---

## `POST /api/school/:schoolId/operations/responsibility/import/csv`

- Handler: `rust/src/domain/operations/responsibility.rs::import_responsibilities_csv`
- Purpose: Import responsibilities from a CSV file upload.
- Auth/Tenant: Requires authenticated tenant context. `admin_id` is used as importer.

### Request

Path params:

- `schoolId`: school/tenant identifier.

Content-Type: `multipart/form-data`

Form field:

- `file`: CSV file containing responsibility data.

### Expected success response

`200 OK`

```json
{
  "success": true,
  "count": 15
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

- The handler reads the first form field named `file` from the multipart.
- CSV content is passed as a string to the service layer.

### Test cases

#### Import valid CSV

- Type: positive
- Request: `POST /api/school/SCH-001/operations/responsibility/import/csv` with multipart file.
- Expected HTTP status: `200`
- Expected response: `{ success: true, count: N }` where N is the number of imported rows.
- Database/state assertion: N new rows in `responsibilities` table.

#### Import with no file field

- Type: negative
- Request: Multipart with no `file` field (empty body or different field name).
- Expected HTTP status: `500` (based on current handler behavior)
- Expected response: `{ success: false, message: "<error>" }`

#### Import malformed CSV

- Type: negative
- Request: Multipart with a non-CSV file.
- Expected HTTP status: `500`
- Expected response: `{ success: false, message: "<error>" }`