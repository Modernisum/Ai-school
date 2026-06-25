# Syllabus Calendar API Contract

Isme `syllabus_calendar::get_syllabus`, `syllabus_calendar::update_chapter_plan`, aur `syllabus_calendar::quarter_report` cover hote hain.

---

## `GET /api/school/:schoolId/academic/syllabus/:responsibilityId`

- Handler: `rust/src/domain/academic/syllabus_calendar.rs::get_syllabus`
- Purpose: Responsibility ya subject ke liye syllabus calendar rows ki list return karna.

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
- Expected response: `data` me syllabus rows honge jahan responsibility/subject match hota hai.

#### Syllabus by subject ID

- Type: positive
- Same route subject ID use kar sakta hai.
- Expected HTTP status: `200`

#### Empty syllabus

- Type: positive
- Expected HTTP status: `200`
- Expected response: `{ success: true, data: [] }`

#### Tenant isolation

- Type: tenant-isolation
- Expected response: Sirf requested `school_id` ke rows return hone chahiye.

---

## `PATCH /api/school/:schoolId/academic/syllabus/chapter/:chapterId`

- Handler: `rust/src/domain/academic/syllabus_calendar.rs::update_chapter_plan`
- Purpose: Ek chapter ke liye planned/actual syllabus status update karna.

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

Saare body fields optional hain.

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
- Database/state assertion: `syllabus_calendar.status = completed` ho jayega.

#### Add actual dates

- Type: positive
- Body me `actualStartDate` aur `actualEndDate` include hain.
- Expected HTTP status: `200`
- Database/state assertion: Dates update ho jayengi.

#### Partial update

- Type: positive
- Body me sirf `status` include hai.
- Expected HTTP status: `200`
- Database/state assertion: Pehle se exist karne wali actual dates unchanged rahengi.

#### Chapter from another school

- Type: tenant-isolation
- Expected behavior: Kisi dusre school ki row ko update nahi karna chahiye.
- Current behavior note: SQL `WHERE school_id = $4 AND id = $5` cross-school update ko prevent karta hai, par koi row-count error return nahi hota.

---

## `GET /api/school/:schoolId/academic/syllabus/quarter/:quarter`

- Handler: `rust/src/domain/academic/syllabus_calendar.rs::quarter_report`
- Purpose: Kisi quarter ke liye syllabus progress summary return karna.

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
- Preconditions: Quarter me planned, completed, aur delayed rows hain.
- Expected HTTP status: `200`
- Expected response: `total`, `completed`, aur `delayed` counts correct hone chahiye.

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
- Expected response: Sirf requested `school_id` aur quarter ke rows return hone chahiye.
