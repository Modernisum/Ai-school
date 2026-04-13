# Leave Management APIs - Expected Responses

This document outlines the expected responses for all Leave Management API endpoints tested in `07-leave.bru`.

## Authentication Requirements
All Leave Management APIs require RLS (Row Level Security) authentication with the following headers:
- `X-School-ID`: School identifier (e.g., "test-school-123")
- `X-Admin-ID`: Admin user identifier (e.g., "admin-456")

## 1. POST /api/leave/:schoolId - Create Leave

**Endpoint**: `POST {{baseUrl}}/api/leave/{{schoolId}}`

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": {
    "id": "leave-123456",
    "employeeId": "emp-123456",
    "employeeName": "Rajesh Kumar",
    "leaveType": "casual",
    "startDate": "2025-04-15",
    "endDate": "2025-04-17",
    "duration": 3,
    "status": "pending",
    "reason": "Family function",
    "contactDuringLeave": "+919876543210",
    "emergencyContact": "+919876543211",
    "responsibilities": ["Class 10A Mathematics", "Exam Coordinator"],
    "documents": [
      {
        "type": "medical",
        "url": "https://example.com/medical_certificate.pdf",
        "uploadedAt": "2025-04-10T10:30:00Z"
      }
    ],
    "createdAt": "2025-04-10T10:30:00Z",
    "createdBy": "admin-456",
    "schoolId": "test-school-123"
  }
}
```

### Error Responses
- **HTTP 400**: Invalid request data (missing required fields, invalid dates)
- **HTTP 401**: Missing or invalid authentication headers
- **HTTP 409**: Leave conflict (overlapping dates)
- **HTTP 500**: Server error

## 2. GET /api/leave/:schoolId - List Leaves

**Endpoint**: `GET {{baseUrl}}/api/leave/{{schoolId}}`

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": [
    {
      "id": "leave-123456",
      "employeeId": "emp-123456",
      "employeeName": "Rajesh Kumar",
      "leaveType": "casual",
      "startDate": "2025-04-15",
      "endDate": "2025-04-17",
      "duration": 3,
      "status": "pending",
      "reason": "Family function",
      "createdAt": "2025-04-10T10:30:00Z"
    },
    {
      "id": "leave-123457",
      "employeeId": "emp-123457",
      "employeeName": "Amit Patel",
      "leaveType": "medical",
      "startDate": "2025-04-18",
      "endDate": "2025-04-20",
      "duration": 3,
      "status": "approved",
      "reason": "Medical treatment",
      "createdAt": "2025-04-09T14:20:00Z"
    }
  ],
  "pagination": {
    "total": 2,
    "page": 1,
    "limit": 50,
    "totalPages": 1
  }
}
```

## 3. POST /api/leave/:schoolId/:leaveId/approve - Approve Leave

**Endpoint**: `POST {{baseUrl}}/api/leave/{{schoolId}}/{{leaveId}}/approve`

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "message": "Leave approved",
  "leave": {
    "id": "leave-123456",
    "status": "approved",
    "approvedAt": "2025-04-10T11:00:00Z",
    "approvedBy": "admin-456"
  }
}
```

## 4. POST /api/leave/:schoolId/:leaveId/reject - Reject Leave

**Endpoint**: `POST {{baseUrl}}/api/leave/{{schoolId}}/{{leaveId}}/reject`

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "message": "Leave rejected",
  "leave": {
    "id": "leave-123456",
    "status": "rejected",
    "rejectedAt": "2025-04-10T11:05:00Z",
    "rejectedBy": "admin-456",
    "rejectionReason": "Insufficient documentation"
  }
}
```

## 5. POST /api/leave/:schoolId/:leaveId/extend - Extend Leave

**Endpoint**: `POST {{baseUrl}}/api/leave/{{schoolId}}/{{leaveId}}/extend`

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "message": "Leave duration extended",
  "leave": {
    "id": "leave-123456",
    "originalEndDate": "2025-04-17",
    "newEndDate": "2025-04-19",
    "extendedBy": 2,
    "reason": "Medical extension required",
    "extendedAt": "2025-04-16T09:30:00Z"
  }
}
```

## 6. POST /api/leave/:schoolId/:leaveId/reduce - Reduce Leave

**Endpoint**: `POST {{baseUrl}}/api/leave/{{schoolId}}/{{leaveId}}/reduce`

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "message": "Leave duration reduced",
  "leave": {
    "id": "leave-123456",
    "originalEndDate": "2025-04-17",
    "newEndDate": "2025-04-16",
    "reducedBy": 1,
    "reason": "Employee returning early",
    "reducedAt": "2025-04-15T14:00:00Z"
  }
}
```

## 7. GET /api/leave/:schoolId/:leaveId/pdf - Download Leave PDF

**Endpoint**: `GET {{baseUrl}}/api/leave/{{schoolId}}/{{leaveId}}/pdf`

### Expected Successful Response (HTTP 200)
- **Content-Type**: `application/pdf`
- **Content-Disposition**: `attachment; filename="leave-123456.pdf"`
- **Body**: PDF binary data

## 8. GET /api/leave/:schoolId/balance/:employeeId - Get Leave Balance

**Endpoint**: `GET {{baseUrl}}/api/leave/{{schoolId}}/balance/{{employeeId}}`

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": {
    "employeeId": "emp-123456",
    "employeeName": "Rajesh Kumar",
    "leaveBalances": {
      "casual": {
        "total": 12,
        "used": 3,
        "remaining": 9,
        "expiring": 0
      },
      "medical": {
        "total": 15,
        "used": 2,
        "remaining": 13,
        "expiring": 0
      },
      "earned": {
        "total": 30,
        "used": 10,
        "remaining": 20,
        "expiring": 5
      }
    },
    "fiscalYear": "2025-2026",
    "lastUpdated": "2025-04-10T10:00:00Z"
  }
}
```

## 9. GET /api/leave/:schoolId/queue - Get Leave Queue

**Endpoint**: `GET {{baseUrl}}/api/leave/{{schoolId}}/queue`

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": {
    "pending": [
      {
        "id": "leave-123456",
        "employeeName": "Rajesh Kumar",
        "leaveType": "casual",
        "startDate": "2025-04-15",
        "endDate": "2025-04-17",
        "duration": 3,
        "submittedAt": "2025-04-10T10:30:00Z",
        "priority": "medium"
      }
    ],
    "awaitingApproval": [],
    "awaitingConditions": [],
    "totalPending": 1,
    "totalAwaitingApproval": 0,
    "totalAwaitingConditions": 0
  }
}
```

## 10. GET /api/leave/:schoolId/details/:leaveId - Get Leave Details

**Endpoint**: `GET {{baseUrl}}/api/leave/{{schoolId}}/details/{{leaveId}}`

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": {
    "id": "leave-123456",
    "employeeId": "emp-123456",
    "employeeName": "Rajesh Kumar",
    "employeeDepartment": "Mathematics",
    "leaveType": "casual",
    "startDate": "2025-04-15",
    "endDate": "2025-04-17",
    "duration": 3,
    "status": "pending",
    "reason": "Family function",
    "contactDuringLeave": "+919876543210",
    "emergencyContact": "+919876543211",
    "responsibilities": [
      {
        "id": "resp-789",
        "name": "Class 10A Mathematics",
        "type": "teaching"
      },
      {
        "id": "resp-790",
        "name": "Exam Coordinator",
        "type": "administrative"
      }
    ],
    "documents": [
      {
        "id": "doc-456",
        "type": "medical",
        "url": "https://example.com/medical_certificate.pdf",
        "uploadedAt": "2025-04-10T10:30:00Z",
        "verified": false
      }
    ],
    "createdAt": "2025-04-10T10:30:00Z",
    "createdBy": "admin-456",
    "updatedAt": "2025-04-10T10:30:00Z",
    "schoolId": "test-school-123",
    "approvalHistory": [],
    "conditionalRequirements": [],
    "coverageAssignments": []
  }
}
```

## 11. POST /api/leave/:schoolId/:leaveId/conditional/approve - Apply Conditional Approval

**Endpoint**: `POST {{baseUrl}}/api/leave/{{schoolId}}/{{leaveId}}/conditional/approve`

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "message": "Conditional approval applied",
  "conditions": [
    {
      "id": "cond-123",
      "type": "document_upload",
      "description": "Upload medical certificate",
      "deadline": "2025-04-20",
      "status": "pending"
    },
    {
      "id": "cond-124",
      "type": "coverage_arranged",
      "description": "Arrange coverage for classes",
      "deadline": "2025-04-14",
      "status": "pending"
    }
  ],
  "approvalDeadline": "2025-04-14",
  "leaveStatus": "conditional_approval"
}
```

## 12. POST /api/leave/:schoolId/:leaveId/conditional/respond - Respond to Conditions

**Endpoint**: `POST {{baseUrl}}/api/leave/{{schoolId}}/{{leaveId}}/conditional/respond`

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "message": "Condition responses submitted",
  "responses": [
    {
      "conditionId": "cond-123",
      "status": "completed",
      "evidence": "https://example.com/medical_certificate_uploaded.pdf",
      "notes": "Medical certificate uploaded",
      "submittedAt": "2025-04-12T15:30:00Z"
    }
  ],
  "leaveStatus": "approved",
  "fullyApproved": false
}
```

## 13. GET /api/leave/:schoolId/conditional/templates - Get Conditional Templates

**Endpoint**: `GET {{baseUrl}}/api/leave/{{schoolId}}/conditional/templates`

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "templates": [
    {
      "id": "template-1",
      "name": "Medical Leave Template",
      "description": "Standard conditions for medical leaves",
      "conditions": [
        {
          "type": "document_upload",
          "description": "Medical certificate from registered doctor",
          "required": true
        },
        {
          "type": "coverage_arranged",
          "description": "Class coverage arranged for duration",
          "required": true
        }
      ],
      "applicableTo": ["medical", "sick"],
      "createdAt": "2025-01-15T09:00:00Z"
    },
    {
      "id": "template-2",
      "name": "Long Leave Template",
      "description": "Conditions for leaves longer than 7 days",
      "conditions": [
        {
          "type": "handover_document",
          "description": "Complete handover document",
          "required": true
        },
        {
          "type": "approval_chain",
          "description": "Approval from department head",
          "required": true
        }
      ],
      "applicableTo": ["casual", "earned"],
      "createdAt": "2025-01-20T10:00:00Z"
    }
  ]
}
```

## 14. POST /api/leave/:schoolId/conditional/templates - Create Conditional Template

**Endpoint**: `POST {{baseUrl}}/api/leave/{{schoolId}}/conditional/templates`

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "message": "Conditional template created",
  "template": {
    "id": "template-3",
    "name": "Medical Leave Template",
    "description": "Standard conditions for medical leaves",
    "conditions": [
      {
        "id": "cond-201",
        "type": "document_upload",
        "description": "Medical certificate from registered doctor",
        "required": true
      },
      {
        "id": "cond-202",
        "type": "coverage_arranged",
        "description": "Class coverage arranged for duration",
        "required": true
      }
    ],
    "applicableTo": ["medical", "sick"],
    "createdAt": "2025-04-10T11:30:00Z",
    "createdBy": "admin-456"
  }
}
```

## 15. POST /api/leave/:schoolId/:leaveId/coverage/assign - Assign Coverage

**Endpoint**: `POST {{baseUrl}}/api/leave/{{schoolId}}/{{leaveId}}/coverage/assign`

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "message": "Coverage assigned successfully",
  "coverage": {
    "id": "coverage-789",
    "leaveId": "leave-123456",
    "coverageEmployeeId": "emp-123457",
    "coverageEmployeeName": "Amit Patel",
    "responsibilities": ["Class 10A Mathematics"],
    "startDate": "2025-04-15",
    "endDate": "2025-04-17",
    "notes": "Coverage for mathematics classes",
    "status": "pending",
    "assignedAt": "2025-04-10T12:00:00Z",
    "assignedBy": "admin-456"
  }
}
```

## 16. GET /api/leave/:schoolId/:leaveId/coverage/available - Get Available Coverages

**Endpoint**: `GET {{baseUrl}}/api/leave/{{schoolId}}/{{leaveId}}/coverage/available`

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "availableEmployees": [
    {
      "id": "emp-123457",
      "name": "Amit Patel",
      "department": "Science",
      "availableFrom": "2025-04-15",
      "availableTo": "2025-04-20",
      "matchingResponsibilities": ["Class 10A Mathematics"],
      "matchScore": 85
    },
    {
      "id": "emp-123458",
      "name": "Sunita Reddy",
      "department": "Administration",
      "availableFrom": "2025-04-16",
      "availableTo": "2025-04-18",
      "matchingResponsibilities": ["Exam Coordinator"],
      "matchScore": 70
    }
  ]
}
```

## 17. POST /api/leave/:schoolId/coverage/:coverageId/accept - Accept Coverage

**Endpoint**: `POST {{baseUrl}}/api/leave/{{schoolId}}/coverage/{{coverageId}}/accept`

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "message": "Coverage accepted",
  "coverage": {
    "id": "coverage-789",
    "status": "accepted",
    "acceptedAt": "2025-04-10T14:30:00Z",
    "acceptedBy": "emp-123457"
  }
}
```

## 18. POST /api/leave/:schoolId/:leaveId/workload/assess - Assess Workload

**Endpoint**: `POST {{baseUrl}}/api/leave/{{schoolId}}/{{leaveId}}/workload/assess`

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "message": "Workload assessment completed",
  "assessment": {
    "leaveId": "leave-123456",
    "employeeId": "emp-123456",
    "workloadImpact": "high",
    "impactScore": 85,
    "affectedClasses": [
      {
        "class": "10A",
        "subject": "Mathematics",
        "sessionsAffected": 6,
        "coverageRequired": true
      }
    ],
    "recommendations": [
      "Arrange coverage for mathematics classes",
      "Reschedule 2 sessions",
      "Notify department head"
    ],
    "assessedAt": "2025-04-10T15:00:00Z",
    "assessedBy": "admin-456"
  }
}
```

## 19. GET /api/leave/:schoolId/:leaveId/workload/assessment - Get Workload Assessment

**Endpoint**: `GET {{baseUrl}}/api/leave/{{schoolId}}/{{leaveId}}/workload/assessment`

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "assessment": {
    "leaveId": "leave-123456",
    "workloadImpact": "high",
    "impactScore": 85,
    "affectedClasses": [
      {
        "class": "10A",
        "subject": "Mathematics",
        "sessionsAffected": 6,
        "coverageStatus": "assigned",
        "coverageEmployee": "Amit Patel"
      }
    ],
    "recommendations": [
      "Arrange coverage for mathematics classes",
      "Reschedule 2 sessions",
      "Notify department head"
    ],
    "actionsTaken": [
      "Coverage assigned to Amit Patel",
      "Department head notified"
    ],
    "assessedAt": "2025-04-10T15:00:00Z",
    "lastUpdated": "2025-04-10T16:00:00Z"
  }
}
```

## 20. GET /api/leave/:schoolId/notifications - Get Notifications

**Endpoint**: `GET {{baseUrl}}/api/leave/{{schoolId}}/notifications`

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "notifications": [
    {
      "id": "notif-123",
      "type": "leave_submission",
      "title": "New Leave Application",
      "message": "Rajesh Kumar has applied for casual leave",
      "leaveId": "leave-123456",
      "employeeId": "emp-123456",
      "employeeName": "Rajesh Kumar",
      "createdAt": "2025-04-10T10:30:00Z",
      "read": false,
      "priority": "medium"
    },
    {
      "id": "notif-124",
      "type": "coverage_request",
      "title": "Coverage Request",
      "message": "You have been assigned coverage for mathematics classes",
      "coverageId": "coverage-789",
      "leaveId": "leave-123456",
      "createdAt": "2025-04-10T12:00:00Z",
      "read": true,
      "priority": "high"
    }
  ],
  "unreadCount": 1,
  "totalCount": 2
}
```

## 21. POST /api/leave/:schoolId/notifications/:notificationId/read - Mark Notification Read

**Endpoint**: `POST {{baseUrl}}/api/leave/{{schoolId}}/notifications/{{notificationId}}/read`

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "message": "Notification marked as read",
  "notification": {
    "id": "notif-123",
    "read": true,
    "readAt": "2025-04-10T16:30:00Z"
  }
}
```

## 22. GET /api/leave/:schoolId/feature-flags - Get Feature Flags

**Endpoint**: `GET {{baseUrl}}/api/leave/{{schoolId}}/feature-flags`

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "featureFlags": {
    "conditionalApproval": true,
    "workloadAssessment": true,
    "autoCoverage": false,
    "notifications": true,
    "pdfExport": true,
    "bulkApproval": false,
    "mobileAppIntegration": true,
    "analyticsDashboard": false,
    "updatedAt": "2025-04-01T09:00:00Z",
    "updatedBy": "admin-456"
  }
}
```

## 23. POST /api/leave/:schoolId/feature-flags - Update Feature Flags

**Endpoint**: `POST {{baseUrl}}/api/leave/{{schoolId}}/feature-flags`

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "message": "Feature flags updated successfully",
  "featureFlags": {
    "conditionalApproval": true,
    "workloadAssessment": true,
    "autoCoverage": false,
    "notifications": true,
    "pdfExport": true,
    "bulkApproval": true,
    "mobileAppIntegration": true,
    "analyticsDashboard": false,
    "updatedAt": "2025-04-10T17:00:00Z",
    "updatedBy": "admin-456"
  }
}
```

## Common Error Responses

### Authentication Error (HTTP 401)
```json
{
  "success": false,
  "message": "Unauthorized: Missing or invalid authentication headers"
}
```

### Validation Error (HTTP 400)
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "startDate",
      "message": "Start date cannot be in the past"
    },
    {
      "field": "endDate",
      "message": "End date must be after start date"
    }
  ]
}
```

### Resource Not Found (HTTP 404)
```json
{
  "success": false,
  "message": "Leave not found"
}
```

### Conflict Error (HTTP 409)
```json
{
  "success": false,
  "message": "Leave dates conflict with existing approved leave"
}
```

### Insufficient Leave Balance (HTTP 422)
```json
{
  "success": false,
  "message": "Insufficient leave balance",
  "available": 5,
  "requested": 7,
  "shortage": 2
}
```

### Server Error (HTTP 500)
```json
{
  "success": false,
  "message": "Internal server error"
}
```

## Test Data Dependencies

For successful testing of Leave Management APIs, ensure the following test data exists:

1. **School ID**: `{{schoolId}}` (e.g., "test-school-123")
2. **Admin ID**: `{{adminId}}` (e.g., "admin-456")
3. **Employee ID**: `{{employeeId}}` (e.g., "emp-123456") - Created during employee management tests
4. **Leave ID**: Created during test execution (will be stored in environment variables)
5. **Coverage ID**: Created during coverage assignment tests
6. **Notification ID**: Created during notification tests
7. **Valid dates**: Future dates for leave applications
8. **Leave types**: casual, medical, earned, sick (as defined in system)

## Testing Notes

1. **Order of Operations**:
   - First create a leave (test 1)
   - Use the returned leave ID for subsequent tests (tests 3-22)
   - Test approval workflow in sequence: create → approve/reject → extend/reduce
   - Test conditional approval and coverage assignment

2. **Data Consistency**:
   - Leave dates must be in the future
   - End date must be after start date
   - Leave duration must match date difference
   - Employee must have sufficient leave balance

3. **Workflow Testing**:
   - Test leave lifecycle: pending → approved/rejected → extended/reduced → closed
   - Test conditional approval workflow
   - Test coverage assignment and acceptance
   - Test notification flow

4. **Edge Cases to Test**:
   - Creating leave with overlapping dates
   - Approving already approved leave
   - Extending leave beyond employee's balance
   - Assigning coverage to unavailable employee
   - Marking non-existent notification as read
   - Updating feature flags with invalid values

5. **Performance Expectations**:
   - List operations should return within 2 seconds
   - PDF generation should complete within 5 seconds
   - Workload assessment should complete within 10 seconds
   - Notifications should be real-time (WebSocket)

6. **Integration Points**:
   - Integration with Employee Management system
   - Integration with Attendance system
   - Integration with Notification system
   - Integration with PDF generation service
   - Integration with Calendar/Outlook (if applicable)

## Leave Types Reference

| Type | Description | Max Duration | Approval Required |
|------|-------------|--------------|-------------------|
| casual | Casual leave for personal reasons | 3 days | Yes |
| medical | Medical leave with certificate | 15 days | Yes (with medical proof) |
| earned | Earned/privilege leave | 30 days | Yes |
| sick | Sick leave without certificate | 7 days | Yes |
| maternity | Maternity leave | 180 days | Yes (with medical proof) |
| paternity | Paternity leave | 15 days | Yes |
| compensatory | Compensatory leave for overtime | Based on overtime | No |

## Status Flow Diagram

```
Pending → Conditional Approval → Approved → Completed
    ↓           ↓                    ↓
Rejected   Conditions Met       Extended/Reduced
    ↓           ↓                    ↓
Closed      Approved             Completed
```

## Success Criteria

1. **Functional**: All 23 endpoints return expected responses
2. **Performance**: Response times within acceptable limits
3. **Error Handling**: Appropriate error responses for invalid inputs
4. **Data Integrity**: Leave balances correctly updated
5. **Workflow**: Complete leave lifecycle works end-to-end
6. **Integration**: Notifications and coverage assignment work correctly