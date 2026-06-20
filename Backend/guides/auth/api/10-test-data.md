# Auth Test Data Rules

Use disposable data for all auth tests. Do not put production credentials, real tokens, or real school secrets in documentation or tests.

## Local environment

```bash
BASE_URL="http://localhost:8080"
SCHOOL_ID="SCH-00021"
STUDENT_IDENT="9876543210"
EMPLOYEE_IDENT="9876543211"
```

## School admin login helper

```bash
TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/school/login" \
  -H "Content-Type: application/json" \
  -d "{\"schoolId\":\"$SCHOOL_ID\",\"password\":\"change-me\"}" \
  | jq -r '.accessToken // empty')
```

## Student or employee login helper

```bash
TEMP_TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/student/login" \
  -H "Content-Type: application/json" \
  -d "{\"ident\":\"$STUDENT_IDENT\"}" \
  | jq -r '.accessToken // empty')
```

## Profile selection helper

```bash
TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/$SCHOOL_ID/user/select-profile" \
  -H "Authorization: Bearer $TEMP_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"ident\":\"$STUDENT_IDENT\",\"userId\":\"STD-99882\",\"userType\":\"student\"}" \
  | jq -r '.token // empty')
```

## Suggested disposable values

| Area | Example | Notes |
|---|---|---|
| School id | `SCH-AUTH-001` | Use a prefix that clearly marks test data |
| Student ident | `9990000001` | Use a phone/email that is not linked to a real user |
| Employee ident | `9990000002` | Use a phone/email that is not linked to a real employee |
| Device token | `fcm_test_token_001` | Should be unique per device registration test |
| Security answer | `test-school-answer` | Do not reuse production recovery answers |
| Temporary password | `12345678` | Only as expected shape; real temp password is generated |

## Assertions

Use these common assertions:

```bash
jq -e '.success == true'
jq -e '.accessToken | type == "string" and length > 0'
jq -e '.token | type == "string" and length > 0'
jq -e '.success == false and (.message | length > 0)'
```

## Database assertions

For tests that mutate state, assert the smallest safe database effect:

- Login should not create users.
- Profile selection should create a `user_activity_logs` row with action `select-profile`.
- Device registration should insert or update `user_device_tokens`.
- Forgot password should update the school auth password hash and mark `passwordTemp`.
- Change password should update the school auth password hash.
- Setup should create a new school row, tenant schema, admin user, default spaces, classes, responsibilities, holidays, and fee templates. This is a high-cost integration assertion; run it sparingly on disposable data.

## Cleanup rules

- Prefer tests that use unique ids and can be left as inactive test rows.
- For destructive tests, clean only the rows created by the test.
- Never clean shared demo or production schools.
- Keep cleanup commands out of committed docs unless they are safe and idempotent.
