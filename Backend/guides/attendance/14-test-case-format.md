# Attendance API Test Case Format

Use this format for every attendance endpoint test. Keep tests deterministic and avoid production data.

## Test setup

```bash
BASE_URL="http://localhost:8080"
SCHOOL_ID="SCH-00021"
```

Authenticated curl helper:

```bash
TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/school/login" \
  -H "Content-Type: application/json" \
  -d '{"schoolId":"SCH-00021","email":"admin@school.com","password":"change-me"}' \
  | jq -r '.token // .accessToken // empty')

AUTH_HEADER="Authorization: Bearer $TOKEN"
```

If your environment uses a different auth endpoint, replace the login command but keep the same assertion style.

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
### TC_ATTENDANCE_<AREA>_<NNN> <Short title>

Endpoint:

```bash
METHOD /api/school/:schoolId/attendance/...
```

Request:

```bash
curl -s -X METHOD "$BASE_URL/api/school/$SCHOOL_ID/attendance/..." \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

Expected:

- Status: `200`
- `.success == true`
- `<specific field assertion>`
```

## Route coverage checklist

| File | Test ids |
|---|---|
| `01-core-attendance.md` | `TC_ATTENDANCE_CORE_001` to `TC_ATTENDANCE_CORE_007` |
| `02-bulk-attendance.md` | `TC_ATTENDANCE_BULK_001` to `TC_ATTENDANCE_BULK_003` |
| `03-qr-mobile-biometric.md` | `TC_ATTENDANCE_QR_001` to `TC_ATTENDANCE_QR_004` |
| `04-holidays.md` | `TC_ATTENDANCE_HOLIDAY_001` to `TC_ATTENDANCE_HOLIDAY_005` |
| `05-reports.md` | `TC_ATTENDANCE_REPORTS_001` to `TC_ATTENDANCE_REPORTS_005` |
| `06-public-attendance.md` | `TC_ATTENDANCE_PUBLIC_001` to `TC_ATTENDANCE_PUBLIC_002` |
| `07-leave-applications.md` | `TC_ATTENDANCE_LEAVE_001` to `TC_ATTENDANCE_LEAVE_007` |
| `08-leave-balance-queue.md` | `TC_ATTENDANCE_LEAVEBAL_001` to `TC_ATTENDANCE_LEAVEBAL_003` |
| `09-conditional-leaves.md` | `TC_ATTENDANCE_CONDITIONAL_001` to `TC_ATTENDANCE_CONDITIONAL_004` |
| `10-coverage-proxy.md` | `TC_ATTENDANCE_COVERAGE_001` to `TC_ATTENDANCE_COVERAGE_003` |
| `11-workload-assessment.md` | `TC_ATTENDANCE_WORKLOAD_001` to `TC_ATTENDANCE_WORKLOAD_002` |
| `12-leave-notifications-flags.md` | `TC_ATTENDANCE_NOTIFY_001` to `TC_ATTENDANCE_NOTIFY_004` |
| `13-automation.md` | `TC_ATTENDANCE_AUTO_001` |

## Test data rules

- Use disposable school ids and disposable student/employee ids.
- Do not run destructive tests on production data.
- For PDF tests, save output to `/tmp` and assert `%PDF` magic bytes.
- For public API key tests, use an API key with `read:attendance` scope.
- If current global middleware requires bearer auth on public attendance, document that in the test environment notes.
