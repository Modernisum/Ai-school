# Enhanced Employee Leave Management System - Backend API Architecture

## Overview
This document outlines the backend API architecture for the enhanced employee leave management system with conditional approvals, notification system, and responsibility coverage features.

## Current API Analysis

### Existing Leave Endpoints
```
POST   /api/leave/:schoolId          - Create leave
GET    /api/leave/:schoolId          - List leaves
POST   /api/leave/:schoolId/:leaveId/approve - Approve
POST   /api/leave/:schoolId/:leaveId/reject  - Reject
POST   /api/leave/:schoolId/:leaveId/extend  - Extend
POST   /api/leave/:schoolId/:leaveId/reduce  - Reduce
GET    /api/leave/:schoolId/:leaveId/pdf     - Download PDF
```

## Enhanced API Architecture

### 1. Extended Leave Management API

#### 1.1 Leave Submission (Enhanced)
```http
POST /api/v2/leave/:schoolId/submit
Content-Type: application/json

{
  "employeeId": "string",
  "employeeName": "string",
  "reason": "string",
  "leaveType": "casual|sick|emergency|annual",
  "fromDate": "YYYY-MM-DD",
  "toDate": "YYYY-MM-DD",
  "submittedVia": "mobile|web",
  "priority": "urgent|high|normal|low",
  "documentation": [
    {
      "type": "medical_certificate|other",
      "url": "string",
      "description": "string"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "leaveId": "LV1712489321000",
    "status": "pending",
    "notificationSent": true,
    "estimatedBalanceAfter": 12,
    "message": "Leave application submitted. Admin will review."
  }
}
```

#### 1.2 Conditional Approval API
```http
POST /api/v2/leave/:schoolId/:leaveId/conditional-approve
Content-Type: application/json

{
  "conditions": [
    {
      "type": "salary_deduction",
      "value": {
        "amount": 500.00,
        "percentage": 10,
        "reason": "Short notice leave"
      }
    },
    {
      "type": "day_reduction",
      "value": {
        "approvedDays": 3,
        "originalDays": 5,
        "reason": "Workload constraints"
      }
    },
    {
      "type": "coverage_required",
      "value": {
        "coveringEmployeeId": "EMP045",
        "responsibilityIds": ["RES001", "RES002"],
        "coveragePercentage": 100
      }
    }
  ],
  "adminNotes": "string",
  "responseDeadline": "YYYY-MM-DD",
  "autoRejectIfNoResponse": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "leaveId": "LV1712489321000",
    "status": "conditionally_approved",
    "conditionsCount": 3,
    "notificationsSent": 2,
    "responseDeadline": "2024-04-15",
    "message": "Leave conditionally approved. Employee has until 2024-04-15 to respond."
  }
}
```

#### 1.3 Employee Response to Conditions
```http
POST /api/v2/leave/:schoolId/:leaveId/respond
Content-Type: application/json

{
  "employeeId": "string",
  "responses": [
    {
      "conditionId": "COND001",
      "response": "accept|reject|negotiate",
      "counterOffer": {
        "type": "salary_deduction",
        "value": {
          "amount": 250.00
        }
      },
      "notes": "string"
    }
  ],
  "overallDecision": "accept_all|reject_all|partial"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "leaveId": "LV1712489321000",
    "finalStatus": "approved|rejected|under_negotiation",
    "negotiationRequired": true,
    "nextStep": "admin_review",
    "message": "Response recorded. Admin will review your counter-offer."
  }
}
```

### 2. Leave Balance & Quota Management API

#### 2.1 Get Employee Leave Balance
```http
GET /api/v2/leave/:schoolId/employee/:employeeId/balance
Query Parameters:
- year: 2024 (optional, defaults to current year)
- leaveType: casual|sick|annual|emergency (optional)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "employeeId": "EMP001",
    "employeeName": "John Doe",
    "year": 2024,
    "balances": {
      "casual": {
        "monthlyQuota": 2,
        "annualQuota": 12,
        "usedThisMonth": 1,
        "usedThisYear": 3,
        "remainingThisMonth": 1,
        "remainingThisYear": 9,
        "carryForward": 0
      },
      "sick": {
        "monthlyQuota": 1,
        "annualQuota": 12,
        "usedThisMonth": 0,
        "usedThisYear": 2,
        "remainingThisMonth": 1,
        "remainingThisYear": 10,
        "carryForward": 0
      }
    },
    "totalAvailableDays": 19
  }
}
```

#### 2.2 Update Leave Quotas (Admin)
```http
PUT /api/v2/leave/:schoolId/quotas
Content-Type: application/json

{
  "employeeId": "EMP001", // Optional for bulk update
  "quotas": [
    {
      "leaveType": "casual",
      "monthlyQuota": 2,
      "annualQuota": 12,
      "carryForwardFromPrevious": 1
    }
  ],
  "effectiveFrom": "YYYY-MM-DD",
  "notes": "Annual quota adjustment"
}
```

### 3. Notification System API

#### 3.1 Get User Notifications
```http
GET /api/v2/notifications/:schoolId/user/:userId
Query Parameters:
- unreadOnly: true|false (default: false)
- limit: 50 (default: 20)
- offset: 0 (default: 0)
- notificationType: leave_submitted|leave_approved|conditional_approval|response_required
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "EMP001",
    "unreadCount": 3,
    "totalCount": 15,
    "notifications": [
      {
        "notificationId": "NOTIF001",
        "type": "conditional_approval",
        "title": "Leave Conditionally Approved",
        "message": "Your leave request LV1712489321000 has been conditionally approved.",
        "metadata": {
          "leaveId": "LV1712489321000",
          "actionRequired": true,
          "deadline": "2024-04-15"
        },
        "isRead": false,
        "createdAt": "2024-04-07T09:30:00Z",
        "actions": [
          {
            "label": "View Conditions",
            "action": "view_conditions",
            "url": "/leave/LV1712489321000/conditions"
          },
          {
            "label": "Respond Now",
            "action": "respond",
            "url": "/leave/LV1712489321000/respond"
          }
        ]
      }
    ]
  }
}
```

#### 3.2 Mark Notification as Read
```http
POST /api/v2/notifications/:schoolId/:notificationId/read
Content-Type: application/json

{
  "userId": "string"
}
```

#### 3.3 Real-time Notification WebSocket
```javascript
// WebSocket connection for real-time updates
const ws = new WebSocket(`wss://api.example.com/ws/notifications/${schoolId}/${userId}`);

ws.onmessage = (event) => {
  const notification = JSON.parse(event.data);
  // Handle real-time notification
};
```

### 4. Responsibility Coverage API

#### 4.1 Assess Coverage Feasibility
```http
POST /api/v2/leave/:schoolId/:leaveId/assess-coverage
Content-Type: application/json

{
  "assessmentDate": "YYYY-MM-DD",
  "includeWorkloadAnalysis": true,
  "departmentFilter": ["teaching", "administration"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "leaveId": "LV1712489321000",
    "assessmentId": "ASSESS001",
    "feasibilityScore": 85,
    "recommendedAction": "approve_with_coverage",
    "availableCoverage": [
      {
        "employeeId": "EMP045",
        "employeeName": "Rajesh Kumar",
        "compatibilityScore": 92,
        "availableCapacity": 80,
        "matchingResponsibilities": ["RES001", "RES002"],
        "recommendedCoveragePercentage": 100
      },
      {
        "employeeId": "EMP128",
        "employeeName": "Priya Sharma",
        "compatibilityScore": 78,
        "availableCapacity": 60,
        "matchingResponsibilities": ["RES001"],
        "recommendedCoveragePercentage": 50
      }
    ],
    "workloadImpact": {
      "department": "teaching",
      "currentWorkloadScore": 75,
      "projectedWorkloadScore": 82,
      "riskLevel": "medium"
    }
  }
}
```

#### 4.2 Assign Coverage
```http
POST /api/v2/leave/:schoolId/:leaveId/assign-coverage
Content-Type: application/json

{
  "coveragePlan": [
    {
      "responsibilityId": "RES001",
      "coveringEmployeeId": "EMP045",
      "coverageType": "full",
      "coveragePercentage": 100,
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD",
      "notes": "Primary coverage assignment"
    },
    {
      "responsibilityId": "RES002",
      "coveringEmployeeId": "EMP128",
      "coverageType": "shared",
      "coveragePercentage": 50,
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD",
      "notes": "Secondary coverage"
    }
  ],
  "notifyCoveringEmployees": true,
  "requireAcceptance": true
}
```

### 5. Conditional Approval Templates API

#### 5.1 Get Conditional Approval Templates
```http
GET /api/v2/leave/:schoolId/conditional-templates
Query Parameters:
- templateType: salary_deduction|day_reduction|coverage_required|combined
- activeOnly: true|false (default: true)
```

#### 5.2 Create/Update Template
```http
POST /api/v2/leave/:schoolId/conditional-templates
PUT /api/v2/leave/:schoolId/conditional-templates/:templateId
Content-Type: application/json

{
  "templateName": "Short Notice Leave Policy",
  "templateType": "combined",
  "conditions": [
    {
      "type": "salary_deduction",
      "parameters": {
        "minAmount": 100.00,
        "maxAmount": 1000.00,
        "defaultPercentage": 10,
        "calculationMethod": "per_day|fixed_amount"
      }
    },
    {
      "type": "coverage_required",
      "parameters": {
        "requireCoverage": true,
        "coverageThreshold": 3, // Days threshold
        "autoAssign": false
      }
    }
  ],
  "applicableTo": {
    "employeeTypes": ["teacher", "staff"],
    "departments": ["teaching", "administration"],
    "leaveTypes": ["casual", "emergency"],
    "noticePeriod": "short" // short, medium, long
  },
  "isActive": true
}
```

### 6. Admin Dashboard API

#### 6.1 Get Leave Dashboard Summary
```http
GET /api/v2/leave/:schoolId/dashboard/summary
Query Parameters:
- timeframe: today|week|month|quarter (default: month)
- department: string (optional)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "timeframe": "month",
    "summary": {
      "totalLeaves": 45,
      "pending": 12,
      "approved": 25,
      "rejected": 5,
      "conditionallyApproved": 3,
      "avgProcessingTime": "2.5 days",
      "approvalRate": 62.2
    },
    "byDepartment": [
      {
        "department": "teaching",
        "pending": 8,
        "approved": 18,
        "rejected": 2,
        "conditionallyApproved": 2
      }
    ],
    "byLeaveType": [
      {
        "type": "casual",
        "count": 20,
        "approvalRate": 70.0
      }
    ],
    "urgentItems": [
      {
        "leaveId": "LV1712489321000",
        "employeeName": "John Doe",
        "days": 5,
        "status": "pending",
        "priority": "urgent",
        "submittedAt": "2024-04-07T09:30:00Z"
      }
    ]
  }
}
```

#### 6.2 Get Leave Queue
```http
GET /api/v2/leave/:schoolId/queue
Query Parameters:
- status: pending|conditionally_approved|under_negotiation (default: pending)
- sortBy: submittedAt|priority|employeeName (default: priority)
- sortOrder: asc|desc (default: desc)
- page: 1 (default: 1)
- pageSize: 20 (default: 20)
```

## Backend Service Architecture

### Service Layer Structure
```
Backend/src/services/
├── leave/
│   ├── enhanced_leave_service.rs      # Enhanced leave operations
│   ├── conditional_approval_service.rs # Conditional approval logic
│   ├── leave_balance_service.rs       # Quota and balance management
│   └── coverage_assessment_service.rs # Responsibility coverage
├── notifications/
│   ├── leave_notification_service.rs  # Leave-specific notifications
│   └── realtime_notification_service.rs # WebSocket notifications
└── templates/
    └── conditional_template_service.rs # Template management
```

### Repository Layer Structure
```
Backend/src/repository/
├── leave/
│   ├── enhanced_leave_repo.rs         # Extended leave operations
│   ├── leave_quota_repo.rs            # Quota management
│   ├── conditional_approval_repo.rs   # Condition storage
│   └── coverage_repo.rs               # Responsibility coverage
├── notifications/
│   └── leave_notification_repo.rs     # Notification storage
└── templates/
    └── conditional_template_repo.rs   # Template storage
```

### Route Layer Structure
```
Backend/src/routes/
├── leave/
│   ├── enhanced_leave_routes.rs       # New enhanced endpoints
│   ├── conditional_approval_routes.rs # Conditional approval endpoints
│   ├── leave_balance_routes.rs        # Balance management
│   └── coverage_routes.rs             # Coverage management
├── notifications/
│   └── leave_notification_routes.rs   # Notification endpoints
└── templates/
    └── conditional_template_routes.rs # Template endpoints
```

## Data Models

### Enhanced Leave Model (Rust)
```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct EnhancedLeaveApplication {
    pub leave_id: String,
    pub school_id: String,
    pub employee_id: String,
    pub employee_name: String,
    pub reason: String,
    pub leave_type: String, // casual, sick, emergency, annual
    pub from_date: NaiveDate,
    pub to_date: NaiveDate,
    pub status: String, // pending, approved, rejected, conditionally_approved, under_negotiation
    pub submitted_via: String, // mobile, web
    pub leave_balance_used: i32,
    pub salary_adjustment: Option<f64>,
    pub approved_days: Option<i32>,
    pub approval_conditions: Option<serde_json::Value>,
    pub coverage_plan_id: Option<String>,
    pub admin_notes: Option<String>,
    pub employee_response: Option<serde_json::Value>,
    pub response_deadline: Option<NaiveDate>,
    pub notification_sent: bool,
    pub priority_level: String, // urgent, high, normal, low
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LeaveApprovalCondition {
    pub condition_id: String,
    pub school_id: String,
    pub leave_id: String,
    pub condition_type: String, // salary_deduction, day_reduction, coverage_required, etc.
    pub condition_value: serde_json::Value,
    pub status: String, // pending, accepted, rejected, negotiated
    pub employee_response: Option<serde_json::Value>,
    pub admin_notes: Option<String>,
    pub created_by: String,
    pub created_at: DateTime<Utc>,
    pub responded_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EmployeeLeaveQuota {
    pub quota_id: String,
    pub school_id: String,
    pub employee_id: String,
    pub leave_type: String,
    pub year: i32,
    pub monthly_quota: i32,
    pub annual_quota: i32,
    pub used_this_month: i32,
    pub used_this_year: