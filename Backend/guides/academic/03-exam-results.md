# Exam Results API Contract

Isme `exam_results::get_student_results` cover hota hai.

---

## `GET /api/school/:schoolId/academic/exams/results/:studentId`

- Handler: `rust/src/domain/academic/exam_results.rs::get_student_results`
- Purpose: School me ek student ke liye sirf published exam results return karna.

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

- Sirf wahi exams return hote hain jahan `e.results_published = TRUE` ho.
- Results `school_id` aur `student_id` ke according scoped hote hain.
- Scores strings ki tarah return hote hain kyunki current handler `BigDecimal` ko text me map karta hai.

### Test cases

#### Published results for student

- Type: positive
- Preconditions: Student ke paas kam se kam ek published exam result hona chahiye.
- Request: `GET /api/school/SCH-001/academic/exams/results/STD-001`
- Expected HTTP status: `200`
- Expected response: `data` me published result rows hone chahiye jisme `examId`, `examName`, scores, grade, feedback, aur `isFinalized` details hon.

#### No published results

- Type: positive
- Preconditions: Student exist karta hai par uske paas koi published results nahi hain.
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
- Preconditions: Student ke paas submissions hain, par exam `results_published = false` hai.
- Expected HTTP status: `200`
- Expected response: `{ success: true, data: [] }`

#### Tenant isolation

- Type: tenant-isolation
- Preconditions: Same `studentId` kisi dusre school me bhi exist karta hai.
- Expected HTTP status: `200`
- Expected response: Sirf requested `schoolId` ke results hi return hone chahiye.
