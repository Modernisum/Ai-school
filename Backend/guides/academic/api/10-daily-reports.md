# Daily Reports API Contract

Covers `daily_report::submit_daily_report`, `daily_report::get_report`, and `daily_report::missed_reports`.

---

## `POST /api/school/:schoolId/academic/reports/daily`

- Handler: `rust/src/domain/academic/daily_report.rs::submit_daily_report`
- Purpose: Submit or update a daily teacher report.

### Request

Path params:

- `schoolId`

Body:

```json
{
  "reportDate": "2026-06-19",
  "summary": "Completed limits and assignment review.",
  "pendingTopics": ["Applications of derivatives"],
  "completedPeriods": 4,
  "totalPeriods": 6
}
```

### Expected success response

`200 OK`

```json
{
  "success": true,
  "message": "Daily report submitted"
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

- `teacher_id` comes from the authenticated tenant context.
- Repository uses upsert on `(school_id, teacher_id, report_date)`.
- Submitting the same teacher/date report updates the existing report.

### Test cases

#### Submit new daily report

- Type: positive
- Request: `POST /api/school/SCH-001/academic/reports/daily`
- Body: Valid report payload.
- Expected HTTP status: `200`
- Database/state assertion: Row inserted with `status = submitted`.

#### Upsert same teacher/date report

- Type: idempotency
- Preconditions: Report already exists for same school/teacher/date.
- Expected HTTP status: `200`
- Database/state assertion: Row count does not increase; summary/pending topics/period counts update.

#### Missing report date

- Type: negative
- Body omits `reportDate`.
- Expected HTTP status: `200` based on current SQL behavior, but should ideally fail validation.

---

## `GET /api/school/:schoolId/academic/reports/daily/:date`

- Handler: `rust/src/domain/academic/daily_report.rs::get_report`
- Purpose: Get daily reports for a school/date, optionally filtered by teacher.

### Request

Path params:

- `schoolId`
- `date`

Query params:

- Optional `teacherId`.

Examples:

```text
GET /api/school/SCH-001/academic/reports/daily/2026-06-19
GET /api/school/SCH-001/academic/reports/daily/2026-06-19?teacherId=EMP-00109
```

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "teacherId": "EMP-00109",
      "reportDate": "2026-06-19",
      "status": "submitted",
      "summary": "Completed limits and assignment review.",
      "completedPeriods": 4,
      "totalPeriods": 6
    }
  ]
}
```

### Test cases

#### Get all reports for date

- Type: positive
- Expected HTTP status: `200`
- Expected response: `data` contains reports for requested school/date.

#### Get one teacher report

- Type: positive
- Request includes `?teacherId=EMP-00109`.
- Expected HTTP status: `200`
- Expected response: Only that teacher's report is returned.

#### Empty reports

- Type: positive
- Expected HTTP status: `200`
- Expected response: `{ success: true, data: [] }`

#### Tenant isolation

- Type: tenant-isolation
- Expected response: Only reports for requested `school_id` are returned.

---

## `GET /api/school/:schoolId/academic/reports/missed`

- Handler: `rust/src/domain/academic/daily_report.rs::missed_reports`
- Purpose: Return teachers who have period plans today but no daily report.

### Expected success response

`200 OK`

```json
{
  "success": true,
  "date": "2026-06-19",
  "data": [
    {
      "teacherId": "EMP-00109",
      "missedPeriods": 2
    }
  ],
  "missedCount": 1
}
```

### Test cases

#### Teachers with missing reports

- Type: positive
- Preconditions: Teacher has period plans today and no daily report.
- Expected HTTP status: `200`
- Expected response: Teacher appears in `data` with `missedPeriods` count.

#### No missed reports

- Type: positive
- Preconditions: Every teacher with period plans has a daily report.
- Expected HTTP status: `200`
- Expected response:

```json
{
  "success": true,
  "date": "2026-06-19",
  "data": [],
  "missedCount": 0
}
```

#### Tenant isolation

- Type: tenant-isolation
- Expected response: Only period plans/reports for requested `school_id` are considered.
