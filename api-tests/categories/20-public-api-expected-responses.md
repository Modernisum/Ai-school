# Public Developer API - Expected Responses

## Overview
The Public Developer API provides external developers with controlled access to school data using API keys with scoped permissions. These endpoints are designed for third-party integrations and require API key authentication.

## Authentication Requirements
- **API Key Authentication**: All endpoints require `X-API-Key` header with valid API key
- **Scope-Based Authorization**: Each endpoint requires specific scopes (e.g., `read:students`, `read:attendance`)
- **Rate Limiting**: Public APIs may have rate limits for abuse prevention

## 1. GET /api/v1/public/students - Get Students
Returns a list of students for the school associated with the API key.

### Required Scope
- `read:students` or `*` (wildcard)

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": [
    {
      "student_id": "stu_123",
      "name": "John Doe",
      "class": "10A",
      "roll_number": 1,
      "status": "active"
    },
    {
      "student_id": "stu_456",
      "name": "Jane Smith",
      "class": "10B",
      "roll_number": 2,
      "status": "active"
    }
  ]
}
```

#### Response Fields
- `data`: Array of student objects
  - `student_id`: Unique student identifier
  - `name`: Full name of student
  - `class`: Class/section (e.g., "10A")
  - `roll_number`: Roll number in class
  - `status`: "active", "inactive", or "graduated"

### Error Responses
- **401 Unauthorized**: Invalid or missing API key
- **403 Forbidden**: API key lacks required scope
- **500 Internal Server Error**: Server error

## 2. GET /api/v1/public/attendance/:date - Get Attendance
Returns attendance records for a specific date.

### Required Scope
- `read:attendance` or `*` (wildcard)

### Path Parameters
- `date`: Date in YYYY-MM-DD format (e.g., "2024-01-15")

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "date": "2024-01-15",
  "attendance": [
    {
      "user_id": "stu_123",
      "role": "student",
      "status": "present",
      "remarks": null
    },
    {
      "user_id": "stu_456",
      "role": "student",
      "status": "absent",
      "remarks": "Sick"
    }
  ]
}
```

#### Response Fields
- `date`: Requested date
- `attendance`: Array of attendance records
  - `user_id`: ID of student or employee
  - `role`: "student" or "employee"
  - `status`: "present", "absent", "late", or "half-day"
  - `remarks`: Optional remarks about attendance

### Error Responses
- **400 Bad Request**: Invalid date format
- **401 Unauthorized**: Invalid or missing API key
- **403 Forbidden**: API key lacks required scope
- **404 Not Found**: No attendance data for date
- **500 Internal Server Error**: Server error

## Scope Reference
Public API uses fine-grained scopes for security:

| Scope | Description | Access Level |
|-------|-------------|--------------|
| `read:students` | Read student information | Read-only |
| `read:attendance` | Read attendance records | Read-only |
| `read:fees` | Read fee information | Read-only |
| `read:employees` | Read employee data | Read-only |
| `write:attendance` | Mark attendance | Write (future) |
| `*` | All permissions | Read/write (admin) |

## API Key Authentication Flow
1. **Key Generation**: School admin creates API key with specific scopes
2. **Authentication**: Client includes key in `X-API-Key` header
3. **Validation**: Server verifies key hash and checks scopes
4. **Context Injection**: School ID and scopes injected into request
5. **Access Control**: Endpoint validates required scopes

## Rate Limiting
Public APIs implement rate limiting to prevent abuse:
- **Default Limit**: 100 requests per hour per API key
- **Burst Limit**: 10 requests per minute
- **Headers**: Include `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Data Privacy Considerations
1. **PII Protection**: Sensitive fields (phone, address) may be excluded
2. **School Isolation**: API keys are scoped to single school
3. **Audit Logging**: All API access is logged for security
4. **Consent Compliance**: Data sharing follows school policies

## Testing Strategy
### Positive Test Cases
1. **Valid API Key with Correct Scope**: Should return data
2. **Multiple Concurrent Requests**: Should respect rate limits
3. **Date Range Queries**: Should handle various date formats
4. **Empty Results**: Should return empty arrays, not errors

### Negative Test Cases
1. **Missing API Key**: Should return 401
2. **Invalid API Key**: Should return 401
3. **Insufficient Scope**: Should return 403
4. **Expired/Revoked Key**: Should return 401
5. **Invalid Date Format**: Should return 400
6. **Rate Limit Exceeded**: Should return 429

### Edge Cases
1. **Large Datasets**: Pagination or limits may apply
2. **Special Characters**: Should handle UTF-8 encoding
3. **Timezone Differences**: Dates should use UTC
4. **Concurrent Key Usage**: Multiple keys should not interfere

## Integration Examples
### Python Client Example
```python
import requests

api_key = "vk_abc123_def456"
headers = {"X-API-Key": api_key}

# Get students
response = requests.get(
    "https://api.example.com/api/v1/public/students",
    headers=headers
)
students = response.json()["data"]
```

### JavaScript/Node.js Example
```javascript
const fetch = require('node-fetch');

async function getAttendance(date) {
  const response = await fetch(
    `https://api.example.com/api/v1/public/attendance/${date}`,
    {
      headers: { 'X-API-Key': process.env.API_KEY }
    }
  );
  return response.json();
}
```

## Security Best Practices
1. **Key Storage**: Store API keys in environment variables, not code
2. **Key Rotation**: Regularly rotate API keys (every 90 days)
3. **Scope Minimization**: Use least-privilege scopes
4. **HTTPS Only**: Always use HTTPS for API calls
5. **Input Validation**: Validate all input parameters
6. **Error Handling**: Don't expose internal errors to clients

## Test Data Dependencies
1. **API Key**: Requires valid API key with appropriate scopes
2. **School Data**: School must have students and attendance records
3. **Database**: Properly populated student and attendance tables
4. **Middleware**: API key authentication middleware must be active

## Success Criteria
- [ ] Valid API key with correct scope returns data
- [ ] Missing API key returns 401 Unauthorized
- [ ] Invalid API key returns 401 Unauthorized
- [ ] Insufficient scope returns 403 Forbidden
- [ ] Valid date returns attendance data
- [ ] Invalid date format returns 400 Bad Request
- [ ] Empty results return empty arrays (not errors)
- [ ] Rate limiting headers are present
- [ ] Response format matches expected schema
- [ ] Concurrent requests from different keys work independently
- [ ] Revoked keys cannot access API
- [ ] Audit logs record API access attempts