# Complaints & Reminders API Contract

Covers `list_complains`, `create_complain`, `list_reminders`.

---

## `GET /api/school/:schoolId/operations/complains`

- Handler: `rust/src/domain/operations/complains.rs::list_complains`
- Purpose: List complaints for the school with optional user/student filtering.
- Auth/Tenant: Scoped to `schoolId`.

### Request

Path params:

- `schoolId`: school/tenant identifier.

Query params (all optional):

| Param | Type | Description |
|---|---|---|
| `user_id` | string | Filter by user ID |
| `student_id` | string | Alias for `user_id` — filter by student ID |
| `user_role` | string | Filter by user role |

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": [
    {
      "complaintId": "CMP-001",
      "studentId": "STD-001",
      "studentName": "Jane Doe",
      "category": "behavioral",
      "summary": "Disruptive conduct in physics laboratory.",
      "severity": "medium",
      "status": "open",
      "reportedBy": "EMP-001",
      "reportedAt": "2026-06-20T14:30:00Z",
      "attachmentUrl": "https://storage.example.com/complaints/CMP-001/photo.jpg"
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

### Important rules

- `student_id` is treated as an alias for `user_id` — both are checked.
- Attachment paths are converted to signed public URLs via `state.storage.get_public_url()`.
- Each complaint item gets `attachmentUrl` field if `attachment_path` exists.

### Test cases

#### List all complaints

- Type: positive
- Request: `GET /api/school/SCH-001/operations/complains`
- Expected HTTP status: `200`
- Expected response: `{ success: true, data: [...] }`
- Database/state assertion: Only complaints for `SCH-001` are returned.

#### List complaints by student

- Type: positive
- Request: `GET /api/school/SCH-001/operations/complains?student_id=STD-001`
- Expected HTTP status: `200`
- Expected response: `data` contains only complaints for `STD-001`.

#### List complaints by user_id alias

- Type: compatibility
- Request: `GET /api/school/SCH-001/operations/complains?user_id=STD-001`
- Expected HTTP status: `200`
- Expected response: Same results as `student_id=STD-001`.

#### Empty complaint list

- Type: positive
- Preconditions: No complaints exist for the school.
- Expected HTTP status: `200`
- Expected response: `{ success: true, data: [] }`

#### Tenant isolation

- Type: tenant-isolation
- Request: `GET /api/school/SCH-002/operations/complains`
- Expected HTTP status: `200`
- Database/state assertion: No complaints from `SCH-001` leaked.

---

## `GET /api/school/:schoolId/operations/complains/student/:studentId`

- Handler: `rust/src/domain/operations/complains.rs::list_complains`
- Purpose: List complaints for a specific student (path param variant).
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
      "complaintId": "CMP-001",
      "studentId": "STD-001",
      "category": "behavioral",
      "summary": "Disruptive conduct in physics laboratory.",
      "status": "open"
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

### Important rules

- The `studentId` path param is passed to the service as `user_id` filter.
- Note: The handler signature uses `Path(school_id)` only (single param), but the route has `student/:studentId` — the handler ignores the second path segment. The `student_id` is extracted from query params.

### Test cases

#### List complaints for student (path variant)

- Type: positive
- Request: `GET /api/school/SCH-001/operations/complains/student/STD-001`
- Expected HTTP status: `200`
- Expected response: `data` contains complaints for `STD-001`.

---

## `GET /api/school/:schoolId/operations/complains/:summaryId/complainlist`

- Handler: `rust/src/domain/operations/complains.rs::list_complains`
- Purpose: List complaints linked to a specific summary (route variant).
- Auth/Tenant: Scoped to `schoolId` and `summaryId`.

### Request

Path params:

- `schoolId`: school/tenant identifier.
- `summaryId`: complaint summary identifier.

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": [
    {
      "complaintId": "CMP-001",
      "summaryId": "SUM-001",
      "studentId": "STD-001",
      "category": "behavioral",
      "summary": "Multiple incidents in laboratory",
      "status": "open"
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

#### List complaints by summary

- Type: positive
- Request: `GET /api/school/SCH-001/operations/complains/SUM-001/complainlist`
- Expected HTTP status: `200`
- Expected response: `data` contains complaints linked to `SUM-001`.

---

## `POST /api/school/:schoolId/operations/complains`

- Handler: `rust/src/domain/operations/complains.rs::create_complain`
- Purpose: File a new discipline complaint for a student.
- Auth/Tenant: Requires authenticated tenant context. `admin_id` is used as reporter.

### Request

Path params:

- `schoolId`: school/tenant identifier.

Body:

```json
{
  "studentId": "STD-001",
  "category": "behavioral",
  "summary": "Disruptive conduct in physics laboratory.",
  "severity": "medium",
  "reportedBy": "EMP-001",
  "description": "Student was talking loudly and disturbing other students during the experiment.",
  "actionTaken": "Verbal warning given"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `studentId` | string | Yes | Student being reported |
| `category` | string | Yes | Complaint category (e.g., `behavioral`, `academic`, `attendance`) |
| `summary` | string | Yes | Brief summary of complaint |
| `severity` | string | No | Severity level (e.g., `low`, `medium`, `high`) |
| `reportedBy` | string | No | Employee ID of reporter |
| `description` | string | No | Detailed description |
| `actionTaken` | string | No | Immediate action taken |

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": {
    "complaintId": "CMP-001",
    "studentId": "STD-001",
    "category": "behavioral",
    "summary": "Disruptive conduct in physics laboratory.",
    "severity": "medium",
    "status": "open",
    "reportedBy": "EMP-001",
    "reportedAt": "2026-06-21T10:30:00Z"
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

- School multitenancy must be enforced — complaints should never cross school boundaries.
- The `admin_id` from `TenantContext` is passed as the creator to the service layer.

### Test cases

#### Create a behavioral complaint

- Type: positive
- Request: `POST /api/school/SCH-001/operations/complains`
- Body: `{ "studentId": "STD-001", "category": "behavioral", "summary": "Disruptive in class" }`
- Expected HTTP status: `200`
- Expected response: `success: true`, `data.complaintId` is a non-empty string.
- Database/state assertion: New row in `complains` table for `SCH-001`.

#### Create complaint with all fields

- Type: positive
- Request body includes `severity`, `description`, `actionTaken`.
- Expected HTTP status: `200`
- Database/state assertion: All fields persisted.

#### Missing studentId

- Type: negative
- Request body: `{ "category": "behavioral", "summary": "Missing student" }`
- Expected HTTP status: `500` (based on current handler behavior)
- Expected response: `{ success: false, message: "<error>" }`

#### Tenant isolation

- Type: tenant-isolation
- Preconditions: `STD-001` exists in `SCH-001`.
- Request: `POST /api/school/SCH-002/operations/complains`
- Body: `{ "studentId": "STD-001", "category": "behavioral", "summary": "Cross-school test" }`
- Expected HTTP status: `500` (should fail)
- Database/state assertion: Complaint should not be created under `SCH-002` if student doesn't belong there.

---

## `GET /api/school/:schoolId/operations/reminders`

- Handler: `rust/src/domain/operations/reminder.rs::list_reminders`
- Purpose: List all operational reminders for the school.
- Auth/Tenant: Scoped to `schoolId`.

### Request

Path params:

- `schoolId`: school/tenant identifier.

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": [
    {
      "reminderId": "REM-001",
      "title": "Submit monthly attendance report",
      "description": "All teachers must submit attendance by 5 PM",
      "dueDate": "2026-06-30",
      "priority": "high",
      "status": "pending",
      "assignedTo": "EMP-001",
      "createdAt": "2026-06-20T09:00:00Z"
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

#### List reminders

- Type: positive
- Request: `GET /api/school/SCH-001/operations/reminders`
- Expected HTTP status: `200`
- Expected response: `{ success: true, data: [...] }`
- Database/state assertion: Only reminders for `SCH-001` are returned.

#### Empty reminder list

- Type: positive
- Preconditions: No reminders exist for the school.
- Expected HTTP status: `200`
- Expected response: `{ success: true, data: [] }`

#### Tenant isolation

- Type: tenant-isolation
- Request: `GET /api/school/SCH-002/operations/reminders`
- Expected HTTP status: `200`
- Database/state assertion: Only reminders from `SCH-002` are returned.