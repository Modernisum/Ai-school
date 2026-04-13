# Webhook Management APIs - Expected Responses

## Overview
Webhook Management allows schools to register external endpoints that receive real-time notifications about system events. Webhooks support retry logic, secret verification, and delivery tracking.

## Authentication Requirements
- **All Webhook APIs**: Require RLS authentication (X-School-ID, X-Admin-ID headers)
- **Webhook Delivery**: Uses HMAC signature with secret for verification

## 1. POST /api/school/:schoolId/webhooks - Register Webhook
Registers a new webhook endpoint for receiving event notifications.

### Request Body
```json
{
  "url": "https://webhook.example.com/callback",
  "secret": "my-secret-token-123",
  "event_types": ["student.created", "attendance.marked"]
}
```

### Request Fields
- `url`: HTTPS endpoint URL (required)
- `secret`: Shared secret for HMAC signature verification (required)
- `event_types`: Array of event types to subscribe to (required)

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "id": 1
}
```

#### Response Fields
- `id`: Database ID of the created webhook endpoint

### Error Responses
- **400 Bad Request**: Missing required fields, invalid URL, or empty event_types
- **401 Unauthorized**: Invalid RLS headers
- **500 Internal Server Error**: Database failure

## 2. GET /api/school/:schoolId/webhooks - List Webhooks
Retrieves all registered webhook endpoints for the school.

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "webhooks": [
    {
      "id": 1,
      "url": "https://webhook.example.com/callback",
      "event_types": ["student.created", "attendance.marked"],
      "status": "active",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### Response Fields
- `webhooks`: Array of webhook objects
  - `id`: Database ID
  - `url`: Registered endpoint URL
  - `event_types`: Subscribed event types
  - `status`: "active", "paused", or "failed"
  - `created_at`: ISO timestamp of registration

### Error Responses
- **401 Unauthorized**: Invalid RLS headers
- **500 Internal Server Error**: Database failure

## 3. DELETE /api/school/:schoolId/webhooks/:webhookId - Delete Webhook
Permanently removes a webhook endpoint.

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "message": "Webhook deleted"
}
```

### Error Responses
- **401 Unauthorized**: Invalid RLS headers
- **404 Not Found**: Webhook not found
- **500 Internal Server Error**: Database failure

## 4. GET /api/school/:schoolId/webhooks/:webhookId/logs - Get Webhook Logs
Retrieves delivery logs for a specific webhook endpoint (last 50 entries).

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "logs": [
    {
      "id": 1,
      "event_type": "student.created",
      "status_code": 200,
      "attempt_count": 1,
      "last_attempt_at": "2024-01-01T12:00:00Z",
      "status": "delivered"
    },
    {
      "id": 2,
      "event_type": "attendance.marked",
      "status_code": 500,
      "attempt_count": 3,
      "last_attempt_at": "2024-01-01T13:00:00Z",
      "status": "failed"
    }
  ]
}
```

#### Response Fields
- `logs`: Array of delivery log entries
  - `id`: Log entry ID
  - `event_type`: Type of event that triggered the webhook
  - `status_code`: HTTP status code from delivery attempt
  - `attempt_count`: Number of delivery attempts
  - `last_attempt_at`: ISO timestamp of last attempt
  - `status`: "delivered", "failed", "pending", or "retrying"

### Error Responses
- **401 Unauthorized**: Invalid RLS headers
- **404 Not Found**: Webhook not found
- **500 Internal Server Error**: Database failure

## Event Types Reference
Webhooks can subscribe to various system events:

| Event Type | Description | Payload Example |
|------------|-------------|-----------------|
| `student.created` | New student registered | Student data with ID, name, class |
| `student.updated` | Student information updated | Updated student fields |
| `attendance.marked` | Attendance recorded for student/class | Attendance record with status |
| `fee.paid` | Fee payment completed | Payment details, amount, student |
| `employee.created` | New employee added | Employee data with role |
| `leave.approved` | Leave request approved | Leave details, approver |
| `exam.scheduled` | New exam scheduled | Exam details, subjects, dates |
| `notification.sent` | System notification sent | Notification content, recipients |
| `backup.completed` | Database backup completed | Backup file details, size |
| `api_key.created` | New API key generated | Key metadata, scopes |

## Webhook Delivery Payload
When an event occurs, the system sends a POST request to the registered URL:

```json
{
  "event": "student.created",
  "timestamp": "2024-01-01T12:00:00Z",
  "school_id": "school123",
  "data": {
    "student_id": "stu_123",
    "name": "John Doe",
    "class": "10A",
    "created_by": "admin_456"
  },
  "signature": "sha256=abc123..."
}
```

### Headers Included
- `X-Webhook-Event`: Event type (e.g., "student.created")
- `X-Webhook-Signature`: HMAC signature using secret
- `X-Webhook-Delivery-ID`: Unique delivery identifier
- `X-Webhook-Attempt`: Attempt number (1, 2, 3...)

## Retry Logic
Failed webhook deliveries are retried with exponential backoff:
1. **First attempt**: Immediate
2. **Second attempt**: 5 minutes later
3. **Third attempt**: 15 minutes later
4. **Fourth attempt**: 30 minutes later
5. **Maximum attempts**: 4 attempts total

## Security Considerations
1. **HTTPS Required**: Webhook URLs must use HTTPS
2. **Secret Verification**: HMAC signatures prevent spoofing
3. **IP Whitelisting**: Optional IP restriction for webhook servers
4. **Payload Validation**: Receivers should verify signatures
5. **Rate Limiting**: Protection against abuse

## Test Data Dependencies
1. **School Context**: Requires valid school ID and admin ID
2. **Database**: `webhook_endpoints` and `webhook_delivery_logs` tables
3. **Event System**: Event publishing must be enabled
4. **Network**: External webhook server for testing delivery

## Testing Notes
1. **Registration**: Test with valid/invalid URLs and event types
2. **Listing**: Verify all registered webhooks are returned
3. **Deletion**: Confirm webhook is removed and stops receiving events
4. **Logs**: Check delivery attempts and status codes
5. **Delivery**: Test actual event triggering and payload format
6. **Security**: Verify HMAC signature validation
7. **Retry Logic**: Test failed deliveries trigger retries
8. **Concurrency**: Multiple events should not interfere

## Success Criteria
- [ ] Webhook registration returns valid ID
- [ ] List endpoint shows all registered webhooks
- [ ] Deletion removes webhook and stops deliveries
- [ ] Logs show delivery attempts with correct status
- [ ] Event triggers result in webhook delivery
- [ ] HMAC signatures are correctly generated and verified
- [ ] Failed deliveries trigger retry logic
- [ ] Invalid webhook configurations are rejected
- [ ] Database operations handle errors gracefully
- [ ] Concurrent events are processed correctly