# Events Management APIs - Expected Responses

## Authentication Requirements
- **RLS Required:** Yes
- **Headers Required:** `X-School-ID`, `X-Admin-ID`
- **Service:** Uses resource service for event creation

## 1. POST /api/events/:schoolId - Create Event

### Request
```json
{
  "title": "Annual Sports Day",
  "description": "School annual sports competition",
  "event_date": "2025-03-15",
  "event_time": "09:00:00",
  "venue": "School Ground",
  "organizer": "Sports Department",
  "participants": ["STU001", "STU002", "EMP001"],
  "category": "sports"
}
```

### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "event_id": "EVT20250315001",
    "title": "Annual Sports Day",
    "description": "School annual sports competition",
    "event_date": "2025-03-15",
    "event_time": "09:00:00",
    "venue": "School Ground",
    "organizer": "Sports Department",
    "participants": ["STU001", "STU002", "EMP001"],
    "category": "sports",
    "created_by": "ADM001",
    "created_at": "2025-01-15T10:30:45Z"
  }
}
```

### Error Responses
#### 400 Bad Request (Validation Error)
```json
{
  "success": false,
  "message": "Invalid event data: missing required fields"
}
```

#### 500 Internal Server Error (Service Error)
```json
{
  "success": false,
  "message": "Failed to create event"
}
```

## Validation Criteria
1. **Required Fields:** title, event_date, venue, organizer
2. **Optional Fields:** description, event_time, participants, category
3. **Date Format:** YYYY-MM-DD
4. **Time Format:** HH:MM:SS (24-hour)
5. **Response Structure:** Should include success flag and data object with event details

## Testing Notes
- Test with minimal required fields
- Test with all optional fields populated
- Verify date/time validation
- Test with invalid data (missing title, invalid date format)
- Verify created_by field matches admin_id from RLS context
- Test participant array with empty array
- Test with different categories (sports, academic, cultural, administrative)