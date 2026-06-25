# Python v1 Auth API Contract

Covers all endpoints in `python/app/api/v1/auth.py`. This router mirrors Rust auth behavior with JWT-based stateless tokens.

Source:
- Router: `python/app/api/v1/auth.py:16`
- JWT utils: `python/app/utils/crypto.py`
- Password hashing: Argon2id via `python/app/utils/crypto.py`

---

## `POST /api/auth/school/login` (also `POST /api/auth/school`)

### Purpose

Authenticate a school admin using `schoolId` and `password`. Returns a JWT access token.

### Auth

Public. No bearer token required.

### Handler

`python/app/api/v1/auth.py:20-82`

### Request body

```json
{
  "schoolId": "SCH-00021",
  "password": "mySecurePassword"
}
```

Both `schoolId` and `school_id` are accepted for the school identifier field.

### Expected success response

**Status:** `200`

```json
{
  "success": true,
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1Ni...",
  "schoolId": "SCH-00021",
  "schoolName": "Vidhyam High School",
  "passwordTemp": false,
  "expiresIn": "24h"
}
```

### Expected error responses

Missing `schoolId` or `password` (HTTP 400):

```json
{
  "success": false,
  "message": "Missing schoolId or password"
}
```

Invalid JSON body (HTTP 400):

```json
{
  "success": false,
  "message": "Invalid JSON body"
}
```

Invalid credentials (HTTP 401):

```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

### Important rules

- Token uses `sub` = `school_id`, includes `school_id` (snake_case), `schoolId` (camelCase), `role: "admin"`, `permissions: ["admin"]`.
- Token expiry is `24h` (configured via `timedelta(hours=24)`).
- `passwordTemp` field indicates whether the school is using a temporary password (read from `auth.password_temp` column).
- School name is fetched from `schools` table; defaults to `"School Admin"` if not found.
- Both `POST /api/auth/school/login` and `POST /api/auth/school` hit the same handler.

### Test cases

#### TC_PYV1_AUTH_001 School login happy path

- Type: positive
- Preconditions: School `SCH-00021` exists in `auth` and `schools` tables with a known password.
- Request:
  - Method: `POST`
  - Route: `/api/auth/school/login`
  - Body: `{ "schoolId": "SCH-00021", "password": "mySecurePassword" }`
- Expected HTTP status: `200`
- Expected response: `success == true`, `accessToken` is a non-empty JWT string, `schoolId == "SCH-00021"`, `schoolName` is a non-empty string, `expiresIn == "24h"`.

#### TC_PYV1_AUTH_002 School login via alias route

- Type: positive
- Request:
  - Method: `POST`
  - Route: `/api/auth/school`
  - Body: `{ "schoolId": "SCH-00021", "password": "mySecurePassword" }`
- Expected HTTP status: `200`
- Expected response: Identical to `/api/auth/school/login` response.

#### TC_PYV1_AUTH_003 Missing schoolId

- Type: negative
- Request:
  - Method: `POST`
  - Route: `/api/auth/school/login`
  - Body: `{ "password": "mySecurePassword" }`
- Expected HTTP status: `400`
- Expected response: `message == "Missing schoolId or password"`.

#### TC_PYV1_AUTH_004 Missing password

- Type: negative
- Request:
  - Method: `POST`
  - Route: `/api/auth/school/login`
  - Body: `{ "schoolId": "SCH-00021" }`
- Expected HTTP status: `400`
- Expected response: `message == "Missing schoolId or password"`.

#### TC_PYV1_AUTH_005 Wrong password

- Type: negative
- Request:
  - Method: `POST`
  - Route: `/api/auth/school/login`
  - Body: `{ "schoolId": "SCH-00021", "password": "wrongPassword" }`
- Expected HTTP status: `401`
- Expected response: `message == "Invalid credentials"`.

#### TC_PYV1_AUTH_006 Non-existent school

- Type: negative
- Request:
  - Method: `POST`
  - Route: `/api/auth/school/login`
  - Body: `{ "schoolId": "NONEXISTENT", "password": "anyPassword" }`
- Expected HTTP status: `401`
- Expected response: `message == "Invalid credentials"`.

---

## `POST /api/auth/school/verify-token`

### Purpose

Verify a JWT token's validity and return its claims.

### Auth

Public. Token can be passed via `Authorization: Bearer <token>` header or in the request body.

### Handler

`python/app/api/v1/auth.py:86-108`

### Request body (optional)

```json
{
  "token": "eyJhbGciOiJIUzI1Ni..."
}
```

If no body is provided, the `Authorization` header is used.

### Expected success response

**Status:** `200`

```json
{
  "success": true,
  "valid": true,
  "schoolId": "SCH-00021",
  "role": "admin",
  "expiresAt": 1719000000
}
```

### Expected error responses

No token provided (HTTP 401):

```json
{
  "success": false,
  "message": "No token provided"
}
```

Token expired (HTTP 401):

```json
{
  "success": false,
  "valid": false,
  "message": "Token expired - please login again"
}
```

Invalid token (HTTP 401):

```json
{
  "success": false,
  "valid": false,
  "message": "<jwt error details>"
}
```

### Important rules

- Token is checked first from `Authorization: Bearer` header, then from request body (`token` or `accessToken` fields).
- The handler resolves `schoolId` from `school_id` (snake_case), `schoolId` (camelCase), or `sub` claim.

### Test cases

#### TC_PYV1_AUTH_007 Verify valid token

- Type: positive
- Preconditions: A valid JWT token from login.
- Request:
  - Method: `POST`
  - Route: `/api/auth/school/verify-token`
  - Header: `Authorization: Bearer <valid_token>`
- Expected HTTP status: `200`
- Expected response: `valid == true`, `schoolId` is non-empty, `role == "admin"`.

#### TC_PYV1_AUTH_008 Verify token from body

- Type: positive
- Request:
  - Method: `POST`
  - Route: `/api/auth/school/verify-token`
  - Body: `{ "token": "<valid_token>" }`
- Expected HTTP status: `200`
- Expected response: `valid == true`.

#### TC_PYV1_AUTH_009 No token provided

- Type: negative
- Request:
  - Method: `POST`
  - Route: `/api/auth/school/verify-token`
- Expected HTTP status: `401`
- Expected response: `message == "No token provided"`.

#### TC_PYV1_AUTH_010 Expired token

- Type: negative
- Preconditions: An expired JWT token.
- Request:
  - Method: `POST`
  - Route: `/api/auth/school/verify-token`
  - Header: `Authorization: Bearer <expired_token>`
- Expected HTTP status: `401`
- Expected response: `valid == false`, `message` contains "expired".

---

## `POST /api/auth/refresh`

### Purpose

Issue a fresh JWT token from a still-valid existing token.

### Auth

Bearer token required in `Authorization` header.

### Handler

`python/app/api/v1/auth.py:112-128`

### Expected success response

**Status:** `200`

```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1Ni...",
  "expiresIn": "24h"
}
```

### Expected error responses

No token (HTTP 401):

```json
{
  "success": false,
  "message": "No token"
}
```

Invalid/expired token (HTTP 401):

```json
{
  "success": false,
  "message": "<jwt error details>"
}
```

### Important rules

- New token preserves the original token's `role` and `permissions` claims.
- New token expiry is always `24h`.

### Test cases

#### TC_PYV1_AUTH_011 Refresh valid token

- Type: positive
- Preconditions: A valid JWT token.
- Request:
  - Method: `POST`
  - Route: `/api/auth/refresh`
  - Header: `Authorization: Bearer <valid_token>`
- Expected HTTP status: `200`
- Expected response: `accessToken` is a new non-empty string, `expiresIn == "24h"`.

#### TC_PYV1_AUTH_012 Refresh without token

- Type: negative
- Request:
  - Method: `POST`
  - Route: `/api/auth/refresh`
- Expected HTTP status: `401`
- Expected response: `message == "No token"`.

---

## `POST /api/auth/school/logout` (also `POST /api/auth/logout`)

### Purpose

Acknowledge logout. Stateless JWT - no server-side revocation.

### Auth

None enforced by handler.

### Handler

`python/app/api/v1/auth.py:132-136`

### Expected success response

**Status:** `200`

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Important rules

- This is a no-op acknowledgement. The token remains valid until it expires naturally.
- Frontend is responsible for discarding the token.

### Test cases

#### TC_PYV1_AUTH_013 Logout

- Type: positive
- Request:
  - Method: `POST`
  - Route: `/api/auth/school/logout`
- Expected HTTP status: `200`
- Expected response: `success == true`, `message == "Logged out successfully"`.

#### TC_PYV1_AUTH_014 Logout alias route

- Type: positive
- Request:
  - Method: `POST`
  - Route: `/api/auth/logout`
- Expected HTTP status: `200`
- Expected response: Same as `/api/auth/school/logout`.

---

## `POST /api/auth/school/change-password`

### Purpose

Change the school admin password. Requires old password verification.

### Auth

Public (no middleware enforcement). Handler validates old password internally.

### Handler

`python/app/api/v1/auth.py:140-169`

### Request body

```json
{
  "schoolId": "SCH-00021",
  "oldPassword": "currentPassword",
  "newPassword": "newSecurePassword123"
}
```

Both camelCase (`schoolId`, `oldPassword`, `newPassword`) and snake_case (`school_id`, `old_password`, `new_password`) field names are accepted.

### Expected success response

**Status:** `200`

```json
{
  "success": true,
  "message": "Password updated successfully"
}
```

### Expected error responses

Invalid JSON (HTTP 400):

```json
{
  "success": false,
  "message": "Invalid JSON"
}
```

Missing fields (HTTP 400):

```json
{
  "success": false,
  "message": "Missing schoolId, oldPassword, or newPassword"
}
```

Invalid old password (HTTP 401):

```json
{
  "success": false,
  "message": "Invalid old password"
}
```

### Important rules

- Password is hashed with Argon2id via `hash_password` from `app.utils.crypto`.
- On successful change, `password_temp` is set to `false` in the `auth` table.
- The handler creates its own DB session via `async_session_factory()`, not through `get_db_with_rls`.

### Test cases

#### TC_PYV1_AUTH_015 Change password happy path

- Type: positive
- Preconditions: School `SCH-00021` exists with known password.
- Request:
  - Method: `POST`
  - Route: `/api/auth/school/change-password`
  - Body: `{ "schoolId": "SCH-00021", "oldPassword": "currentPassword", "newPassword": "newSecurePassword123" }`
- Expected HTTP status: `200`
- Expected response: `success == true`, `message == "Password updated successfully"`.
- Database assertion: `auth.password` column updated, `auth.password_temp = false`.

#### TC_PYV1_AUTH_016 Change password with wrong old password

- Type: negative
- Request:
  - Method: `POST`
  - Route: `/api/auth/school/change-password`
  - Body: `{ "schoolId": "SCH-00021", "oldPassword": "wrongOldPassword", "newPassword": "newSecurePassword123" }`
- Expected HTTP status: `401`
- Expected response: `message == "Invalid old password"`.

#### TC_PYV1_AUTH_017 Change password missing fields

- Type: negative
- Request:
  - Method: `POST`
  - Route: `/api/auth/school/change-password`
  - Body: `{ "schoolId": "SCH-00021" }`
- Expected HTTP status: `400`
- Expected response: `message == "Missing schoolId, oldPassword, or newPassword"`.