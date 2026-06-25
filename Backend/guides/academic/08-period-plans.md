# Period Plans API Contract

Isme `period_plan::get_daily_todo`, `period_plan::get_date_plan`, aur `period_plan::update_status` cover hote hain.

---

## `GET /api/school/:schoolId/academic/period-plans/today`

- Handler: `rust/src/domain/academic/period_plan.rs::get_daily_todo`
- Purpose: Ek specific date par teacher ke liye period plans return karna.

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
- Expected response: `data` me `period_number` ke order me plans hone chahiye.

#### Missing teacherId

- Type: negative
- Request me `teacherId` omit kiya gaya hai.
- Expected HTTP status: `400`
- Expected response: `{ success: false, message: "teacherId and date required" }`

#### Missing date

- Type: negative
- Request me `date` omit kiya gaya hai.
- Expected HTTP status: `400`

#### Empty plans

- Type: positive
- Expected HTTP status: `200`
- Expected response: `{ success: true, date: "2026-06-19", data: [] }`

---

## `GET /api/school/:schoolId/academic/period-plans/:date`

- Handler: `rust/src/domain/academic/period_plan.rs::get_date_plan`
- Purpose: Path parameter ke throw pass kiye gaye date par teacher ke liye period plans return karna.

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
- Path date invalid hai, jaise ki `not-a-date`.
- Expected behavior: Validation fail hona chahiye ya DB query behavior ke according empty data return hona chahiye.

---

## `POST /api/school/:schoolId/academic/period-plans/:id/status`

- Handler: `rust/src/domain/academic/period_plan.rs::update_status`
- Purpose: Period plan status aur optional teacher note update karna.

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

Agar `status == completed` ho, toh backend `completed_at` ko current timestamp par set karta hai.

### Test cases

#### Mark plan completed with note

- Type: positive
- Request: `POST /api/school/SCH-001/academic/period-plans/1/status`
- Body: `{ "status": "completed", "teacherNote": "Completed limits." }`
- Expected HTTP status: `200`
- Database/state assertion: `period_plans.status = completed` ho jayega, `teacher_note` set ho jayega, `completed_at` set ho jayega.

#### Mark plan pending

- Type: positive
- Body: `{ "status": "pending" }`
- Expected HTTP status: `200`
- Database/state assertion: Status pending ho jayega.

#### Missing status

- Type: negative
- Body: `{}`
- Expected HTTP status: `200` current SQL behavior ke basis par, par ideal case me validation fail hona chahiye.
- Documentation note: Backend ko empty status ke liye validation add karna chahiye.

#### Plan from another school

- Type: tenant-isolation
- Expected behavior: Should not update another school's plan.
- Current behavior note: SQL cross-school update ko prevent karta hai, par koi row-count error return nahi hota.
