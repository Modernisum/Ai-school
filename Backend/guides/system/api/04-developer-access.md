# Developer Access API

Manages developer access requests, approvals, revocations, and activity tracking.

**Base path:** `/school/:schoolId/system/developer-access`

---

## 1. Request Access

```
POST /school/:schoolId/system/developer-access/:developer_id/request
```

**Auth:** Not required

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `schoolId` | string | School identifier |
| `developer_id` | string | Developer's unique ID |

**Request Body:**
```json
{
  "developerEmail": "dev@example.com",
  "targetSchoolId": "school-456",
  "requestedRole": "readonly",
  "justification": "Need to debug API integration issue",
  "requestedTables": ["students", "exams"],
  "durationMinutes": 480
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `developerEmail` | string | Yes | - | Developer's email |
| `targetSchoolId` | string | No | - | Target school for access |
| `requestedRole` | string | Yes | - | Desired role (e.g., `readonly`, `editor`) |
| `justification` | string | Yes | - | Reason for access request |
| `requestedTables` | array of strings | Yes | - | Tables to access |
| `durationMinutes` | integer | No | `240` | Request duration in minutes (converted to hours) |

**Expected Response (201):**
```json
{
  "success": true,
  "message": "Access request submitted successfully",
  "request": {
    "request_id": 1,
    "developer_id": "dev-123",
    "target_school_id": "school-456",
    "requested_role": "readonly",
    "status": "pending",
    "justification": "Need to debug API integration issue",
    "created_at": "2026-06-21T10:00:00Z",
    "expires_at": "2026-06-21T14:00:00Z"
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Error description"
}
```

**Test Cases:**
```yaml
name: "Request developer access"
request:
  method: POST
  url: "/school/school-123/system/developer-access/dev-123/request"
  body:
    developerEmail: "dev@example.com"
    requestedRole: "readonly"
    justification: "Debugging API"
    requestedTables: ["students"]
    durationMinutes: 240
expect:
  status: 201
  body:
    success: true
    message: "Access request submitted successfully"
    request.request_id: number

name: "Request access with default duration"
request:
  method: POST
  url: "/school/school-123/system/developer-access/dev-123/request"
  body:
    developerEmail: "dev@example.com"
    requestedRole: "readonly"
    justification: "Testing"
    requestedTables: ["students"]
    # durationMinutes omitted - defaults to 240
expect:
  status: 201
  body:
    success: true
```

---

## 2. Approve Access Request

```
POST /school/:schoolId/system/developer-access/requests/:request_id/approve
```

**Auth:** Not required

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `schoolId` | string | School identifier |
| `request_id` | integer | Access request ID to approve |

**Request Body:**
```json
{
  "approverId": "admin-1",
  "approverEmail": "admin@school.com",
  "approvalNotes": "Approved for 24 hours",
  "overrideDurationMinutes": 1440
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `approverId` | string | Yes | ID of the approving admin |
| `approverEmail` | string | Yes | Email of the approving admin |
| `approvalNotes` | string | No | Optional approval notes |
| `overrideDurationMinutes` | integer | No | Override the requested duration |

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Access request approved",
  "data": {
    "grant_id": 1,
    "developer_id": "dev-123",
    "role": "readonly",
    "active_until": "2026-06-22T10:00:00Z",
    "tables": ["students", "exams"]
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Error description"
}
```

**Test Cases:**
```yaml
name: "Approve access request"
prerequisites:
  - Create a pending access request, note its request_id
request:
  method: POST
  url: "/school/school-123/system/developer-access/requests/1/approve"
  body:
    approverId: "admin-1"
    approverEmail: "admin@school.com"
    approvalNotes: "Approved"
expect:
  status: 200
  body:
    success: true
    message: "Access request approved"
    data.grant_id: number
```

---

## 3. Reject Access Request

```
POST /school/:schoolId/system/developer-access/requests/:request_id/reject
```

**Auth:** Not required

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `schoolId` | string | School identifier |
| `request_id` | integer | Access request ID to reject |

**Request Body:**
```json
{
  "revokerId": "admin-1",
  "revokerEmail": "admin@school.com",
  "reason": "Insufficient justification"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `revokerId` | string | Yes | ID of the rejecting admin |
| `revokerEmail` | string | Yes | Email of the rejecting admin |
| `reason` | string | Yes | Reason for rejection |

**Status:** `501 NOT_IMPLEMENTED`

**Expected Response (501):**
```json
{
  "success": false,
  "error": "Not implemented"
}
```

**Test Case:**
```yaml
name: "Reject access request (not implemented)"
request:
  method: POST
  url: "/school/school-123/system/developer-access/requests/1/reject"
  body:
    revokerId: "admin-1"
    revokerEmail: "admin@school.com"
    reason: "Not needed"
expect:
  status: 501
  body:
    success: false
    error: "Not implemented"
```

---

## 4. Revoke Access

```
DELETE /school/:schoolId/system/developer-access/:developer_id/access
```

**Auth:** Not required

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `schoolId` | string | School identifier |
| `developer_id` | string | Developer ID whose access to revoke |

**Request Body:**
```json
{
  "revokerId": "admin-1",
  "revokerEmail": "admin@school.com",
  "reason": "Access no longer needed"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `revokerId` | string | Yes | ID of the revoking admin |
| `revokerEmail` | string | Yes | Email of the revoking admin |
| `reason` | string | Yes | Reason for revocation |

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Access revoked successfully"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Error description"
}
```

**Note:** The route parameter `:developer_id` is used as the grant ID internally (`Path(grant_id): Path<i32>`).

**Test Cases:**
```yaml
name: "Revoke developer access"
prerequisites:
  - An active access grant exists for the developer
request:
  method: DELETE
  url: "/school/school-123/system/developer-access/1/access"
  body:
    revokerId: "admin-1"
    revokerEmail: "admin@school.com"
    reason: "Access no longer needed"
expect:
  status: 200
  body:
    success: true
    message: "Access revoked successfully"
```

---

## 5. Get Pending Requests

```
GET /school/:schoolId/system/developer-access/requests
```

**Auth:** Not required

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `schoolId` | string | School identifier |

**Expected Response (200):**
```json
{
  "success": true,
  "requests": [
    {
      "request_id": 1,
      "developer_id": "dev-123",
      "target_school_id": "school-456",
      "requested_role": "readonly",
      "status": "pending",
      "justification": "Need to debug API integration issue",
      "created_at": "2026-06-21T10:00:00Z",
      "expires_at": "2026-06-21T14:00:00Z"
    }
  ]
}
```

**Error Response (500):**
```json
{
  "success": false,
  "error": "Error description"
}
```

**Test Cases:**
```yaml
name: "Get pending requests"
prerequisites:
  - Create at least 1 pending access request
request:
  method: GET
  url: "/school/school-123/system/developer-access/requests"
expect:
  status: 200
  body:
    success: true
    requests: array

name: "Get pending requests when none exist"
request:
  method: GET
  url: "/school/school-123/system/developer-access/requests"
expect:
  status: 200
  body:
    success: true
    requests: []
```

---

## 6. Get Developer Access

```
GET /school/:schoolId/system/developer-access/:developer_id/access
```

**Auth:** Not required

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `schoolId` | string | School identifier |
| `developer_id` | string | Developer ID |

**Expected Response (200):**
```json
{
  "success": true,
  "access": {
    "developer_id": "dev-123",
    "current_role": "readonly",
    "active_until": "2026-06-22T10:00:00Z",
    "schools_with_access": ["school-456", "school-789"],
    "total_requests": 5,
    "approved_requests": 3
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "error": "Error description"
}
```

**Test Cases:**
```yaml
name: "Get developer access info"
request:
  method: GET
  url: "/school/school-123/system/developer-access/dev-123/access"
expect:
  status: 200
  body:
    success: true
    access.developer_id: "dev-123"

name: "Get access for unknown developer"
request:
  method: GET
  url: "/school/school-123/system/developer-access/unknown-dev/access"
expect:
  status: 404
  body:
    success: false
```

---

## 7. Get Developer Activity

```
GET /school/:schoolId/system/developer-access/:developer_id/activity
```

**Auth:** Not required

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `schoolId` | string | School identifier |
| `developer_id` | string | Developer ID |

**Expected Response (200):**
```json
{
  "success": true,
  "activities": [
    {
      "activity_id": 1,
      "developer_id": "dev-123",
      "action_type": "DATA_ACCESS",
      "target_school_id": "school-456",
      "details": { "table": "students", "operation": "SELECT" },
      "ip_address": "192.168.1.100",
      "user_agent": "Mozilla/5.0 ...",
      "created_at": "2026-06-21T10:05:00Z"
    }
  ]
}
```

**Note:** Fetches up to 100 activity records.

**Error Response (500):**
```json
{
  "success": false,
  "error": "Error description"
}
```

**Test Cases:**
```yaml
name: "Get developer activity"
request:
  method: GET
  url: "/school/school-123/system/developer-access/dev-123/activity"
expect:
  status: 200
  body:
    success: true
    activities: array

name: "Get activity for developer with no activity"
request:
  method: GET
  url: "/school/school-123/system/developer-access/new-dev/activity"
expect:
  status: 200
  body:
    success: true
    activities: []
```

---

## 8. Update Developer Role

```
PUT /school/:schoolId/system/developer-access/:developer_id/role
```

**Auth:** Not required

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `schoolId` | string | School identifier |
| `developer_id` | string | Developer ID |

**Request Body:**
```json
{
  "newRole": "editor",
  "reason": "Promoted to editor for project work"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `newRole` | string | Yes | New role to assign |
| `reason` | string | Yes | Reason for role change |

**Status:** `501 NOT_IMPLEMENTED`

**Expected Response (501):**
```json
{
  "success": false,
  "error": "Not implemented"
}
```

**Test Case:**
```yaml
name: "Update developer role (not implemented)"
request:
  method: PUT
  url: "/school/school-123/system/developer-access/dev-123/role"
  body:
    newRole: "editor"
    reason: "Promotion"
expect:
  status: 501
  body:
    success: false
    error: "Not implemented"
```

---

## 9. Emergency Access

```
POST /school/:schoolId/system/developer-access/:developer_id/emergency
```

**Auth:** Not required

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `schoolId` | string | School identifier |
| `developer_id` | string | Developer ID |

**Request Body:**
```json
{
  "developerEmail": "dev@example.com",
  "justification": "Critical production issue - database corruption",
  "requestedTables": ["students", "exams", "results"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `developerEmail` | string | Yes | Developer's email |
| `justification` | string | Yes | Emergency justification |
| `requestedTables` | array of strings | Yes | Tables to access |
| `requestedRole` | string | No | Ignored — always set to `"emergency"` |
| `durationMinutes` | integer | No | Ignored — always set to `1` hour |

**Note:** This is a shortcut that calls `request_access` with role `"emergency"` and duration of 1 hour. The `requestedRole` and `durationMinutes` fields in the body are ignored.

**Expected Response (201):**
```json
{
  "success": true,
  "message": "Emergency access requested",
  "request": {
    "request_id": 2,
    "developer_id": "dev-123",
    "requested_role": "emergency",
    "status": "pending",
    "justification": "Critical production issue",
    "created_at": "2026-06-21T15:00:00Z",
    "expires_at": "2026-06-21T16:00:00Z"
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Error description"
}
```

**Test Cases:**
```yaml
name: "Request emergency access"
request:
  method: POST
  url: "/school/school-123/system/developer-access/dev-123/emergency"
  body:
    developerEmail: "dev@example.com"
    justification: "Critical production issue"
    requestedTables: ["students"]
expect:
  status: 201
  body:
    success: true
    message: "Emergency access requested"
    request.requested_role: "emergency"
```

---

## 10. Validate Access Token

```
GET /school/:schoolId/system/developer-access/validate
```

**Auth:** Not required

**Status:** `501 NOT_IMPLEMENTED`

**Query Parameters:** Accepted but ignored (placeholder).

**Expected Response (501):**
```json
{
  "success": false,
  "error": "Not implemented"
}
```

**Test Case:**
```yaml
name: "Validate access token (not implemented)"
request:
  method: GET
  url: "/school/school-123/system/developer-access/validate?token=some-token"
expect:
  status: 501
  body:
    success: false
    error: "Not implemented"
```