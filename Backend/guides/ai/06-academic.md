# Python v1 Academic API Contract

Covers academic endpoints for AI exam generation, auto-grading, syllabus planning, and period restructure from `python/app/api/v1/academic.py`.

Source:
- Router: `python/app/api/v1/academic.py:9`
- Orchestrator: `python/app/services/ai/orchestrator.py`

---

## `POST /api/school/{schoolId}/academic/exams/ai/generate`

### Purpose

Generate exam questions using AI for given subject, class, and chapters.

### Auth

Bearer token via `get_db_with_rls`.

### Handler

`python/app/api/v1/academic.py:43-53`

### Path params

- `schoolId` (string, required): School tenant ID.

### Request body

```json
{
  "subjectId": "SUB-001",
  "classId": "CLS-10",
  "chapterIds": [1, 2, 3],
  "totalMarks": 100,
  "difficulty": "medium"
}
```

### Expected success response

**Status:** `200`

```json
{
  "success": true,
  "data": {
    "questions": [
      {
        "question": "Explain the process of photosynthesis.",
        "marks": 10,
        "type": "long_answer",
        "chapterId": 1
      },
      {
        "question": "What is the chemical equation for photosynthesis?",
        "marks": 5,
        "type": "short_answer",
        "chapterId": 1
      }
    ],
    "totalMarks": 100,
    "metadata": {}
  }
}
```

### Expected error responses

Internal error (HTTP 500):

```json
{
  "detail": "<error message>"
}
```

### Important rules

- `difficulty` defaults to `"medium"` if not provided.
- Calls `orchestrator.generate_exam_questions()`.
- This route is duplicated on the AI router at `POST /api/school/{schoolId}/ai/chat/{schoolId_2}/exam/generate`.

### Test cases

#### TC_PYV1_ACAD_001 Generate exam questions

- Type: positive
- Request:
  - Method: `POST`
  - Route: `/api/school/SCH-00021/academic/exams/ai/generate`
  - Header: `Authorization: Bearer <token>`
  - Body: `{ "subjectId": "SUB-001", "classId": "CLS-10", "chapterIds": [1, 2], "totalMarks": 50, "difficulty": "easy" }`
- Expected HTTP status: `200`
- Expected response: `success == true`, `data.questions` is a non-empty array.

#### TC_PYV1_ACAD_002 Generate exam default difficulty

- Type: boundary
- Request:
  - Method: `POST`
  - Route: `/api/school/SCH-00021/academic/exams/ai/generate`
  - Header: `Authorization: Bearer <token>`
  - Body: `{ "subjectId": "SUB-001", "classId": "CLS-10", "chapterIds": [1], "totalMarks": 20 }`
- Expected HTTP status: `200`
- Expected response: `success == true`.

---

## `POST /api/school/{schoolId}/academic/exams/ai/regenerate-question`

### Purpose

Regenerate a single exam question while keeping the same topic constraints.

### Auth

Bearer token via `get_db_with_rls`.

### Handler

`python/app/api/v1/academic.py:56-66`

### Path params

- `schoolId` (string, required): School tenant ID.

### Request body

```json
{
  "currentQuestion": {
    "question": "Original question text",
    "marks": 5,
    "chapterId": 1
  },
  "difficulty": "medium",
  "topicConstraint": "photosynthesis"
}
```

`difficulty` defaults to `"medium"`. `topicConstraint` is optional.

### Expected success response

**Status:** `200`

```json
{
  "success": true,
  "data": {
    "question": "Regenerated question text on the same topic",
    "marks": 5,
    "type": "short_answer"
  }
}
```

### Important rules

- Calls `orchestrator.regenerate_exam_question()`.
- `topicConstraint` can be used to keep the regenerated question focused on a specific topic.

### Test cases

#### TC_PYV1_ACAD_003 Regenerate question

- Type: positive
- Request:
  - Method: `POST`
  - Route: `/api/school/SCH-00021/academic/exams/ai/regenerate-question`
  - Header: `Authorization: Bearer <token>`
  - Body: `{ "currentQuestion": { "question": "What is 2+2?", "marks": 2, "chapterId": 1 }, "difficulty": "easy" }`
- Expected HTTP status: `200`
- Expected response: `success == true`, `data` contains a regenerated question.

---

## `POST /api/school/{schoolId}/academic/exams/submit-test`

### Purpose

Submit student answers for AI-powered auto-grading.

### Auth

Bearer token via `get_db_with_rls`.

### Handler

`python/app/api/v1/academic.py:69-79`

### Path params

- `schoolId` (string, required): School tenant ID.

### Request body

```json
{
  "studentId": "STD-99882",
  "examId": "EXAM-001",
  "answers": [
    {
      "questionId": 1,
      "answer": "Photosynthesis is the process by which plants convert sunlight into energy."
    },
    {
      "questionId": 2,
      "answer": "6CO2 + 6H2O → C6H12O6 + 6O2"
    }
  ]
}
```

### Expected success response

**Status:** `200`

```json
{
  "success": true,
  "data": {
    "totalMarks": 100,
    "obtainedMarks": 85,
    "percentage": 85.0,
    "gradedAnswers": [
      {
        "questionId": 1,
        "marksAwarded": 8,
        "maxMarks": 10,
        "feedback": "Good explanation but missing mention of chlorophyll."
      }
    ]
  }
}
```

### Important rules

- Calls `orchestrator.grade_test_submission()`.
- `answers` is a list of objects with at minimum `questionId` and `answer`.

### Test cases

#### TC_PYV1_ACAD_004 Submit test for grading

- Type: positive
- Preconditions: Exam and student exist.
- Request:
  - Method: `POST`
  - Route: `/api/school/SCH-00021/academic/exams/submit-test`
  - Header: `Authorization: Bearer <token>`
  - Body: `{ "studentId": "STD-99882", "examId": "EXAM-001", "answers": [{ "questionId": 1, "answer": "Test answer" }] }`
- Expected HTTP status: `200`
- Expected response: `success == true`, `data` contains grading results.

---

## `POST /api/school/{schoolId}/academic/syllabus/{responsibilityId}/plot`

### Purpose

Generate an annual syllabus plot/calendar for a given subject (responsibility).

### Auth

Bearer token via `get_db_with_rls`.

### Handler

`python/app/api/v1/academic.py:82-101`

### Path params

- `schoolId` (string, required): School tenant ID.
- `responsibilityId` (string, required): Subject/responsibility ID (used as `subject_id`).

### Request body

```json
{
  "academicYear": 2026,
  "spaceId": "CLS-10"
}
```

`academicYear` defaults to `2026`. `spaceId` defaults to `"general"` (used as `class_id`).

### Expected success response

**Status:** `200`

```json
{
  "success": true,
  "data": {
    "syllabus": [
      {
        "month": "April",
        "topics": ["Introduction to Algebra", "Linear Equations"],
        "periods": 20
      }
    ]
  }
}
```

### Important rules

- `spaceId` is used as `class_id` internally.
- `responsibilityId` is used as `subject_id`.
- Response shape is determined by the orchestrator; may not include `success` wrapper.

### Test cases

#### TC_PYV1_ACAD_005 Syllabus annual plot

- Type: positive
- Request:
  - Method: `POST`
  - Route: `/api/school/SCH-00021/academic/syllabus/SUB-001/plot`
  - Header: `Authorization: Bearer <token>`
  - Body: `{ "academicYear": 2026, "spaceId": "CLS-10" }`
- Expected HTTP status: `200`
- Expected response: Contains syllabus data.

---

## `POST /api/school/{schoolId}/academic/syllabus/{responsibilityId}/micro-plan`

### Purpose

Generate a micro-level period plan for a date range within a syllabus.

### Auth

Bearer token via `get_db_with_rls`.

### Handler

`python/app/api/v1/academic.py:104-122`

### Path params

- `schoolId` (string, required): School tenant ID.
- `responsibilityId` (string, required): Subject ID.

### Request body

```json
{
  "fromDate": "2026-06-01",
  "toDate": "2026-06-30",
  "spaceId": "CLS-10"
}
```

`spaceId` defaults to `"general"`.

### Expected success response

**Status:** `200`

```json
{
  "success": true,
  "data": {
    "periods": [
      {
        "date": "2026-06-01",
        "topic": "Introduction to Algebra",
        "activities": ["Lecture", "Worksheet"],
        "resources": ["Textbook Chapter 1"]
      }
    ]
  }
}
```

### Important rules

- `spaceId` is used as `class_id`.
- `responsibilityId` is used as `subject_id`.
- `fromDate` and `toDate` are required strings.

### Test cases

#### TC_PYV1_ACAD_006 Micro plan generation

- Type: positive
- Request:
  - Method: `POST`
  - Route: `/api/school/SCH-00021/academic/syllabus/SUB-001/micro-plan`
  - Header: `Authorization: Bearer <token>`
  - Body: `{ "fromDate": "2026-06-01", "toDate": "2026-06-30", "spaceId": "CLS-10" }`
- Expected HTTP status: `200`
- Expected response: Contains period plan data.

---

## `POST /api/school/{schoolId}/academic/period-plans/restructure`

### Purpose

Restructure pending period plans when a teacher falls behind schedule (delay).

### Auth

Bearer token via `get_db_with_rls`.

### Handler

`python/app/api/v1/academic.py:125-140`

### Path params

- `schoolId` (string, required): School tenant ID.

### Request body

```json
{
  "teacherId": "EMP-00109",
  "date": "2026-06-22"
}
```

### Expected success response

**Status:** `200`

```json
{
  "success": true,
  "data": {
    "restructured": true,
    "affectedPeriods": 5,
    "newSchedule": [...]
  }
}
```

### Important rules

- Calls `orchestrator.restructure_syllabus_on_delay()`.
- `teacherId` and `date` are required.

### Test cases

#### TC_PYV1_ACAD_007 Restructure period plans

- Type: positive
- Preconditions: Teacher has pending periods that are behind schedule.
- Request:
  - Method: `POST`
  - Route: `/api/school/SCH-00021/academic/period-plans/restructure`
  - Header: `Authorization: Bearer <token>`
  - Body: `{ "teacherId": "EMP-00109", "date": "2026-06-22" }`
- Expected HTTP status: `200`
- Expected response: Contains restructured schedule data.