# Exam Results API Contract

Covers `exam_results::get_student_results`.

---

## `GET /api/school/:schoolId/academic/exams/results/:studentId`

- Handler: `rust/src/domain/academic/exam_results.rs::get_student_results`
- Purpose: Return published exam results for a student in a school.

### Request

Path params:

- `schoolId`
- `studentId`

### Expected success response

`200 OK`

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
      "submissionId": "550e8400-e29b-41d4-a716-446655440000",
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

### Expected error response

`500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "<error message>"
}
```

### Important rules

- Only exams where `e.results_published = TRUE` are returned.
- Results are scoped by `school_id` and `student_id`.
- Scores are returned as strings because the current handler maps `BigDecimal` to text.

### Test cases

#### Published results for student

- Type: positive
- Preconditions: Student has at least one published exam result.
- Request: `GET /api/school/SCH-001/academic/exams/results/STD-001`
- Expected HTTP status: `200`
- Expected response: `data` contains published result rows with `examId`, `examName`, scores, grade, feedback, and `isFinalized`.

#### No published results

- Type: positive
- Preconditions: Student exists but has no published results.
- Expected HTTP status: `200`
- Expected response:

```json
{
  "success": true,
  "data": []
}
```

#### Unpublished results only

- Type: workflow
- Preconditions: Student has submissions, but exam `results_published = false`.
- Expected HTTP status: `200`
- Expected response: `{ success: true, data: [] }`

#### Tenant isolation

- Type: tenant-isolation
- Preconditions: Same `studentId` exists in another school.
- Expected HTTP status: `200`
- Expected response: Only results for the requested `schoolId` are returned.
