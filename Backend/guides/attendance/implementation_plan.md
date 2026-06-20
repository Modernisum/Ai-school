# Attendance & Leaves Documentation Implementation Plan

Yeh plan `rust/src/domain/attendance/mod.rs` aur `rust/src/domain/attendance/leave.rs` ke routes ko fresher-friendly `.md` docs mein split karne ke liye hai. Existing high-level manual `guides/attendance/attendance_guide.md` overview deta hai; ab har route group ke liye expected response aur test cases `guides/attendance/api/` ke andar maintain karna hai.

## 1. Source of truth

Start from:

```text
rust/src/domain/attendance/mod.rs
rust/src/domain/attendance/attendance.rs
rust/src/domain/attendance/attendance_automation.rs
rust/src/domain/attendance/leave.rs
```

For every route:

1. Method and path read from `mod.rs`.
2. Handler name read from the route declaration.
3. Request body/query/path params read from handler and `models/attendance.rs`.
4. Success/error response read from handler and service return shape.
5. Test case written with curl command and `jq` assertions.

Base route prefix:

```text
/api/school/:schoolId/attendance
```

Leave routes are nested under:

```text
/api/school/:schoolId/attendance/leave
```

## 2. Recommended file structure under `guides/attendance/api/`

Create these files:

| File | Routes covered | Purpose |
|---|---|---|
| `00-index.md` | All attendance/leave groups | Route map, common response shape, documentation notes |
| `01-core-attendance.md` | Present, holiday, update, delete, list, date list, class attendance | Daily attendance CRUD and roll-call behavior |
| `02-bulk-attendance.md` | `/bulk`, `/class` | Bulk student/employee attendance and class roll-call tests |
| `03-qr-mobile-biometric.md` | `/qr`, `/user`, `/offline-sync` | QR generation, geofenced mobile check-in, offline biometric sync |
| `04-holidays.md` | `/holidays`, `/holidays/check`, `/holidays/:holidayId` | Holiday CRUD and holiday-check API |
| `05-reports.md` | `/`, `/reports/student`, `/reports/class`, `/reports/employee`, `/reports/custom` | Attendance analytics and report APIs |
| `06-public-attendance.md` | `/public/attendance/:date` | API-key protected public attendance read API |
| `07-leave-applications.md` | `/leave`, `/leave/:leaveId/approve|reject|extend|reduce|pdf` | Leave create, list, approve/reject, duration changes, PDF |
| `08-leave-balance-queue.md` | `/leave/balance/:employeeId`, `/leave/queue`, `/leave/details/:leaveId` | Leave balance, queue, and detail lookups |
| `09-conditional-leaves.md` | `/leave/:leaveId/conditional/approve|respond`, `/leave/conditional/templates` | Conditional approval workflow and templates |
| `10-coverage-proxy.md` | `/leave/:leaveId/coverage/assign|available`, `/leave/coverage/:coverageId/accept` | Proxy/coverage assignment workflow |
| `11-workload-assessment.md` | `/leave/:leaveId/workload/assess`, `/leave/:leaveId/workload/assessment` | AI syllabus impact and workload assessment |
| `12-leave-notifications-flags.md` | `/leave/notifications`, `/leave/notifications/:notificationId/read`, `/leave/feature-flags` | Leave notifications and feature flags |
| `13-automation.md` | `/auto-assign-teacher` | Auto assign teacher workflow |
| `14-test-case-format.md` | Test format | Reusable curl/jq test case format for attendance docs |

## 3. Per-route documentation format

Every endpoint section should include:

```md
### Endpoint name

- **Endpoint:** `METHOD /api/school/:schoolId/attendance/...`
- **Handler:** `domain/attendance/<file>.rs::<handler>`
- **Auth/Middleware:** Admin bearer token, API key, or tenant context
- **Path params:** table
- **Query params:** table
- **Request body:** JSON sample, if applicable
- **Success response:** status code + JSON sample
- **Error response:** status code + JSON sample
- **Workflow rules:** important business constraints
- **Test case id:** link or inline curl assertion
```

Example:

```md
### TC_ATTENDANCE_QR_001 Generate classroom QR

- **Endpoint:** `POST /api/school/:schoolId/attendance/qr`
- **Expected success:** `200 OK`
- **Expected JSON:** `.success == true`, `.data.token` exists, `.data.expires_at` exists
- **Workflow rule:** `payload.school_id` must match the path `schoolId`.
```

## 4. Important current-code notes to document

While writing docs, preserve current implementation behavior even if it later needs cleanup:

- `POST /api/school/:schoolId/attendance/qr` generates a QR image and returns `qr_code` as base64 PNG inside `data`.
- `POST /api/school/:schoolId/attendance/user` returns `location_verified` and `distance_meters` at top level.
- `POST /api/school/:schoolId/attendance/offline-sync` never fails the whole request for one bad record; it returns per-record `results` with `success:false` errors.
- `GET /api/school/:schoolId/attendance/reports/employee` currently returns a placeholder response.
- `POST /api/school/:schoolId/attendance/reports/custom` currently returns a placeholder response.
- Many leave handlers return `500 INTERNAL_SERVER_ERROR` for service/repository failures. Document this as current behavior.
- Leave create auto-escalates student leaves longer than 3 days by adding `requiresAdminApproval` and `escalationReason`.

## 5. Test case rules

Minimum tests for each endpoint:

1. Success case with valid tenant/admin context.
2. Missing or invalid auth/middleware case where applicable.
3. Invalid role/path/body case where applicable.
4. Service failure case if easy to simulate.
5. State transition rule for workflow endpoints, e.g. approve/reject/extend/reduce leave.

For destructive or side-effectful tests:

- Use disposable school ids.
- Do not run delete/import/session-expiry tests on production data.
- Mark tests with `DISPOSABLE_DATA_REQUIRED`.

## 6. Definition of done

Attendance/leave API docs are done when:

- `guides/attendance/api/00-index.md` lists every route from `rust/src/domain/attendance/mod.rs`.
- Every route has expected request/response documentation in one of the split files.
- Every route has at least one test case id and curl-style request.
- Placeholder endpoints are explicitly marked as `IMPLEMENTATION_PENDING`.
- Current behavior and desired product behavior are separated in notes.
- `attendance_guide.md` links to the split docs.
