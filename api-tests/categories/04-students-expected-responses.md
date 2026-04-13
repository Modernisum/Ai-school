# Student Management APIs - Expected Responses

This document outlines the expected responses for Student Management API endpoints.

## Authentication Requirements
- **RLS Authentication Required:** Yes
- **Required Headers:**
  - `X-School-ID`: School identifier
  - `X-Admin-ID`: Admin user identifier
- **Access Level:** School admin or teachers with student management permissions

## 1. POST /api/students/:schoolId - Create Student

**Request Body Structure:**
```json
{
  "student_id": "STU001",
  "first_name": "John",
  "last_name": "Doe",
  "date_of_birth": "2010-05-15",
  "gender": "male",
  "class_name": "10th",
  "section": "A",
  "father_name": "Robert Doe",
  "mother_name": "Jane Doe",
  "contact_number": "+919876543210",
  "address": "123 Main Street, Delhi",
  "aadhaar_number": "123456789012",
  "enrollment_date": "2024-01-15"
}
```

**Expected Successful Response:**
- **Status Code:** 201 Created
- **Content-Type:** application/json
- **Response Body Structure:**
```json
{
  "success": true,
  "message": "Student created successfully",
  "student": {
    "id": "stu_abc123",
    "student_id": "STU001",
    "first_name": "John",
    "last_name": "Doe",
    "full_name": "John Doe",
    "date_of_birth": "2010-05-15",
    "age": 14,
    "gender": "male",
    "class_name": "10th",
    "section": "A",
    "father_name": "Robert Doe",
    "mother_name": "Jane Doe",
    "contact_number": "+919876543210",
    "address": "123 Main Street, Delhi",
    "aadhaar_number": "123456789012",
    "enrollment_date": "2024-01-15",
    "status": "active",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
}
```

**Validation Criteria:**
- Should return 201 Created status
- Should include complete student object with generated ID
- Should calculate age from date_of_birth
- Should set default status as "active"

**Error Responses:**
- **400 Bad Request:** Missing required fields, invalid data format
- **409 Conflict:** Student ID already exists
- **401 Unauthorized:** Missing or invalid RLS headers

## 2. POST /api/students/:schoolId/validate - Validate Student Data

**Expected Successful Response:**
- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Response Body Structure:**
```json
{
  "success": true,
  "valid": true,
  "warnings": [],
  "errors": [],
  "suggestions": {
    "class_name": "Valid class",
    "section": "Valid section"
  }
}
```

**Validation Criteria:**
- Should validate all fields without creating record
- Should return warnings for non-critical issues
- Should return errors for invalid data
- Should provide suggestions for corrections

## 3. POST /api/students/:schoolId/bulk - Bulk Import Students

**Expected Successful Response:**
- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Response Body Structure:**
```json
{
  "success": true,
  "message": "2 students imported, 0 failed",
  "total": 2,
  "success_count": 2,
  "fail_count": 0,
  "results": [
    {
      "student_id": "STU001",
      "status": "created",
      "message": "Student created successfully",
      "id": "stu_abc123"
    },
    {
      "student_id": "STU002",
      "status": "created",
      "message": "Student created successfully",
      "id": "stu_abc124"
    }
  ]
}
```

**Validation Criteria:**
- Should process all students in batch
- Should continue on partial failures
- Should provide detailed results for each student
- Should return counts of success/failure

## 4. GET /api/students/:schoolId - List All Students

**Expected Successful Response:**
- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Response Body Structure:**
```json
{
  "success": true,
  "data": [
    {
      "id": "stu_abc123",
      "student_id": "STU001",
      "first_name": "John",
      "last_name": "Doe",
      "full_name": "John Doe",
      "class_name": "10th",
      "section": "A",
      "gender": "male",
      "status": "active",
      "contact_number": "+919876543210"
    },
    {
      "id": "stu_abc124",
      "student_id": "STU002",
      "first_name": "Jane",
      "last_name": "Smith",
      "full_name": "Jane Smith",
      "class_name": "10th",
      "section": "B",
      "gender": "female",
      "status": "active",
      "contact_number": "+919876543211"
    }
  ],
  "count": 2
}
```

**Validation Criteria:**
- Should return array of student objects
- Should include basic student information
- Should filter by school ID
- Should respect user permissions

## 5. GET /api/students/:schoolId/paginated - List Students Paginated

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `class_name`: Filter by class (optional)
- `section`: Filter by section (optional)
- `status`: Filter by status (optional)
- `search`: Search term (optional)

**Expected Successful Response:**
- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Response Body Structure:**
```json
{
  "success": true,
  "data": [
    {
      "id": "stu_abc123",
      "student_id": "STU001",
      "first_name": "John",
      "last_name": "Doe",
      "full_name": "John Doe",
      "class_name": "10th",
      "section": "A",
      "gender": "male",
      "status": "active"
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "per_page": 20,
    "total_pages": 8,
    "has_next": true,
    "has_prev": false
  }
}
```

**Validation Criteria:**
- Should support pagination metadata
- Should apply filters correctly
- Should support search across multiple fields
- Should respect page and limit parameters

## 6. GET /api/students/:schoolId/class/:className - List Students by Class

**Expected Successful Response:**
- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Response Body Structure:**
```json
{
  "success": true,
  "data": [
    {
      "id": "stu_abc123",
      "student_id": "STU001",
      "first_name": "John",
      "last_name": "Doe",
      "full_name": "John Doe",
      "class_name": "10th",
      "section": "A",
      "gender": "male",
      "status": "active"
    },
    {
      "id": "stu_abc125",
      "student_id": "STU003",
      "first_name": "Alice",
      "last_name": "Johnson",
      "full_name": "Alice Johnson",
      "class_name": "10th",
      "section": "A",
      "gender": "female",
      "status": "active"
    }
  ],
  "class_name": "10th",
  "section": "A",
  "count": 2
}
```

**Validation Criteria:**
- Should filter students by class name
- Should support optional section parameter
- Should return class information in response

## 7. GET /api/students/:schoolId/studentIds - List Student IDs

**Expected Successful Response:**
- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Response Body Structure:**
```json
{
  "success": true,
  "data": [
    {
      "id": "stu_abc123",
      "student_id": "STU001",
      "full_name": "John Doe"
    },
    {
      "id": "stu_abc124",
      "student_id": "STU002",
      "full_name": "Jane Smith"
    }
  ],
  "count": 2
}
```

**Validation Criteria:**
- Should return minimal student information (ID, student_id, name)
- Should be optimized for dropdown/selection use cases
- Should be faster than full student listing

## 8. GET /api/students/:schoolId/:studentId - Get Student Details

**Expected Successful Response:**
- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Response Body Structure:**
```json
{
  "success": true,
  "student": {
    "id": "stu_abc123",
    "student_id": "STU001",
    "first_name": "John",
    "last_name": "Doe",
    "full_name": "John Doe",
    "date_of_birth": "2010-05-15",
    "age": 14,
    "gender": "male",
    "class_name": "10th",
    "section": "A",
    "father_name": "Robert Doe",
    "mother_name": "Jane Doe",
    "contact_number": "+919876543210",
    "alternate_contact": "+919876543211",
    "address": "123 Main Street, Delhi",
    "aadhaar_number": "123456789012",
    "enrollment_date": "2024-01-15",
    "status": "active",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z",
    "academic_history": [
      {
        "year": "2023-2024",
        "class": "9th",
        "section": "A",
        "result": "pass"
      }
    ],
    "attendance_summary": {
      "present": 85,
      "absent": 5,
      "percentage": 94.4
    }
  }
}
```

**Validation Criteria:**
- Should return complete student details
- Should include academic history if available
- Should include attendance summary
- Should match requested student ID

## 9. PUT /api/students/:schoolId/:studentId - Update Student

**Expected Successful Response:**
- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Response Body Structure:**
```json
{
  "success": true,
  "message": "Student updated successfully",
  "student": {
    "id": "stu_abc123",
    "student_id": "STU001",
    "first_name": "John Updated",
    "last_name": "Doe Updated",
    "class_name": "11th",
    "section": "B",
    "contact_number": "+919876543211",
    "updated_at": "2024-01-16T14:30:00Z"
  }
}
```

**Validation Criteria:**
- Should update only provided fields
- Should return updated student object
- Should update timestamp

## 10. DELETE /api/students/:schoolId/:studentId - Delete Student

**Expected Successful Response:**
- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Response Body Structure:**
```json
{
  "success": true,
  "message": "Student deleted successfully",
  "student_id": "STU001",
  "deleted_at": "2024-01-16T14:35:00Z"
}
```

**Validation Criteria:**
- Should soft delete (mark as inactive) rather than hard delete
- Should return confirmation message
- Should include deletion timestamp

## Common Error Responses

### 404 Not Found
```json
{
  "success": false,
  "error": {
    "code": "STUDENT_NOT_FOUND",
    "message": "Student not found",
    "details": "Student ID 'STU999' does not exist in school 'school_001'"
  }
}
```

### 400 Bad Request (Validation Error)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid student data",
    "details": {
      "date_of_birth": "Date must be in YYYY-MM-DD format",
      "contact_number": "Invalid phone number format"
    }
  }
}
```

### 409 Conflict (Duplicate)
```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_STUDENT",
    "message": "Student already exists",
    "details": "Student ID 'STU001' is already registered"
  }
}
```

## Testing Notes

1. **Data Validation:** Test with invalid dates, phone numbers, Aadhaar numbers
2. **Permissions:** Test with different admin roles (school admin vs teacher)
3. **Bulk Operations:** Test with large imports (100+ students)
4. **Pagination:** Test edge cases (empty page, last page, invalid page numbers)
5. **Search:** Test search functionality with partial matches
6. **Concurrent Updates:** Test simultaneous updates to same student
7. **Data Consistency:** Verify class/section references are valid

## Performance Expectations

1. **List Operations:** < 500ms for up to 1000 students
2. **Single Student Fetch:** < 100ms
3. **Bulk Import:** < 2 seconds per 100 students
4. **Pagination:** Should maintain performance with large datasets