# School Self Management API Contract

Covers school details, school profile update, and school admin password self-reset.

Routes:

- `GET /api/school/:schoolId`
- `PUT /api/school/:schoolId`
- `PATCH /api/school/:schoolId`

Source:

- Route registration: `rust/src/domain/auth/mod.rs:32-34`
- Get school details: `rust/src/domain/auth/school.rs:10-18`
- Update school profile: `rust/src/domain/auth/school.rs:20-28`
- Change password self: `rust/src/domain/auth/school.rs:30-46`

## Current-code tenant-isolation note

Current handlers require bearer auth through RLS, but they do not verify that the token school matches the path `schoolId` for `PUT` or `PATCH`. The tests below document current behavior and should be paired with future guard tests.

## `GET /api/school/:schoolId`

### Purpose

Fetches school details.

### Auth

Bearer token required by RLS middleware.

### Path params

- `schoolId` (string, required): School tenant identifier.

### Query params

- `filter` (string, optional): Passed to `school.get_school_details`.

### Expected success response

```json
{
  "success": true,
  "data": {
    "schoolId": "SCH-00021",
    "schoolName": "Vidhyam High School",
    "address": "74 Park Avenue, City",
    "contactEmail": "admin@school.com",
    "sessionDurationHours": 720
  }
}
```

### Expected error responses

Missing auth before handler:

```json
{
  "success": false,
  "message": "Missing authorization token"
}
```

Validation or service errors follow the standard error shape:

```json
{
  "success": false,
  "error_code": "VALIDATION_ERR",
  "message": "<error message>"
}
```

Database errors follow:

```json
{
  "success": false,
  "error_code": "DB_ERR",
  "message": "An internal database error occurred"
}
```

### Test cases

#### TC_AUTH_SCHOOL_001 Get school details

- Type: positive
- Preconditions: School `SCH-00021` exists and valid bearer token exists.
- Request:
  - Method: `GET`
  - Route: `/api/school/SCH-00021`
  - Headers: `Authorization: Bearer <token>`
- Expected HTTP status: `200`
- Expected response: `success == true`, `data` contains school fields.

#### TC_AUTH_SCHOOL_002 Get school details with filter

- Type: positive
- Preconditions: Valid bearer token exists.
- Request:
  - Method: `GET`
  - Route: `/api/school/SCH-00021?filter=billing`
  - Headers: `Authorization: Bearer <token>`
- Expected HTTP status: `200`
- Expected response: `success == true`, `data` contains filtered or service-selected school data.

#### TC_AUTH_SCHOOL_003 Get missing school

- Type: negative
- Preconditions: Valid bearer token exists.
- Request:
  - Method: `GET`
  - Route: `/api/school/SCH-MISSING`
  - Headers: `Authorization: Bearer <token>`
- Expected HTTP status: Depends on service implementation; document actual behavior.

## `PUT /api/school/:schoolId`

### Purpose

Updates school profile details.

### Auth

Bearer token required by RLS middleware. Current code does not enforce same-tenant path/token matching.

### Path params

- `schoolId` (string, required): School tenant identifier.

### Request body

```json
{
  "schoolName": "Vidhyam High School - East Branch",
  "address": "78 Park Avenue, City"
}
```

### Expected success response

```json
{
  "success": true,
  "message": "School profile updated successfully"
}
```

### Important rules

- The handler passes `tenant_ctx.admin_id` to `school.update_school`.
- The path `schoolId` is also passed to the service.
- The full JSON body is passed as update payload.
- Audit logging is handled by the school service.
- Current code does not compare token school to path `schoolId`; add a guard before treating this as tenant-safe.

### Test cases

#### TC_AUTH_SCHOOL_004 Update school profile

- Type: positive
- Preconditions: Authenticated school admin token exists.
- Request:
  - Method: `PUT`
  - Route: `/api/school/SCH-00021`
  - Headers: `Authorization: Bearer <school-admin-token>`
  - Body: `{ "schoolName": "Vidhyam High School - East Branch", "address": "78 Park Avenue" }`
- Expected HTTP status: `200`
- Expected response: `message == "School profile updated successfully"`.
- Database/state assertion: School profile fields update.

#### TC_AUTH_SCHOOL_005 Update with empty body

- Type: negative/boundary
- Preconditions: Valid bearer token exists.
- Request:
  - Method: `PUT`
  - Route: `/api/school/SCH-00021`
  - Headers: `Authorization: Bearer <token>`
  - Body: `{}`
- Expected behavior: Document actual service behavior.

#### TC_AUTH_SCHOOL_006 Current-code cross-tenant mutation gap

- Type: tenant-isolation/current-code-gap
- Preconditions: Token belongs to a different school.
- Request:
  - Method: `PUT`
  - Route: `/api/school/SCH-OTHER`
  - Headers: `Authorization: Bearer <token-for-SCH-00021>`
  - Body: `{ "schoolName": "Blocked School" }`
- Expected current behavior: Current handler/service may allow the update because no same-tenant guard exists.
- Expected future behavior: Reject with `403` when token school does not match path `schoolId`.

## `PATCH /api/school/:schoolId`

### Purpose

Updates the school admin password directly.

### Auth

Bearer token required by RLS middleware. Current code does not enforce same-tenant path/token matching.

### Path params

- `schoolId` (string, required): School tenant identifier.

### Request body

Preferred field:

```json
{
  "newPassword": "newSecretPassword2026"
}
```

Fallback field accepted by handler:

```json
{
  "password": "newSecretPassword2026"
}
```

### Expected success response

```json
{
  "success": true,
  "message": "Password updated successfully"
}
```

### Expected error responses

Missing auth before handler:

```json
{
  "success": false,
  "message": "Missing authorization token"
}
```

Missing password:

```json
{
  "success": false,
  "error_code": "VALIDATION_ERR",
  "message": "newPassword is required"
}
```

Password too short:

```json
{
  "success": false,
  "error_code": "VALIDATION_ERR",
  "message": "Password must be at least 6 characters"
}
```

### Important rules

- `newPassword` is preferred.
- `password` is accepted as a fallback.
- Password must be at least 6 characters.
- The new password is hashed by `change_password_self`.
- Current code does not compare token school to path `schoolId`; add a guard before treating this as tenant-safe.

### Test cases

#### TC_AUTH_SCHOOL_007 Change school password

- Type: positive
- Preconditions: Authenticated school admin token exists.
- Request:
  - Method: `PATCH`
  - Route: `/api/school/SCH-00021`
  - Headers: `Authorization: Bearer <school-admin-token>`
  - Body: `{ "newPassword": "newSecretPassword2026" }`
- Expected HTTP status: `200`
- Expected response: `message == "Password updated successfully"`.
- Database/state assertion: School auth password hash changes.

#### TC_AUTH_SCHOOL_008 Password too short

- Type: boundary
- Preconditions: Valid bearer token exists.
- Request:
  - Method: `PATCH`
  - Route: `/api/school/SCH-00021`
  - Headers: `Authorization: Bearer <token>`
  - Body: `{ "newPassword": "12345" }`
- Expected HTTP status: `400`
- Expected response: `message == "Password must be at least 6 characters"`.

#### TC_AUTH_SCHOOL_009 Current-code cross-tenant password reset gap

- Type: tenant-isolation/current-code-gap
- Preconditions: Token belongs to a different school.
- Request:
  - Method: `PATCH`
  - Route: `/api/school/SCH-OTHER`
  - Headers: `Authorization: Bearer <token-for-SCH-00021>`
  - Body: `{ "newPassword": "newSecretPassword2026" }`
- Expected current behavior: Current handler may allow the password reset because no same-tenant guard exists.
- Expected future behavior: Reject with `403` when token school does not match path `schoolId`.
