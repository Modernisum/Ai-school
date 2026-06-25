# Exams API Contract

Isme `exam::create_exam`, `exam::list_exams`, `exam::create_exam_section`, `exam::list_exam_sections`, `exam::update_exam_section`, aur `exam::create_teacher_test` cover hote hain.

---

## `POST /api/school/:schoolId/academic/exams`

- Handler: `rust/src/domain/academic/exam.rs::create_exam`
- Purpose: School ke liye exam record create ya update karna.
- Auth/Tenant: Authenticated tenant context chahiye. `schoolId` path value ko academic repository tenant connection me pass kiya jata hai.

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

Current handler directly service/repository data return karta hai, bina kisi wrapper ke.

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

- `name`, `startDate`, `endDate`, `status`, aur `examType` clients dwara supply kiye jaane chahiye.
- Repository `ON CONFLICT (school_id, name)` use karta hai, isliye same school ke duplicate exam names date/status fields ko update karenge, naya exam create karne ke bajaye.
- Client ko is endpoint ke liye `{ success: true }` wrapper par rely nahi karna chahiye.

### Test cases

#### Create main exam

- Type: positive
- Preconditions: `SCH-001` ke liye authenticated tenant token.
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
- Expected response: Ek JSON object jisme `id`, `name`, `quarter`, `startDate`, `endDate`, `status`, aur `examType` honge.
- Database/state assertion: `exams` table me `school_id = SCH-001` aur `name = Midterm Examination` ke liye ek row honi chahiye.

#### Duplicate exam name upsert

- Type: idempotency
- Preconditions: `SCH-001` ke liye `Midterm Examination` naam ka exam pehle se exist karta hai.
- Request: Create exam ke jaisa hi, bas baad ki `endDate` ke sath.
- Expected HTTP status: `200`
- Expected response: Updated exam object.
- Database/state assertion: Row count nahi badhega; date/status fields update ho jayenge.

#### Missing exam name

- Type: negative
- Request body me `name` omit kiya gaya hai.
- Expected HTTP status: `500` current handler behavior ke basis par.
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
- Purpose: Ek school ke exams ki list return karna.
- Auth/Tenant: DB query ke liye `schoolId` path value use karta hai.

### Request

Query params:

- Optional `student_id`: abhi handler ise accept karta hai par repository dwara filtering ke liye use nahi kiya jata.

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
- Database/state assertion: Sirf `SCH-001` ke exams return hone chahiye.

#### List with student query

- Type: compatibility
- Request: `GET /api/school/SCH-001/academic/exams?student_id=STD-001`
- Expected HTTP status: `200`
- Expected response: Current implementation saare school exams return karta hai; agar future behavior me student ke according filter karna ho toh document karein.

#### Empty exam list

- Type: positive
- Preconditions: School ke liye koi exams nahi hain.
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
- Purpose: Ek class/space aur responsibility/subject ke liye exam section create ya update karna.

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

Aap `spaceId` ya `classId` me se koi bhi use kar sakte hain. Aur `responsibilityId` ya `subjectId` me se koi bhi use kar sakte hain.

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

- Repository conflict key `(school_id, exam_id, space_id, responsibility_id)` hai.
- Same school/exam/space/responsibility ko re-submit karne par `syllabus`, `ai_generated_paper`, `questions`, aur `total_marks` update ho jate hain.

### Test cases

#### Create section with canonical fields

- Type: positive
- Request: `POST /api/school/SCH-001/academic/exams/1/sections`
- Body me `spaceId` aur `responsibilityId` use kiya gaya hai.
- Expected HTTP status: `200`
- Expected response: `{ success: true, data: { id, examId, spaceId, responsibilityId, ... } }`

#### Create section with alias fields

- Type: compatibility
- Body me `classId` aur `subjectId` use kiya gaya hai.
- Expected HTTP status: `200`
- Expected response: Response normalize hokar `spaceId` aur `responsibilityId` ban jata hai.

#### Upsert same section

- Type: idempotency
- Preconditions: School/exam/space/responsibility ke liye section pehle se exist karta hai.
- Request: New `questions` aur `totalMarks` ke sath same key submit karein.
- Expected HTTP status: `200`
- Database/state assertion: Row count nahi badhega; syllabus/questions/total marks update ho jayenge.

---

## `GET /api/school/:schoolId/academic/exams/:examId/sections`

- Handler: `rust/src/domain/academic/exam.rs::list_exam_sections`
- Purpose: Ek school me exam ke liye sections ki list return karna.

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
- Expected response: `data` me requested exam ke sections hone chahiye.

#### Empty sections

- Type: positive
- Expected HTTP status: `200`
- Expected response: `{ success: true, data: [] }`

#### Wrong school/exam pair

- Type: tenant-isolation
- Expected HTTP status: `200` empty data ke sath, ya data shape ke according current DB error response.
- Database/state assertion: Kisi dusre school ke sections kabhi return nahi hone chahiye.

---

## `PATCH /api/school/:schoolId/academic/exams/:examId/sections/:sectionId`

- Handler: `rust/src/domain/academic/exam.rs::update_exam_section`
- Purpose: Ek section ke liye syllabus, questions, AI paper flag, ya total marks update karna.

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
- Database/state assertion: `exam_sections.total_marks = 80` ho jayega.

#### Update questions

- Type: positive
- Body includes a `questions` array.
- Expected HTTP status: `200`
- Database/state assertion: JSONB questions submitted payload se match karne chahiye.

#### Section from another school

- Type: tenant-isolation
- Expected HTTP status: `200` bina kisi rows affect hue current SQL ke basis par, ya `500` agar caller updates na hone ko error treat karta hai.
- Documentation note: Backend ko clearer error return karna chahiye jab koi row update na hui ho.

---

## `POST /api/school/:schoolId/academic/exams/teacher-test`

- Handler: `rust/src/domain/academic/exam.rs::create_teacher_test`
- Purpose: Validated syllabus aur optional OMR/announcement rules ke sath teacher-managed class test create karna.

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

- `classId` required hai.
- `subjectId` required hai.
- `name` required hai.
- Teacher responsibility `Subject - Class` se mapped hona chahiye.
- `syllabus` array required hai.
- Har syllabus item ko id ya name se chapter se match karna chahiye.
- Har selected chapter ka `is_taught = true` hona chahiye.
- Agar `isOmr` true hai:
  - `totalQuestions` required hai.
  - `totalQuestions` 5 ka multiple hona chahiye.
- Agar `isOmr` true hai ya `wantsAnnouncement` true hai:
  - `testDate` required hai.
  - Date format `YYYY-MM-DD` hona chahiye.
  - Date must be at least 3 days in the future.

### Test cases

#### Create valid non-OMR teacher test

- Type: positive
- Preconditions: Teacher `SUB-MATH - CLS_10A` se mapped hai; chapters 10 aur 11 completed/taught hain.
- Request: `POST /api/school/SCH-001/academic/exams/teacher-test`
- Body: Valid non-OMR payload.
- Expected HTTP status: `200`
- Database/state assertion: Ek `TEACHER_TEST` exam aur ek exam section create ho jate hain.

#### Create valid OMR test

- Type: positive
- Body me `isOmr: true`, `totalQuestions: 20`, aur future `testDate` include hain.
- Expected HTTP status: `200`

#### OMR question count boundary

- Type: boundary
- Body me `isOmr: true`, `totalQuestions: 17` include hain.
- Expected HTTP status: `500` current handler behavior ke basis par.
- Expected response message me include hona chahiye: `OMR tests must have total questions in multiples of 5`.

#### OMR date too close

- Type: boundary
- Body me `testDate` aaj se 3 days se kam hai.
- Expected HTTP status: `500`
- Expected response message me include hona chahiye: `OMR/announced tests must be scheduled at least 3 days in advance`.

#### Teacher not mapped to class/subject

- Type: negative
- Preconditions: Teacher `SUB-MATH - CLS_10A` se mapped nahi hai.
- Expected HTTP status: `500`
- Expected response message me include hona chahiye: `Teacher is not mapped to the responsibility`.

#### Syllabus chapter not taught

- Type: negative
- Preconditions: Kisi ek selected syllabus chapter ka `is_taught = false` hai.
- Expected HTTP status: `500`
- Expected response message me include hona chahiye: `has not been taught yet`.
