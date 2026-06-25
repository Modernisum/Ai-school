# Operations API Test Case Format

Use this format for every endpoint test case in the Operations API docs.

```md
### Test Case: <short name>

- Type: positive / negative / boundary / workflow / tenant-isolation / idempotency
- Preconditions:
- Request:
  - Method:
  - Route:
  - Headers/Auth:
  - Body/Query:
- Expected HTTP status:
- Expected response:
- Database/state assertion:
- Side effects:
- Notes:
```

## Recommended test-case categories

### Positive happy path

Confirms the endpoint works with valid data and returns the documented success response.

### Missing required field

Confirms validation fails cleanly when required fields (`employeeIds`, `employee_id`, `name`, `studentId`, `category`, `summary`, etc.) are absent.

### Invalid path parameter

Confirms behavior for missing, malformed, or non-existent IDs (`responsibilityId`, `taskId`, `vehicleId`, `summaryId`, `studentId`).

### Tenant isolation

Confirms the request remains scoped to the tenant/school and cannot read or mutate another school's data. Critical for:

- Responsibility CRUD operations
- Complaint creation and listing
- Task listing and status updates
- Reminder listing

### Boundary value

Confirms limits such as:

- Empty `employeeIds` array in bulk operations
- Empty search query `q` in search endpoint
- `paginated` with `page=0` or `limit=0`
- Date range with `startDate` after `endDate`
- Invalid month (13) in `generate-salaries`

### Empty list

Confirms list endpoints return a safe empty array instead of failing:

- `GET /responsibility` with no responsibilities
- `GET /tasks` with no tasks
- `GET /complains` with no complaints
- `GET /reminders` with no reminders
- `GET /search?q=test` with no matches
- `GET /alerts/missing-responsibilities` with no alerts

### Workflow / state transition

Confirms valid state transitions:

- Task status: `todo` -> `in_progress` -> `completed`
- Bulk assign then bulk remove (idempotency)
- Rollback to valid version, rollback to non-existent version
- Version history after multiple updates

### Idempotency / update behavior

Confirms update/upsert endpoints behave predictably:

- Assigning same responsibility to same employee twice
- Removing already-removed responsibility
- Syncing fees when no changes needed

### External dependency failure

Confirms graceful handling when external services are down:

- `POST /tasks/ai/generate` when AI backend is unreachable
- `POST /transport/gps/:vehicleId` when Redis is not configured
- `GET /transport/bus-location/:vehicleId` when Redis is not configured

## Key response shape conventions

### Success responses

Most endpoints return:

```json
{
  "success": true,
  "data": { ... }
}
```

Or for bulk/mutation operations:

```json
{
  "success": true,
  "message": "Operation completed for N employees",
  "warnings": [ ... ]
}
```

### Error responses

```json
{
  "success": false,
  "message": "<error message>"
}
```

### Notable exceptions

- `POST /transport/gps/:vehicleId` returns plain text `"GPS Updated"` (not JSON).
- PDF report endpoints return binary `application/pdf` streams.
- CSV export returns `text/csv` with `Content-Disposition: attachment`.
- WebSocket endpoint upgrades from HTTP and uses custom message protocol.

## Database tables to verify

| Table | Key endpoints |
|---|---|
| `responsibilities` | CRUD, list, get, update, delete, import/export |
| `responsibility_assignments` | Bulk assign, remove, update, history |
| `responsibility_history` | Version list, rollback, history |
| `tasks` | List, update status, AI generate |
| `complains` | List, create |
| `reminders` | List |
| `gps_logs` | GPS publish (via Redis, periodically persisted to DB) |

## Redis keys to verify

| Key pattern | Endpoint |
|---|---|
| `school:{schoolId}:transport:{vehicleId}` | GPS publish, bus location |
| `school:{schoolId}:responsibilities` | WebSocket events, Pub/Sub channel |