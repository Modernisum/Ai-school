# User API (External Integration) Contract

Covers `user_api::get_students_user`, `user_api::search_students_user`, `user_api::get_student_user`, `user_api::get_employees_user`, `user_api::search_employees_user`, `user_api::get_employee_user`.

These routes are **API-key protected** endpoints meant for third-party integrations. They allow external apps to sync student and employee data.

All routes are nested under:
- `/api/school/:schoolId/people/user/...`

---

## Authentication

All endpoints in this group require:

- **Header:** `x-api-key: <integrationKey>`
- **Middleware:** `crate::middleware::api_key_auth::api_key_auth`
- The middleware extracts `ApiKeyContext` containing `school_id` and `scopes`.

### Scope-Based Access Control

| Endpoint | Required Scope |
|----------|---------------|
| All student endpoints | `read:students` |
| All employee endpoints | `read:employees` |
| Wildcard access | `*` |

A missing scope returns:

`403 FORBIDDEN`

```json
{
  "success": false,
  "message": "Missing required scope: read:students"
}
```

---

## `GET /api/school/:schoolId/people/user/students`

- Handler: `rust/src/domain/people/user_api.rs::get_students_user`
- Purpose: List all students for the school associated with the API key.
- Scope: `read:students` or `*`

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": [
    {
      "studentId": "STD-99812",
      "name": "Arjun Sharma",
      "spaceId": "class_10a",
      "status": "active"
    }
  ]
}
```

### Expected error response

`403 FORBIDDEN` (missing scope)

```json
{
  "success": false,
  "message": "Missing required scope: read:students"
}
```

`500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "<DB error>"
}
```

### Test cases

#### List students with valid API key and scope

- Type: positive
- Preconditions: API key with `read:students` scope for `SCH-001`.
- Request: `GET /api/school/SCH-001/people/user/students`
- Headers: `x-api-key: <valid-key>`
- Expected HTTP status: `200`
- Expected response: `{ "success": true, "data": [...] }`

#### List students with missing scope

- Type: negative
- Preconditions: API key with only `read:employees` scope.
- Expected HTTP status: `403`
- Expected response: `{ "success": false, "message": "Missing required scope: read:students" }`

#### List students with wildcard scope

- Type: positive
- Preconditions: API key with `*` scope.
- Expected HTTP status: `200`

#### List students without API key

- Type: negative
- Request omitted `x-api-key` header.
- Expected HTTP status: `401` (middleware-level rejection)

---

## `GET /api/school/:schoolId/people/user/students/search`

- Handler: `rust/src/domain/people/user_api.rs::search_students_user`
- Purpose: Search and filter students with pagination.
- Scope: `read:students` or `*`

### Request

Query params:

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `search` | string | No | - | Search term across name/contact |
| `class_name` | string | No | - | Class name filter |
| `section` | string | No | - | Section filter (combined with class_name to form spaceId) |
| `status` | string | No | - | Filter by student status |
| `page` | i32 | No | 1 | Page number (min 1) |
| `limit` | i32 | No | 20 | Items per page (min 1, max 100) |

### Important rules

- When both `class_name` and `section` are provided, they are combined as `{class_name}-{section}` to form the `space_id` filter.
- When only `class_name` is provided, it is used directly as `space_id`.

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": [
    {
      "studentId": "STD-99812",
      "name": "Arjun Sharma",
      "spaceId": "10-A",
      "status": "active"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

### Test cases

#### Search students by name

- Type: positive
- Request: `GET /api/school/SCH-001/people/user/students/search?search=Arjun`
- Headers: `x-api-key: <valid-key>`
- Expected HTTP status: `200`
- Expected response: `{ "success": true, "data": [...], "pagination": {...} }`

#### Search with class and section filter

- Type: positive
- Request: `GET /api/school/SCH-001/people/user/students/search?class_name=10&section=A`
- Expected HTTP status: `200`
- Expected response: Students filtered by space `10-A`.

#### Search with pagination

- Type: positive
- Request: `GET /api/school/SCH-001/people/user/students/search?page=2&limit=10`
- Expected HTTP status: `200`
- Expected response: `{ "pagination": { "page": 2, "limit": 10 } }`

#### Search with no results

- Type: positive
- Request: `GET /api/school/SCH-001/people/user/students/search?search=ZZZZZZ`
- Expected HTTP status: `200`
- Expected response: `{ "success": true, "data": [], "pagination": { "total": 0 } }`

---

## `GET /api/school/:schoolId/people/user/students/:studentId`

- Handler: `rust/src/domain/people/user_api.rs::get_student_user`
- Purpose: Get a single student by ID.
- Scope: `read:students` or `*`

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": {
    "studentId": "STD-99812",
    "name": "Arjun Sharma",
    "spaceId": "class_10a",
    "status": "active"
  }
}
```

### Expected error response

`400 BAD_REQUEST` (empty studentId)

```json
{
  "success": false,
  "message": "student_id cannot be empty"
}
```

`404 NOT_FOUND`

```json
{
  "success": false,
  "message": "Student not found"
}
```

`403 FORBIDDEN` (missing scope)

```json
{
  "success": false,
  "message": "Missing required scope: read:students"
}
```

### Test cases

#### Get existing student by ID

- Type: positive
- Preconditions: Student `STD-99812` exists.
- Request: `GET /api/school/SCH-001/people/user/students/STD-99812`
- Headers: `x-api-key: <valid-key>`
- Expected HTTP status: `200`
- Expected response: `{ "success": true, "data": { "studentId": "STD-99812", ... } }`

#### Get non-existent student

- Type: negative
- Request: `GET /api/school/SCH-001/people/user/students/NONEXIST`
- Expected HTTP status: `404`
- Expected response: `{ "success": false, "message": "Student not found" }`

#### Empty studentId

- Type: negative
- Request: `GET /api/school/SCH-001/people/user/students/%20`
- Expected HTTP status: `400`
- Expected response: `{ "success": false, "message": "student_id cannot be empty" }`

---

## `GET /api/school/:schoolId/people/user/employees`

- Handler: `rust/src/domain/people/user_api.rs::get_employees_user`
- Purpose: List all employees for the school associated with the API key.
- Scope: `read:employees` or `*`

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": [
    {
      "employeeId": "EMP-00281",
      "name": "Sunita Rao",
      "employeeType": "teacher",
      "status": "active"
    }
  ]
}
```

### Expected error response

`403 FORBIDDEN` (missing scope)

```json
{
  "success": false,
  "message": "Missing required scope: read:employees"
}
```

`500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "<DB error>"
}
```

### Test cases

#### List employees with valid API key and scope

- Type: positive
- Preconditions: API key with `read:employees` scope for `SCH-001`.
- Request: `GET /api/school/SCH-001/people/user/employees`
- Headers: `x-api-key: <valid-key>`
- Expected HTTP status: `200`
- Expected response: `{ "success": true, "data": [...] }`

#### List employees with missing scope

- Type: negative
- Preconditions: API key with only `read:students` scope.
- Expected HTTP status: `403`
- Expected response: `{ "success": false, "message": "Missing required scope: read:employees" }`

#### Empty employee list

- Type: positive
- Preconditions: No employees in the school.
- Expected HTTP status: `200`
- Expected response: `{ "success": true, "data": [] }`

---

## `GET /api/school/:schoolId/people/user/employees/search`

- Handler: `rust/src/domain/people/user_api.rs::search_employees_user`
- Purpose: Search and filter employees. Filtering is done in-memory after fetching all employees.
- Scope: `read:employees` or `*`

### Request

Query params:

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `search` | string | No | - | Search term across name, phone, employeeId |
| `employee_type` | string | No | - | Filter by employee type (exact match, case-insensitive) |

### Important rules

- This endpoint does NOT use pagination; it fetches all employees and filters in-memory.
- `search` performs case-insensitive substring matching against `name`, `phone`, and `employeeId`.
- `employee_type` performs case-insensitive exact matching.

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": [
    {
      "employeeId": "EMP-00281",
      "name": "Sunita Rao",
      "employeeType": "teacher",
      "phone": "9922334455"
    }
  ],
  "total": 1
}
```

### Test cases

#### Search employees by name

- Type: positive
- Request: `GET /api/school/SCH-001/people/user/employees/search?search=Sunita`
- Headers: `x-api-key: <valid-key>`
- Expected HTTP status: `200`
- Expected response: `{ "success": true, "data": [...], "total": 1 }`

#### Filter by employee type

- Type: positive
- Request: `GET /api/school/SCH-001/people/user/employees/search?employee_type=teacher`
- Expected HTTP status: `200`
- Expected response: Only employees with `employeeType: "teacher"`.

#### Search with no results

- Type: positive
- Request: `GET /api/school/SCH-001/people/user/employees/search?search=ZZZZZZ`
- Expected HTTP status: `200`
- Expected response: `{ "success": true, "data": [], "total": 0 }`

#### Combined search and type filter

- Type: positive
- Request: `GET /api/school/SCH-001/people/user/employees/search?search=rao&employee_type=teacher`
- Expected HTTP status: `200`
- Expected response: Only teachers whose name/phone/ID contains "rao".

---

## `GET /api/school/:schoolId/people/user/employees/:employeeId`

- Handler: `rust/src/domain/people/user_api.rs::get_employee_user`
- Purpose: Get a single employee by ID.
- Scope: `read:employees` or `*`

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": {
    "employeeId": "EMP-00281",
    "name": "Sunita Rao",
    "employeeType": "teacher",
    "status": "active"
  }
}
```

### Expected error response

`400 BAD_REQUEST` (empty employeeId)

```json
{
  "success": false,
  "message": "employee_id cannot be empty"
}
```

`404 NOT_FOUND`

```json
{
  "success": false,
  "message": "Employee not found"
}
```

`403 FORBIDDEN` (missing scope)

```json
{
  "success": false,
  "message": "Missing required scope: read:employees"
}
```

### Test cases

#### Get existing employee by ID

- Type: positive
- Preconditions: Employee `EMP-00281` exists.
- Request: `GET /api/school/SCH-001/people/user/employees/EMP-00281`
- Headers: `x-api-key: <valid-key>`
- Expected HTTP status: `200`
- Expected response: `{ "success": true, "data": { "employeeId": "EMP-00281", ... } }`

#### Get non-existent employee

- Type: negative
- Request: `GET /api/school/SCH-001/people/user/employees/NONEXIST`
- Expected HTTP status: `404`
- Expected response: `{ "success": false, "message": "Employee not found" }`

#### Empty employeeId

- Type: negative
- Request: `GET /api/school/SCH-001/people/user/employees/%20`
- Expected HTTP status: `400`
- Expected response: `{ "success": false, "message": "employee_id cannot be empty" }`