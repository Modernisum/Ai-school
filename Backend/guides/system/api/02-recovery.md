# Recovery & Audit API

Provides student change history and audit log with undo capabilities.

**Base path:** `/school/:schoolId/system/recovery`

---

## 1. List Student History

```
GET /school/:schoolId/system/recovery/history/students
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
  "data": [
    {
      "id": 1,
      "studentId": "student-456",
      "field": "name",
      "oldValue": "John Doe",
      "newValue": "John Smith",
      "changedBy": "admin-1",
      "changedAt": "2026-06-20T15:30:00Z",
      "status": "applied"
    }
  ]
}
```

**Test Case:**
```yaml
name: "List student history"
request:
  method: GET
  url: "/school/school-123/system/recovery/history/students"
expect:
  status: 200
  body:
    success: true
    data: array
```

---

## 2. Undo Student Change

```
POST /school/:schoolId/system/recovery/history/undo/:id
```

**Auth:** Not required

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `schoolId` | string | School identifier |
| `id` | integer | History record ID to revert |

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Change reverted successfully"
}
```

**Test Case:**
```yaml
name: "Undo student change"
prerequisites:
  - A student history record exists with id 1
request:
  method: POST
  url: "/school/school-123/system/recovery/history/undo/1"
expect:
  status: 200
  body:
    success: true
    message: "Change reverted successfully"
```

---

## 3. List Audit Logs

```
GET /school/:schoolId/system/recovery/audit
```

**Auth:** Not required

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `schoolId` | string | School identifier |

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `module` | string | No | Filter by module name |
| `limit` | integer | No | Max results (hardcoded to 100 in service) |

**Expected Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "module": "academic",
      "action": "UPDATE",
      "tableName": "exams",
      "recordId": "exam-123",
      "oldData": { "name": "Old Exam" },
      "newData": { "name": "New Exam" },
      "performedBy": "admin-1",
      "performedAt": "2026-06-20T15:30:00Z"
    }
  ]
}
```

**Note:** The service implementation currently has a hardcoded limit of 100 records. The `module` and `limit` query params are accepted but the limit is not passed through.

**Test Cases:**
```yaml
name: "List audit logs"
request:
  method: GET
  url: "/school/school-123/system/recovery/audit"
expect:
  status: 200
  body:
    success: true
    data: array

name: "List audit logs filtered by module"
request:
  method: GET
  url: "/school/school-123/system/recovery/audit?module=academic"
expect:
  status: 200
  body:
    success: true
    data: array
```

---

## 4. Undo Audit Log

```
POST /school/:schoolId/system/recovery/audit/undo/:logId
```

**Auth:** Not required

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `schoolId` | string | School identifier |
| `logId` | integer | Audit log ID to revert |

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Audit log reversion submitted."
}
```

**Test Case:**
```yaml
name: "Undo audit log"
prerequisites:
  - An audit log record exists with id 1
request:
  method: POST
  url: "/school/school-123/system/recovery/audit/undo/1"
expect:
  status: 200
  body:
    success: true
    message: "Audit log reversion submitted."
```