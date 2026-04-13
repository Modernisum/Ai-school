# Recovery & Audit APIs - Expected Responses

## Authentication Requirements
- **X-School-ID**: Required for all endpoints
- **X-Admin-ID**: Required for all endpoints
- **Permissions**: Admin or audit role required for undo operations

## 1. GET /api/recovery/:schoolId/student-history - List Student History

### Query Parameters
- `limit`: Optional, max number of records (default: 100)
- `offset`: Optional, pagination offset (default: 0)
- `studentId`: Optional, filter by specific student
- `action`: Optional, filter by action type (create, update, delete)

### Successful Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "studentId": "STU001",
      "action": "update",
      "tableName": "students",
      "oldData": {
        "name": "John Doe",
        "grade": "10"
      },
      "newData": {
        "name": "John Smith",
        "grade": "10"
      },
      "changedBy": "admin123",
      "changedAt": "2024-03-15T10:30:00Z"
    },
    {
      "id": 2,
      "studentId": "STU002",
      "action": "delete",
      "tableName": "students",
      "oldData": {
        "name": "Jane Doe",
        "grade": "11"
      },
      "newData": null,
      "changedBy": "admin456",
      "changedAt": "2024-03-14T14:20:00Z"
    }
  ],
  "pagination": {
    "total": 45,
    "limit": 100,
    "offset": 0
  }
}
```

## 2. POST /api/recovery/:schoolId/student-history/:id/undo - Undo Student Change

### Successful Response (200 OK)
```json
{
  "success": true,
  "message": "Change reverted successfully"
}
```

### Error Response (404 Not Found)
```json
{
  "success": false,
  "message": "Student history record not found"
}
```

## 3. GET /api/recovery/:schoolId/audit-logs - List Audit Logs

### Query Parameters
- `module`: Optional, filter by module (students, employees, fees, etc.)
- `userId`: Optional, filter by user who performed action
- `startDate`: Optional, filter logs after this date (ISO format)
- `endDate`: Optional, filter logs before this date (ISO format)
- `limit`: Optional, max records (default: 100)

### Successful Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "logId": 101,
      "userId": "admin123",
      "action": "CREATE",
      "module": "students",
      "entityId": "STU001",
      "oldValue": null,
      "newValue": "{\"name\":\"John Doe\",\"grade\":\"10\"}",
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0",
      "timestamp": "2024-03-15T10:30:00Z"
    },
    {
      "logId": 102,
      "userId": "admin456",
      "action": "UPDATE",
      "module": "employees",
      "entityId": "EMP001",
      "oldValue": "{\"salary\":50000}",
      "newValue": "{\"salary\":55000}",
      "ipAddress": "192.168.1.101",
      "userAgent": "PostmanRuntime/7.36.0",
      "timestamp": "2024-03-14T14:20:00Z"
    }
  ]
}
```

## 4. POST /api/recovery/:schoolId/audit-logs/:logId/undo - Undo Audit Log

### Successful Response (200 OK)
```json
{
  "success": true,
  "message": "Audit log reversion submitted."
}
```

### Error Responses
#### 400 Bad Request
```json
{
  "success": false,
  "message": "Cannot undo audit log: dependent data exists"
}
```

#### 404 Not Found
```json
{
  "success": false,
  "message": "Audit log not found"
}
```

## Testing Notes
1. **Student History**: Tracks all changes to student records for recovery purposes
2. **Audit Logs**: Comprehensive logging of all system actions with user context
3. **Undo Operations**: Should be used cautiously - creates audit trail of undo actions
4. **Data Integrity**: Undo operations maintain referential integrity

## Performance Expectations
- List operations: < 300ms for up to 1000 records
- Undo operations: < 1000ms depending on data complexity
- Audit log retrieval: < 500ms with filters

## Security Considerations
1. Only authorized administrators can view audit logs
2. Undo operations require elevated permissions
3. All undo actions are themselves audited
4. Sensitive data in audit logs may be masked or encrypted

## Data Retention
1. Student history: Retained for 365 days
2. Audit logs: Retained indefinitely for compliance
3. Automated cleanup of old records based on retention policy