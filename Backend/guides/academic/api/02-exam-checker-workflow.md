# Exam Checker Workflow API Contract

Covers checker assignment, pending checker exams, submission listing, checker review, teacher approve/reject, and result publishing.

Workflow target:

```text
pending -> checker_reviewed -> teacher_approved / teacher_rejected -> results_published
```

Do not allow checker review, teacher approval, or teacher rejection after the exam result is published or the submission is already in a terminal state.

---

## `POST /api/school/:schoolId/academic/exams/checker/assign/:examId`

- Handler: `rust/src/domain/academic/exam_checker.rs::assign_checker`
- Purpose: Assign a checker employee to an exam.

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

Important: current handler reads `checkerEmployeeId`, not `checkerId`.

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
- Database/state assertion: `exams.checker_employee_id = EMP-00122` and `checker_assigned_at` is set.

#### Missing checkerEmployeeId

- Type: negative
- Body: `{}`
- Expected HTTP status: `500` based on current handler behavior.
- Expected response message: DB/service error caused by empty checker ID.

#### Legacy checkerId body

- Type: compatibility
- Body: `{ "checkerId": "EMP-00122" }`
- Expected HTTP status: `500` based on current handler behavior.
- Documentation note: Clients should use `checkerEmployeeId`.

---

## `GET /api/school/:schoolId/academic/exams/checker/pending`

- Handler: `rust/src/domain/academic/exam_checker.rs::checker_pending_exams`
- Purpose: List unpublished exams assigned to the current checker.

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
- Preconditions: Current tenant user is assigned as checker to at least one unpublished exam.
- Expected HTTP status: `200`
- Expected response: `data` contains assigned exams with `results_published = false`.

#### Published exam excluded

- Type: workflow
- Preconditions: Checker has one unpublished exam and one published exam.
- Expected HTTP status: `200`
- Expected response: Published exam is not included.

#### Empty pending list

- Type: positive
- Expected HTTP status: `200`
- Expected response: `{ success: true, data: [] }`

---

## `GET /api/school/:schoolId/academic/exams/checker/submissions/:examId`

- Handler: `rust/src/domain/academic/exam_checker.rs::list_exam_submissions`
- Purpose: List student submissions for an exam, optionally filtered by status.

### Request

Path params:

- `schoolId`
- `examId`

Query params:

- Optional `status`: for example `pending`, `checker_reviewed`, `teacher_approved`, `teacher_rejected`.

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
- Expected response: `data` contains submissions for the exam.

#### Filter pending submissions

- Type: positive
- Request: `GET /api/school/SCH-001/academic/exams/checker/submissions/1?status=pending`
- Expected HTTP status: `200`
- Expected response: All returned rows have `status = pending`.

#### Empty submissions

- Type: positive
- Expected HTTP status: `200`
- Expected response: `{ success: true, data: [] }`

---

## `POST /api/school/:schoolId/academic/exams/checker/review/:examId/:submissionId`

- Handler: `rust/src/domain/academic/exam_checker.rs::checker_review`
- Purpose: Checker reviews a student submission and stores checker notes/score/strictness.

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

Current handler updates status to `checker_reviewed`. Product rule: reject review when submission is already `teacher_approved`, `teacher_rejected`, or exam results are published.

### Test cases

#### Review pending submission

- Type: positive
- Preconditions: Submission status is `pending` and exam is not published.
- Request: `POST /api/school/SCH-001/academic/exams/checker/review/1/<submissionId>`
- Body: Valid checker review.
- Expected HTTP status: `200`
- Database/state assertion: `student_submissions.status = checker_reviewed`; `ai_grading_results.checker_id` and notes are set.

#### Review already teacher approved

- Type: workflow
- Preconditions: Submission status is `teacher_approved`.
- Expected HTTP status: Should be `409 CONFLICT` or equivalent validation error.
- Current behavior note: Backend must add state validation before accepting this transition.

#### Review published exam

- Type: workflow
- Preconditions: Exam `results_published = true`.
- Expected HTTP status: Should be `409 CONFLICT`.
- Current behavior note: Backend must block checker review after publish.

#### Invalid UUID submission ID

- Type: negative
- Path uses non-UUID submission ID.
- Expected HTTP status: `500` based on current UUID parse behavior.

---

## `POST /api/school/:schoolId/academic/exams/approve/:examId/:submissionId`

- Handler: `rust/src/domain/academic/exam_checker.rs::teacher_approve`
- Purpose: Teacher approves a checker-reviewed submission.

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

Approve should be allowed only from a valid pre-approval state, usually `checker_reviewed` or `pending` if product allows direct teacher approval. It must be blocked after publish.

### Test cases

#### Approve checker-reviewed submission

- Type: positive
- Preconditions: Submission status is `checker_reviewed`.
- Expected HTTP status: `200`
- Database/state assertion: `student_submissions.status = teacher_approved`; `ai_grading_results.teacher_approved = true` and `is_finalized = true`.

#### Approve rejected submission

- Type: workflow
- Preconditions: Submission status is `teacher_rejected`.
- Expected HTTP status: Should be `409 CONFLICT`.
- Current behavior note: Backend must add state validation before accepting this transition.

#### Approve published exam

- Type: workflow
- Preconditions: Exam `results_published = true`.
- Expected HTTP status: Should be `409 CONFLICT`.

---

## `POST /api/school/:schoolId/academic/exams/reject/:examId/:submissionId`

- Handler: `rust/src/domain/academic/exam_checker.rs::teacher_reject`
- Purpose: Teacher rejects a submission for rework or correction.

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
- Preconditions: Submission status is `checker_reviewed`.
- Expected HTTP status: `200`
- Database/state assertion: `student_submissions.status = teacher_rejected`; `ai_grading_results.teacher_approved = false`.

#### Reject already approved submission

- Type: workflow
- Preconditions: Submission status is `teacher_approved`.
- Expected HTTP status: Should be `409 CONFLICT`.

#### Reject published exam

- Type: workflow
- Preconditions: Exam `results_published = true`.
- Expected HTTP status: Should be `409 CONFLICT`.

---

## `POST /api/school/:schoolId/academic/exams/publish/:examId`

- Handler: `rust/src/domain/academic/exam_checker.rs::publish_results`
- Purpose: Mark exam results as published.

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

Publish only after required submissions are approved/finalized according to product policy. After publish, checker review, teacher approve, and teacher reject must be blocked.

### Test cases

#### Publish exam with approved submissions

- Type: positive
- Preconditions: Exam has approved/finalized submissions.
- Expected HTTP status: `200`
- Database/state assertion: `exams.results_published = true`, `results_published_at` and `approved_by` are set.

#### Publish exam with pending submissions

- Type: workflow
- Preconditions: Exam has at least one `pending` submission.
- Expected HTTP status: Should be `409 CONFLICT` unless product allows partial publish.

#### Publish already published exam

- Type: idempotency
- Preconditions: Exam already has `results_published = true`.
- Expected HTTP status: Should be documented as either idempotent `200` or `409 CONFLICT`.
- Current behavior note: Current SQL update can be idempotent; product decision should be documented.

#### Publish exam from another school

- Type: tenant-isolation
- Expected HTTP status: Should not affect another school's exam.
