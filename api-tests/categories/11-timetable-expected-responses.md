# Timetable Management APIs - Expected Responses

## Authentication Requirements
- **Auth Type:** RLS (Row Level Security)
- **Required Headers:** `X-School-ID`, `X-Admin-ID`
- **Base URL:** `{{baseUrl}}/api/school/:schoolId/timetable`

## 1. POST /api/school/:schoolId/timetable/generate - Generate Timetable

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "config_id": "tt_config_1234567890",
  "class_id": "class_10a_2025",
  "class_name": "Class 10-A",
  "total_slots": 40,
  "slots": [
    {
      "slot_id": "slot_1",
      "day": 1,
      "period": 1,
      "subject_id": "math_101",
      "subject_name": "Mathematics",
      "teacher_id": "teacher_123",
      "teacher_name": "John Doe",
      "room": "Room 101",
      "start_time": "08:30",
      "end_time": "09:10"
    },
    // ... more slots
  ],
  "conflicts": [],
  "has_conflicts": false
}
```

### Error Responses
- **HTTP 400 (Bad Request):** Invalid request body, missing required fields
- **HTTP 401 (Unauthorized):** Missing or invalid RLS headers
- **HTTP 404 (Not Found):** Class or subject not found
- **HTTP 409 (Conflict):** Timetable already exists for this class
- **HTTP 500 (Internal Server Error):** Timetable generation failed

## 2. GET /api/school/:schoolId/timetable/:configId - Get Timetable

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": {
    "config_id": "tt_config_1234567890",
    "school_id": "school_123",
    "class_id": "class_10a_2025",
    "class_name": "Class 10-A",
    "periods_per_day": 8,
    "working_days": [1, 2, 3, 4, 5],
    "season": "Spring 2025",
    "start_time": "08:30",
    "end_time": "15:30",
    "period_duration_minutes": 40,
    "break_duration_minutes": 10,
    "status": "generated",
    "approved_by": null,
    "approved_at": null,
    "created_at": "2025-03-15T10:30:00Z",
    "slots": [
      {
        "slot_id": "slot_1",
        "day": 1,
        "period": 1,
        "subject_id": "math_101",
        "subject_name": "Mathematics",
        "teacher_id": "teacher_123",
        "teacher_name": "John Doe",
        "room": "Room 101",
        "start_time": "08:30",
        "end_time": "09:10"
      }
    ]
  }
}
```

### Error Responses
- **HTTP 401 (Unauthorized):** Missing or invalid RLS headers
- **HTTP 404 (Not Found):** Timetable config not found
- **HTTP 500 (Internal Server Error):** Database error

## 3. GET /api/school/:schoolId/timetable - List All Timetables

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": [
    {
      "config_id": "tt_config_1234567890",
      "class_id": "class_10a_2025",
      "class_name": "Class 10-A",
      "periods_per_day": 8,
      "working_days": [1, 2, 3, 4, 5],
      "season": "Spring 2025",
      "status": "generated",
      "approved_by": null,
      "approved_at": null,
      "created_at": "2025-03-15T10:30:00Z",
      "total_slots": 40
    },
    {
      "config_id": "tt_config_9876543210",
      "class_id": "class_9b_2025",
      "class_name": "Class 9-B",
      "periods_per_day": 7,
      "working_days": [1, 2, 3, 4, 5],
      "season": "Spring 2025",
      "status": "approved",
      "approved_by": "admin_456",
      "approved_at": "2025-03-16T14:20:00Z",
      "created_at": "2025-03-14T09:15:00Z",
      "total_slots": 35
    }
  ]
}
```

### Error Responses
- **HTTP 401 (Unauthorized):** Missing or invalid RLS headers
- **HTTP 500 (Internal Server Error):** Database error

## 4. POST /api/school/:schoolId/timetable/:configId/approve - Approve Timetable

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "message": "Timetable approved and notifications sent"
}
```

### Error Responses
- **HTTP 401 (Unauthorized):** Missing or invalid RLS headers
- **HTTP 403 (Forbidden):** User not authorized to approve timetables
- **HTTP 404 (Not Found):** Timetable config not found
- **HTTP 409 (Conflict):** Timetable already approved
- **HTTP 500 (Internal Server Error):** Approval failed

## 5. DELETE /api/school/:schoolId/timetable/:configId - Delete Timetable

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "message": "Timetable deleted"
}
```

### Error Responses
- **HTTP 401 (Unauthorized):** Missing or invalid RLS headers
- **HTTP 403 (Forbidden):** User not authorized to delete timetables
- **HTTP 404 (Not Found):** Timetable config not found
- **HTTP 500 (Internal Server Error):** Deletion failed

## Test Data Dependencies

### Prerequisites
1. **School Setup:** School must be created and configured
2. **Class Creation:** Class must exist (created via Class Management APIs)
3. **Subject Creation:** Subjects must exist (created via Class Management APIs)
4. **Teacher/Employee:** Teacher must exist (created via Employee Management APIs)

### Environment Variables
```json
{
  "timetableConfigId": "tt_config_1234567890",
  "classId": "class_10a_2025",
  "mathSubjectId": "math_101",
  "scienceSubjectId": "science_102",
  "englishSubjectId": "english_103",
  "teacherId": "teacher_123"
}
```

### Sample Timetable Configuration
```json
{
  "class_id": "class_10a_2025",
  "class_name": "Class 10-A",
  "periods_per_day": 8,
  "working_days": [1, 2, 3, 4, 5],
  "requirements": [
    {
      "subject_id": "math_101",
      "subject_name": "Mathematics",
      "periods_per_week": 6,
      "teacher_id": "teacher_123"
    },
    {
      "subject_id": "science_102",
      "subject_name": "Science",
      "periods_per_week": 5,
      "teacher_id": "teacher_123"
    },
    {
      "subject_id": "english_103",
      "subject_name": "English",
      "periods_per_week": 5,
      "teacher_id": "teacher_123"
    }
  ],
  "season": "Spring 2025",
  "start_time": "08:30",
  "end_time": "15:30",
  "period_duration_minutes": 40,
  "break_duration_minutes": 10
}
```

## Testing Notes

### Workflow Sequence
1. **Generate Timetable** → Creates timetable configuration
2. **Get Timetable** → Verify generated timetable
3. **List Timetables** → Check it appears in list
4. **Approve Timetable** → Change status to approved
5. **Delete Timetable** → Clean up (optional)

### Edge Cases to Test
1. **Empty Requirements:** Generate timetable with no subjects
2. **Invalid Days:** Working days outside 1-7 range
3. **Time Conflicts:** Overlapping periods
4. **Teacher Conflicts:** Same teacher scheduled for multiple classes simultaneously
5. **Room Conflicts:** Same room double-booked

### Status Flow
```
generated → approved → (optional: deleted)
```

### Success Criteria
1. All 5 endpoints return expected HTTP status codes
2. Response structures match documented schemas
3. Timetable generation produces valid schedule
4. Approval workflow works correctly
5. Deletion removes timetable from database
6. RLS headers are properly validated