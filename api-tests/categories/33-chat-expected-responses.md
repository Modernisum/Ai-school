# Chat System APIs - Expected Responses

## Authentication Requirements
- **RLS Required:** Yes
- **Headers Required:** `X-School-ID`, `X-Admin-ID`
- **Database:** Messages stored in `messages` table with school_id partitioning

## 1. POST /api/chat/:schoolId/send - Send Message

### Request
```json
{
  "sender_id": "EMP001",
  "sender_type": "employee",
  "receiver_id": "STU001",
  "receiver_type": "student",
  "content": "Hello, this is a test message",
  "attachment_url": null
}
```

### Success Response (200 OK)
```json
{
  "message_id": 123,
  "sender_id": "EMP001",
  "sender_type": "employee",
  "receiver_id": "STU001",
  "receiver_type": "student",
  "content": "Hello, this is a test message",
  "attachment_url": null,
  "created_at": "2025-01-15T10:30:45Z"
}
```

### Error Responses
#### 500 Internal Server Error (Database Error)
```
"Database error"
```

#### 500 Internal Server Error (Failed to Send Message)
```
"Failed to send message"
```

## 2. GET /api/chat/:schoolId/history/:user1/:user2 - Get Chat History

### Success Response (200 OK)
```json
[
  {
    "message_id": 123,
    "sender_id": "EMP001",
    "sender_type": "employee",
    "receiver_id": "STU001",
    "receiver_type": "student",
    "content": "Hello, this is a test message",
    "attachment_url": null,
    "created_at": "2025-01-15T10:30:45Z"
  },
  {
    "message_id": 124,
    "sender_id": "STU001",
    "sender_type": "student",
    "receiver_id": "EMP001",
    "receiver_type": "employee",
    "content": "Hi, received your message",
    "attachment_url": null,
    "created_at": "2025-01-15T10:31:20Z"
  }
]
```

### Error Responses
#### 500 Internal Server Error (Database Error)
```
"Database error"
```

#### 500 Internal Server Error (Failed to Fetch History)
```
"Failed to fetch history"
```

## Validation Criteria
1. **Send Message:** Should return created message with message_id and timestamp
2. **Get History:** Should return array of messages between two users (max 50 messages)
3. **Redis Integration:** Messages should be published to Redis Pub/Sub for real-time delivery
4. **Database Persistence:** Messages should be stored in database with proper school_id partitioning

## Testing Notes
- Requires Redis for Pub/Sub functionality
- Database connection must be established for tenant (school_id)
- Test with different sender/receiver types (employee, student, parent, group)
- Verify message ordering (ASC by created_at)
- Test with attachment URLs (optional field)