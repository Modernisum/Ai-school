# Daily Reports API Contract

Isme `daily_report::submit_daily_report`, `daily_report::get_report`, aur `daily_report::missed_reports` cover hote hain.

---

## `POST /api/school/:schoolId/academic/reports/daily`

- Handler: `rust/src/domain/academic/daily_report.rs::submit_daily_report`
- Purpose: Daily teacher report submit ya update karna.

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

- `teacher_id` authenticated tenant context se aata hai.
- Repository `(school_id, teacher_id, report_date)` par upsert use karta hai.
- Same teacher/date report submit karne par existing report update ho jati hai.

### Test cases

#### Submit new daily report

- Type: positive
- Request: `POST /api/school/SCH-001/academic/reports/daily`
- Body: Valid report payload.
- Expected HTTP status: `200`
- Database/state assertion: Row `status = submitted` ke sath insert ho jati hai.

#### Upsert same teacher/date report

- Type: idempotency
- Preconditions: Report already exists for same school/teacher/date.
- Expected HTTP status: `200`
- Database/state assertion: Row count nahi badhega; summary/pending topics/period counts update ho jayenge.

#### Missing report date

- Type: negative
- Body me `reportDate` omit kiya gaya hai.
- Expected HTTP status: `200` current SQL behavior ke basis par, par ideal case me validation fail hona chahiye.

---

## `GET /api/school/:schoolId/academic/reports/daily/:date`

- Handler: `rust/src/domain/academic/daily_report.rs::get_report`
- Purpose: School/date ke liye daily reports return karna, jise optionally teacher ke according filter kiya ja sake.

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
- Expected response: `data` me requested school/date ke reports hone chahiye.

#### Get one teacher report

- Type: positive
- Request me `?teacherId=EMP-00109` include hai.
- Expected HTTP status: `200`
- Expected response: Sirf us teacher ki report return honi chahiye.

#### Empty reports

- Type: positive
- Expected HTTP status: `200`
- Expected response: `{ success: true, data: [] }`

#### Tenant isolation

- Type: tenant-isolation
- Expected response: Sirf requested `school_id` ke reports return hone chahiye.

---

## `GET /api/school/:schoolId/academic/reports/missed`

- Handler: `rust/src/domain/academic/daily_report.rs::missed_reports`
- Purpose: Aise teachers return karna jinke paas aaj ke liye period plans hain par koi daily report nahi hai.

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
- Preconditions: Teacher ke paas aaj ke liye period plans hain aur koi daily report nahi hai.
- Expected HTTP status: `200`
- Expected response: Teacher `data` me `missedPeriods` count ke sath dikhna chahiye.

#### No missed reports

- Type: positive
- Preconditions: Har teacher jiske paas period plans hain, unke paas daily report hai.
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
- Expected response: Sirf requested `school_id` ke period plans/reports ko hi consider kiya jayega.
