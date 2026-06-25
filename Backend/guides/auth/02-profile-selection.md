# Profile Selection API Contract

Covers `auth::select_profile_handler`.

Route:

- `POST /api/auth/:schoolId/user/select-profile`

Source:

- Route registration: `rust/src/domain/auth/mod.rs:21`
- Handler: `rust/src/domain/auth/auth.rs:286-337`
- Request model: `rust/src/models/auth.rs:76-83`
- RLS public list: `rust/src/middleware/rls.rs:36-48`

## `POST /api/auth/:schoolId/user/select-profile`

### Purpose

After a global student/employee login returns multiple profiles, this endpoint selects the exact school/user profile and returns a school-scoped JWT.

### Auth

Bearer token required by global RLS middleware.

### Path params

- `schoolId` (string, required): Target school/tenant identifier.

### Request body

```json
{
  "ident": "9876543210",
  "userId": "EMP-00109",
  "userType": "employee"
}
```

### Expected success response

```json
{
  "success": true,
  "token": "jwt_token"
}
```

### Expected error responses

Missing authorization before handler:

```json
{
  "success": false,
  "message": "Missing authorization token"
}
```

Missing required fields are handled by serde/axum because request fields are non-optional `String`s. Handler-level empty-field validation returns:

```json
{
  "success": false,
  "error_code": "VALIDATION_ERR",
  "message": "ident, user_id, and user_type cannot be empty"
}
```

### Important rules

- `ident`, `userId`, and `userType` cannot be empty.
- `userId` accepts both `userId` and `user_id`.
- `userType` accepts both `userType` and `user_type`.
- Token expiration uses `session_duration_hours` from the selected school.
- If the school does not define `session_duration_hours`, the handler defaults to `720` hours.
- A `user_activity_logs` row is inserted with action `select-profile`.

### Test cases

#### TC_AUTH_PROFILE_001 Select student profile

- Type: positive
- Preconditions: Authenticated temporary token exists from `/api/auth/student/login`; student profile exists for `SCH-00021`.
- Request:
  - Method: `POST`
  - Route: `/api/auth/SCH-00021/user/select-profile`
  - Headers: `Authorization: Bearer <temp-token>`
  - Body: `{ "ident": "9876543210", "userId": "STD-99882", "userType": "student" }`
- Expected HTTP status: `200`
- Expected response: `success == true`, `token` is a non-empty string.
- Database/state assertion: `user_activity_logs` has action `select-profile`.

#### TC_AUTH_PROFILE_002 Select employee profile

- Type: positive
- Preconditions: Authenticated temporary token exists from `/api/auth/employee/login`.
- Request:
  - Method: `POST`
  - Route: `/api/auth/SCH-00021/user/select-profile`
  - Headers: `Authorization: Bearer <temp-token>`
  - Body: `{ "ident": "9876543211", "userId": "EMP-00109", "userType": "employee" }`
- Expected HTTP status: `200`
- Expected response: `token` is returned.

#### TC_AUTH_PROFILE_003 Missing authorization

- Type: negative
- Request:
  - Method: `POST`
  - Route: `/api/auth/SCH-00021/user/select-profile`
  - Body: `{ "ident": "9876543210", "userId": "STD-99882", "userType": "student" }`
- Expected HTTP status: `401`
- Expected response: RLS missing-auth response.

#### TC_AUTH_PROFILE_004 Missing ident

- Type: negative
- Preconditions: Valid bearer token exists.
- Request:
  - Method: `POST`
  - Route: `/api/auth/SCH-00021/user/select-profile`
  - Headers: `Authorization: Bearer <token>`
  - Body: `{ "userId": "STD-99882", "userType": "student" }`
- Expected HTTP status: `400` or JSON extraction error depending on Axum/serde behavior.

#### TC_AUTH_PROFILE_005 Missing userId

- Type: negative
- Preconditions: Valid bearer token exists.
- Request:
  - Method: `POST`
  - Route: `/api/auth/SCH-00021/user/select-profile`
  - Headers: `Authorization: Bearer <token>`
  - Body: `{ "ident": "9876543210", "userType": "student" }`
- Expected HTTP status: `400` or JSON extraction error depending on Axum/serde behavior.

#### TC_AUTH_PROFILE_006 Missing userType

- Type: negative
- Preconditions: Valid bearer token exists.
- Request:
  - Method: `POST`
  - Route: `/api/auth/SCH-00021/user/select-profile`
  - Headers: `Authorization: Bearer <token>`
  - Body: `{ "ident": "9876543210", "userId": "STD-99882" }`
- Expected HTTP status: `400` or JSON extraction error depending on Axum/serde behavior.

#### TC_AUTH_PROFILE_007 Empty string fields

- Type: boundary
- Preconditions: Valid bearer token exists.
- Request:
  - Method: `POST`
  - Route: `/api/auth/SCH-00021/user/select-profile`
  - Headers: `Authorization: Bearer <token>`
  - Body: `{ "ident": "", "userId": "STD-99882", "userType": "student" }`
- Expected HTTP status: `400`
- Expected response: `message == "ident, user_id, and user_type cannot be empty"`.
