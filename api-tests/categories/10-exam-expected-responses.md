# Exam Management APIs - Expected Responses

## Authentication Requirements
- **Auth Type:** RLS (Row Level Security)
- **Required Headers:** `X-School-ID`, `X-Admin-ID` (for write operations)
- **Base URL:** `/api/exam/:schoolId`

## 1. POST /api/exam/:schoolId - Create Exam

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": {
    "examId": "exam_123456",
    "examName": "First Term Examination",
    "examType": "term",
    "academicYear": "2024-2025",
    "startDate": "2025-03-01",
    "endDate": "2025-03-15",
    "classes": ["Class 10", "Class 11", "Class 12"],
    "subjects": ["Mathematics", "Science", "English"],
    "totalMarks": 100,
    "passingMarks": 40,
    "description": "First term examination for all classes",
    "schedule": [
      {
        "date": "2025-03-01",
        "subject": "Mathematics",
        "time": "10:00-13:00",
        "venue": "Main Hall",
        "examiner": "To be assigned"
      }
    ],
    "status": "draft",
    "createdAt": "2025-01-15T10:00:00Z",
    "createdBy": "admin_001",
    "totalStudents": 150,
    "totalSubjects": 3
  }
}
```

### Error Responses
- **HTTP 400:** Invalid exam data (missing dates, invalid marks)
- **HTTP 401:** Missing or invalid authentication headers
- **HTTP 409:** Exam with same name and dates already exists
- **HTTP 500:** Server error

## 2. GET /api/exam/:schoolId - List Exams

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": [
    {
      "examId": "exam_123456",
      "examName": "First Term Examination",
      "examType": "term",
      "academicYear": "2024-2025",
      "startDate": "2025-03-01",
      "endDate": "2025-03-15",
      "classes": ["Class 10", "Class 11", "Class 12"],
      "status": "draft",
      "totalStudents": 150,
      "totalSubjects": 3,
      "createdAt": "2025-01-15T10:00:00Z"
    },
    {
      "examId": "exam_789012",
      "examName": "Mid-term Assessment",
      "examType": "midterm",
      "academicYear": "2024-2025",
      "startDate": "2025-02-01",
      "endDate": "2025-02-05",
      "classes": ["Class 10"],
      "status": "published",
      "totalStudents": 50,
      "totalSubjects": 5,
      "createdAt": "2025-01-10T09:00:00Z"
    }
  ],
  "pagination": {
    "total": 2,
    "page": 1,
    "limit": 20,
    "pages": 1
  }
}
```

## 3. GET /api/exam/:schoolId?studentId=:studentId - List Exams by Student

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": [
    {
      "examId": "exam_123456",
      "examName": "First Term Examination",
      "examType": "term",
      "startDate": "2025-03-01",
      "endDate": "2025-03-15",
      "className": "Class 10",
      "subjects": [
        {
          "subjectName": "Mathematics",
          "examDate": "2025-03-01",
          "time": "10:00-13:00",
          "venue": "Main Hall",
          "status": "upcoming",
          "preparedness": "not_started"
        },
        {
          "subjectName": "Science",
          "examDate": "2025-03-03",
          "time": "10:00-13:00",
          "venue": "Science Lab",
          "status": "upcoming",
          "preparedness": "not_started"
        }
      ],
      "overallStatus": "upcoming"
    }
  ]
}
```

## 4. POST /api/exam/:schoolId/ai/generate - AI Generate Exam Questions

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": {
    "examId": "exam_ai_001",
    "subject": "Mathematics",
    "classLevel": "Class 10",
    "difficulty": "medium",
    "totalQuestions": 20,
    "questions": [
      {
        "questionId": "q_001",
        "questionType": "mcq",
        "questionText": "What is the value of π (pi) to two decimal places?",
        "options": ["3.14", "3.15", "3.16", "3.17"],
        "correctAnswer": "3.14",
        "marks": 1,
        "topic": "Geometry",
        "difficulty": "easy"
      },
      {
        "questionId": "q_002",
        "questionType": "short_answer",
        "questionText": "Solve for x: 2x + 5 = 15",
        "correctAnswer": "5",
        "marks": 2,
        "topic": "Algebra",
        "difficulty": "easy"
      },
      {
        "questionId": "q_003",
        "questionType": "problem_solving",
        "questionText": "A triangle has sides of length 3cm, 4cm, and 5cm. Calculate its area.",
        "solution": "Using Heron's formula: s = (3+4+5)/2 = 6, Area = √[6(6-3)(6-4)(6-5)] = √[6×3×2×1] = √36 = 6 cm²",
        "marks": 5,
        "topic": "Geometry",
        "difficulty": "medium"
      }
    ],
    "answerKey": {
      "q_001": "3.14",
      "q_002": "5",
      "q_003": "6 cm²"
    },
    "totalMarks": 100,
    "generatedAt": "2025-01-15T11:30:00Z",
    "generationTime": "2.5 seconds"
  },
  "message": "Exam questions generated successfully"
}
```

## 5. GET /api/exam/:schoolId/:examId - Get Exam Details

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": {
    "examId": "exam_123456",
    "examName": "First Term Examination",
    "examType": "term",
    "academicYear": "2024-2025",
    "startDate": "2025-03-01",
    "endDate": "2025-03-15",
    "classes": ["Class 10", "Class 11", "Class 12"],
    "subjects": ["Mathematics", "Science", "English"],
    "totalMarks": 100,
    "passingMarks": 40,
    "description": "First term examination for all classes",
    "schedule": [
      {
        "date": "2025-03-01",
        "subject": "Mathematics",
        "time": "10:00-13:00",
        "venue": "Main Hall",
        "examiner": "Mr. Sharma",
        "invigilators": ["Ms. Patel", "Mr. Kumar"]
      },
      {
        "date": "2025-03-03",
        "subject": "Science",
        "time": "10:00-13:00",
        "venue": "Science Lab",
        "examiner": "Dr. Singh",
        "invigilators": ["Ms. Gupta"]
      }
    ],
    "status": "draft",
    "createdAt": "2025-01-15T10:00:00Z",
    "createdBy": "admin_001",
    "totalStudents": 150,
    "totalSubjects": 3,
    "questionPapers": [
      {
        "subject": "Mathematics",
        "paperId": "paper_001",
        "status": "draft",
        "createdAt": "2025-01-15T11:00:00Z"
      }
    ]
  }
}
```

## 6. PUT /api/exam/:schoolId/:examId - Update Exam

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": {
    "examId": "exam_123456",
    "examName": "First Term Examination Updated",
    "endDate": "2025-03-20",
    "description": "Updated exam schedule with extended dates",
    "updatedAt": "2025-01-16T09:00:00Z",
    "updatedBy": "admin_001",
    "changes": ["examName", "endDate", "description"]
  }
}
```

## 7. DELETE /api/exam/:schoolId/:examId - Delete Exam

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "message": "Exam deleted successfully",
  "data": {
    "examId": "exam_123456",
    "examName": "First Term Examination",
    "deletedAt": "2025-01-16T10:00:00Z",
    "deletedBy": "admin_001",
    "affectedStudents": 150,
    "affectedSchedules": 3,
    "backupCreated": true
  }
}
```

## 8. POST /api/exam/:schoolId/:examId/publish - Publish Exam Results

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": {
    "examId": "exam_123456",
    "examName": "First Term Examination",
    "publishDate": "2025-03-25",
    "status": "results_published",
    "notificationsSent": {
      "students": 150,
      "parents": 300,
      "teachers": 15
    },
    "statistics": {
      "totalStudents": 150,
      "studentsAppeared": 145,
      "passPercentage": 85.5,
      "topScore": 98,
      "averageScore": 72.3
    },
    "publishedAt": "2025-03-25T10:00:00Z",
    "publishedBy": "admin_001"
  }
}
```

## Common Error Responses

### Authentication Error (HTTP 401)
```json
{
  "success": false,
  "message": "Unauthorized: Missing or invalid school/admin headers"
}
```

### Validation Error (HTTP 400)
```json
{
  "success": false,
  "message": "Validation failed: endDate must be after startDate",
  "errors": [
    {
      "field": "endDate",
      "message": "End date must be after start date"
    }
  ]
}
```

### Resource Not Found (HTTP 404)
```json
{
  "success": false,
  "message": "Exam not found"
}
```

### Conflict Error (HTTP 409)
```json
{
  "success": false,
  "message": "Exam with same name and dates already scheduled"
}
```

### Exam in Progress (HTTP 422)
```json
{
  "success": false,
  "message": "Cannot modify exam that is currently in progress"
}
```

### AI Generation Error (HTTP 500)
```json
{
  "success": false,
  "message": "Failed to generate exam questions: AI service unavailable"
}
```

## Test Data Dependencies
1. **School Setup:** School must be created and active
2. **Class Data:** Classes must exist for exam scheduling
3. **Subject Data:** Subjects must be defined
4. **Student Data:** Students must be enrolled in classes
5. **Teacher Data:** Examiners and invigilators must exist

## Testing Notes
1. **Exam Lifecycle:** Test draft → scheduled → in-progress → completed → results published
2. **Date Validation:** Test overlapping exam schedules
3. **AI Integration:** Test exam question generation with different parameters
4. **Result Publishing:** Test notification mechanisms
5. **Security:** Verify students can only see their own exams
6. **Bulk Operations:** Consider testing bulk result entry

## Exam Status Flow
- **draft:** Exam created but not scheduled
- **scheduled:** Dates and schedule finalized
- **in_progress:** Exam currently ongoing
- **completed:** Exam finished, awaiting results
- **results_published:** Results available to students
- **archived:** Exam from previous academic year