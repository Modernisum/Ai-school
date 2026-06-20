# Academic API Contract & Test Case Documentation Plan

## Goal

Convert `guides/academic/academic_guide.md` into a fresh-developer-friendly Academic domain API manual where every endpoint registered inside `rust/src/domain/academic/mod.rs` has:

1. Endpoint route, handler file, HTTP method, and purpose.
2. Request path/query/body contract.
3. Expected success response based on current handler behavior.
4. Expected error response/status based on current handler behavior.
5. Practical API test cases with sample payloads.
6. Important workflow/state rules, tenant isolation rules, and validation notes.

If the content becomes large, split it into multiple Markdown files under `guides/academic/api/` and keep `academic_guide.md` as the index/overview.

---

## Current Source Audit

### Active Academic routes from `rust/src/domain/academic/mod.rs`

The documentation must cover every route below.

#### Exams

| Method | Route | Handler | Current source |
|---|---|---|---|
| `POST` | `/api/school/:schoolId/academic/exams` | `exam::create_exam` | `rust/src/domain/academic/exam.rs:11` |
| `GET` | `/api/school/:schoolId/academic/exams` | `exam::list_exams` | `rust/src/domain/academic/exam.rs:32` |
| `POST` | `/api/school/:schoolId/academic/exams/:examId/sections` | `exam::create_exam_section` | `rust/src/domain/academic/exam.rs:50` |
| `GET` | `/api/school/:schoolId/academic/exams/:examId/sections` | `exam::list_exam_sections` | `rust/src/domain/academic/exam.rs:71` |
| `PATCH` | `/api/school/:schoolId/academic/exams/:examId/sections/:sectionId` | `exam::update_exam_section` | `rust/src/domain/academic/exam.rs:85` |
| `POST` | `/api/school/:schoolId/academic/exams/teacher-test` | `exam::create_teacher_test` | `rust/src/domain/academic/exam.rs:106` |

#### Exam checker workflow

| Method | Route | Handler | Current source |
|---|---|---|---|
| `POST` | `/api/school/:schoolId/academic/exams/checker/assign/:examId` | `exam_checker::assign_checker` | `rust/src/domain/academic/exam_checker.rs:11` |
| `GET` | `/api/school/:schoolId/academic/exams/checker/pending` | `exam_checker::checker_pending_exams` | `rust/src/domain/academic/exam_checker.rs:33` |
| `GET` | `/api/school/:schoolId/academic/exams/checker/submissions/:examId` | `exam_checker::list_exam_submissions` | `rust/src/domain/academic/exam_checker.rs:53` |
| `POST` | `/api/school/:schoolId/academic/exams/checker/review/:examId/:submissionId` | `exam_checker::checker_review` | `rust/src/domain/academic/exam_checker.rs:75` |
| `POST` | `/api/school/:schoolId/academic/exams/approve/:examId/:submissionId` | `exam_checker::teacher_approve` | `rust/src/domain/academic/exam_checker.rs:96` |
| `POST` | `/api/school/:schoolId/academic/exams/reject/:examId/:submissionId` | `exam_checker::teacher_reject` | `rust/src/domain/academic/exam_checker.rs:117` |
| `POST` | `/api/school/:schoolId/academic/exams/publish/:examId` | `exam_checker::publish_results` | `rust/src/domain/academic/exam_checker.rs:138` |

#### Exam results

| Method | Route | Handler | Current source |
|---|---|---|---|
| `GET` | `/api/school/:schoolId/academic/exams/results/:studentId` | `exam_results::get_student_results` | `rust/src/domain/academic/exam_results.rs:10` |

#### Timetable

| Method | Route | Handler | Current source |
|---|---|---|---|
| `POST` | `/api/school/:schoolId/academic/timetable/generate` | `timetable::generate_timetable` | `rust/src/domain/academic/timetable.rs:14` |
| `GET` | `/api/school/:schoolId/academic/timetable/` | `timetable::list_timetables` | `rust/src/domain/academic/timetable.rs:63` |
| `GET` | `/api/school/:schoolId/academic/timetable/:configId` | `timetable::get_timetable` | `rust/src/domain/academic/timetable.rs:49` |
| `POST` | `/api/school/:schoolId/academic/timetable/:configId/approve` | `timetable::approve_timetable` | `rust/src/domain/academic/timetable.rs:93` |
| `DELETE` | `/api/school/:schoolId/academic/timetable/:configId` | `timetable::delete_timetable` | `rust/src/domain/academic/timetable.rs:77` |

#### Timetable enhanced

| Method | Route | Handler | Current source |
|---|---|---|---|
| `GET` | `/api/school/:schoolId/academic/timetable-issue-box/:configId` | `timetable_enhanced::issue_box` | `rust/src/domain/academic/timetable_enhanced.rs:53` |
| `GET` | `/api/school/:schoolId/academic/timetable-view/:configId` | `timetable_enhanced::view_filtered` | `rust/src/domain/academic/timetable_enhanced.rs:67` |
| `GET` | `/api/school/:schoolId/academic/timetable-substitute/:spaceId/:responsibilityId/:day/:period` | `timetable_enhanced::suggest_substitute` | `rust/src/domain/academic/timetable_enhanced.rs:92` |

#### Topics

| Method | Route | Handler | Current source |
|---|---|---|---|
| `POST` | `/api/school/:schoolId/academic/topics` | `topic::create_topic` | `rust/src/domain/academic/topic.rs:4` |

#### Syllabus calendar

| Method | Route | Handler | Current source |
|---|---|---|---|
| `GET` | `/api/school/:schoolId/academic/syllabus/:responsibilityId` | `syllabus_calendar::get_syllabus` | `rust/src/domain/academic/syllabus_calendar.rs:12` |
| `PATCH` | `/api/school/:schoolId/academic/syllabus/chapter/:chapterId` | `syllabus_calendar::update_chapter_plan` | `rust/src/domain/academic/syllabus_calendar.rs:52` |
| `GET` | `/api/school/:schoolId/academic/syllabus/quarter/:quarter` | `syllabus_calendar::quarter_report` | `rust/src/domain/academic/syllabus_calendar.rs:84` |

#### Period plans

| Method | Route | Handler | Current source |
|---|---|---|---|
| `GET` | `/api/school/:schoolId/academic/period-plans/today` | `period_plan::get_daily_todo` | `rust/src/domain/academic/period_plan.rs:11` |
| `GET` | `/api/school/:schoolId/academic/period-plans/:date` | `period_plan::get_date_plan` | `rust/src/domain/academic/period_plan.rs:59` |
| `POST` | `/api/school/:schoolId/academic/period-plans/:id/status` | `period_plan::update_status` | `rust/src/domain/academic/period_plan.rs:74` |

#### Schedule changes

| Method | Route | Handler | Current source |
|---|---|---|---|
| `POST` | `/api/school/:schoolId/academic/changes/request` | `schedule_change::request_change` | `rust/src/domain/academic/schedule_change.rs:11` |
| `GET` | `/api/school/:schoolId/academic/changes/pending` | `schedule_change::list_pending` | `rust/src/domain/academic/schedule_change.rs:46` |
| `POST` | `/api/school/:schoolId/academic/changes/:id/approve` | `schedule_change::approve_change` | `rust/src/domain/academic/schedule_change.rs:78` |
| `POST` | `/api/school/:schoolId/academic/changes/:id/reject` | `schedule_change::reject_change` | `rust/src/domain/academic/schedule_change.rs:98` |

#### Daily reports

| Method | Route | Handler | Current source |
|---|---|---|---|
| `POST` | `/api/school/:schoolId/academic/reports/daily` | `daily_report::submit_daily_report` | `rust/src/domain/academic/daily_report.rs:12` |
| `GET` | `/api/school/:schoolId/academic/reports/daily/:date` | `daily_report::get_report` | `rust/src/domain/academic/daily_report.rs:47` |
| `GET` | `/api/school/:schoolId/academic/reports/missed` | `daily_report::missed_reports` | `rust/src/domain/academic/daily_report.rs:81` |

---

## Documentation File Split

Recommended structure:

```text
guides/academic/
  academic_guide.md
  api/
    00-index.md
    01-exams.md
    02-exam-checker-workflow.md
    03-exam-results.md
    04-timetable.md
    05-timetable-enhanced.md
    06-topics.md
    07-syllabus-calendar.md
    08-period-plans.md
    09-schedule-changes.md
    10-daily-reports.md
    11-test-case-format.md
```

### `academic_guide.md`

Keep as the high-level domain manual and add a short API contract section:

- Purpose of the Academic domain.
- Link to `api/00-index.md`.
- Developer laws:
  - Timetable must be validated before approving/activating.
  - Exam score inputs must not exceed section max marks.
  - Checker review must not be allowed after approved/rejected/published/finalized states.
  - All lookups must stay scoped to `school_id`.
- Workflow summary:
  - Exam creation -> sections -> submissions -> checker review -> teacher approve/reject -> publish -> student results.
  - Timetable generation -> issue box -> filtered view -> approve/delete.
  - Syllabus planning -> period plans -> daily reports.
  - Schedule change request -> pending list -> approve/reject.

### `api/00-index.md`

Create a route index table with:

- Group name.
- File link.
- Routes covered.
- Main workflow.
- Most important test cases.

### `api/11-test-case-format.md`

Define a reusable test-case template:

```md
### Test Case: <short name>

- Type: positive / negative / boundary / workflow / tenant-isolation
- Preconditions:
- Request:
  - Method:
  - Route:
  - Headers/Auth:
  - Body/Query:
- Expected HTTP status:
- Expected response:
- Database/state assertion:
- Notes:
```

Recommended test-case categories:

1. Positive happy path.
2. Missing required field.
3. Invalid path parameter.
4. Unauthorized tenant/school mismatch.
5. Workflow state violation.
6. Boundary value.
7. Idempotency/update behavior where applicable.
8. Empty list behavior.

---

## Endpoint Documentation Contract

Each endpoint page must use this structure.

```md
# <Group Name>

## Endpoint: <METHOD> <route>

- Handler: `<file.rs::function>`
- Purpose:
- Auth/Tenant:
- Request:
  - Path params:
  - Query params:
  - Body:
- Expected success response:
  - HTTP status:
  - JSON:
- Expected error response:
  - HTTP status:
  - JSON:
- Important validation/rules:
- Test cases:
```

Error response should usually be documented as:

```json
{
  "success": false,
  "message": "<error message>"
}
```

Most current handlers return `500 INTERNAL_SERVER_ERROR` for service/repository errors. Where the handler uses a specific status, document that exact status instead.

---

## Endpoint Expected Responses to Document

### Exams

#### `POST /api/school/:schoolId/academic/exams`

Expected success response should document the service/repository return shape, not a generic wrapper, because `exam::create_exam` returns `Json(data)` directly.

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

Test cases:

- Create main exam with name, quarter, start/end date, status, examType.
- Create exam with missing name to verify DB/service error.
- Duplicate exam name behavior due to `ON CONFLICT (school_id, name)`.
- Tenant isolation: same schoolId in path must be used by tenant connection.

#### `GET /api/school/:schoolId/academic/exams`

Expected success response:

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

Query:

- Optional `student_id`. Current repository accepts it but does not filter by student.

Test cases:

- List all exams.
- List with `?student_id=STD-001`.
- Empty list.

#### `POST /api/school/:schoolId/academic/exams/:examId/sections`

Expected success response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "examId": 1,
    "spaceId": "CLS_10A",
    "responsibilityId": "SUB-MATH",
    "syllabus": [],
    "aiGeneratedPaper": false,
    "questions": [],
    "totalMarks": 100
  }
}
```

Request fields:

- `spaceId` or `classId`.
- `responsibilityId` or `subjectId`.
- Optional `syllabus`.
- Optional `aiGeneratedPaper`.
- Optional `questions`.
- Optional `totalMarks`.

Test cases:

- Create section with `spaceId` and `responsibilityId`.
- Create section with legacy aliases `classId` and `subjectId`.
- Update same section conflict key with new syllabus/questions.
- Missing exam ID path.
- Tenant isolation.

#### `GET /api/school/:schoolId/academic/exams/:examId/sections`

Expected success response:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "examId": 1,
      "spaceId": "CLS_10A",
      "responsibilityId": "SUB-MATH",
      "syllabus": [],
      "aiGeneratedPaper": false,
      "questions": [],
      "totalMarks": 100
    }
  ]
}
```

Test cases:

- Multiple sections.
- Empty sections.
- Wrong school/exam pair.

#### `PATCH /api/school/:schoolId/academic/exams/:examId/sections/:sectionId`

Expected success response:

```json
{
  "success": true
}
```

Test cases:

- Update `syllabus`.
- Update `questions`.
- Update `totalMarks`.
- Update `aiGeneratedPaper`.
- Section ID belongs to another school.

#### `POST /api/school/:schoolId/academic/exams/teacher-test`

Expected success response:

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
      "syllabus": [1],
      "aiGeneratedPaper": false,
      "questions": [],
      "totalMarks": 20
    }
  }
}
```

Important validations from service:

- `classId` required.
- `subjectId` required.
- `name` required.
- Teacher must be mapped to responsibility `Subject - Class`.
- `syllabus` array required.
- Every syllabus item must match a chapter by id or name and must be taught.
- If `isOmr` true, `totalQuestions` required and must be multiple of 5.
- If `isOmr` true or `wantsAnnouncement` true, `testDate` required, format `YYYY-MM-DD`, and at least 3 days in future.

Test cases:

- Valid non-OMR teacher test.
- Valid OMR test with 20 questions and future date.
- OMR test with 17 questions.
- OMR/announced test with date less than 3 days ahead.
- Teacher not mapped to class/subject.
- Syllabus chapter not taught.

---

### Exam Checker Workflow

#### `POST /api/school/:schoolId/academic/exams/checker/assign/:examId`

Current handler expects `checkerEmployeeId`, not `checkerId`.

Expected success response:

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

Test cases:

- Assign checker with `checkerEmployeeId`.
- Missing `checkerEmployeeId`.
- Invalid exam ID.
- Checker assigned after publish should be checked in workflow docs.

#### `GET /api/school/:schoolId/academic/exams/checker/pending`

Expected success response:

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

Test cases:

- Pending exams for assigned checker.
- Published exam excluded.
- Empty list.

#### `GET /api/school/:schoolId/academic/exams/checker/submissions/:examId`

Expected success response:

```json
{
  "success": true,
  "data": [
    {
      "submissionId": "<uuid>",
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

Query:

- Optional `status`.

Test cases:

- All submissions.
- Filter by `?status=pending`.
- Filter by `?status=checker_reviewed`.
- Empty list.

#### `POST /api/school/:schoolId/academic/exams/checker/review/:examId/:submissionId`

Expected success response:

```json
{
  "success": true,
  "data": {
    "success": true,
    "submissionId": "<uuid>",
    "status": "checker_reviewed"
  }
}
```

Request fields:

- `checkerNotes`
- `adjustedScore`
- `strictnessUsed`

Workflow rule:

- Do not allow review when submission is already teacher approved/rejected or exam results are published.
- Current handler does not enforce this; document as required validation/test case.

Test cases:

- Review pending submission.
- Review with adjusted score.
- Review already teacher approved submission should fail.
- Review published exam should fail.
- Invalid UUID submission ID.

#### `POST /api/school/:schoolId/academic/exams/approve/:examId/:submissionId`

Expected success response:

```json
{
  "success": true,
  "data": {
    "success": true,
    "submissionId": "<uuid>",
    "status": "approved"
  }
}
```

Request fields:

- `teacherApproved`: true.
- Optional `teacherNotes`.
- Optional `adjustedScore`.

Test cases:

- Approve checker-reviewed submission.
- Approve rejected submission should fail.
- Approve already published exam should fail.
- Invalid UUID submission ID.

#### `POST /api/school/:schoolId/academic/exams/reject/:examId/:submissionId`

Expected success response:

```json
{
  "success": true,
  "data": {
    "success": true,
    "submissionId": "<uuid>",
    "status": "rejected"
  }
}
```

Request fields:

- `teacherApproved`: false.
- Optional `teacherNotes`.
- Optional `adjustedScore`.

Test cases:

- Reject checker-reviewed submission.
- Reject already approved submission should fail.
- Reject published exam should fail.

#### `POST /api/school/:schoolId/academic/exams/publish/:examId`

Expected success response:

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

Workflow rule:

- Publish only after required submissions are teacher approved.
- After publish, checker review/approve/reject must be blocked.

Test cases:

- Publish exam with approved submissions.
- Publish exam with pending/rejected submissions should fail.
- Publish already published exam should be idempotent or fail depending product decision.
- Publish exam from another school should fail.

---

### Exam Results

#### `GET /api/school/:schoolId/academic/exams/results/:studentId`

Expected success response:

```json
{
  "success": true,
  "data": [
    {
      "examId": 1,
      "examName": "Midterm Examination",
      "quarter": "Q2",
      "subjectId": "SUB-MATH",
      "classId": "CLS_10A",
      "submissionId": "<uuid>",
      "overallScore": "86.5",
      "teacherAdjustedScore": "88.0",
      "grade": "A",
      "feedback": "Well done.",
      "isFinalized": true,
      "strictnessUsed": "medium"
    }
  ]
}
```

Important rule:

- Only returns exams where `e.results_published = TRUE`.

Test cases:

- Published results for student.
- No published results.
- Student has unpublished results only.
- Tenant isolation.

---

### Timetable

#### `POST /api/school/:schoolId/academic/timetable/generate`

Expected success response:

```json
{
  "success": true,
  "config_id": "<uuid>",
  "class_id": "CLS_10A",
  "class_name": "10-A",
  "total_slots": 30,
  "slots": [
    {
      "day": 1,
      "period": 1,
      "subject_id": "SUB-MATH",
      "subject_name": "Mathematics",
      "teacher_id": "EMP-00109",
      "teacher_name": "Sunita Rao",
      "room_id": "R-102",
      "is_free_period": false
    }
  ],
  "conflicts": [],
  "has_conflicts": false
}
```

Request fields:

- `classId`
- `className`
- Optional `periodsPerDay` default 8.
- Optional `workingDays` default `[1,2,3,4,5]`.
- `requirements`: `subjectId`, `subjectName`, `teacherId`, `teacherName`, `periodsPerWeek`, `roomType`.
- Optional `season`.
- Optional `startTime`, `endTime`, `periodDurationMinutes`, `breakDurationMinutes`.

Test cases:

- Generate conflict-free timetable.
- Generate with teacher double-booking conflict.
- Generate with room double-booking conflict.
- Missing requirements.
- Tenant isolation.
- Approve only when `has_conflicts == false`.

#### `GET /api/school/:schoolId/academic/timetable/`

Expected success response:

```json
{
  "success": true,
  "data": [
    {
      "configId": "<uuid>",
      "classId": "CLS_10A",
      "className": "10-A",
      "status": "draft",
      "createdAt": "2026-06-19T09:00:00Z"
    }
  ]
}
```

Test cases:

- Multiple configs.
- Empty list.
- Tenant isolation.

#### `GET /api/school/:schoolId/academic/timetable/:configId`

Expected success response:

```json
{
  "success": true,
  "data": {
    "configId": "<uuid>",
    "classId": "CLS_10A",
    "className": "10-A",
    "status": "draft",
    "slots": [],
    "conflicts": []
  }
}
```

Error status:

- `404 NOT_FOUND` on missing config.

Test cases:

- Existing config.
- Missing config.
- Config from another school.

#### `POST /api/school/:schoolId/academic/timetable/:configId/approve`

Expected success response:

```json
{
  "success": true,
  "message": "Timetable approved and notifications sent"
}
```

Test cases:

- Approve conflict-free timetable.
- Approve timetable with conflicts should fail.
- Approve missing config should fail.
- Tenant isolation.

#### `DELETE /api/school/:schoolId/academic/timetable/:configId`

Expected success response:

```json
{
  "success": true,
  "message": "Timetable deleted"
}
```

Test cases:

- Delete draft timetable.
- Delete active/approved timetable should fail.
- Delete missing config.
- Tenant isolation.

---

### Timetable Enhanced

#### `GET /api/school/:schoolId/academic/timetable-issue-box/:configId`

Expected success response:

```json
{
  "success": true,
  "data": {
    "issues": [
      {
        "type": "teacher_double_booking",
        "description": "Teacher EMP-00109 is scheduled at two classes at Day 1 Period 3"
      }
    ]
  }
}
```

Test cases:

- No issues.
- Teacher double booking.
- Room double booking.
- Missing config.

#### `GET /api/school/:schoolId/academic/timetable-view/:configId`

Expected success response:

```json
{
  "success": true,
  "viewType": "teachers",
  "data": {
    "configId": "<uuid>",
    "classId": "CLS_10A",
    "className": "10-A",
    "slots": [
      {
        "day": 1,
        "period": 1,
        "teacher_id": "EMP-00109"
      }
    ]
  }
}
```

Query:

- Optional `type`: `global`, `teachers`, `non-teachers`.

Test cases:

- Global view.
- Teachers-only view.
- Non-teachers-only view.
- Missing config.

#### `GET /api/school/:schoolId/academic/timetable-substitute/:spaceId/:responsibilityId/:day/:period`

Expected success response:

```json
{
  "success": true,
  "data": [
    {
      "rank": 1,
      "employeeId": "EMP-00302",
      "name": "David Miller",
      "freePeriodsToday": 4,
      "isSubjectMatch": true,
      "score": 92
    }
  ],
  "totalCandidates": 1
}
```

Test cases:

- Subject-matched free teacher.
- No available substitute.
- Invalid day/period.
- Tenant isolation.

---

### Topics

#### `POST /api/school/:schoolId/academic/topics`

Current handler ignores `schoolId` path and calls `create_topic(payload)` directly.

Expected success response:

```json
{
  "id": 1,
  "responsibilityId": "SUB-MATH",
  "name": "Linear Equations",
  "description": "Basic algebra topic"
}
```

Important issue:

- Current handler does not enforce tenant/school scope.
- Documentation should mark this as a tenant-isolation gap and add a test case.

Test cases:

- Create topic with `responsibilityId`.
- Create topic with `subjectId` alias.
- Missing name should fail.
- Tenant isolation check should be added.

---

### Syllabus Calendar

#### `GET /api/school/:schoolId/academic/syllabus/:responsibilityId`

Expected success response:

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

Test cases:

- Syllabus by responsibility ID.
- Syllabus by subject ID.
- Empty syllabus.
- Tenant isolation.

#### `PATCH /api/school/:schoolId/academic/syllabus/chapter/:chapterId`

Expected success response:

```json
{
  "success": true
}
```

Request fields:

- Optional `status`.
- Optional `actualStartDate`.
- Optional `actualEndDate`.

Test cases:

- Mark chapter completed.
- Add actual start/end dates.
- Partial update.
- Chapter from another school.

#### `GET /api/school/:schoolId/academic/syllabus/quarter/:quarter`

Expected success response:

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

Test cases:

- Quarter with mixed statuses.
- Empty quarter.
- Tenant isolation.

---

### Period Plans

#### `GET /api/school/:schoolId/academic/period-plans/today`

Expected success response:

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

Query required:

- `teacherId`
- `date`

Error response:

```json
{
  "success": false,
  "message": "teacherId and date required"
}
```

Test cases:

- Valid teacher/date.
- Missing teacherId.
- Missing date.
- Empty plans.
- Tenant isolation.

#### `GET /api/school/:schoolId/academic/period-plans/:date`

Same behavior as `period-plans/today`, but `date` is path parameter and `teacherId` remains query parameter.

Test cases:

- Valid date path.
- Missing `teacherId`.
- Invalid date format.

#### `POST /api/school/:schoolId/academic/period-plans/:id/status`

Expected success response:

```json
{
  "success": true
}
```

Request fields:

- `status` required.
- Optional `teacherNote`.
- If `status == completed`, backend sets `completed_at` to current timestamp.

Test cases:

- Mark plan completed with note.
- Mark plan pending.
- Missing status.
- Plan from another school.

---

### Schedule Changes

#### `POST /api/school/:schoolId/academic/changes/request`

Expected success response:

```json
{
  "success": true,
  "message": "Change request submitted"
}
```

Request fields:

- `type`
- `reason`
- Optional `dateFrom`
- Optional `dateTo`
- Optional `blockCapMinutes`
- Optional `sourceClassId`
- Optional `sourceSubjectId`
- Optional `targetClassId`
- Optional `targetSubjectId`

Test cases:

- Submit valid swap request.
- Submit request without reason.
- Submit request with invalid date range.
- Tenant isolation.

#### `GET /api/school/:schoolId/academic/changes/pending`

Expected success response:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "type": "swap",
      "requestedBy": "EMP-00109",
      "status": "pending",
      "reason": "Doctor appointment",
      "sourceClassId": "CLS_10A",
      "targetClassId": "CLS_9B",
      "dateFrom": "2026-06-20",
      "dateTo": "2026-06-20",
      "createdAt": "2026-06-19T09:00:00Z"
    }
  ]
}
```

Test cases:

- Pending list.
- Empty list.
- Non-pending statuses excluded.
- Tenant isolation.

#### `POST /api/school/:schoolId/academic/changes/:id/approve`

Expected success response:

```json
{
  "success": true
}
```

Test cases:

- Approve pending request.
- Approve already approved request.
- Approve request from another school.

#### `POST /api/school/:schoolId/academic/changes/:id/reject`

Expected success response:

```json
{
  "success": true
}
```

Request fields:

- Optional `adminNote`.

Test cases:

- Reject pending request with note.
- Reject without note.
- Reject request from another school.

---

### Daily Reports

#### `POST /api/school/:schoolId/academic/reports/daily`

Expected success response:

```json
{
  "success": true,
  "message": "Daily report submitted"
}
```

Request fields:

- `reportDate`
- `summary`
- Optional `pendingTopics`
- Optional `completedPeriods`
- Optional `totalPeriods`

Test cases:

- Submit new daily report.
- Upsert same teacher/date report.
- Missing report date.
- Tenant isolation.

#### `GET /api/school/:schoolId/academic/reports/daily/:date`

Expected success response:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "teacherId": "EMP-00109",
      "reportDate": "2026-06-19",
      "status": "submitted",
      "summary": "Completed limits and assignments.",
      "completedPeriods": 4,
      "totalPeriods": 6
    }
  ]
}
```

Query:

- Optional `teacherId`.
- If missing, returns all reports for that school/date.

Test cases:

- Get all reports for date.
- Get one teacher report.
- Empty reports.
- Tenant isolation.

#### `GET /api/school/:schoolId/academic/reports/missed`

Expected success response:

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

Test cases:

- Teachers with period plans and no report.
- No missed reports.
- Tenant isolation.

---

## Implementation Steps

1. Create `guides/academic/api/`.
2. Add `api/11-test-case-format.md` with reusable test case template.
3. Add `api/00-index.md` listing all endpoint groups and links.
4. Add group files:
   - `01-exams.md`
   - `02-exam-checker-workflow.md`
   - `03-exam-results.md`
   - `04-timetable.md`
   - `05-timetable-enhanced.md`
   - `06-topics.md`
   - `07-syllabus-calendar.md`
   - `08-period-plans.md`
   - `09-schedule-changes.md`
   - `10-daily-reports.md`
5. Update `academic_guide.md`:
   - Add link to `api/00-index.md`.
   - Keep existing overview, architecture, developer laws, and history.
   - Replace outdated sample API snippets with references to endpoint docs where needed.
6. Normalize documentation language:
   - Keep the existing Hinglish-friendly tone.
   - Use clear English field names because API payloads are in English.
   - Add short Hindi/Hinglish notes for workflow meaning where helpful.
7. Highlight code/documentation mismatches:
   - Checker assign expects `checkerEmployeeId`, not `checkerId`.
   - `POST /topics` currently does not use `schoolId`.
   - Some error paths return `500` where product expectation may be `400`/`404`.
   - Checker workflow state enforcement is not fully implemented in current handler code.
8. Validate docs against `rust/src/domain/academic/mod.rs` so no route is missing.

---

## Validation Plan

After documentation changes:

1. Confirm every route in `rust/src/domain/academic/mod.rs` appears in `guides/academic/api/00-index.md` or a group file.
2. Confirm every endpoint has:
   - Request contract.
   - Success response.
   - Error response/status.
   - At least one positive and one negative test case.
3. Confirm workflow-sensitive endpoints include state rules:
   - Checker review.
   - Teacher approve/reject.
   - Publish results.
   - Timetable approve.
4. Confirm tenant isolation is documented for every endpoint, especially `POST /topics`.
5. Run a documentation-only lint pass:
   - Broken Markdown links.
   - Duplicate route entries.
   - Missing expected status codes.
