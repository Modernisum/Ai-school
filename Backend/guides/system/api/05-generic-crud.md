# Generic CRUD API

Provides dynamic CRUD operations on whitelisted tables without writing dedicated endpoints.

**Base path:** `/school/:schoolId/system/crud/:table`

---

## Allowed Tables

| Table | ID Column |
|-------|-----------|
| `reminders` | `id` |
| `webhook_endpoints` | `id` |
| `awards` | `id` |
| `complains` | `id` |
| `document_box` | `id` |
| `tasks` | `task_id` |

Accessing any table not in this list returns `400 BAD_REQUEST`.

---

## 1. Create Record

```
POST /school/:schoolId/system/crud/:table
```

**Auth:** Not required

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `schoolId` | string | School identifier |
| `table` | string | Whitelisted table name |

**Request Body (any JSON matching the table schema):**
```json
{
  "title": "Submit report by Friday",
  "description": "Complete the quarterly report",
  "due_date": "2026-06-30T00:00:00Z",
  "status": "pending"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Submit report by Friday",
    "description": "Complete the quarterly report",
    "due_date": "2026-06-30T00:00:00Z",
    "status": "pending"
  }
}
```

**Error Response (400 - Unauthorized table):**
```json
{
  "success": false,
  "message": "Unauthorized table access"
}
```

**Error Response (500):**
```json
{
  "success": false,
  "message": "Error description"
}
```

**Test Cases:**
```yaml
name: "Create record in allowed table"
request:
  method: POST
  url: "/school/school-123/system/crud/reminders"
  body:
    title: "Submit report"
    description: "Complete quarterly report"
    status: "pending"
expect:
  status: 200
  body:
    success: true
    data.id: number

name: "Create record in unauthorized table"
request:
  method: POST
  url: "/school/school-123/system/crud/students"
  body:
    name: "Should fail"
expect:
  status: 400
  body:
    success: false
    message: "Unauthorized table access"
```

---

## 2. List Records

```
GET /school/:schoolId/system/crud/:table
```

**Auth:** Not required

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `schoolId` | string | School identifier |
| `table` | string | Whitelisted table name |

**Expected Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Submit report",
      "description": "Complete quarterly report",
      "status": "pending",
      "created_at": "2026-06-21T10:00:00Z"
    },
    {
      "id": 2,
      "title": "Review code",
      "description": "Review pull request #42",
      "status": "completed",
      "created_at": "2026-06-20T08:00:00Z"
    }
  ]
}
```

**Note:** Uses `select_all` which fetches all records for the school. No pagination.

**Error Response (400 - Unauthorized table):**
```json
{
  "success": false,
  "message": "Unauthorized table access"
}
```

**Test Cases:**
```yaml
name: "List records from allowed table"
request:
  method: GET
  url: "/school/school-123/system/crud/reminders"
expect:
  status: 200
  body:
    success: true
    data: array

name: "List records from unauthorized table"
request:
  method: GET
  url: "/school/school-123/system/crud/unauthorized_table"
expect:
  status: 400
  body:
    success: false
    message: "Unauthorized table access"
```

---

## 3. Get Single Record

```
GET /school/:schoolId/system/crud/:table/:id
```

**Auth:** Not required

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `schoolId` | string | School identifier |
| `table` | string | Whitelisted table name |
| `id` | string | Record ID (auto-parsed as i32 for `id` column, string for `task_id`) |

**ID Column Resolution:**

| Table | ID Column | ID Type |
|-------|-----------|---------|
| `tasks` | `task_id` | string |
| All others | `id` | integer (auto-parsed) |

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Submit report",
    "description": "Complete quarterly report",
    "status": "pending"
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "message": "Record not found"
}
```

**Error Response (400 - Unauthorized table):**
```json
{
  "success": false,
  "message": "Unauthorized table access"
}
```

**Test Cases:**
```yaml
name: "Get single record"
prerequisites:
  - Create a record in reminders table, note its id
request:
  method: GET
  url: "/school/school-123/system/crud/reminders/1"
expect:
  status: 200
  body:
    success: true
    data.id: 1

name: "Get non-existent record"
request:
  method: GET
  url: "/school/school-123/system/crud/reminders/99999"
expect:
  status: 404
  body:
    success: false
    message: "Record not found"

name: "Get record from tasks table (task_id column)"
prerequisites:
  - Create a task record, note its task_id
request:
  method: GET
  url: "/school/school-123/system/crud/tasks/some-task-uuid"
expect:
  status: 200
  body:
    success: true
```

---

## 4. Update Record

```
PUT /school/:schoolId/system/crud/:table/:id
```

**Auth:** Not required

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `schoolId` | string | School identifier |
| `table` | string | Whitelisted table name |
| `id` | string | Record ID |

**Request Body (any JSON fields to update):**
```json
{
  "status": "completed",
  "completed_at": "2026-06-21T12:00:00Z"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Submit report",
    "status": "completed",
    "completed_at": "2026-06-21T12:00:00Z"
  }
}
```

**Error Response (400 - Unauthorized table):**
```json
{
  "success": false,
  "message": "Unauthorized table access"
}
```

**Error Response (500):**
```json
{
  "success": false,
  "message": "Error description"
}
```

**Test Cases:**
```yaml
name: "Update record"
prerequisites:
  - Create a record in reminders table, note its id
request:
  method: PUT
  url: "/school/school-123/system/crud/reminders/1"
  body:
    status: "completed"
expect:
  status: 200
  body:
    success: true
    data.status: "completed"

name: "Update record in unauthorized table"
request:
  method: PUT
  url: "/school/school-123/system/crud/students/1"
  body:
    name: "Should fail"
expect:
  status: 400
  body:
    success: false
    message: "Unauthorized table access"
```

---

## 5. Delete Record

```
DELETE /school/:schoolId/system/crud/:table/:id
```

**Auth:** Not required

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `schoolId` | string | School identifier |
| `table` | string | Whitelisted table name |
| `id` | string | Record ID |

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Record deleted"
}
```

**Error Response (400 - Unauthorized table):**
```json
{
  "success": false,
  "message": "Unauthorized table access"
}
```

**Error Response (500):**
```json
{
  "success": false,
  "message": "Error description"
}
```

**Test Cases:**
```yaml
name: "Delete record"
prerequisites:
  - Create a record in reminders table, note its id
request:
  method: DELETE
  url: "/school/school-123/system/crud/reminders/1"
expect:
  status: 200
  body:
    success: true
    message: "Record deleted"

name: "Delete from unauthorized table"
request:
  method: DELETE
  url: "/school/school-123/system/crud/students/1"
expect:
  status: 400
  body:
    success: false
    message: "Unauthorized table access"
```

---

## Summary of Allowed Tables

| Table | Description | ID Column | ID Type |
|-------|-------------|-----------|---------|
| `reminders` | Task reminders | `id` | integer |
| `webhook_endpoints` | Webhook configurations | `id` | integer |
| `awards` | Student awards | `id` | integer |
| `complains` | Complaints/feedback | `id` | integer |
| `document_box` | Document storage | `id` | integer |
| `tasks` | Task management | `task_id` | string |

**Security Note:** No authentication or tenant context is required for generic CRUD endpoints. The table whitelist is the only access control mechanism. Consider adding auth middleware for production use.