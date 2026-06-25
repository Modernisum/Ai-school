# Python v1 AI Tasks & Exams API Contract

Covers AI-powered task generation, task reorganization, and exam generation endpoints from `python/app/api/v1/ai.py`.

Source:
- Router: `python/app/api/v1/ai.py:11`
- Orchestrator: `python/app/services/ai/orchestrator.py`

---

## `POST /api/school/{schoolId}/ai/chat/{schoolId_2}/tasks/generate`

### Purpose

Generate weekly tasks for a specific employee using AI.

### Auth

Bearer token via `get_db_with_rls`.

### Handler

`python/app/api/v1/ai.py:433-447`

### Path params

- `schoolId` (string, required): School tenant ID.
- `schoolId_2` (string, required): Currently unused.

### Request body

```json
{
  "employee_id": "EMP-00109"
}
```

### Expected success response

**Status:** `200`

```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "title": "Review class 10 attendance",
        "description": "Check attendance records...",
        "priority": "high",
        "deadline": "2026-06-28"
      }
    ]
  }
}
```

### Expected error responses

Missing employee_id (HTTP 400):

```json
{
  "detail": "employee_id is required"
}
```

### Important rules

- Calls `orchestrator.generate_weekly_tasks_for_employee()`.
- `employee_id` is required and validated before processing.

### Test cases

#### TC_PYV1_AI_031 Generate tasks for employee

- Type: positive
- Preconditions: Employee exists in the school.
- Request:
  - Method: `POST`
  - Route: `/api/school/SCH-00021/ai/chat/anyvalue/tasks/generate`
  - Header: `Authorization: Bearer <token>`
  - Body: `{ "employee_id": "EMP-00109" }`
- Expected HTTP status: `200`
- Expected response: `success == true`, `data` contains tasks array.

#### TC_PYV1_AI_032 Generate tasks without employee_id

- Type: negative
- Request:
  - Method: `POST`
  - Route: `/api/school/SCH-00021/ai/chat/anyvalue/tasks/generate`
  - Header: `Authorization: Bearer <token>`
  - Body: `{}`
- Expected HTTP status: `400`
- Expected response: `detail == "employee_id is required"`.

---

## `POST /api/school/{schoolId}/ai/chat/{schoolId_2}/tasks/reorganize`

### Purpose

Reorganize existing tasks for an employee using AI optimization.

### Auth

Bearer token via `get_db_with_rls`.

### Handler

`python/app/api/v1/ai.py:449-463`

### Path params

- `schoolId` (string, required): School tenant ID.
- `schoolId_2` (string, required): Currently unused.

### Request body

```json
{
  "employee_id": "EMP-00109"
}
```

### Expected success response

**Status:** `200`

```json
{
  "success": true,
  "data": {
    "reorganized": true,
    "tasks": [...]
  }
}
```

### Expected error responses

Missing employee_id (HTTP 400):

```json
{
  "detail": "employee_id is required"
}
```

### Important rules

- Calls `orchestrator.reorganize_tasks()`.

### Test cases

#### TC_PYV1_AI_033 Reorganize tasks

- Type: positive
- Preconditions: Employee has existing tasks.
- Request:
  - Method: `POST`
  - Route: `/api/school/SCH-00021/ai/chat/anyvalue/tasks/reorganize`
  - Header: `Authorization: Bearer <token>`
  - Body: `{ "employee_id": "EMP-00109" }`
- Expected HTTP status: `200`
- Expected response: `success == true`, `data` is an object.

---

## `POST /api/school/{schoolId}/ai/chat/{schoolId_2}/exam/generate`

### Purpose

Generate exam questions using AI (AI router version - also exists on academic router).

### Auth

Bearer token via `get_db_with_rls`.

### Handler

`python/app/api/v1/ai.py:465-476`

### Path params

- `schoolId` (string, required): School tenant ID.
- `schoolId_2` (string, required): Currently unused.

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
        "type": "long_answer"
      }
    ]
  }
}
```

### Important rules

- This is a duplicate of the academic router's `POST /api/school/{schoolId}/academic/exams/ai/generate` (see `06-academic.md`).
- Both routes call the same `orchestrator.generate_exam_questions()`.
- No payload validation beyond basic dict acceptance - the orchestrator handles validation internally.

### Test cases

#### TC_PYV1_AI_034 Generate exam (AI router)

- Type: positive
- Request:
  - Method: `POST`
  - Route: `/api/school/SCH-00021/ai/chat/anyvalue/exam/generate`
  - Header: `Authorization: Bearer <token>`
  - Body: `{ "subjectId": "SUB-001", "classId": "CLS-10", "chapterIds": [1, 2], "totalMarks": 50 }`
- Expected HTTP status: `200`
- Expected response: `success == true`, `data` contains questions.