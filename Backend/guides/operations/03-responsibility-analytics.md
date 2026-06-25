# Responsibility Analytics API Contract

Covers metrics endpoints and report generators for utilization, workload, space distribution, and revenue.

---

## `GET /api/school/:schoolId/operations/responsibility/metrics/utilization`

- Handler: `rust/src/domain/operations/responsibility.rs::get_utilization_metrics`
- Purpose: Get responsibility utilization metrics for the school.
- Auth/Tenant: Requires tenant context. Scoped to `schoolId`.

### Request

Path params:

- `schoolId`: school/tenant identifier.

Query params (all optional):

| Param | Type | Description |
|---|---|---|
| `startDate` | string | Start date filter (YYYY-MM-DD) |
| `endDate` | string | End date filter (YYYY-MM-DD) |

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": {
    "totalResponsibilities": 45,
    "assignedCount": 38,
    "unassignedCount": 7,
    "utilizationPercentage": 84.4,
    "byEmployeeType": {
      "teacher": { "total": 20, "assigned": 18, "utilization": 90.0 },
      "support": { "total": 15, "assigned": 12, "utilization": 80.0 },
      "admin": { "total": 10, "assigned": 8, "utilization": 80.0 }
    }
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

#### Get utilization metrics

- Type: positive
- Request: `GET /api/school/SCH-001/operations/responsibility/metrics/utilization`
- Expected HTTP status: `200`
- Expected response: `success: true`, `data.utilizationPercentage` is a number.

#### Get utilization with date range

- Type: positive
- Request: `GET /api/school/SCH-001/operations/responsibility/metrics/utilization?startDate=2026-01-01&endDate=2026-06-30`
- Expected HTTP status: `200`
- Expected response: Metrics filtered to date range.

---

## `GET /api/school/:schoolId/operations/responsibility/metrics/workload`

- Handler: `rust/src/domain/operations/responsibility.rs::get_workload_metrics`
- Purpose: Get employee workload metrics including assigned periods vs capacity.
- Auth/Tenant: Requires tenant context. Scoped to `schoolId`.

### Request

Path params:

- `schoolId`: school/tenant identifier.

Query params (all optional):

| Param | Type | Description |
|---|---|---|
| `employeeId` | string | Filter by specific employee |
| `startDate` | string | Start date filter (YYYY-MM-DD) |
| `endDate` | string | End date filter (YYYY-MM-DD) |

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": [
    {
      "employeeId": "EMP-001",
      "name": "Sunita Rao",
      "assignedPeriods": 28,
      "maxCapacityPeriods": 30,
      "loadPercentage": 93.3,
      "responsibilities": [
        { "responsibilityId": "RES-001", "name": "Class 10-A Teacher", "periods": 20 },
        { "responsibilityId": "RES-005", "name": "Lab Assistant", "periods": 8 }
      ]
    }
  ]
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

#### Get workload metrics for all employees

- Type: positive
- Request: `GET /api/school/SCH-001/operations/responsibility/metrics/workload`
- Expected HTTP status: `200`
- Expected response: `data` is an array of employee workload objects.

#### Get workload for specific employee

- Type: positive
- Request: `GET /api/school/SCH-001/operations/responsibility/metrics/workload?employeeId=EMP-001`
- Expected HTTP status: `200`
- Expected response: `data` contains only `EMP-001` workload.

#### Overloaded employee detection

- Type: boundary
- Preconditions: `EMP-001` assigned 35 periods with max capacity 30.
- Expected HTTP status: `200`
- Expected response: `loadPercentage` > 100.

---

## `GET /api/school/:schoolId/operations/responsibility/metrics/space-distribution`

- Handler: `rust/src/domain/operations/responsibility.rs::get_space_distribution_metrics`
- Purpose: Get space distribution metrics showing how responsibilities are distributed across spaces.
- Auth/Tenant: Requires tenant context. Scoped to `schoolId`.

### Request

Path params:

- `schoolId`: school/tenant identifier.

Query params (all optional):

| Param | Type | Description |
|---|---|---|
| `spaceId` | string | Filter by specific space |
| `startDate` | string | Start date filter (YYYY-MM-DD) |
| `endDate` | string | End date filter (YYYY-MM-DD) |

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": [
    {
      "spaceId": "CLS_10A",
      "spaceName": "Classroom 10-A",
      "totalResponsibilities": 5,
      "mandatoryCount": 3,
      "optionalCount": 2,
      "coveragePercentage": 100.0
    }
  ]
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

#### Get space distribution

- Type: positive
- Request: `GET /api/school/SCH-001/operations/responsibility/metrics/space-distribution`
- Expected HTTP status: `200`
- Expected response: `data` array with per-space distribution metrics.

#### Filter by specific space

- Type: positive
- Request: `GET /api/school/SCH-001/operations/responsibility/metrics/space-distribution?spaceId=CLS_10A`
- Expected HTTP status: `200`
- Expected response: `data` contains only `CLS_10A` metrics.

---

## `GET /api/school/:schoolId/operations/responsibility/metrics/revenue`

- Handler: `rust/src/domain/operations/responsibility.rs::get_revenue_metrics`
- Purpose: Get revenue metrics related to responsibility assignments.
- Auth/Tenant: Requires tenant context. Scoped to `schoolId`.

### Request

Path params:

- `schoolId`: school/tenant identifier.

Query params (all optional):

| Param | Type | Description |
|---|---|---|
| `responsibilityId` | string | Filter by specific responsibility |
| `startDate` | string | Start date filter (YYYY-MM-DD) |
| `endDate` | string | End date filter (YYYY-MM-DD) |

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": {
    "totalRevenue": 450000,
    "byResponsibility": [
      {
        "responsibilityId": "RES-001",
        "name": "Class 10-A Teacher",
        "revenue": 150000,
        "studentCount": 30
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

#### Get revenue metrics

- Type: positive
- Request: `GET /api/school/SCH-001/operations/responsibility/metrics/revenue`
- Expected HTTP status: `200`
- Expected response: `success: true`, `data.totalRevenue` is a number.

---

## `GET /api/school/:schoolId/operations/responsibility/reports/utilization/:startDate/:endDate`

- Handler: `rust/src/domain/operations/responsibility.rs::generate_utilization_report`
- Purpose: Generate a utilization report for a date range.
- Auth/Tenant: Requires tenant context. Scoped to `schoolId`.

### Request

Path params:

- `schoolId`: school/tenant identifier.
- `startDate`: Start date (YYYY-MM-DD).
- `endDate`: End date (YYYY-MM-DD).

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": {
    "reportType": "utilization",
    "startDate": "2026-01-01",
    "endDate": "2026-06-30",
    "summary": {
      "totalResponsibilities": 45,
      "assignedCount": 38,
      "utilizationPercentage": 84.4
    },
    "details": [ ... ]
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

#### Generate utilization report

- Type: positive
- Request: `GET /api/school/SCH-001/operations/responsibility/reports/utilization/2026-01-01/2026-06-30`
- Expected HTTP status: `200`
- Expected response: `success: true`, `data.reportType == "utilization"`.

---

## `GET /api/school/:schoolId/operations/responsibility/reports/workload/:startDate/:endDate`

- Handler: `rust/src/domain/operations/responsibility.rs::generate_workload_report`
- Purpose: Generate a workload report for a date range.
- Auth/Tenant: Requires tenant context. Scoped to `schoolId`.

### Request

Path params:

- `schoolId`: school/tenant identifier.
- `startDate`: Start date (YYYY-MM-DD).
- `endDate`: End date (YYYY-MM-DD).

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": {
    "reportType": "workload",
    "startDate": "2026-01-01",
    "endDate": "2026-06-30",
    "summary": {
      "totalEmployees": 25,
      "overloadedCount": 3,
      "averageLoadPercentage": 78.5
    },
    "details": [ ... ]
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

#### Generate workload report

- Type: positive
- Request: `GET /api/school/SCH-001/operations/responsibility/reports/workload/2026-01-01/2026-06-30`
- Expected HTTP status: `200`
- Expected response: `data.reportType == "workload"`.

---

## `GET /api/school/:schoolId/operations/responsibility/reports/space-distribution/:startDate/:endDate`

- Handler: `rust/src/domain/operations/responsibility.rs::generate_space_distribution_report`
- Purpose: Generate a space distribution report for a date range.
- Auth/Tenant: Requires tenant context. Scoped to `schoolId`.

### Request

Path params:

- `schoolId`: school/tenant identifier.
- `startDate`: Start date (YYYY-MM-DD).
- `endDate`: End date (YYYY-MM-DD).

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": {
    "reportType": "space-distribution",
    "startDate": "2026-01-01",
    "endDate": "2026-06-30",
    "summary": {
      "totalSpaces": 30,
      "fullyCoveredSpaces": 28,
      "coveragePercentage": 93.3
    },
    "details": [ ... ]
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

#### Generate space distribution report

- Type: positive
- Request: `GET /api/school/SCH-001/operations/responsibility/reports/space-distribution/2026-01-01/2026-06-30`
- Expected HTTP status: `200`
- Expected response: `data.reportType == "space-distribution"`.

---

## `GET /api/school/:schoolId/operations/responsibility/reports/revenue/:startDate/:endDate`

- Handler: `rust/src/domain/operations/responsibility.rs::generate_revenue_report`
- Purpose: Generate a revenue report for a date range.
- Auth/Tenant: Requires tenant context. Scoped to `schoolId`.

### Request

Path params:

- `schoolId`: school/tenant identifier.
- `startDate`: Start date (YYYY-MM-DD).
- `endDate`: End date (YYYY-MM-DD).

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": {
    "reportType": "revenue",
    "startDate": "2026-01-01",
    "endDate": "2026-06-30",
    "summary": {
      "totalRevenue": 450000,
      "byResponsibility": [ ... ]
    },
    "details": [ ... ]
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

#### Generate revenue report

- Type: positive
- Request: `GET /api/school/SCH-001/operations/responsibility/reports/revenue/2026-01-01/2026-06-30`
- Expected HTTP status: `200`
- Expected response: `data.reportType == "revenue"`.

---

## PDF Report Endpoints

Four PDF export endpoints follow the same pattern. Each generates a binary PDF file.

### Endpoints

| Endpoint | Handler |
|---|---|
| `GET /responsibility/reports/utilization/:startDate/:endDate/pdf` | `generate_utilization_report_pdf` |
| `GET /responsibility/reports/workload/:startDate/:endDate/pdf` | `generate_workload_report_pdf` |
| `GET /responsibility/reports/space-distribution/:startDate/:endDate/pdf` | `generate_space_distribution_report_pdf` |
| `GET /responsibility/reports/revenue/:startDate/:endDate/pdf` | `generate_revenue_report_pdf` |

### Request

Path params:

- `schoolId`: school/tenant identifier.
- `startDate`: Start date (YYYY-MM-DD).
- `endDate`: End date (YYYY-MM-DD).

### Expected success response

`200 OK`

- Headers:
  - `Content-Type: application/pdf`
  - `Content-Disposition: attachment; filename="utilization_report_2026-01-01_2026-06-30.pdf"`
- Body: Binary PDF stream.

### Expected error response

`500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "<error message>"
}
```

### Test cases

#### Download PDF report

- Type: positive
- Request: `GET /api/school/SCH-001/operations/responsibility/reports/utilization/2026-01-01/2026-06-30/pdf`
- Expected HTTP status: `200`
- Expected response: `Content-Type: application/pdf`, binary body.
- Headers: `Content-Disposition` contains filename.

#### PDF generation failure

- Type: negative
- Preconditions: Service layer PDF generation fails.
- Expected HTTP status: `500`
- Expected response: `{ success: false, message: "<error>" }`