# School Holidays APIs - Expected Responses

## Authentication Requirements
- **X-School-ID**: Required for all endpoints
- **X-Admin-ID**: Required for write operations (create, update, delete)
- **Permissions**: Admin or calendar manager role required for modifications

## 1. GET /api/school-holidays/:schoolId - List School Holidays

### Query Parameters
- `month`: Optional, filter by month (1-12)
- `year`: Optional, filter by year (e.g., 2024)
- `type`: Optional, filter by holiday type (religious, cultural, annual, etc.)
- `limit`: Optional, max records (default: 100)

### Successful Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "holidayId": "HOL001",
      "title": "Good Friday",
      "description": "Christian holiday",
      "date": "2024-04-07",
      "type": "religious",
      "durationDays": 1,
      "applicableTo": ["students", "teachers", "staff"],
      "createdBy": "admin123",
      "createdAt": "2024-01-15T10:00:00Z"
    },
    {
      "holidayId": "HOL002",
      "title": "Summer Vacation",
      "description": "Annual summer break",
      "startDate": "2024-05-15",
      "endDate": "2024-06-15",
      "type": "annual",
      "durationDays": 32,
      "applicableTo": ["students"],
      "createdBy": "admin456",
      "createdAt": "2024-01-20T14:30:00Z"
    }
  ],
  "pagination": {
    "total": 15,
    "month": 4,
    "year": 2024
  }
}
```

## 2. GET /api/school-holidays/:schoolId/:holidayId - Get Holiday Detail

### Successful Response (200 OK)
```json
{
  "success": true,
  "data": {
    "holidayId": "HOL001",
    "title": "Good Friday",
    "description": "Christian holiday observed by school",
    "date": "2024-04-07",
    "type": "religious",
    "durationDays": 1,
    "applicableTo": ["students", "teachers", "staff"],
    "notes": "School will remain closed",
    "createdBy": "admin123",
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedBy": "admin123",
    "updatedAt": "2024-01-16T11:00:00Z",
    "recurring": {
      "yearly": true,
      "adjustForWeekends": true
    }
  }
}
```

## 3. POST /api/school-holidays/:schoolId - Create School Holiday

### Request Body
```json
{
  "title": "Diwali Festival",
  "description": "Hindu festival of lights",
  "date": "2024-11-01",
  "type": "cultural",
  "durationDays": 3,
  "applicableTo": ["students", "teachers", "staff"],
  "notes": "Extended holiday for festival celebrations",
  "recurring": {
    "yearly": true,
    "adjustForWeekends": true
  }
}
```

### Successful Response (200 OK)
```json
{
  "success": true,
  "data": {
    "holidayId": "hol-1234567890",
    "title": "Diwali Festival",
    "description": "Hindu festival of lights",
    "date": "2024-11-01",
    "type": "cultural",
    "durationDays": 3,
    "applicableTo": ["students", "teachers", "staff"],
    "createdBy": "admin123",
    "createdAt": "2024-03-15T10:30:00Z",
    "recurring": {
      "yearly": true,
      "adjustForWeekends": true
    }
  }
}
```

## 4. DELETE /api/school-holidays/:schoolId/:holidayId - Delete School Holiday

### Successful Response (200 OK)
```json
{
  "success": true
}
```

## 5. GET /api/school-holidays/:schoolId/check - Check School Holiday

### Query Parameters
- `date`: Required, date to check (YYYY-MM-DD format)

### Successful Response (200 OK)
```json
{
  "success": true,
  "isHoliday": true,
  "holiday": {
    "holidayId": "HOL001",
    "title": "Good Friday",
    "description": "Christian holiday",
    "date": "2024-04-07",
    "type": "religious"
  }
}
```

### Response for Non-Holiday
```json
{
  "success": true,
  "isHoliday": false,
  "holiday": null
}
```

## Error Responses

### 400 Bad Request (Validation Error)
```json
{
  "success": false,
  "message": "Invalid date format. Use YYYY-MM-DD"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Holiday not found"
}
```

### 409 Conflict
```json
{
  "success": false,
  "message": "Holiday already exists for this date"
}
```

## Testing Notes
1. **Holiday Types**: Valid types: "religious", "cultural", "national", "annual", "special", "exam"
2. **Applicable To**: Array of strings, valid values: "students", "teachers", "staff", "all"
3. **Date Format**: YYYY-MM-DD for single day holidays
4. **Duration**: For multi-day holidays, use startDate and endDate fields
5. **Recurring Holidays**: Can be marked as recurring yearly with weekend adjustment

## Performance Expectations
- Holiday checking: < 50ms per date
- List retrieval: < 200ms for 100 holidays
- Bulk operations: < 1000ms for importing holiday calendar

## Security Considerations
1. Holiday data is school-specific
2. Only authorized users can modify holiday calendar
3. Historical holidays cannot be deleted (archived instead)
4. Holiday changes affect attendance and scheduling systems

## Integration Points
1. **Attendance System**: Holidays affect attendance marking
2. **Timetable System**: No classes scheduled on holidays
3. **Notification System**: Holiday announcements to stakeholders
4. **Academic Calendar**: Holidays are part of academic year planning

## Data Validation Rules
1. Title: Required, max 100 characters
2. Date: Required, must be valid date
3. Type: Must be valid holiday type
4. ApplicableTo: Array, must contain valid audience types
5. DurationDays: Positive integer, required for multi-day holidays