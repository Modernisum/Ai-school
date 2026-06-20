# Attendance & Leaves API Contract Index

This index is the route map for every endpoint registered in `rust/src/domain/attendance/mod.rs`. Each linked file contains request contracts, expected responses, error behavior, workflow rules, and API test cases.

Base prefix:

```text
/api/school/:schoolId/attendance
```

Leave prefix:

```text
/api/school/:schoolId/attendance/leave
```

## Route groups

| Group | File | Routes covered | Main workflow |
|---|---|---|---|
| Core attendance | [01-core-attendance.md](./01-core-attendance.md) | present, holiday, update, delete, list, date list | Daily attendance CRUD and roll-call reads |
| Bulk/class attendance | [02-bulk-attendance.md](./02-bulk-attendance.md) | `/bulk`, `/class` | Bulk mark attendance and class roll-call lookup |
| QR/mobile/offline sync | [03-qr-mobile-biometric.md](./03-qr-mobile-biometric.md) | `/qr`, `/user`, `/offline-sync` | QR generation, geofenced mobile check-in, offline biometric sync |
| Holidays | [04-holidays.md](./04-holidays.md) | `/holidays`, `/holidays/check`, `/holidays/:holidayId` | School holiday CRUD and date check |
| Reports | [05-reports.md](./05-reports.md) | `/`, `/reports/student`, `/reports/class`, `/reports/employee`, `/reports/custom` | Attendance analytics and reports |
| Public attendance | [06-public-attendance.md](./06-public-attendance.md) | `/public/attendance/:date` | API-key protected public attendance read |
| Leave applications | [07-leave-applications.md](./07-leave-applications.md) | `/leave`, `/leave/:leaveId/approve\|reject\|extend\|reduce\|pdf` | Leave create, list, approve/reject, duration changes, PDF |
| Leave balance/queue/details | [08-leave-balance-queue.md](./08-leave-balance-queue.md) | `/leave/balance/:employeeId`, `/leave/queue`, `/leave/details/:leaveId` | Leave balance, priority queue, leave details |
| Conditional leaves | [09-conditional-leaves.md](./09-conditional-leaves.md) | `/leave/:leaveId/conditional/approve\|respond`, `/leave/conditional/templates` | Conditional approval and templates |
| Coverage/proxy | [10-coverage-proxy.md](./10-coverage-proxy.md) | `/leave/:leaveId/coverage/assign\|available`, `/leave/coverage/:coverageId/accept` | Proxy/coverage assignment workflow |
| Workload assessment | [11-workload-assessment.md](./11-workload-assessment.md) | `/leave/:leaveId/workload/assess`, `/leave/:leaveId/workload/assessment` | AI syllabus impact and workload assessment |
| Notifications/flags | [12-leave-notifications-flags.md](./12-leave-notifications-flags.md) | `/leave/notifications`, `/leave/notifications/:notificationId/read`, `/leave/feature-flags` | Leave notifications and feature flags |
| Automation | [13-automation.md](./13-automation.md) | `/auto-assign-teacher` | Auto assign teacher workflow |
| Test format | [14-test-case-format.md](./14-test-case-format.md) | N/A | Reusable curl/jq test case format |

## Common auth and response shape

Most attendance endpoints run behind the global RLS/auth middleware:

```http
Authorization: Bearer <schoolOrAdminAccessToken>
X-School-ID: SCH-00021
```

If the token contains `schoolId`, the middleware uses that value. `X-Admin-ID` is optional and defaults to `unknown_admin`.

Most success responses use:

```json
{
  "success": true,
  "data": {}
}
```

Some handlers include top-level fields:

```json
{
  "success": true,
  "message": "Attendance marked present",
  "data": {},
  "location_verified": true,
  "distance_meters": 12.5
}
```

Most `AppResult` errors use:

```json
{
  "success": false,
  "error_code": "VALIDATION_ERR",
  "message": "Human readable error"
}
```

Many leave handlers return manual `500 INTERNAL_SERVER_ERROR` responses for service/repository failures:

```json
{
  "success": false,
  "message": "Human readable error"
}
```

## Important documentation notes

- `POST /api/school/:schoolId/attendance/qr` returns a base64 PNG QR image in `data.qr_code`.
- `POST /api/school/:schoolId/attendance/user` returns `location_verified` and `distance_meters` at top level.
- `POST /api/school/:schoolId/attendance/offline-sync` returns per-record success/error results.
- `GET /api/school/:schoolId/attendance/reports/employee` and `POST /api/school/:schoolId/attendance/reports/custom` are currently placeholder endpoints.
- Leave create auto-escalates student leaves longer than 3 days.
- Leave approve/reject/extend/reduce handlers accept `:leaveId` as a string path param, then services usually convert it to `i32`.
- `GET /api/school/:schoolId/attendance/public/attendance/:date` is intended for API-key auth with `read:attendance` scope. Current global middleware may also require a bearer token unless the route is added to the public path list.
- Many service/repository failures are returned as `500` in current code; document current behavior separately from desired product behavior.
