# Auth API Contract Index

This index is the route map for every endpoint registered in `rust/src/domain/auth/mod.rs:19-34`. Each linked file contains request contracts, expected responses, error behavior, workflow rules, and test cases.

All endpoints are nested under `/api` by `rust/src/domain/mod.rs:93-95`, so documented paths start with `/api/auth/...`.

## Route groups

| Group | File | Routes covered | Main workflow |
|---|---|---|---|
| Login | [01-login.md](./01-login.md) | `POST /api/auth/:userType/login`, `POST /api/auth/school/login` | Authenticate students, employees, school admins, and schools |
| Profile selection | [02-profile-selection.md](./02-profile-selection.md) | `POST /api/auth/:schoolId/user/select-profile` | Select a specific school/user profile after global login |
| Support | [03-support.md](./03-support.md) | `POST /api/auth/school/support` | Submit onboarding/login support requests |
| Token, logout, security | [04-token-logout-security.md](./04-token-logout-security.md) | `POST /api/auth/school/verify-token`, `POST /api/auth/school/logout`, `POST /api/auth/school/set-security` | Validate tokens, revoke sessions, configure recovery question |
| Password recovery | [05-password-recovery.md](./05-password-recovery.md) | `POST /api/auth/school/forgot-password`, `POST /api/auth/school/change-password`, `POST /api/auth/school/verify-otp` | Generate temp password, change password, verify OTP/token |
| Device registration | [06-device-registration.md](./06-device-registration.md) | `POST /api/auth/register-device` | Register FCM/device tokens for push notifications |
| School setup | [07-setup.md](./07-setup.md) | `POST /api/auth/setup/school` | Create a new school tenant |
| School self management | [08-school-self-management.md](./08-school-self-management.md) | `GET`, `PUT`, `PATCH /api/school/:schoolId` | Read/update school profile and school admin password |
| Test format | [09-test-case-format.md](./09-test-case-format.md) | Shared test-case template | Standard format for all auth tests |
| Test data | [10-test-data.md](./10-test-data.md) | Shared test data rules | Disposable schools, tokens, and environment notes |

## Common response shape

Most auth success responses use:

```json
{
  "success": true,
  "message": "..."
}
```

Some handlers return data wrappers:

```json
{
  "success": true,
  "data": {}
}
```

Most error responses use:

```json
{
  "success": false,
  "error_code": "VALIDATION_ERR",
  "message": "Missing school_id"
}
```

Generic error mapping is defined in `rust/src/error.rs:90-98`.

## Rate limits

- Auth routes under `/api/auth` have auth-specific rate limiting from `rust/src/domain/auth/mod.rs:36-43`.
- Current auth limiter is `5 requests/minute/IP` from `rust/src/middleware/rate_limiter.rs:34-36`.
- General API limiter is `500 requests/minute/IP` from `rust/src/middleware/rate_limiter.rs:29-31`.
- When the auth limiter rejects a request, the response is:

```json
{
  "success": false,
  "error_code": "RATE_LIMITED",
  "message": "Too many requests. Please try again later."
}
```

## Important current-code notes

- Auth routes have auth-specific rate limiting in `rust/src/domain/auth/mod.rs:36-43`.
- The whole API has general rate limiting in `rust/src/domain/mod.rs:84-91`.
- Public auth routes are listed in `rust/src/middleware/rls.rs:43-48`.
- `POST /api/auth/school/change-password` is currently public according to RLS middleware, even though the handler name suggests a password update flow.
- `POST /api/auth/school/support` is implemented by `admin::create_support_request`, not by an auth handler.
- `POST /api/auth/setup/school` requires bearer auth under current RLS middleware, even though onboarding may be intended to be public later.
- `POST /api/auth/setup/school` returns raw setup data if automatic login fails; this fallback must not expose credentials in production.
- `POST /api/auth/register-device` requires bearer auth under current RLS middleware; handler can resolve `schoolId` and `userId` from that token when they are not supplied.
- `PUT /api/school/:schoolId` and `PATCH /api/school/:schoolId` currently do not enforce that the token school matches the path `schoolId`.
