# Academic API Test Case Format

Use this format for every endpoint test case in the Academic API docs.

```md
### Test Case: <short name>

- Type: positive / negative / boundary / workflow / tenant-isolation
- Preconditions:
- Request:
  - Method:
  - Route:
  - Headers/Auth:
  - Body/Query:
- Expected HTTP status:
- Expected response:
- Database/state assertion:
- Notes:
```

## Recommended test-case categories

### Positive happy path

Confirms the endpoint works with valid data and returns the documented success response.

### Missing required field

Confirms validation fails cleanly when required fields are absent.

### Invalid path parameter

Confirms behavior for missing, malformed, or non-existent IDs.

### Tenant isolation

Confirms the request remains scoped to the tenant/school and cannot read or mutate another school's data.

### Workflow state violation

Confirms invalid workflow transitions are blocked, for example:

- Checker review after teacher approval.
- Teacher approve/reject after publish.
- Timetable approve with conflicts.
- Delete active timetable.

### Boundary value

Confirms limits such as:

- OMR question count must be a multiple of 5.
- OMR/announced test date must be at least 3 days in the future.
- Timetable day/period values must be valid.
- Exam marks must not exceed section max marks.

### Empty list

Confirms list endpoints return a safe empty array instead of failing.

### Idempotency/update behavior

Confirms update/upsert endpoints behave predictably when the same record is submitted again.
