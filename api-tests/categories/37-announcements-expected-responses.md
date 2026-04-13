# Announcements Management APIs - Expected Responses

## Authentication Requirements
- **X-School-ID**: Required for all endpoints
- **X-Admin-ID**: Required for all endpoints
- **Content-Type**: `application/json` for POST endpoints

## 1. POST /api/announcements/:schoolId/:typeStr/:userId - Create Announcement

### Request Body
```json
{
  "title": "Important School Announcement",
  "content": "This is an important announcement for all students and staff regarding upcoming events.",
  "priority": "high",
  "targetAudience": ["students", "teachers"],
  "expiresAt": "2025-12-31T23:59:59Z",
  "attachments": []
}
```

### Successful Response (201 Created)
```json
{
  "success": true,
  "data": {
    "announcementId": "ann-1234567890",
    "title": "Important School Announcement",
    "content": "This is an important announcement for all students and staff regarding upcoming events.",
    "priority": "high",
    "createdBy": "admin123",
    "createdAt": "2024-03-15T10:30:00Z",
    "expiresAt": "2025-12-31T23:59:59Z"
  }
}
```

### Error Responses
#### 400 Bad Request (Validation Error)
```json
{
  "success": false,
  "message": "Invalid announcement data: title is required"
}
```

#### 401 Unauthorized
```json
{
  "success": false,
  "message": "Authentication required"
}
```

#### 403 Forbidden
```json
{
  "success": false,
  "message": "Insufficient permissions to create announcements"
}
```

## Testing Notes
1. **Priority Levels**: Valid values are "low", "medium", "high", "critical"
2. **Target Audience**: Array of strings, valid values: "students", "teachers", "staff", "parents", "all"
3. **Expiration**: ISO 8601 format, optional field
4. **Attachments**: Array of file URLs or attachment objects (future enhancement)

## Performance Expectations
- Response time: < 500ms for announcement creation
- Concurrent announcements: Support up to 100 concurrent announcements
- Announcement retrieval: < 200ms for listing announcements

## Data Validation Rules
1. Title: Required, max 200 characters
2. Content: Required, max 5000 characters
3. Priority: Must be one of ["low", "medium", "high", "critical"]
4. TargetAudience: Array, must contain valid audience types
5. ExpiresAt: Optional, must be future date if provided

## Security Considerations
1. Announcements are scoped to school ID
2. Only users with appropriate permissions can create announcements
3. Announcements may contain sensitive information - ensure proper access controls
4. Audit logging for all announcement creations