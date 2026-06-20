# Token, Logout, and Security API Contract

Covers token verification, logout, and security question setup.

Routes:

- `POST /api/auth/school/verify-token`
- `POST /api/auth/school/logout`
- `POST /api/auth/school/set-security`

Source:

- Route registration: `rust/src/domain/auth/mod.rs:23-25`
- Verify token handler: `rust/src/domain/auth/auth.rs:105-123`
- Logout handler: `rust/src/domain/auth/auth.rs:126-144`
- Set security handler: `rust/src/domain/auth/auth.rs:147-154`
- Token request model: `rust/src/models/auth.rs:32-36`
- Set security model: `rust/src/models/auth.rs:45-50`
- RLS public list: `rust/src/middleware/rls.rs:36-48`

## Current-code auth note

`POST /api/auth/school/verify-token`, `POST /api/auth/school/logout`, and `POST /api/auth/school/set-security` are not listed as public in RLS. They require a valid `Authorization: Bearer ...` header before the handler runs.

## `POST /api/auth/school/verify-token`

### Purpose

Verifies a bearer token. The handler also has body-token parsing logic, but body-only requests cannot reach it under current RLS.

### Auth

Bearer token required by RLS middleware.

### Request

```http
Authorization: Bearer jwt_token
```

### Expected success response

Saved legacy/admin token response:

```json
{
  "success": true,
  "message": "Token valid",
  "token": {
    "tokenId": "jwt_token",
    "schoolId": "SCH-00021"
  }
}
```

JWT-derived response:

```json
{
  "success": true,
  "message": "Token valid",
  "token": {
    "sub": "9876543210",
    "role": "student",
    "status": "valid",
    "expiresAt": 1780000000
  }
}
```

Admin JWT-derived response:

```json
{
  "success": true,
  "message": "Token valid",
  "token": {
    "sub": "SCH-00021",
    "schoolId": "SCH-00021",
    "role": "admin",
    "permissions": ["admin"],
    "status": "valid",
    "expiresAt": 1780000000
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

Invalid or expired JWT before handler:

```json
{
  "success": false,
  "message": "Invalid or expired token: <error>"
}
```

### Important rules

- Header bearer token is required by current RLS.
- The handler checks the `Authorization` header before parsing a body token.
- Legacy saved tokens return only `tokenId` and `schoolId`.
- JWT tokens return decoded claims.

### Test cases

#### TC_AUTH_TOKEN_001 Verify token from authorization header

- Type: positive
- Request:
  - Method: `POST`
  - Route: `/api/auth/school/verify-token`
  - Headers: `Authorization: Bearer <token>`
- Expected HTTP status: `200`
- Expected response: `success == true`, `message == "Token valid"`.

#### TC_AUTH_TOKEN_002 Missing authorization header

- Type: negative
- Request:
  - Method: `POST`
  - Route: `/api/auth/school/verify-token`
  - Body: `{ "token": "<token>" }`
- Expected HTTP status: `401`
- Expected response: RLS missing-auth response.

#### TC_AUTH_TOKEN_003 Invalid token

- Type: negative
- Request:
  - Method: `POST`
  - Route: `/api/auth/school/verify-token`
  - Headers: `Authorization: Bearer invalid`
- Expected HTTP status: `401`

## `POST /api/auth/school/logout`

### Purpose

Revokes or records logout for the supplied bearer token.

### Auth

Bearer token required by RLS middleware.

### Request

```http
Authorization: Bearer jwt_token
```

### Expected success response

```json
{
  "success": true,
  "message": "Logged out, token revoked"
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

Invalid or expired JWT before handler:

```json
{
  "success": false,
  "message": "Invalid or expired token: <error>"
}
```

### Important rules

- Logout requires a valid bearer token under current RLS.
- If the token is a valid JWT but not found in saved token rows, logout still returns success because `revoke_token` is a no-op when no row matches.
- Body-token-only logout is not reachable under current RLS.

### Test cases

#### TC_AUTH_TOKEN_004 Logout with bearer token

- Type: positive
- Request:
  - Method: `POST`
  - Route: `/api/auth/school/logout`
  - Headers: `Authorization: Bearer <token>`
- Expected HTTP status: `200`
- Expected response: `success == true`.

#### TC_AUTH_TOKEN_005 Missing logout authorization

- Type: negative
- Request:
  - Method: `POST`
  - Route: `/api/auth/school/logout`
  - Body: `{ "token": "<token>" }`
- Expected HTTP status: `401`

#### TC_AUTH_TOKEN_006 Logout with valid JWT but unknown saved token

- Type: idempotency
- Preconditions: Token is a valid JWT but not saved in `tokens`.
- Request:
  - Method: `POST`
  - Route: `/api/auth/school/logout`
  - Headers: `Authorization: Bearer <valid-jwt-not-saved>`
- Expected HTTP status: `200`
- Expected response: `success == true`.

## `POST /api/auth/school/set-security`

### Purpose

Sets a security question and answer for school password recovery.

### Auth

Bearer token required by RLS middleware.

### Request body

```json
{
  "schoolId": "SCH-00021",
  "question": "What was the name of your first school?",
  "answer": "St. Marys"
}
```

### Expected success response

```json
{
  "success": true,
  "message": "Security question set"
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

Missing request fields are handled by serde/axum before handler-level validation.

### Important rules

- The answer is trimmed and lowercased before hashing.
- The question text is stored.
- The answer hash is stored, not the plain answer.
- An auth log with action `set-security` is added.
- The response must not contain the answer or answer hash.

### Test cases

#### TC_AUTH_TOKEN_007 Set security question

- Type: positive
- Request:
  - Method: `POST`
  - Route: `/api/auth/school/set-security`
  - Headers: `Authorization: Bearer <school-admin-token>`
  - Body: `{ "schoolId": "SCH-00021", "question": "What was the name of your first school?", "answer": "St. Marys" }`
- Expected HTTP status: `200`
- Expected response: `message == "Security question set"`.

#### TC_AUTH_TOKEN_008 Missing authorization

- Type: negative
- Request:
  - Method: `POST`
  - Route: `/api/auth/school/set-security`
  - Body: `{ "schoolId": "SCH-00021", "question": "What was the name of your first school?", "answer": "St. Marys" }`
- Expected HTTP status: `401`

#### TC_AUTH_TOKEN_009 Security answer is not returned

- Type: security
- Request:
  - Method: `POST`
  - Route: `/api/auth/school/set-security`
  - Headers: `Authorization: Bearer <school-admin-token>`
  - Body: `{ "schoolId": "SCH-00021", "question": "What was the name of your first school?", "answer": "St. Marys" }`
- Expected HTTP status: `200`
- Expected response: Response must not contain `answer` or `securityAnswerHash`.
