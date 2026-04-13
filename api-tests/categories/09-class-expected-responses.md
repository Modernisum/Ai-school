# Class & Subject Management APIs - Expected Responses

## Authentication Requirements
- **Auth Type:** RLS (Row Level Security)
- **Required Headers:** `X-School-ID`, `X-Admin-ID` (for write operations)
- **Base URL:** `/api/class/:schoolId` and `/api/subject/:schoolId`

## 1. POST /api/class/:schoolId - Create Class

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "message": "Class created successfully",
  "data": {
    "classId": "class_123456",
    "className": "Class 10-A",
    "section": "A",
    "academicYear": "2024-2025",
    "classTeacherId": "emp_001",
    "classTeacherName": "Mr. Sharma",
    "maxStudents": 40,
    "currentStudents": 0,
    "subjects": ["Mathematics", "Science", "English", "Social Studies"],
    "description": "Class 10 Section A for academic year 2024-2025",
    "createdAt": "2025-01-15T10:00:00Z",
    "createdBy": "admin_001",
    "status": "active"
  }
}
```

### Error Responses
- **HTTP 400:** Invalid class data (missing className, invalid maxStudents)
- **HTTP 401:** Missing or invalid authentication headers
- **HTTP 409:** Class with same name and section already exists
- **HTTP 500:** Server error

## 2. GET /api/class/:schoolId - List Classes

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": [
    {
      "classId": "class_123456",
      "className": "Class 10-A",
      "section": "A",
      "academicYear": "2024-2025",
      "classTeacherId": "emp_001",
      "classTeacherName": "Mr. Sharma",
      "maxStudents": 40,
      "currentStudents": 35,
      "subjects": ["Mathematics", "Science", "English", "Social Studies"],
      "description": "Class 10 Section A for academic year 2024-2025",
      "createdAt": "2025-01-15T10:00:00Z",
      "status": "active"
    },
    {
      "classId": "class_789012",
      "className": "Class 11-B",
      "section": "B",
      "academicYear": "2024-2025",
      "classTeacherId": "emp_002",
      "classTeacherName": "Ms. Patel",
      "maxStudents": 40,
      "currentStudents": 38,
      "subjects": ["Physics", "Chemistry", "Mathematics", "Biology"],
      "description": "Class 11 Section B Science stream",
      "createdAt": "2025-01-10T09:00:00Z",
      "status": "active"
    }
  ]
}
```

## 3. POST /api/subject/:schoolId - Create Subject

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": {
    "subjectId": "subj_123456",
    "subjectName": "Computer Science",
    "subjectCode": "CS101",
    "description": "Introduction to Computer Science",
    "credits": 4,
    "isElective": true,
    "applicableClasses": ["Class 10", "Class 11", "Class 12"],
    "teacherId": "emp_003",
    "teacherName": "Dr. Kumar",
    "createdAt": "2025-01-15T11:00:00Z",
    "createdBy": "admin_001",
    "status": "active"
  }
}
```

## 4. GET /api/subject/:schoolId - List Subjects

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": [
    {
      "subjectId": "subj_123456",
      "subjectName": "Computer Science",
      "subjectCode": "CS101",
      "description": "Introduction to Computer Science",
      "credits": 4,
      "isElective": true,
      "applicableClasses": ["Class 10", "Class 11", "Class 12"],
      "teacherId": "emp_003",
      "teacherName": "Dr. Kumar",
      "createdAt": "2025-01-15T11:00:00Z",
      "status": "active"
    },
    {
      "subjectId": "subj_789012",
      "subjectName": "Mathematics",
      "subjectCode": "MATH101",
      "description": "Advanced Mathematics",
      "credits": 5,
      "isElective": false,
      "applicableClasses": ["Class 10", "Class 11", "Class 12"],
      "teacherId": "emp_001",
      "teacherName": "Mr. Sharma",
      "createdAt": "2025-01-10T10:00:00Z",
      "status": "active"
    }
  ]
}
```

## 5. POST /api/class/:schoolId/:classId/subjects - Assign Subject to Class

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": {
    "assignmentId": "assign_001",
    "classId": "class_123456",
    "className": "Class 10-A",
    "subjectId": "subj_123456",
    "subjectName": "Computer Science",
    "weeklyPeriods": 5,
    "teacherId": "emp_003",
    "teacherName": "Dr. Kumar",
    "assignedAt": "2025-01-15T12:00:00Z",
    "assignedBy": "admin_001",
    "academicYear": "2024-2025"
  }
}
```

## 6. GET /api/class/:schoolId/:classId/subjects - Get Class Subjects

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": {
    "classId": "class_123456",
    "className": "Class 10-A",
    "subjects": [
      {
        "subjectId": "subj_123456",
        "subjectName": "Computer Science",
        "subjectCode": "CS101",
        "weeklyPeriods": 5,
        "teacherId": "emp_003",
        "teacherName": "Dr. Kumar",
        "credits": 4,
        "isElective": true
      },
      {
        "subjectId": "subj_789012",
        "subjectName": "Mathematics",
        "subjectCode": "MATH101",
        "weeklyPeriods": 7,
        "teacherId": "emp_001",
        "teacherName": "Mr. Sharma",
        "credits": 5,
        "isElective": false
      }
    ],
    "totalSubjects": 2,
    "totalCredits": 9
  }
}
```

## 7. PUT /api/class/:schoolId/:classId - Update Class

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": {
    "classId": "class_123456",
    "className": "Class 10-A Updated",
    "section": "A",
    "maxStudents": 45,
    "description": "Updated class description",
    "updatedAt": "2025-01-15T13:00:00Z",
    "updatedBy": "admin_001",
    "changes": ["className", "maxStudents", "description"]
  }
}
```

## 8. DELETE /api/class/:schoolId/:classId - Delete Class

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "message": "Class deleted successfully",
  "data": {
    "classId": "class_123456",
    "className": "Class 10-A",
    "deletedAt": "2025-01-15T14:00:00Z",
    "deletedBy": "admin_001",
    "affectedStudents": 35,
    "affectedSubjects": 4
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
  "message": "Validation failed: className is required",
  "errors": [
    {
      "field": "className",
      "message": "Class name cannot be empty"
    }
  ]
}
```

### Resource Not Found (HTTP 404)
```json
{
  "success": false,
  "message": "Class not found"
}
```

### Conflict Error (HTTP 409)
```json
{
  "success": false,
  "message": "Class with same name and section already exists in this academic year"
}
```

### Constraint Violation (HTTP 422)
```json
{
  "success": false,
  "message": "Cannot delete class with active students. Please transfer students first."
}
```

### Server Error (HTTP 500)
```json
{
  "success": false,
  "message": "Internal server error"
}
```

## Test Data Dependencies
1. **School Setup:** School must be created and active
2. **Employee Data:** Teacher/employee must exist for class teacher assignment
3. **Academic Year:** Valid academic year format (YYYY-YYYY)
4. **Subject Data:** Subjects must exist before assigning to classes

## Testing Notes
1. **Class Creation:** Test with valid and invalid class names, sections
2. **Subject Assignment:** Verify subject-class mapping works correctly
3. **Capacity Limits:** Test maxStudents constraint
4. **Academic Year:** Test cross-year class management
5. **Cascading Effects:** Deleting class should handle student transfers
6. **Teacher Assignment:** Verify teacher exists and has appropriate permissions

## Class Status Flow
- **active:** Class is currently operational
- **inactive:** Class is not taking new admissions
- **archived:** Class from previous academic year
- **deleted:** Soft-deleted class (may be restored)