# Awards Management APIs - Expected Responses

This document outlines the expected responses for Awards Management API endpoints.

## Authentication Requirements
- **RLS Authentication Required:** Yes
- **Required Headers:**
  - `X-School-ID`: School identifier
  - `X-Admin-ID`: Admin user identifier
- **Access Level:** School admin, teachers, or authorized staff

## 1. GET /api/awards/:schoolId - List Awards

**Query Parameters:**
- `student_id` (optional): Filter awards by student ID
- `award_type` (optional): Filter by award type (e.g., "Academic Excellence", "Sports")
- `category` (optional): Filter by category (e.g., "academic", "sports", "cultural")
- `year` (optional): Filter by award year

**Expected Successful Response:**
- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Response Body Structure:**
```json
{
  "success": true,
  "data": [
    {
      "id": "award_001",
      "student_id": "STU001",
      "student_name": "John Doe",
      "award_type": "Academic Excellence",
      "title": "Mathematics Topper",
      "description": "Awarded for securing first position in Mathematics in annual exams",
      "award_date": "2024-03-15",
      "presented_by": "Principal",
      "category": "academic",
      "level": "school",
      "certificate_number": "CERT-2024-MATH-001",
      "remarks": "Excellent performance in Mathematics",
      "created_at": "2024-03-15T10:30:00Z",
      "updated_at": "2024-03-15T10:30:00Z"
    },
    {
      "id": "award_002",
      "student_id": "STU002",
      "student_name": "Jane Smith",
      "award_type": "Sports Achievement",
      "title": "District Level Badminton Champion",
      "description": "Won first place in district level badminton tournament",
      "award_date": "2024-02-20",
      "presented_by": "Sports Director",
      "category": "sports",
      "level": "district",
      "certificate_number": "CERT-2024-SPORTS-001",
      "remarks": "Outstanding performance in sports",
      "created_at": "2024-02-20T14:45:00Z",
      "updated_at": "2024-02-20T14:45:00Z"
    }
  ]
}
```

**Validation Criteria:**
- Should return 200 OK status
- Should include list of awards with student details
- Should support filtering by student_id
- Should include certificate information if available
- Should handle empty results gracefully

**Error Responses:**
- **401 Unauthorized:** Missing or invalid RLS headers
- **400 Bad Request:** Invalid query parameters

## 2. GET /api/awards/:schoolId?student_id=:studentId - List Awards for Student

**Expected Successful Response:**
- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Response Body Structure:**
```json
{
  "success": true,
  "data": [
    {
      "id": "award_001",
      "student_id": "STU001",
      "student_name": "John Doe",
      "award_type": "Academic Excellence",
      "title": "Mathematics Topper",
      "description": "Awarded for securing first position in Mathematics in annual exams",
      "award_date": "2024-03-15",
      "presented_by": "Principal",
      "category": "academic",
      "level": "school",
      "certificate_number": "CERT-2024-MATH-001",
      "remarks": "Excellent performance in Mathematics",
      "created_at": "2024-03-15T10:30:00Z",
      "updated_at": "2024-03-15T10:30:00Z"
    }
  ],
  "student_summary": {
    "student_id": "STU001",
    "student_name": "John Doe",
    "total_awards": 3,
    "academic_awards": 2,
    "sports_awards": 1,
    "first_award_date": "2023-05-10",
    "latest_award_date": "2024-03-15"
  }
}
```

**Validation Criteria:**
- Should return 200 OK status
- Should filter awards by specific student
- Should include student summary statistics
- Should handle student with no awards (empty array)

**Error Responses:**
- **404 Not Found:** Student not found
- **401 Unauthorized:** Missing or invalid RLS headers

## 3. POST /api/awards/:schoolId - Create Award

**Request Body Structure:**
```json
{
  "student_id": "STU001",
  "award_type": "Academic Excellence",
  "title": "Mathematics Topper",
  "description": "Awarded for securing first position in Mathematics in annual exams",
  "award_date": "2024-03-15",
  "presented_by": "Principal",
  "category": "academic",
  "level": "school",
  "certificate_number": "CERT-2024-MATH-001",
  "remarks": "Excellent performance in Mathematics"
}
```

**Expected Successful Response:**
- **Status Code:** 201 Created
- **Content-Type:** application/json
- **Response Body Structure:**
```json
{
  "success": true,
  "data": {
    "id": "award_003",
    "student_id": "STU001",
    "student_name": "John Doe",
    "award_type": "Academic Excellence",
    "title": "Mathematics Topper",
    "description": "Awarded for securing first position in Mathematics in annual exams",
    "award_date": "2024-03-15",
    "presented_by": "Principal",
    "category": "academic",
    "level": "school",
    "certificate_number": "CERT-2024-MATH-001",
    "remarks": "Excellent performance in Mathematics",
    "created_at": "2024-03-15T10:30:00Z",
    "updated_at": "2024-03-15T10:30:00Z"
  }
}
```

**Validation Criteria:**
- Should return 201 Created status
- Should include created award with generated ID
- Should validate student exists
- Should set default values for optional fields
- Should include student name from student record

**Error Responses:**
- **400 Bad Request:** Missing required fields, invalid data format
- **404 Not Found:** Student not found
- **409 Conflict:** Certificate number already exists
- **401 Unauthorized:** Missing or invalid RLS headers

## Award Categories Reference

| Category | Description | Common Award Types |
|----------|-------------|-------------------|
| `academic` | Academic achievements | Academic Excellence, Subject Topper, Perfect Attendance |
| `sports` | Sports achievements | Sports Champion, Best Player, Team Captain |
| `cultural` | Cultural activities | Dance Competition, Music Award, Art Exhibition |
| `leadership` | Leadership roles | Student Council, Class Monitor, Club President |
| `community` | Community service | Volunteer Service, Social Work, Environmental Initiative |
| `special` | Special recognition | Most Improved, Best Attitude, Resilience Award |

## Award Levels Reference

| Level | Scope | Description |
|-------|-------|-------------|
| `class` | Classroom level | Award within a specific class |
| `school` | School level | Award at school-wide level |
| `district` | District level | Award at district competition |
| `state` | State level | Award at state competition |
| `national` | National level | Award at national competition |
| `international` | International level | Award at international level |

## Testing Notes

1. **Student Validation:** Awards require valid student ID
2. **Certificate Uniqueness:** Certificate numbers should be unique within school
3. **Date Validation:** Award date cannot be in the future
4. **Filtering:** Awards can be filtered by multiple criteria
5. **Student Summary:** Student-specific endpoints include achievement summary
6. **Audit Trail:** Award creation should be logged for audit purposes

## Success Criteria

1. ✅ All 3 endpoints return expected HTTP status codes
2. ✅ Response structures match documented schemas
3. ✅ Award creation returns valid award data with ID
4. ✅ Filtering by student_id works correctly
5. ✅ RLS headers are properly validated
6. ✅ Error handling works for invalid student IDs
7. ✅ Certificate number uniqueness is enforced
8. ✅ Student summary statistics are accurate