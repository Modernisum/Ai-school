# Exam Checker Workflow API Contract

Isme checker assignment, pending checker exams, submission listing, checker review, teacher approve/reject, aur result publishing cover hote hain.

Workflow target:

```text
pending -> checker_reviewed -> teacher_approved / teacher_rejected -> results_published
```

Exam result publish hone ke baad ya submission pehle se terminal state me hone ke baad, checker review, teacher approval, ya teacher rejection allow nahi kiya jayega.

---

## `POST /api/school/:schoolId/academic/exams/checker/assign/:examId`

- Handler: `rust/src/domain/academic/exam_checker.rs::assign_checker`
- Purpose: Ek exam ke liye checker employee assign karna.

### Request

Path params:

- `schoolId`
- `examId`

Body:

```json
{
  "checkerEmployeeId": "EMP-00122"
}
```

Important: current handler `checkerEmployeeId` read karta hai, `checkerId` nahi.

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": {
    "examId": "1",
    "checkerEmployeeId": "EMP-00122",
    "assignedAt": "2026-06-19T09:30:00Z"
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

#### Assign checker

- Type: positive
- Request: `POST /api/school/SCH-001/academic/exams/checker/assign/1`
- Body: `{ "checkerEmployeeId": "EMP-00122" }`
- Expected HTTP status: `200`
- Database/state assertion: `exams.checker_employee_id = EMP-00122` aur `checker_assigned_at` set ho jate hain.

#### Missing checkerEmployeeId

- Type: negative
- Body: `{}`
- Expected HTTP status: `500` based on current handler behavior.
- Expected response message: Khali checker ID ki wajah se hone wala DB/service error.

#### Legacy checkerId body

- Type: compatibility
- Body: `{ "checkerId": "EMP-00122" }`
- Expected HTTP status: `500` based on current handler behavior.
- Documentation note: Clients ko `checkerEmployeeId` use karna chahiye.

---

## `GET /api/school/:schoolId/academic/exams/checker/pending`

- Handler: `rust/src/domain/academic/exam_checker.rs::checker_pending_exams`
- Purpose: Current checker ko assigned unpublished exams ki list return karna.

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
      "status": "SCHEDULED",
      "examType": "MAIN",
      "startDate": "2026-10-15",
      "endDate": "2026-10-15",
      "responsibilityId": "SUB-MATH",
      "spaceId": "CLS_10A",
      "checkerAssignedAt": "2026-10-01T09:00:00Z",
      "strictnessLevel": "medium"
    }
  ]
}
```

### Test cases

#### Pending exams for checker

- Type: positive
- Preconditions: Current tenant user kam se kam ek unpublished exam ke liye checker ki tarah assigned hona chahiye.
- Expected HTTP status: `200`
- Expected response: `data` me assigned exams hone chahiye jinka `results_published = false` ho.

#### Published exam excluded

- Type: workflow
- Preconditions: Checker ke paas ek unpublished exam aur ek published exam hai.
- Expected HTTP status: `200`
- Expected response: Published exam isme include nahi hona chahiye.

#### Empty pending list

- Type: positive
- Expected HTTP status: `200`
- Expected response: `{ success: true, data: [] }`

---

## `GET /api/school/:schoolId/academic/exams/checker/submissions/:examId`

- Handler: `rust/src/domain/academic/exam_checker.rs::list_exam_submissions`
- Purpose: Ek exam ke liye student submissions ki list return karna, jise optionally status ke according filter kiya ja sake.

### Request

Path params:

- `schoolId`
- `examId`

Query params:

- Optional `status`: jaise ki `pending`, `checker_reviewed`, `teacher_approved`, `teacher_rejected`.

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": [
    {
      "submissionId": "550e8400-e29b-41d4-a716-446655440000",
      "studentId": "STD-99882",
      "status": "pending",
      "submissionType": "exam",
      "checkedBy": null,
      "checkedAt": null,
      "overallScore": "42.5",
      "grade": "B",
      "feedback": "Good answer structure.",
      "imageMetadata": {}
    }
  ]
}
```

### Test cases

#### List all submissions

- Type: positive
- Request: `GET /api/school/SCH-001/academic/exams/checker/submissions/1`
- Expected HTTP status: `200`
- Expected response: `data` me exam ke liye submissions hone chahiye.

#### Filter pending submissions

- Type: positive
- Request: `GET /api/school/SCH-001/academic/exams/checker/submissions/1?status=pending`
- Expected HTTP status: `200`
- Expected response: Saari returned rows me `status = pending` hona chahiye.

#### Empty submissions

- Type: positive
- Expected HTTP status: `200`
- Expected response: `{ success: true, data: [] }`

---

## `POST /api/school/:schoolId/academic/exams/checker/review/:examId/:submissionId`

- Handler: `rust/src/domain/academic/exam_checker.rs::checker_review`
- Purpose: Checker student submission ko review karta hai aur checker notes/score/strictness store karta hai.

### Request

Path params:

- `schoolId`
- `examId`
- `submissionId`

Body:

```json
{
  "checkerNotes": "Good structural clarity in section B.",
  "adjustedScore": 42.5,
  "strictnessUsed": "medium"
}
```

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": {
    "success": true,
    "submissionId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "checker_reviewed"
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

### Important workflow rule

Current handler status ko `checker_reviewed` par update karta hai. Product rule: jab submission pehle se `teacher_approved`, `teacher_rejected`, ya exam results published hon, toh review ko reject kar dein.

### Test cases

#### Review pending submission

- Type: positive
- Preconditions: Submission status `pending` hai aur exam published nahi hai.
- Request: `POST /api/school/SCH-001/academic/exams/checker/review/1/<submissionId>`
- Body: Valid checker review.
- Expected HTTP status: `200`
- Database/state assertion: `student_submissions.status = checker_reviewed` ho jayega; `ai_grading_results.checker_id` aur notes set ho jayenge.

#### Review already teacher approved

- Type: workflow
- Preconditions: Submission status `teacher_approved` hai.
- Expected HTTP status: `409 CONFLICT` ya uske equivalent validation error hona chahiye.
- Current behavior note: Backend ko is transition ko accept karne se pehle state validation add karna chahiye.

#### Review published exam

- Type: workflow
- Preconditions: Exam ka `results_published = true` hai.
- Expected HTTP status: Should be `409 CONFLICT`.
- Current behavior note: Backend ko publish ke baad checker review block karna chahiye.

#### Invalid UUID submission ID

- Type: negative
- Path me non-UUID submission ID use kiya gaya hai.
- Expected HTTP status: `500` current UUID parse behavior ke basis par.

---

## `POST /api/school/:schoolId/academic/exams/approve/:examId/:submissionId`

- Handler: `rust/src/domain/academic/exam_checker.rs::teacher_approve`
- Purpose: Teacher ek checker-reviewed submission ko approve karta hai.

### Request

Path params:

- `schoolId`
- `examId`
- `submissionId`

Body:

```json
{
  "teacherApproved": true,
  "teacherNotes": "Approved with minor score adjustment.",
  "adjustedScore": 44
}
```

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": {
    "success": true,
    "submissionId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "approved"
  }
}
```

### Important workflow rule

Approve sirf ek valid pre-approval state (usually `checker_reviewed` ya `pending` agar product direct teacher approval allow karta ho) se hi allow hona chahiye. Publish ke baad ise block karna zaroori hai.

### Test cases

#### Approve checker-reviewed submission

- Type: positive
- Preconditions: Submission status `checker_reviewed` hai.
- Expected HTTP status: `200`
- Database/state assertion: `student_submissions.status = teacher_approved` ho jayega; `ai_grading_results.teacher_approved = true` aur `is_finalized = true` ho jayenge.

#### Approve rejected submission

- Type: workflow
- Preconditions: Submission status `teacher_rejected` hai.
- Expected HTTP status: Should be `409 CONFLICT`.
- Current behavior note: Backend ko is transition ko accept karne se pehle state validation add karna chahiye.

#### Approve published exam

- Type: workflow
- Preconditions: Exam ka `results_published = true` hai.
- Expected HTTP status: Should be `409 CONFLICT`.

---

## `POST /api/school/:schoolId/academic/exams/reject/:examId/:submissionId`

- Handler: `rust/src/domain/academic/exam_checker.rs::teacher_reject`
- Purpose: Teacher rework ya correction ke liye submission ko reject karta hai.

### Request

Path params:

- `schoolId`
- `examId`
- `submissionId`

Body:

```json
{
  "teacherApproved": false,
  "teacherNotes": "Section B answer needs correction.",
  "adjustedScore": 38
}
```

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": {
    "success": true,
    "submissionId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "rejected"
  }
}
```

### Test cases

#### Reject checker-reviewed submission

- Type: positive
- Preconditions: Submission status `checker_reviewed` hai.
- Expected HTTP status: `200`
- Database/state assertion: `student_submissions.status = teacher_rejected` ho jayega; `ai_grading_results.teacher_approved = false` ho jayega.

#### Reject already approved submission

- Type: workflow
- Preconditions: Submission status `teacher_approved` hai.
- Expected HTTP status: Should be `409 CONFLICT`.

#### Reject published exam

- Type: workflow
- Preconditions: Exam ka `results_published = true` hai.
- Expected HTTP status: Should be `409 CONFLICT`.

---

## `POST /api/school/:schoolId/academic/exams/publish/:examId`

- Handler: `rust/src/domain/academic/exam_checker.rs::publish_results`
- Purpose: Exam results ko published mark karna.

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": {
    "examId": "1",
    "resultsPublished": true,
    "publishedAt": "2026-10-20T09:00:00Z"
  }
}
```

### Important workflow rule

Publish tabhi karein jag product policy ke according required submissions approved/finalized hon. Publish hone ke baad checker review, teacher approve, aur teacher reject ko block karna zaroori hai.

### Test cases

#### Publish exam with approved submissions

- Type: positive
- Preconditions: Exam me approved/finalized submissions hain.
- Expected HTTP status: `200`
- Database/state assertion: `exams.results_published = true` ho jayega, `results_published_at` aur `approved_by` set ho jayenge.

#### Publish exam with pending submissions

- Type: workflow
- Preconditions: Exam me kam se kam ek `pending` submission hai.
- Expected HTTP status: `409 CONFLICT` hona chahiye jab tak ki product partial publish allow na karta ho.

#### Publish already published exam

- Type: idempotency
- Preconditions: Exam ka pehle se hi `results_published = true` hai.
- Expected HTTP status: Idempotent `200` ya fir `409 CONFLICT` ki tarah document kiya jana chahiye.
- Current behavior note: Current SQL update idempotent ho sakta hai; product decision document kiya jana chahiye.

#### Publish exam from another school

- Type: tenant-isolation
- Expected HTTP status: Kisi dusre school ke exam ko affect nahi karna chahiye.
