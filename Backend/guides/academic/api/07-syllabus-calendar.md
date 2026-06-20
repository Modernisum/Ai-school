# Syllabus Calendar API Contract

Covers `syllabus_calendar::get_syllabus`, `syllabus_calendar::update_chapter_plan`, and `syllabus_calendar::quarter_report`.

---

## `GET /api/school/:schoolId/academic/syllabus/:responsibilityId`

- Handler: `rust/src/domain/academic/syllabus_calendar.rs::get_syllabus`
- Purpose: List syllabus calendar rows for a responsibility or subject.

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "chapterId": 10,
      "chapterName": "Limits",
      "quarter": "Q1",
      "plannedStartDate": "2026-07-01",
      "plannedEndDate": "2026-07-15",
      "actualStartDate": null,
      "actualEndDate": null,
      "periodCount": 8,
      "status": "planned"
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

#### Syllabus by responsibility ID

- Type: positive
- Request: `GET /api/school/SCH-001/academic/syllabus/SUB-MATH`
- Expected HTTP status: `200`
- Expected response: `data` contains syllabus rows where responsibility/subject matches.

#### Syllabus by subject ID

- Type: positive
- Same route can use a subject ID.
- Expected HTTP status: `200`

#### Empty syllabus

- Type: positive
- Expected HTTP status: `200`
- Expected response: `{ success: true, data: [] }`

#### Tenant isolation

- Type: tenant-isolation
- Expected response: Only rows with requested `school_id` are returned.

---

## `PATCH /api/school/:schoolId/academic/syllabus/chapter/:chapterId`

- Handler: `rust/src/domain/academic/syllabus_calendar.rs::update_chapter_plan`
- Purpose: Update planned/actual syllabus status for a chapter.

### Request

Path params:

- `schoolId`
- `chapterId`

Body:

```json
{
  "status": "completed",
  "actualStartDate": "2026-07-01",
  "actualEndDate": "2026-07-15"
}
```

All body fields are optional.

### Expected success response

`200 OK`

```json
{
  "success": true
}
```

### Test cases

#### Mark chapter completed

- Type: positive
- Request: `PATCH /api/school/SCH-001/academic/syllabus/chapter/10`
- Body: `{ "status": "completed" }`
- Expected HTTP status: `200`
- Database/state assertion: `syllabus_calendar.status = completed`.

#### Add actual dates

- Type: positive
- Body includes `actualStartDate` and `actualEndDate`.
- Expected HTTP status: `200`
- Database/state assertion: Dates are updated.

#### Partial update

- Type: positive
- Body includes only `status`.
- Expected HTTP status: `200`
- Database/state assertion: Existing actual dates remain unchanged.

#### Chapter from another school

- Type: tenant-isolation
- Expected behavior: Should not update another school's row.
- Current behavior note: SQL `WHERE school_id = $4 AND id = $5` prevents cross-school update, but no row-count error is returned.

---

## `GET /api/school/:schoolId/academic/syllabus/quarter/:quarter`

- Handler: `rust/src/domain/academic/syllabus_calendar.rs::quarter_report`
- Purpose: Return syllabus progress summary for a quarter.

### Expected success response

`200 OK`

```json
{
  "success": true,
  "quarter": "Q1",
  "total": 12,
  "completed": 8,
  "delayed": 1,
  "data": [
    {
      "id": 1,
      "chapterId": 10,
      "chapterName": "Limits",
      "status": "completed",
      "plannedStartDate": "2026-07-01",
      "plannedEndDate": "2026-07-15"
    }
  ]
}
```

### Test cases

#### Quarter with mixed statuses

- Type: positive
- Preconditions: Quarter has planned, completed, and delayed rows.
- Expected HTTP status: `200`
- Expected response: `total`, `completed`, and `delayed` counts are correct.

#### Empty quarter

- Type: positive
- Expected HTTP status: `200`
- Expected response:

```json
{
  "success": true,
  "quarter": "Q3",
  "total": 0,
  "completed": 0,
  "delayed": 0,
  "data": []
}
```

#### Tenant isolation

- Type: tenant-isolation
- Expected response: Only rows for requested `school_id` and quarter are returned.
