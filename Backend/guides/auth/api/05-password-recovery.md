# Password Recovery API Contract

Covers forgot password, change password, and OTP verification.

Routes:

- `POST /api/auth/school/forgot-password`
- `POST /api/auth/school/change-password`
- `POST /api/auth/school/verify-otp`

Source:

- Route registration: `rust/src/domain/auth/mod.rs:26-28`
- Forgot password handler: `rust/src/domain/auth/auth.rs:157-169`
- Change password handler: `rust/src/domain/auth/auth.rs:181-190`
- Verify OTP handler: `rust/src/domain/auth/auth.rs:193-218`
- Request models: `rust/src/models/auth.rs:53-66`

## `POST /api/auth/school/forgot-password`

### Purpose

Generates a temporary password when the stored security answer matches.

### Auth

Public according to RLS middleware.

### Request body

```json
{
  "schoolId": "SCH-00021",
  "answer": "St. Marys"
}
```

### Expected success response

```json
{
  "success": true,
  "message": "Temporary password generated. Use it to login and change your password.",
  "tempPassword": "12345678"
}
```

### Expected error responses

Incorrect security answer:

```json
{
  "success": false,
  "error_code": "UNAUTHORIZED",
  "message": "Incorrect security answer"
}
```

Missing fields are handled by serde/axum as validation or JSON errors depending on request shape.

### Important rules

- The answer is trimmed and lowercased before comparison.
- The generated temporary password is an 8-digit string.
- The school password is updated to a hash of the temporary password.
- The auth record is marked as temporary password.
- An auth log with action `forgot-password` is added.
- This is a credential-mutation endpoint and must be rate-limited and monitored in production.

### Test cases

#### TC_AUTH_PASSWORD_001 Forgot password happy path

- Type: positive
- Preconditions: Security answer is already set for `SCH-00021`.
- Request:
  - Method: `POST`
  - Route: `/api/auth/school/forgot-password`
  - Body: `{ "schoolId": "SCH-00021", "answer": "St. Marys" }`
- Expected HTTP status: `200`
- Expected response: `tempPassword` is an 8-digit string.
- Database/state assertion: School auth password hash changes and temporary password flag is set.

#### TC_AUTH_PASSWORD_002 Incorrect security answer

- Type: negative
- Request:
  - Method: `POST`
  - Route: `/api/auth/school/forgot-password`
  - Body: `{ "schoolId": "SCH-00021", "answer": "wrong" }`
- Expected HTTP status: `401`

#### TC_AUTH_PASSWORD_003 Missing schoolId

- Type: negative
- Request:
  - Method: `POST`
  - Route: `/api/auth/school/forgot-password`
  - Body: `{ "answer": "St. Marys" }`
- Expected HTTP status: `400` or JSON parse error depending on request format.

#### TC_AUTH_PASSWORD_004 Missing answer

- Type: negative
- Request:
  - Method: `POST`
  - Route: `/api/auth/school/forgot-password`
  - Body: `{ "schoolId": "SCH-00021" }`
- Expected HTTP status: `400` or JSON parse error depending on request format.

#### TC_AUTH_PASSWORD_004B Repeated failed forgot-password attempts are rate-limited

- Type: rate-limit
- Preconditions: Security answer is not set or incorrect.
- Request:
  - Method: `POST`
  - Route: `/api/auth/school/forgot-password`
  - Body: `{ "schoolId": "SCH-00021", "answer": "wrong" }`
- Expected behavior: After the auth limiter threshold is reached, repeated requests should return HTTP `429` with `error_code == "RATE_LIMITED"`.

## `POST /api/auth/school/change-password`

### Purpose

Changes the school admin password using the old password and new password.

### Auth

Public according to RLS middleware, but business logic still requires valid old password.

### Request body

```json
{
  "schoolId": "SCH-00021",
  "oldPassword": "oldPassword",
  "newPassword": "newPassword123"
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

Invalid old password:

```json
{
  "success": false,
  "error_code": "UNAUTHORIZED",
  "message": "Invalid old password"
}
```

### Important rules

- This endpoint is public according to current RLS middleware.
- The old password is verified against the stored hash.
- The new password is hashed before storing.
- An auth log is added by the service.
- Because the route is public and mutates credentials, production tests must cover rate limiting and monitoring.

### Test cases

#### TC_AUTH_PASSWORD_005 Change password happy path

- Type: positive
- Preconditions: School exists and `oldPassword` matches.
- Request:
  - Method: `POST`
  - Route: `/api/auth/school/change-password`
  - Body: `{ "schoolId": "SCH-00021", "oldPassword": "oldPassword", "newPassword": "newPassword123" }`
- Expected HTTP status: `200`
- Expected response: `message == "Password updated successfully"`.
- Database/state assertion: School auth password hash changes.

#### TC_AUTH_PASSWORD_006 Invalid old password

- Type: negative
- Request:
  - Method: `POST`
  - Route: `/api/auth/school/change-password`
  - Body: `{ "schoolId": "SCH-00021", "oldPassword": "wrong", "newPassword": "newPassword123" }`
- Expected HTTP status: `401`

#### TC_AUTH_PASSWORD_007 Missing old password

- Type: negative
- Request:
  - Method: `POST`
  - Route: `/api/auth/school/change-password`
  - Body: `{ "schoolId": "SCH-00021", "newPassword": "newPassword123" }`
- Expected HTTP status: `400` or JSON parse error.

#### TC_AUTH_PASSWORD_008 Missing new password

- Type: negative
- Request:
  - Method: `POST`
  - Route: `/api/auth/school/change-password`
  - Body: `{ "schoolId": "SCH-00021", "oldPassword": "oldPassword" }`
- Expected HTTP status: `400` or JSON parse error.

#### TC_AUTH_PASSWORD_008B Repeated failed change-password attempts are rate-limited

- Type: rate-limit
- Preconditions: School exists and old password is wrong.
- Request:
  - Method: `POST`
  - Route: `/api/auth/school/change-password`
  - Body: `{ "schoolId": "SCH-00021", "oldPassword": "wrong", "newPassword": "newPassword123" }`
- Expected behavior: After the auth limiter threshold is reached, repeated requests should return HTTP `429` with `error_code == "RATE_LIMITED"`.

## `POST /api/auth/school/verify-otp`

### Purpose

Verifies an OTP-like token. Current implementation treats `idToken` as a token and verifies it through the auth service. It also accepts `otp` as a fallback field.

### Auth

Public.

### Request body

```json
{
  "idToken": "jwt_or_token_string"
}
```

Fallback:

```json
{
  "otp": "jwt_or_token_string"
}
```

### Expected success response

```json
{
  "success": true,
  "message": "OTP verified successfully",
  "user": {
    "uid": "SCH-00021",
    "email": "SCH-00021"
  }
}
```

### Expected error responses

Missing token:

```json
{
  "success": false,
  "error_code": "VALIDATION_ERR",
  "message": "Missing idToken"
}
```

Invalid token:

```json
{
  "success": false,
  "error_code": "UNAUTHORIZED",
  "message": "Invalid or expired token"
}
```

### Important rules

- `idToken` is preferred.
- `otp` is accepted as a fallback.
- If the token is invalid, `verify_token` returns an auth error.
- The `user.uid` and `user.email` are both derived from token `sub`.

### Test cases

#### TC_AUTH_PASSWORD_009 Verify OTP with idToken

- Type: positive
- Preconditions: A valid token exists.
- Request:
  - Method: `POST`
  - Route: `/api/auth/school/verify-otp`
  - Body: `{ "idToken": "<valid-token>" }`
- Expected HTTP status: `200`
- Expected response: `success == true`, `user.uid` is present.

#### TC_AUTH_PASSWORD_010 Verify OTP with otp fallback

- Type: positive
- Preconditions: A valid token exists.
- Request:
  - Method: `POST`
  - Route: `/api/auth/school/verify-otp`
  - Body: `{ "otp": "<valid-token>" }`
- Expected HTTP status: `200`

#### TC_AUTH_PASSWORD_011 Missing OTP token

- Type: negative
- Request:
  - Method: `POST`
  - Route: `/api/auth/school/verify-otp`
  - Body: `{}`
- Expected HTTP status: `400`
- Expected response: `message == "Missing idToken"`.

#### TC_AUTH_PASSWORD_012 Invalid OTP token

- Type: negative
- Request:
  - Method: `POST`
  - Route: `/api/auth/school/verify-otp`
  - Body: `{ "idToken": "invalid" }`
- Expected HTTP status: `401`
- Expected response: Invalid or expired token error.
