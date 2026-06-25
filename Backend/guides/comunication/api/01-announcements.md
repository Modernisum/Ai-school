# Announcements API Contract

Covers `announcement::create_announcement`.

---

## `POST /api/school/:schoolId/comm/announcements/:type/:userId`

- Handler: `rust/src/domain/communication/announcement.rs::create_announcement`
- Purpose: Create a school announcement. Supports role-based validation: ADMIN can create any announcement; TEACHER must be mapped to the specified class/subject responsibility.
- Auth/Tenant: Requires `TenantContext` extension. `schoolId`, `type` (announcement type), and `userId` come from the path.

### Request

Path params:

- `schoolId`: school/tenant identifier.
- `type`: announcement type string (e.g. `GENERAL`, `ACADEMIC`, `EVENT`).
- `userId`: ID of the user creating the announcement.

Body:

```json
{
  "role": "ADMIN",
  "title": "School Reopening Notice",
  "content": "School will reopen on July 1st. All students must attend.",
  "classId": "CLS_10A",
  "subjectId": "SUB-MATH"
}
```

For TEACHER role, `classId` and `subjectId` are mandatory:

```json
{
  "role": "TEACHER",
  "title": "Math Homework Reminder",
  "content": "Submit Chapter 10 homework by Friday.",
  "classId": "CLS_10A",
  "subjectId": "SUB-MATH"
}
```

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": {
    "id": 42,
    "schoolId": "SCH-00021",
    "type": "GENERAL",
    "userId": "ADM-001",
    "title": "School Reopening Notice",
    "content": "School will reopen on July 1st. All students must attend.",
    "createdAt": "2026-06-21T10:00:00Z"
  }
}
```

### Expected error response

`500 INTERNAL_SERVER_ERROR` (or `403 FORBIDDEN` / `400 BAD_REQUEST` depending on error type)

```json
{
  "success": false,
  "message": "<error message>"
}
```

### Important rules

- `role` must be `"ADMIN"` or `"TEACHER"`. Any other value returns `"Invalid role"`.
- For `TEACHER` role, both `classId` and `subjectId` are required.
- The space (class) must exist in the resource repository.
- The responsibility (subject) must exist.
- The teacher must be mapped to the responsibility via `get_employee_responsibilities`. If not mapped, returns `403 Forbidden`.
- After creating the announcement, targeted notifications are sent:
  - If `classId` is provided and valid, notifications are sent to all students in that class.
  - Otherwise, a global school-wide notification is broadcast.
- `title` and `content` are required for notification generation. If either is missing, no notification is triggered (but the announcement is still created).

### Test cases

#### Admin creates announcement

- Type: positive
- Preconditions: Authenticated admin tenant token for `SCH-001`.
- Request:
  - Method: `POST`
  - Route: `/api/school/SCH-001/comm/announcements/GENERAL/ADM-001`
  - Body:

```json
{
  "role": "ADMIN",
  "title": "Admin Announcement",
  "content": "This is a test announcement from admin."
}
```

- Expected HTTP status: `200`
- Expected response: `{ success: true, data: { id, schoolId, type, userId, title, content, createdAt } }`
- Database/state assertion: Announcement row exists for `SCH-001` with matching title/content.

#### Admin announcement with classId triggers student notifications

- Type: positive
- Preconditions: Class `CLS_10A` exists with 3 enrolled students.
- Request:
  - Method: `POST`
  - Route: `/api/school/SCH-001/comm/announcements/ACADEMIC/ADM-001`
  - Body:

```json
{
  "role": "ADMIN",
  "title": "Class Announcement",
  "content": "All students of Class 10A, please note.",
  "classId": "CLS_10A"
}
```

- Expected HTTP status: `200`
- Database/state assertion: 3 notifications are created for students in `CLS_10A`.

#### Teacher creates announcement with valid responsibility mapping

- Type: positive
- Preconditions: Teacher `EMP-001` is mapped to `SUB-MATH - CLS_10A`. Space `CLS_10A` and responsibility `SUB-MATH` exist.
- Request:
  - Method: `POST`
  - Route: `/api/school/SCH-001/comm/announcements/ACADEMIC/EMP-001`
  - Body:

```json
{
  "role": "TEACHER",
  "title": "Math Test",
  "content": "Math test on Monday.",
  "classId": "CLS_10A",
  "subjectId": "SUB-MATH"
}
```

- Expected HTTP status: `200`
- Expected response: `{ success: true, data: { ... } }`

#### Teacher missing classId

- Type: negative
- Request:
  - Method: `POST`
  - Route: `/api/school/SCH-001/comm/announcements/ACADEMIC/EMP-001`
  - Body:

```json
{
  "role": "TEACHER",
  "title": "Test",
  "content": "Test content"
}
```

- Expected HTTP status: `500` (Validation error)
- Expected response message includes: `classId and subjectId are required for TEACHER announcements`

#### Teacher not mapped to responsibility

- Type: negative
- Preconditions: Teacher `EMP-002` is NOT mapped to `SUB-MATH - CLS_10A`.
- Request:
  - Method: `POST`
  - Route: `/api/school/SCH-001/comm/announcements/ACADEMIC/EMP-002`
  - Body:

```json
{
  "role": "TEACHER",
  "title": "Test",
  "content": "Test content",
  "classId": "CLS_10A",
  "subjectId": "SUB-MATH"
}
```

- Expected HTTP status: `403` (Forbidden)
- Expected response message includes: `Teacher is not mapped to this responsibility`

#### Invalid role

- Type: negative
- Request body: `{ "role": "STUDENT", "title": "Test", "content": "Test" }`
- Expected HTTP status: `500`
- Expected response message includes: `Invalid role`

#### Non-existent space

- Type: negative
- Request body includes `classId: "NONEXISTENT"` with `role: "TEACHER"`.
- Expected HTTP status: `500`
- Expected response message includes: `Space 'NONEXISTENT' does not exist`

#### Announcement without title/content still succeeds

- Type: boundary
- Request body: `{ "role": "ADMIN" }` (no title, no content)
- Expected HTTP status: `200`
- Expected response: `{ success: true, data: { ... } }` — announcement is created but no notification is sent.