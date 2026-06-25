# Responsibility Advanced API Contract

Covers `responsibility_analytics`, `overview_analytics`, `get_responsibility_history`, `get_responsibility_versions`, `rollback_responsibility`, `sync_student_fees`, `sync_student_fees_for_resp`, `generate_salaries`, `get_space_financial_overview`, `get_missing_responsibility_alerts`, and WebSocket handler.

---

## `GET /api/school/:schoolId/operations/responsibility/:responsibilityId/analytics`

- Handler: `rust/src/domain/operations/responsibility.rs::responsibility_analytics`
- Purpose: Get detailed analytics for a specific responsibility.
- Auth/Tenant: Scoped to `schoolId` and `responsibilityId`.

### Request

Path params:

- `schoolId`: school/tenant identifier.
- `responsibilityId`: responsibility identifier.

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": {
    "responsibilityId": "RES-001",
    "name": "Class 10-A Teacher",
    "totalAssignments": 5,
    "activeAssignments": 4,
    "assignmentHistory": [ ... ],
    "spaceCoverage": [ ... ],
    "revenueImpact": 150000
  }
}
```

### Expected error response

`500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "<error message>"
}
```

### Test cases

#### Get responsibility analytics

- Type: positive
- Request: `GET /api/school/SCH-001/operations/responsibility/RES-001/analytics`
- Expected HTTP status: `200`
- Expected response: `success: true`, `data.responsibilityId == "RES-001"`.

#### Analytics for non-existent responsibility

- Type: negative
- Request: `GET /api/school/SCH-001/operations/responsibility/RES-999/analytics`
- Expected HTTP status: `500` (based on current handler behavior)
- Expected response: `{ success: false, message: "<error>" }`

---

## `GET /api/school/:schoolId/operations/responsibility/overview/analytics`

- Handler: `rust/src/domain/operations/responsibility.rs::overview_analytics`
- Purpose: Get overview analytics for all responsibilities in the school.
- Auth/Tenant: Scoped to `schoolId`.

### Request

Path params:

- `schoolId`: school/tenant identifier.

Query params (optional):

| Param | Type | Default | Description |
|---|---|---|---|
| `timeRange` | string | `"30d"` | Time range for analytics (e.g., `7d`, `30d`, `90d`, `1y`) |

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": {
    "totalResponsibilities": 45,
    "totalAssignments": 120,
    "activeAssignments": 98,
    "utilizationTrend": [ ... ],
    "workloadDistribution": { ... },
    "revenueOverview": { ... }
  }
}
```

### Expected error response

`500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "<error message>"
}
```

### Test cases

#### Get overview analytics (default timeRange)

- Type: positive
- Request: `GET /api/school/SCH-001/operations/responsibility/overview/analytics`
- Expected HTTP status: `200`
- Expected response: `success: true`, `data` contains overview metrics.

#### Get overview with custom timeRange

- Type: positive
- Request: `GET /api/school/SCH-001/operations/responsibility/overview/analytics?timeRange=90d`
- Expected HTTP status: `200`
- Expected response: Data scoped to 90-day window.

---

## `GET /api/school/:schoolId/operations/responsibility/:responsibilityId/history`

- Handler: `rust/src/domain/operations/responsibility.rs::get_responsibility_history`
- Purpose: Get assignment history for a specific responsibility.
- Auth/Tenant: Scoped to `schoolId` and `responsibilityId`.

### Request

Path params:

- `schoolId`: school/tenant identifier.
- `responsibilityId`: responsibility identifier.

Query params (optional):

| Param | Type | Default | Description |
|---|---|---|---|
| `limit` | integer | `50` | Max number of history entries to return |

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": {
    "responsibilityId": "RES-001",
    "assignments": [
      {
        "employeeId": "EMP-001",
        "employeeName": "Sunita Rao",
        "action": "assigned",
        "timestamp": "2026-06-15T10:30:00Z",
        "performedBy": "ADMIN-001"
      },
      {
        "employeeId": "EMP-001",
        "employeeName": "Sunita Rao",
        "action": "removed",
        "timestamp": "2026-03-01T09:00:00Z",
        "performedBy": "ADMIN-002"
      }
    ]
  }
}
```

### Expected error response

`500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "<error message>"
}
```

### Test cases

#### Get assignment history

- Type: positive
- Request: `GET /api/school/SCH-001/operations/responsibility/RES-001/history`
- Expected HTTP status: `200`
- Expected response: `data.assignments` is an array of history entries.

#### Get history with limit

- Type: boundary
- Request: `GET /api/school/SCH-001/operations/responsibility/RES-001/history?limit=10`
- Expected HTTP status: `200`
- Expected response: `data.assignments` has at most 10 entries.

---

## `GET /api/school/:schoolId/operations/responsibility/:responsibilityId/versions`

- Handler: `rust/src/domain/operations/responsibility.rs::get_responsibility_versions`
- Purpose: Get version history for a responsibility configuration.
- Auth/Tenant: Scoped to `schoolId` and `responsibilityId`.

### Request

Path params:

- `schoolId`: school/tenant identifier.
- `responsibilityId`: responsibility identifier.

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": {
    "responsibilityId": "RES-001",
    "versions": [
      {
        "version": 5,
        "name": "Class 10-A Senior Teacher",
        "weeklyPeriods": 32,
        "updatedAt": "2026-06-20T14:00:00Z",
        "updatedBy": "ADMIN-001"
      },
      {
        "version": 4,
        "name": "Class 10-A Teacher",
        "weeklyPeriods": 30,
        "updatedAt": "2026-03-15T10:00:00Z",
        "updatedBy": "ADMIN-002"
      }
    ]
  }
}
```

### Expected error response

`500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "<error message>"
}
```

### Test cases

#### Get version history

- Type: positive
- Request: `GET /api/school/SCH-001/operations/responsibility/RES-001/versions`
- Expected HTTP status: `200`
- Expected response: `data.versions` lists all historical versions.

#### No version history

- Type: positive
- Preconditions: Responsibility has never been updated.
- Expected HTTP status: `200`
- Expected response: `data.versions` is empty array.

---

## `POST /api/school/:schoolId/operations/responsibility/:responsibilityId/rollback/:version`

- Handler: `rust/src/domain/operations/responsibility.rs::rollback_responsibility`
- Purpose: Roll back a responsibility to a specific historical version.
- Auth/Tenant: Requires authenticated tenant context. `admin_id` is used as performer.

### Request

Path params:

- `schoolId`: school/tenant identifier.
- `responsibilityId`: responsibility identifier.
- `version`: version number to roll back to (integer).

### Expected success response

`200 OK`

```json
{
  "success": true,
  "message": "Responsibility rolled back to version 4"
}
```

### Expected error response

`500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "<error message>"
}
```

### Important rules

- The target version must exist in the version history table.
- Rollback creates a new version entry (not destructive).

### Test cases

#### Successful rollback

- Type: positive
- Preconditions: `RES-001` has version 5 as current, version 4 exists in history.
- Request: `POST /api/school/SCH-001/operations/responsibility/RES-001/rollback/4`
- Expected HTTP status: `200`
- Expected response: `{ success: true, message: "Responsibility rolled back to version 4" }`
- Database/state assertion: Responsibility config matches version 4; new version entry created.

#### Rollback to non-existent version

- Type: negative
- Request: `POST /api/school/SCH-001/operations/responsibility/RES-001/rollback/99`
- Expected HTTP status: `500`
- Expected response: `{ success: false, message: "<error>" }`

---

## `POST /api/school/:schoolId/operations/responsibility/sync-student-fees`

- Handler: `rust/src/domain/operations/responsibility.rs::sync_student_fees`
- Purpose: Recalculate and sync student fees from responsibility assignments for all students in the school.
- Auth/Tenant: Requires tenant context. Scoped to `schoolId`.

### Request

Path params:

- `schoolId`: school/tenant identifier.

No body required.

### Expected success response

`200 OK`

```json
{
  "success": true,
  "message": "Student fees synced for 150 students",
  "affectedCount": 150
}
```

### Expected error response

`500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "<error message>"
}
```

### Test cases

#### Sync all student fees

- Type: positive
- Request: `POST /api/school/SCH-001/operations/responsibility/sync-student-fees`
- Expected HTTP status: `200`
- Expected response: `success: true`, `affectedCount` is a positive integer.
- Database/state assertion: Student fee records updated from responsibility assignments.

#### Sync with no students

- Type: boundary
- Preconditions: School has no students.
- Expected HTTP status: `200`
- Expected response: `{ success: true, affectedCount: 0 }`

---

## `POST /api/school/:schoolId/operations/responsibility/:responsibilityId/sync-student-fees`

- Handler: `rust/src/domain/operations/responsibility.rs::sync_student_fees_for_resp`
- Purpose: Recalculate student fees for spaces covered by a specific responsibility.
- Auth/Tenant: Requires tenant context. Scoped to `schoolId` and `responsibilityId`.

### Request

Path params:

- `schoolId`: school/tenant identifier.
- `responsibilityId`: responsibility identifier.

### Expected success response

`200 OK`

```json
{
  "success": true,
  "message": "Student fees synced for 30 students",
  "affectedCount": 30
}
```

### Expected error response

`500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "<error message>"
}
```

### Test cases

#### Sync fees for specific responsibility

- Type: positive
- Request: `POST /api/school/SCH-001/operations/responsibility/RES-001/sync-student-fees`
- Expected HTTP status: `200`
- Expected response: `success: true`, only students in spaces covered by `RES-001` are affected.

---

## `POST /api/school/:schoolId/operations/responsibility/generate-salaries/:month/:year`

- Handler: `rust/src/domain/operations/responsibility.rs::generate_salaries`
- Purpose: Generate monthly salary records for all employees based on responsibility assignments.
- Auth/Tenant: Requires tenant context. Scoped to `schoolId`.

### Request

Path params:

- `schoolId`: school/tenant identifier.
- `month`: month number (1-12).
- `year`: year (e.g., 2026).

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": {
    "month": 6,
    "year": 2026,
    "totalEmployees": 25,
    "totalSalary": 450000,
    "generatedRecords": 25
  }
}
```

### Expected error response

`500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "<error message>"
}
```

### Test cases

#### Generate salaries for month

- Type: positive
- Request: `POST /api/school/SCH-001/operations/responsibility/generate-salaries/6/2026`
- Expected HTTP status: `200`
- Expected response: `success: true`, `data.generatedRecords` > 0.
- Database/state assertion: Salary records created in database.

#### Invalid month

- Type: boundary
- Request: `POST /api/school/SCH-001/operations/responsibility/generate-salaries/13/2026`
- Expected HTTP status: `500` (based on current handler behavior)
- Expected response: `{ success: false, message: "<error>" }`

---

## `GET /api/school/:schoolId/operations/responsibility/spaces/:spaceId/financial-overview`

- Handler: `rust/src/domain/operations/responsibility.rs::get_space_financial_overview`
- Purpose: Get financial overview for a specific space including revenue and costs.
- Auth/Tenant: Scoped to `schoolId` and `spaceId`.

### Request

Path params:

- `schoolId`: school/tenant identifier.
- `spaceId`: space identifier.

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": {
    "spaceId": "CLS_10A",
    "spaceName": "Classroom 10-A",
    "totalRevenue": 150000,
    "totalCost": 45000,
    "netIncome": 105000,
    "studentCount": 30,
    "assignedResponsibilities": [ ... ]
  }
}
```

### Expected error response

`500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "<error message>"
}
```

### Test cases

#### Get space financial overview

- Type: positive
- Request: `GET /api/school/SCH-001/operations/responsibility/spaces/CLS_10A/financial-overview`
- Expected HTTP status: `200`
- Expected response: `success: true`, `data.netIncome` is calculated.

---

## `GET /api/school/:schoolId/operations/responsibility/alerts/missing-responsibilities`

- Handler: `rust/src/domain/operations/responsibility.rs::get_missing_responsibility_alerts`
- Purpose: Find spaces that are missing required responsibilities.
- Auth/Tenant: Scoped to `schoolId`.

### Request

Path params:

- `schoolId`: school/tenant identifier.

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": [
    {
      "spaceId": "LAB_CHEMISTRY",
      "spaceName": "Chemistry Lab",
      "missingResponsibilities": ["Lab Assistant", "Lab Safety Officer"],
      "severity": "high"
    }
  ],
  "total": 1
}
```

### Expected error response

`500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "<error message>"
}
```

### Test cases

#### Get missing responsibility alerts

- Type: positive
- Request: `GET /api/school/SCH-001/operations/responsibility/alerts/missing-responsibilities`
- Expected HTTP status: `200`
- Expected response: `success: true`, `total` is the count of spaces with missing responsibilities.

#### No alerts

- Type: positive
- Preconditions: All spaces have all required responsibilities.
- Expected HTTP status: `200`
- Expected response: `{ success: true, data: [], total: 0 }`

---

## `GET /api/school/:schoolId/operations/responsibility/ws` (WebSocket Upgrade)

- Handler: `rust/src/domain/operations/responsibility_ws.rs::responsibility_ws_handler`
- Purpose: Real-time WebSocket connection for responsibility change events.
- Protocol: WebSocket upgrade from HTTP GET.

### Connection flow

1. Client sends HTTP GET with `Upgrade: websocket` header.
2. Server upgrades to WebSocket.
3. Client sends first message — authentication payload.
4. If authenticated, client subscribes to Redis Pub/Sub channel `school:{schoolId}:responsibilities`.
5. Server pushes real-time events as they occur.

### Authentication message (first message from client)

```json
{
  "token": "jwt_token_here",
  "school_id": "SCH-001",
  "user_id": "ADMIN-001"
}
```

### Expected success after auth

Server sends: `"Authenticated successfully"`

### Expected failure after auth

Server sends: `"Authentication failed"` and closes the connection.

### Event types received

```json
{
  "type": "responsibility_assigned",
  "data": {
    "responsibility_id": "RES-001",
    "employee_id": "EMP-001",
    "employee_name": "Sunita Rao",
    "responsibility_name": "Class 10-A Teacher",
    "timestamp": "2026-06-21T10:30:00Z"
  }
}
```

```json
{
  "type": "responsibility_updated",
  "data": {
    "responsibility_id": "RES-001",
    "field": "weeklyPeriods",
    "old_value": 30,
    "new_value": 32,
    "updated_by": "ADMIN-001",
    "timestamp": "2026-06-21T10:30:00Z"
  }
}
```

```json
{
  "type": "bulk_update",
  "data": {
    "responsibility_id": "RES-001",
    "update_type": "bulk_assign",
    "affected_count": 5,
    "performed_by": "ADMIN-001",
    "timestamp": "2026-06-21T10:30:00Z"
  }
}
```

### Important rules

- `REDIS_URL` environment variable must be set.
- Authentication token is validated against the database.
- The connection is kept alive until either side closes.
- Both send (Redis -> WebSocket) and receive (WebSocket keepalive) tasks run concurrently via `tokio::select!`.
- If either task stops, the other is aborted.

### Test cases

#### Successful WebSocket connection

- Type: workflow
- Preconditions: Valid auth token exists.
- Steps:
  1. Connect to `ws://localhost:3000/api/school/SCH-001/operations/responsibility/ws`
  2. Send auth message: `{ "token": "valid_token", "school_id": "SCH-001", "user_id": "ADMIN-001" }`
- Expected: Receive `"Authenticated successfully"`.
- Post-condition: Trigger a responsibility update — WebSocket should receive the event.

#### Failed authentication

- Type: negative
- Steps:
  1. Connect to WebSocket.
  2. Send invalid auth: `{ "token": "invalid", "school_id": "SCH-001", "user_id": "ADMIN-001" }`
- Expected: Receive `"Authentication failed"`, connection closed.

#### Connection keepalive

- Type: workflow
- Steps:
  1. Authenticate successfully.
  2. Send a ping message.
- Expected: Server responds with pong.