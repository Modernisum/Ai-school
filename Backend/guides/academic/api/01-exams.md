# Exams API Contract

Covers `exam::create_exam`, `exam::list_exams`, `exam::create_exam_section`, `exam::list_exam_sections`, `exam::update_exam_section`, and `exam::create_teacher_test`.

---

## `POST /api/school/:schoolId/academic/exams`

- Handler: `rust/src/domain/academic/exam.rs::create_exam`
- Purpose: Create or update an exam record for the school.
- Auth/Tenant: Requires authenticated tenant context. The `schoolId` path value is passed to the academic repository tenant connection.

### Request

Path params:

- `schoolId`: school/tenant identifier.

Body:

```json
{
  "name": "Midterm Examination",
  "quarter": "Q2",
  "startDate": "2026-10-15",
  "endDate": "2026-10-15",
  "status": "SCHEDULED",
  "examType": "MAIN"
}
```

### Expected success response

`200 OK`

Current handler returns the service/repository data directly, without a wrapper.

```json
{
  "id": 1,
  "name": "Midterm Examination",
  "quarter": "Q2",
  "startDate": "2026-10-15",
  "endDate": "2026-10-15",
  "status": "SCHEDULED",
  "examType": "MAIN"
}
```

### Expected error response

Usually:

`500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "<error message>"
}
```

### Important rules

- `name`, `startDate`, `endDate`, `status`, and `examType` should be supplied by clients.
- Repository uses `ON CONFLICT (school_id, name)`, so same-school duplicate exam names update date/status fields instead of creating a second exam.
- Client should not rely on a `{ success: true }` wrapper for this endpoint.

### Test cases

#### Create main exam

- Type: positive
- Preconditions: Authenticated tenant token for `SCH-001`.
- Request:
  - Method: `POST`
  - Route: `/api/school/SCH-001/academic/exams`
  - Body:

```json
{
  "name": "Midterm Examination",
  "quarter": "Q2",
  "startDate": "2026-10-15",
  "endDate": "2026-10-15",
  "status": "SCHEDULED",
  "examType": "MAIN"
}
```

- Expected HTTP status: `200`
- Expected response: JSON object containing `id`, `name`, `quarter`, `startDate`, `endDate`, `status`, `examType`.
- Database/state assertion: `exams` contains one row for `school_id = SCH-001` and `name = Midterm Examination`.

#### Duplicate exam name upsert

- Type: idempotency
- Preconditions: Exam named `Midterm Examination` already exists for `SCH-001`.
- Request: Same as create exam, but with a later `endDate`.
- Expected HTTP status: `200`
- Expected response: Updated exam object.
- Database/state assertion: Row count does not increase; date/status fields update.

#### Missing exam name

- Type: negative
- Request body omits `name`.
- Expected HTTP status: `500` based on current handler behavior.
- Expected response:

```json
{
  "success": false,
  "message": "<DB or service error>"
}
```

---

## `GET /api/school/:schoolId/academic/exams`

- Handler: `rust/src/domain/academic/exam.rs::list_exams`
- Purpose: List exams for a school.
- Auth/Tenant: Uses `schoolId` path value for DB query.

### Request

Query params:

- Optional `student_id`: currently accepted by handler but not used for filtering by repository.

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Midterm Examination",
      "quarter": "Q2",
      "startDate": "2026-10-15",
      "endDate": "2026-10-15",
      "status": "SCHEDULED",
      "examType": "MAIN"
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

#### List all exams

- Type: positive
- Request: `GET /api/school/SCH-001/academic/exams`
- Expected HTTP status: `200`
- Expected response: `{ success: true, data: [...] }`
- Database/state assertion: Only exams for `SCH-001` are returned.

#### List with student query

- Type: compatibility
- Request: `GET /api/school/SCH-001/academic/exams?student_id=STD-001`
- Expected HTTP status: `200`
- Expected response: Current implementation returns all school exams; document if future behavior should filter by student.

#### Empty exam list

- Type: positive
- Preconditions: No exams for school.
- Expected HTTP status: `200`
- Expected response:

```json
{
  "success": true,
  "data": []
}
```

---

## `POST /api/school/:schoolId/academic/exams/:examId/sections`

- Handler: `rust/src/domain/academic/exam.rs::create_exam_section`
- Purpose: Create or update an exam section for a class/space and responsibility/subject.

### Request

Path params:

- `schoolId`
- `examId`

Body:

```json
{
  "spaceId": "CLS_10A",
  "classId": "CLS_10A",
  "responsibilityId": "SUB-MATH",
  "subjectId": "SUB-MATH",
  "syllabus": [10, 11],
  "aiGeneratedPaper": false,
  "questions": [],
  "totalMarks": 100
}
```

Either `spaceId` or `classId` can be used. Either `responsibilityId` or `subjectId` can be used.

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": {
    "id": 1,
    "examId": 1,
    "spaceId": "CLS_10A",
    "responsibilityId": "SUB-MATH",
    "syllabus": [10, 11],
    "aiGeneratedPaper": false,
    "questions": [],
    "totalMarks": 100
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

### Important rules

- Repository conflict key is `(school_id, exam_id, space_id, responsibility_id)`.
- Re-submitting the same school/exam/space/responsibility updates `syllabus`, `ai_generated_paper`, `questions`, and `total_marks`.

### Test cases

#### Create section with canonical fields

- Type: positive
- Request: `POST /api/school/SCH-001/academic/exams/1/sections`
- Body uses `spaceId` and `responsibilityId`.
- Expected HTTP status: `200`
- Expected response: `{ success: true, data: { id, examId, spaceId, responsibilityId, ... } }`

#### Create section with alias fields

- Type: compatibility
- Body uses `classId` and `subjectId`.
- Expected HTTP status: `200`
- Expected response: Response normalizes to `spaceId` and `responsibilityId`.

#### Upsert same section

- Type: idempotency
- Preconditions: Section already exists for school/exam/space/responsibility.
- Request: Submit same key with new `questions` and `totalMarks`.
- Expected HTTP status: `200`
- Database/state assertion: Row count does not increase; syllabus/questions/total marks update.

---

## `GET /api/school/:schoolId/academic/exams/:examId/sections`

- Handler: `rust/src/domain/academic/exam.rs::list_exam_sections`
- Purpose: List sections for an exam in a school.

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "examId": 1,
      "spaceId": "CLS_10A",
      "responsibilityId": "SUB-MATH",
      "syllabus": [10, 11],
      "aiGeneratedPaper": false,
      "questions": [],
      "totalMarks": 100
    }
  ]
}
```

### Test cases

#### Multiple sections

- Type: positive
- Expected HTTP status: `200`
- Expected response: `data` contains sections for the requested exam.

#### Empty sections

- Type: positive
- Expected HTTP status: `200`
- Expected response: `{ success: true, data: [] }`

#### Wrong school/exam pair

- Type: tenant-isolation
- Expected HTTP status: `200` with empty data, or current DB error response depending data shape.
- Database/state assertion: Sections from another school are never returned.

---

## `PATCH /api/school/:schoolId/academic/exams/:examId/sections/:sectionId`

- Handler: `rust/src/domain/academic/exam.rs::update_exam_section`
- Purpose: Update syllabus, questions, AI paper flag, or total marks for a section.

### Request

Path params:

- `schoolId`
- `examId`
- `sectionId`

Body:

```json
{
  "syllabus": [10, 11],
  "questions": [
    {
      "questionId": "Q-001",
      "text": "Define limits.",
      "maxMarks": 5
    }
  ],
  "aiGeneratedPaper": true,
  "totalMarks": 80
}
```

### Expected success response

`200 OK`

```json
{
  "success": true
}
```

### Test cases

#### Update total marks

- Type: positive
- Request: `PATCH /api/school/SCH-001/academic/exams/1/sections/1`
- Body: `{ "totalMarks": 80 }`
- Expected HTTP status: `200`
- Database/state assertion: `exam_sections.total_marks = 80`.

#### Update questions

- Type: positive
- Body includes a `questions` array.
- Expected HTTP status: `200`
- Database/state assertion: JSONB questions match submitted payload.

#### Section from another school

- Type: tenant-isolation
- Expected HTTP status: `200` with no rows affected based on current SQL, or `500` if caller treats no update as error.
- Documentation note: Backend should return a clearer error when no row was updated.

---

## `POST /api/school/:schoolId/academic/exams/teacher-test`

- Handler: `rust/src/domain/academic/exam.rs::create_teacher_test`
- Purpose: Create a teacher-managed class test with validated syllabus and optional OMR/announcement rules.

### Request

Path params:

- `schoolId`

Body:

```json
{
  "classId": "CLS_10A",
  "subjectId": "SUB-MATH",
  "name": "Class Test 1",
  "quarter": "Q1",
  "syllabus": [10, 11],
  "testDate": "2026-07-01",
  "isOmr": false,
  "wantsAnnouncement": true,
  "aiGeneratedPaper": false,
  "questions": [],
  "totalMarks": 20
}
```

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": {
    "exam": {
      "id": 1,
      "name": "Class Test 1",
      "quarter": "Q1",
      "startDate": "2026-07-01",
      "endDate": "2026-07-01",
      "status": "SCHEDULED",
      "examType": "TEACHER_TEST"
    },
    "section": {
      "id": 1,
      "examId": 1,
      "spaceId": "CLS_10A",
      "responsibilityId": "SUB-MATH",
      "syllabus": [10, 11],
      "aiGeneratedPaper": false,
      "questions": [],
      "totalMarks": 20
    }
  }
}
```

### Expected error response

Usually:

`500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "<validation or DB error>"
}
```

### Important validations

- `classId` is required.
- `subjectId` is required.
- `name` is required.
- Teacher must be mapped to the responsibility `Subject - Class`.
- `syllabus` array is required.
- Every syllabus item must match a chapter by id or name.
- Every selected chapter must have `is_taught = true`.
- If `isOmr` is true:
  - `totalQuestions` is required.
  - `totalQuestions` must be a multiple of 5.
- If `isOmr` is true or `wantsAnnouncement` is true:
  - `testDate` is required.
  - Date format must be `YYYY-MM-DD`.
  - Date must be at least 3 days in the future.

### Test cases

#### Create valid non-OMR teacher test

- Type: positive
- Preconditions: Teacher is mapped to `SUB-MATH - CLS_10A`; chapters 10 and 11 are taught.
- Request: `POST /api/school/SCH-001/academic/exams/teacher-test`
- Body: Valid non-OMR payload.
- Expected HTTP status: `200`
- Database/state assertion: One `TEACHER_TEST` exam and one exam section are created.

#### Create valid OMR test

- Type: positive
- Body includes `isOmr: true`, `totalQuestions: 20`, and future `testDate`.
- Expected HTTP status: `200`

#### OMR question count boundary

- Type: boundary
- Body includes `isOmr: true`, `totalQuestions: 17`.
- Expected HTTP status: `500` based on current handler behavior.
- Expected response message includes: `OMR tests must have total questions in multiples of 5`.

#### OMR date too close

- Type: boundary
- Body includes `testDate` less than 3 days from today.
- Expected HTTP status: `500`
- Expected response message includes: `OMR/announced tests must be scheduled at least 3 days in advance`.

#### Teacher not mapped to class/subject

- Type: negative
- Preconditions: Teacher is not mapped to `SUB-MATH - CLS_10A`.
- Expected HTTP status: `500`
- Expected response message includes: `Teacher is not mapped to the responsibility`.

#### Syllabus chapter not taught

- Type: negative
- Preconditions: One selected syllabus chapter has `is_taught = false`.
- Expected HTTP status: `500`
- Expected response message includes: `has not been taught yet`.
