# Period Plans API Contract

Covers `period_plan::get_daily_todo`, `period_plan::get_date_plan`, and `period_plan::update_status`.

---

## `GET /api/school/:schoolId/academic/period-plans/today`

- Handler: `rust/src/domain/academic/period_plan.rs::get_daily_todo`
- Purpose: Return period plans for a teacher on a specific date.

### Request

Path params:

- `schoolId`

Query params required:

- `teacherId`
- `date`

Example:

```text
GET /api/school/SCH-001/academic/period-plans/today?teacherId=EMP-00109&date=2026-06-19
```

### Expected success response

`200 OK`

```json
{
  "success": true,
  "date": "2026-06-19",
  "data": [
    {
      "id": 1,
      "periodNumber": 1,
      "classId": "CLS_10A",
      "subjectId": "SUB-MATH",
      "chapterId": 10,
      "chapterName": "Limits",
      "topicName": "Introduction",
      "status": "planned",
      "teacherNote": null,
      "syllabusStatus": "planned"
    }
  ]
}
```

### Expected error response

`400 BAD_REQUEST`

```json
{
  "success": false,
  "message": "teacherId and date required"
}
```

### Test cases

#### Valid teacher/date

- Type: positive
- Request: `GET /api/school/SCH-001/academic/period-plans/today?teacherId=EMP-00109&date=2026-06-19`
- Expected HTTP status: `200`
- Expected response: `data` contains plans ordered by `period_number`.

#### Missing teacherId

- Type: negative
- Request omits `teacherId`.
- Expected HTTP status: `400`
- Expected response: `{ success: false, message: "teacherId and date required" }`

#### Missing date

- Type: negative
- Request omits `date`.
- Expected HTTP status: `400`

#### Empty plans

- Type: positive
- Expected HTTP status: `200`
- Expected response: `{ success: true, date: "2026-06-19", data: [] }`

---

## `GET /api/school/:schoolId/academic/period-plans/:date`

- Handler: `rust/src/domain/academic/period_plan.rs::get_date_plan`
- Purpose: Return period plans for a teacher on a date passed as a path parameter.

### Request

Path params:

- `schoolId`
- `date`

Query params required:

- `teacherId`

Example:

```text
GET /api/school/SCH-001/academic/period-plans/2026-06-19?teacherId=EMP-00109
```

### Expected success response

Same as `GET /period-plans/today`:

```json
{
  "success": true,
  "date": "2026-06-19",
  "data": []
}
```

### Test cases

#### Valid date path

- Type: positive
- Expected HTTP status: `200`

#### Missing teacherId

- Type: negative
- Expected HTTP status: `400`

#### Invalid date format

- Type: boundary
- Path date is invalid, for example `not-a-date`.
- Expected behavior: Should fail validation or return empty data depending DB query behavior.

---

## `POST /api/school/:schoolId/academic/period-plans/:id/status`

- Handler: `rust/src/domain/academic/period_plan.rs::update_status`
- Purpose: Update a period plan status and optional teacher note.

### Request

Path params:

- `schoolId`
- `id`

Body:

```json
{
  "status": "completed",
  "teacherNote": "Completed limits evaluation exercises."
}
```

### Expected success response

`200 OK`

```json
{
  "success": true
}
```

### Important rule

If `status == completed`, backend sets `completed_at` to the current timestamp.

### Test cases

#### Mark plan completed with note

- Type: positive
- Request: `POST /api/school/SCH-001/academic/period-plans/1/status`
- Body: `{ "status": "completed", "teacherNote": "Completed limits." }`
- Expected HTTP status: `200`
- Database/state assertion: `period_plans.status = completed`, `teacher_note` is set, `completed_at` is set.

#### Mark plan pending

- Type: positive
- Body: `{ "status": "pending" }`
- Expected HTTP status: `200`
- Database/state assertion: Status updates to pending.

#### Missing status

- Type: negative
- Body: `{}`
- Expected HTTP status: `200` based on current SQL behavior, but should ideally fail validation.
- Documentation note: Backend should add validation for empty status.

#### Plan from another school

- Type: tenant-isolation
- Expected behavior: Should not update another school's plan.
- Current behavior note: SQL prevents cross-school update, but no row-count error is returned.
