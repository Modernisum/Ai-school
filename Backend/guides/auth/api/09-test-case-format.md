# Auth API Test Case Format

Use this format for every auth endpoint test case. Keep tests deterministic and avoid production data.

## Test setup

```bash
BASE_URL="http://localhost:8080"
SCHOOL_ID="SCH-00021"
```

Authenticated curl helper is defined in [Auth Test Data Rules](./10-test-data.md). Use that shared helper instead of duplicating token setup here.

If your environment uses a different login endpoint, replace the login command but keep the same assertion style.

Common success assertion:

```bash
jq -e '.success == true'
```

Common error assertion:

```bash
jq -e '.success == false and (.message | length > 0)'
```

## Test template

```md
### TC_AUTH_<AREA>_<NNN> <Short title>

Endpoint:

```bash
METHOD /api/auth/...
```

Request:

```bash
curl -s -X METHOD "$BASE_URL/api/auth/..." \
  -H "Content-Type: application/json" \
  -H "<auth-header>" \
  -d '{...}'
```

Expected:

- Status: `200`
- `.success == true`
- Specific field assertions
```

## Recommended test-case categories

### Positive happy path

Confirms the endpoint works with valid data and returns the documented success response.

### Missing required field

Confirms validation fails cleanly when required fields are absent.

### Invalid path parameter

Confirms behavior for missing, malformed, or non-existent IDs.

### Token validation

Confirms bearer token, expired token, invalid token, and missing token behavior.

### Tenant isolation

Confirms requests remain scoped to the correct school and cannot read or mutate another school's data.

### Boundary value

Confirms limits such as password length, empty strings, and invalid class ranges.

### Workflow state

Confirms multi-step flows such as setup -> auto-login -> school profile update.

### Rate limit/load

Confirms auth limiter behavior, especially HTTP `429` with `error_code == "RATE_LIMITED"` after repeated requests from the same IP.

### Idempotency/update behavior

Confirms update/upsert endpoints behave predictably when the same record is submitted again.

## Route coverage checklist

| File | Test ids |
|---|---|
| `01-login.md` | `TC_AUTH_LOGIN_001` to `TC_AUTH_LOGIN_010` |
| `02-profile-selection.md` | `TC_AUTH_PROFILE_001` to `TC_AUTH_PROFILE_007` |
| `03-support.md` | `TC_AUTH_SUPPORT_001` to `TC_AUTH_SUPPORT_004` |
| `04-token-logout-security.md` | `TC_AUTH_TOKEN_001` to `TC_AUTH_TOKEN_009` |
| `05-password-recovery.md` | `TC_AUTH_PASSWORD_001` to `TC_AUTH_PASSWORD_012` |
| `06-device-registration.md` | `TC_AUTH_DEVICE_001` to `TC_AUTH_DEVICE_006` |
| `07-setup.md` | `TC_AUTH_SETUP_001` to `TC_AUTH_SETUP_008` |
| `08-school-self-management.md` | `TC_AUTH_SCHOOL_001` to `TC_AUTH_SCHOOL_008` |

## Test data rules

- Use disposable school ids and disposable student/employee ids.
- Do not run destructive tests on production data.
- Do not commit real tokens, passwords, or school credentials.
- If a test needs a school admin token, create it through `POST /api/auth/school/login` in the test setup.
- If a test needs a student/employee token, create it through `POST /api/auth/:userType/login` followed by `POST /api/auth/:schoolId/user/select-profile`.
