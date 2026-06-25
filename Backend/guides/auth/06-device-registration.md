# Device Registration API Contract

Covers `auth::register_device_handler`.

Route:

- `POST /api/auth/register-device`

Source:

- Route registration: `rust/src/domain/auth/mod.rs:29`
- Handler: `rust/src/domain/auth/auth.rs:205-283`
- Request model: `rust/src/domain/auth/auth.rs:207-218`
- RLS public list: `rust/src/middleware/rls.rs:36-48`

## `POST /api/auth/register-device`

### Purpose

Registers a device token for push notifications.

### Auth

Bearer token is required by current RLS middleware. Explicit `schoolId` and `userId` in the body do not bypass auth.

### Request body with token-derived identity

```json
{
  "fcmToken": "fcm_token_string",
  "deviceType": "android",
  "deviceId": "device_id_hash"
}
```

### Request body with explicit identity

```json
{
  "schoolId": "SCH-00021",
  "userId": "STD-99882",
  "fcmToken": "fcm_token_string",
  "deviceType": "android",
  "deviceId": "device_id_hash"
}
```

### Accepted aliases

- `fcmToken` or `fcm_token`
- `deviceType` or `device_type`
- `deviceId` or `device_id`
- `schoolId` or `school_id`
- `userId` or `user_id`

### Expected success response

```json
{
  "success": true,
  "message": "Device registered successfully"
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

Invalid bearer token before handler:

```json
{
  "success": false,
  "message": "Invalid or expired token: <error>"
}
```

Missing device token after handler reaches route:

```json
{
  "success": false,
  "error_code": "VALIDATION_ERR",
  "message": "Missing device token (token or device_id)"
}
```

Could not resolve school id:

```json
{
  "success": false,
  "error_code": "VALIDATION_ERR",
  "message": "Could not resolve schoolId"
}
```

Could not resolve user id:

```json
{
  "success": false,
  "error_code": "VALIDATION_ERR",
  "message": "Could not resolve userId"
}
```

### Important rules

- `token` is taken from `fcmToken`/`fcm_token` or falls back to `deviceId`/`device_id`.
- If `schoolId` or `userId` is missing, the handler verifies the bearer token and extracts identity.
- For admin tokens, `schoolId` is read from token and `userId` defaults to `admin`.
- For student/employee tokens, the handler looks up the global user by `sub` and matches by `role`.
- Database insert uses `ON CONFLICT (user_id, school_id, token) DO UPDATE SET last_seen_at = NOW()`.
- Platform is stored as-is from `deviceType`/`device_type`.

### Test cases

#### TC_AUTH_DEVICE_001 Register device with token-derived identity

- Type: positive
- Preconditions: Valid bearer token exists.
- Request:
  - Method: `POST`
  - Route: `/api/auth/register-device`
  - Headers: `Authorization: Bearer <token>`
  - Body: `{ "fcmToken": "fcm_test_token_001", "deviceType": "android", "deviceId": "device_001" }`
- Expected HTTP status: `200`
- Expected response: `success == true`.
- Database/state assertion: `user_device_tokens` has one row for the resolved user, school, and `fcm_test_token_001`.

#### TC_AUTH_DEVICE_002 Register device with explicit identity

- Type: positive
- Preconditions: Valid bearer token exists.
- Request:
  - Method: `POST`
  - Route: `/api/auth/register-device`
  - Headers: `Authorization: Bearer <token>`
  - Body: `{ "schoolId": "SCH-00021", "userId": "STD-99882", "fcmToken": "fcm_test_token_002", "deviceType": "android", "deviceId": "device_002" }`
- Expected HTTP status: `200`
- Expected response: `success == true`.
- Database/state assertion: `user_device_tokens` has one row for `(STD-99882, SCH-00021, fcm_test_token_002)`.

#### TC_AUTH_DEVICE_003 Missing authorization

- Type: negative
- Request:
  - Method: `POST`
  - Route: `/api/auth/register-device`
  - Body: `{ "schoolId": "SCH-00021", "userId": "STD-99882", "fcmToken": "fcm_test_token_003", "deviceType": "android" }`
- Expected HTTP status: `401`
- Expected response: RLS missing-auth response.

#### TC_AUTH_DEVICE_004 Missing device token

- Type: negative
- Preconditions: Valid bearer token exists.
- Request:
  - Method: `POST`
  - Route: `/api/auth/register-device`
  - Headers: `Authorization: Bearer <token>`
  - Body: `{ "schoolId": "SCH-00021", "userId": "STD-99882" }`
- Expected HTTP status: `400`
- Expected response: `message == "Missing device token (token or device_id)"`.

#### TC_AUTH_DEVICE_005 Invalid bearer token

- Type: negative
- Request:
  - Method: `POST`
  - Route: `/api/auth/register-device`
  - Headers: `Authorization: Bearer invalid`
  - Body: `{ "fcmToken": "fcm_test_token_005", "deviceType": "android" }`
- Expected HTTP status: `401`

#### TC_AUTH_DEVICE_006 Duplicate device token is idempotent

- Type: idempotency
- Preconditions: Device token already exists for the same user and school.
- Request:
  - Method: `POST`
  - Route: `/api/auth/register-device`
  - Headers: `Authorization: Bearer <token>`
  - Body: Same device token as existing row.
- Expected HTTP status: `200`
- Database/state assertion: Row count does not increase; `last_seen_at` is updated.
