# Complaint Management APIs - Expected Responses

## Authentication Requirements
- **Auth Type:** RLS (Row Level Security)
- **Required Headers:** `X-School-ID`, `X-Admin-ID`
- **Base URL:** `{{baseUrl}}/api/complains`

## 1. POST /api/complains/:schoolId - Create Complaint

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": {
    "complaint_id": "complaint_1234567890",
    "school_id": "school_123",
    "title": "Classroom AC not working",
    "description": "The air conditioner in classroom 101 has been not working for 3 days. Students are facing discomfort during lectures.",
    "category": "facilities",
    "priority": "medium",
    "reported_by": {
      "id": "student_456",
      "name": "Rahul Sharma",
      "role": "student"
    },
    "assigned_to": {
      "id": "employee_789",
      "name": "Maintenance Department",
      "role": "employee"
    },
    "status": "open",
    "attachment_path": null,
    "attachmentUrl": null,
    "created_at": "2025-03-15T14:30:00Z",
    "updated_at": "2025-03-15T14:30:00Z"
  }
}
```

### Error Responses
- **HTTP 400 (Bad Request):** Invalid request body, missing required fields
- **HTTP 401 (Unauthorized):** Missing or invalid RLS headers
- **HTTP 404 (Not Found):** Student or employee not found
- **HTTP 500 (Internal Server Error):** Database error

## 2. GET /api/complains/:schoolId - List All Complaints

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": [
    {
      "complaint_id": "complaint_1234567890",
      "school_id": "school_123",
      "title": "Classroom AC not working",
      "description": "The air conditioner in classroom 101 has been not working for 3 days.",
      "category": "facilities",
      "priority": "medium",
      "reported_by": {
        "id": "student_456",
        "name": "Rahul Sharma",
        "role": "student"
      },
      "assigned_to": {
        "id": "employee_789",
        "name": "Maintenance Department",
        "role": "employee"
      },
      "status": "open",
      "attachment_path": null,
      "attachmentUrl": null,
      "created_at": "2025-03-15T14:30:00Z",
      "updated_at": "2025-03-15T14:30:00Z"
    },
    {
      "complaint_id": "complaint_9876543210",
      "school_id": "school_123",
      "title": "Library books missing",
      "description": "Several reference books from the mathematics section are missing.",
      "category": "academic",
      "priority": "low",
      "reported_by": {
        "id": "teacher_111",
        "name": "Priya Singh",
        "role": "teacher"
      },
      "assigned_to": {
        "id": "employee_222",
        "name": "Library Department",
        "role": "employee"
      },
      "status": "in_progress",
      "attachment_path": "/uploads/complaints/library_issue.jpg",
      "attachmentUrl": "https://storage.example.com/uploads/complaints/library_issue.jpg",
      "created_at": "2025-03-14T10:15:00Z",
      "updated_at": "2025-03-15T09:20:00Z"
    }
  ]
}
```

### Error Responses
- **HTTP 401 (Unauthorized):** Missing or invalid RLS headers
- **HTTP 500 (Internal Server Error):** Database error

## 3. GET /api/complains/:schoolId?user_id=:userId&user_role=:role - List Complaints with Filters

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": [
    {
      "complaint_id": "complaint_1234567890",
      "school_id": "school_123",
      "title": "Classroom AC not working",
      "description": "The air conditioner in classroom 101 has been not working for 3 days.",
      "category": "facilities",
      "priority": "medium",
      "reported_by": {
        "id": "student_456",
        "name": "Rahul Sharma",
        "role": "student"
      },
      "assigned_to": {
        "id": "employee_789",
        "name": "Maintenance Department",
        "role": "employee"
      },
      "status": "open",
      "attachment_path": null,
      "attachmentUrl": null,
      "created_at": "2025-03-15T14:30:00Z",
      "updated_at": "2025-03-15T14:30:00Z"
    }
  ]
}
```

### Query Parameters
- `user_id`: Filter by reporter ID
- `user_role`: Filter by reporter role (student, teacher, employee, parent)

### Error Responses
- **HTTP 401 (Unauthorized):** Missing or invalid RLS headers
- **HTTP 500 (Internal Server Error):** Database error

## 4. GET /api/complains/:schoolId/:summaryId/complainlist - List Complaints by Summary

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": [
    {
      "complaint_id": "complaint_1234567890",
      "school_id": "school_123",
      "title": "Classroom AC not working",
      "description": "The air conditioner in classroom 101 has been not working for 3 days.",
      "category": "facilities",
      "priority": "medium",
      "reported_by": {
        "id": "student_456",
        "name": "Rahul Sharma",
        "role": "student"
      },
      "assigned_to": {
        "id": "employee_789",
        "name": "Maintenance Department",
        "role": "employee"
      },
      "status": "open",
      "attachment_path": null,
      "attachmentUrl": null,
      "created_at": "2025-03-15T14:30:00Z",
      "updated_at": "2025-03-15T14:30:00Z"
    }
  ]
}
```

### Error Responses
- **HTTP 401 (Unauthorized):** Missing or invalid RLS headers
- **HTTP 404 (Not Found):** Summary not found
- **HTTP 500 (Internal Server Error):** Database error

## 5. GET /api/complains/:schoolId/student/:studentId - List Complaints by Student

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": [
    {
      "complaint_id": "complaint_1234567890",
      "school_id": "school_123",
      "title": "Classroom AC not working",
      "description": "The air conditioner in classroom 101 has been not working for 3 days.",
      "category": "facilities",
      "priority": "medium",
      "reported_by": {
        "id": "student_456",
        "name": "Rahul Sharma",
        "role": "student"
      },
      "assigned_to": {
        "id": "employee_789",
        "name": "Maintenance Department",
        "role": "employee"
      },
      "status": "open",
      "attachment_path": null,
      "attachmentUrl": null,
      "created_at": "2025-03-15T14:30:00Z",
      "updated_at": "2025-03-15T14:30:00Z"
    },
    {
      "complaint_id": "complaint_5555555555",
      "school_id": "school_123",
      "title": "Bus route issue",
      "description": "Bus number 12 is arriving 30 minutes late every day.",
      "category": "transport",
      "priority": "high",
      "reported_by": {
        "id": "student_456",
        "name": "Rahul Sharma",
        "role": "student"
      },
      "assigned_to": {
        "id": "employee_333",
        "name": "Transport Department",
        "role": "employee"
      },
      "status": "resolved",
      "attachment_path": null,
      "attachmentUrl": null,
      "created_at": "2025-03-10T08:45:00Z",
      "updated_at": "2025-03-12T16:20:00Z"
    }
  ]
}
```

### Error Responses
- **HTTP 401 (Unauthorized):** Missing or invalid RLS headers
- **HTTP 404 (Not Found):** Student not found
- **HTTP 500 (Internal Server Error):** Database error

## Test Data Dependencies

### Prerequisites
1. **School Setup:** School must be created and configured
2. **Student Creation:** Student must exist (created via Student Management APIs)
3. **Employee Creation:** Employee must exist (created via Employee Management APIs)

### Environment Variables
```json
{
  "complaintSummaryId": "summary_facilities_2025_03",
  "studentId": "student_456",
  "employeeId": "employee_789"
}
```

### Complaint Categories
- `facilities`: Building, equipment, infrastructure issues
- `academic`: Teaching, curriculum, library issues
- `transport`: Bus, pickup/drop issues
- `food`: Canteen, meal quality issues
- `safety`: Security, safety concerns
- `other`: Miscellaneous issues

### Priority Levels
- `low`: Minor issue, can be addressed later
- `medium`: Normal priority, address within 3 days
- `high`: Urgent issue, address within 24 hours
- `critical`: Emergency, address immediately

### Status Flow
```
open → in_progress → resolved → closed
           ↓
        cancelled
```

## Testing Notes

### Workflow Sequence
1. **Create Complaint** → Submit new complaint
2. **List All Complaints** → Verify complaint appears in list
3. **List with Filters** → Test filtering by user/role
4. **List by Summary** → Test summary-based grouping
5. **List by Student** → Test student-specific complaints

### Edge Cases to Test
1. **Empty Description:** Complaint with minimal details
2. **Missing Attachment:** Complaint without file upload
3. **Invalid Priority:** Priority value outside allowed range
4. **Non-existent User:** Complaint assigned to non-existent employee
5. **Large Description:** Very long complaint description

### Attachment Handling
- Attachments are stored in cloud storage
- Signed URLs are generated for access
- Attachment paths are converted to public URLs in response

### Success Criteria
1. All 5 endpoints return expected HTTP status codes
2. Response structures match documented schemas
3. Complaint creation returns valid complaint ID
4. Filtering works correctly for user_id and user_role
5. Attachment URLs are properly generated when present
6. RLS headers are properly validated