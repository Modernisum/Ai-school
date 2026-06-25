# Schools API

Base path: `/admin/schools`

Saare endpoints ko Bearer token ke throw authentication ki zaroorat hoti hai.

---

## 1. List All Schools

```
GET /admin/schools
```

**Auth:** Required (Bearer token)

Saare schools return karta hai. Lightweight list ke liye `?simple=true` query parameter support karta hai.

**Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `simple` | string | No | — | Minimal fields (sirf `schoolId` aur `schoolName`) ke liye ise `"true"` par set karein |

**Expected Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "schoolId": "school-123",
      "schoolName": "Springfield Elementary",
      "status": "active",
      "email": "admin@springfield.edu",
      "createdAt": "2025-06-01T00:00:00Z",
      "walletBalance": "500.00",
      "studentCount": 250,
      "employeeCount": 35
    }
  ]
}
```

**Simple mode response:**
```json
{
  "success": true,
  "data": [
    {
      "schoolId": "school-123",
      "schoolName": "Springfield Elementary"
    }
  ]
}
```

**Test Case:**
```yaml
name: "List all schools"
prerequisites:
  - Login aur token generate karein
request:
  method: GET
  url: "/admin/schools"
  headers:
    Authorization: "Bearer <token>"
expect:
  status: 200
  body:
    success: true
    data: array
```

```yaml
name: "List schools simple mode"
prerequisites:
  - Login aur token generate karein
request:
  method: GET
  url: "/admin/schools?simple=true"
  headers:
    Authorization: "Bearer <token>"
expect:
  status: 200
  body:
    success: true
    data.0.schoolId: string
    data.0.schoolName: string
```

---

## 2. Export All Schools

```
GET /admin/schools/export/all
```

**Auth:** Required (Bearer token)

Saare schools ka JSON backup download karta hai. `Content-Disposition: attachment` ke sath file download return karta hai.

**Expected Response (200):**
- Content-Type: `application/json`
- Content-Disposition: `attachment; filename="all_schools_backup_YYYYMMDD.json"`
- Body: Ek JSON object jisme saare schools ka data hoga

**Test Case:**
```yaml
name: "Export all schools"
prerequisites:
  - Login aur token generate karein
request:
  method: GET
  url: "/admin/schools/export/all"
  headers:
    Authorization: "Bearer <token>"
expect:
  status: 200
  headers:
    content-type: "application/json"
    content-disposition: contains "attachment"
```

---

## 3. Get School

```
GET /admin/schools/:schoolId
```

**Auth:** Required (Bearer token)

Single school ke liye full details return karta hai.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `schoolId` | string | School identifier |

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "schoolId": "school-123",
    "schoolName": "Springfield Elementary",
    "status": "active",
    "email": "admin@springfield.edu",
    "phone": "+1234567890",
    "address": "123 Main St",
    "walletBalance": "500.00",
    "sessionDurationHours": 24,
    "createdAt": "2025-06-01T00:00:00Z",
    "updatedAt": "2026-06-01T00:00:00Z"
  }
}
```

**Test Case:**
```yaml
name: "Get school by ID"
prerequisites:
  - Login aur token generate karein
  - School "school-123" exist karta hai
request:
  method: GET
  url: "/admin/schools/school-123"
  headers:
    Authorization: "Bearer <token>"
expect:
  status: 200
  body:
    success: true
    data.schoolId: "school-123"
```

---

## 4. Update School

```
PUT /admin/schools/:schoolId
```

**Auth:** Required (Bearer token)

School fields update karta hai. Kisi bhi valid JSON fields ko accept karta hai.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `schoolId` | string | School identifier |

**Request Body:**
```json
{
  "schoolName": "Springfield Elementary Updated",
  "email": "newadmin@springfield.edu",
  "phone": "+9876543210"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": "School updated"
}
```

**Test Case:**
```yaml
name: "Update school"
prerequisites:
  - Login aur token generate karein
  - School "school-123" exist karta hai
request:
  method: PUT
  url: "/admin/schools/school-123"
  headers:
    Authorization: "Bearer <token>"
  body:
    schoolName: "Updated School"
    phone: "+9876543210"
expect:
  status: 200
  body:
    success: true
    data: "School updated"
```

---

## 5. Delete School

```
DELETE /admin/schools/:schoolId
```

**Auth:** Required (Bearer token)

Manually/permanently ek school aur uske saare related data (students, employees, resources, etc.) ko delete karta hai.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `schoolId` | string | School identifier |

**Expected Response (200):**
```json
{
  "success": true,
  "data": "School and all related data deleted"
}
```

**Test Case:**
```yaml
name: "Delete school"
prerequisites:
  - Login aur token generate karein
  - School "school-123" exist karta hai
request:
  method: DELETE
  url: "/admin/schools/school-123"
  headers:
    Authorization: "Bearer <token>"
expect:
  status: 200
  body:
    success: true
    data: "School and all related data deleted"
```

---

## 6. Set School Status

```
PATCH /admin/schools/:schoolId/status
```

**Auth:** Required (Bearer token)

School ka status change karta hai. Sirf `active`, `blocked`, aur `inactive` hi valid hain.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `schoolId` | string | School identifier |

**Request Body:**
```json
{
  "status": "blocked"
}
```

| Field | Type | Required | Allowed Values |
|-------|------|----------|----------------|
| `status` | string | Yes | `active`, `blocked`, `inactive` |

**Expected Response (200):**
```json
{
  "success": true,
  "data": "School status set to blocked"
}
```

**Error Responses:**

Invalid status (400):
```json
{
  "success": false,
  "message": "status must be active|blocked|inactive"
}
```

**Test Case:**
```yaml
name: "Set school status to blocked"
prerequisites:
  - Login aur token generate karein
  - School "school-123" exist karta hai
request:
  method: PATCH
  url: "/admin/schools/school-123/status"
  headers:
    Authorization: "Bearer <token>"
  body:
    status: "blocked"
expect:
  status: 200
  body:
    success: true
    data: "School status set to blocked"
```

```yaml
name: "Set school status invalid value"
prerequisites:
  - Login aur token generate karein
request:
  method: PATCH
  url: "/admin/schools/school-123/status"
  headers:
    Authorization: "Bearer <token>"
  body:
    status: "deleted"
expect:
  status: 400
  body:
    success: false
    message: "status must be active|blocked|inactive"
```

---

## 7. Change School Password

```
PATCH /admin/schools/:schoolId/password
```

**Auth:** Required (Bearer token)

School ka login password reset karta hai.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `schoolId` | string | School identifier |

**Request Body:**
```json
{
  "newPassword": "newSecurePass123"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `newPassword` | string | Yes | School account ke liye naya password |

**Expected Response (200):**
```json
{
  "success": true,
  "data": "Password updated"
}
```

**Error Responses:**

Missing newPassword (400):
```json
{
  "success": false,
  "message": "newPassword required"
}
```

**Test Case:**
```yaml
name: "Change school password"
prerequisites:
  - Login aur token generate karein
  - School "school-123" exist karta hai
request:
  method: PATCH
  url: "/admin/schools/school-123/password"
  headers:
    Authorization: "Bearer <token>"
  body:
    newPassword: "newSecurePass123"
expect:
  status: 200
  body:
    success: true
    data: "Password updated"
```

```yaml
name: "Change school password missing field"
request:
  method: PATCH
  url: "/admin/schools/school-123/password"
  headers:
    Authorization: "Bearer <token>"
  body: {}
expect:
  status: 400
  body:
    success: false
    message: "newPassword required"
```

---

## 8. Set Session Duration

```
PATCH /admin/schools/:schoolId/session
```

**Auth:** Required (Bearer token)

School ke liye maximum session duration (hours me) set karta hai. Valid range: 1–8760 (1 year).

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `schoolId` | string | School identifier |

**Request Body:**
```json
{
  "hours": 48
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `hours` | integer | Yes | 1–8760 (1 hour se 1 year tak) |

**Expected Response (200):**
```json
{
  "success": true,
  "data": "Session duration set to 48 hours"
}
```

**Error Responses:**

Invalid hours (400):
```json
{
  "success": false,
  "message": "hours must be 1–8760"
}
```

**Test Case:**
```yaml
name: "Set session duration"
prerequisites:
  - Login aur token generate karein
  - School "school-123" exist karta hai
request:
  method: PATCH
  url: "/admin/schools/school-123/session"
  headers:
    Authorization: "Bearer <token>"
  body:
    hours: 48
expect:
  status: 200
  body:
    success: true
    data: "Session duration set to 48 hours"
```

```yaml
name: "Set session duration out of range"
request:
  method: PATCH
  url: "/admin/schools/school-123/session"
  headers:
    Authorization: "Bearer <token>"
  body:
    hours: 0
expect:
  status: 400
  body:
    success: false
    message: "hours must be 1–8760"
```

---

## 9. Get School Sessions

```
GET /admin/schools/:schoolId/sessions
```

**Auth:** Required (Bearer token)

School ke liye saare active sessions return karta hai.

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
      "sessionId": "sess-abc123",
      "userId": "user-456",
      "deviceInfo": "Chrome/Windows",
      "ipAddress": "192.168.1.1",
      "createdAt": "2026-06-21T10:00:00Z",
      "expiresAt": "2026-06-23T10:00:00Z"
    }
  ]
}
```

**Test Case:**
```yaml
name: "Get school sessions"
prerequisites:
  - Login aur token generate karein
  - School "school-123" exist karta hai jisme active sessions hon
request:
  method: GET
  url: "/admin/schools/school-123/sessions"
  headers:
    Authorization: "Bearer <token>"
expect:
  status: 200
  body:
    success: true
    data: array
```

---

## 10. Expire School Sessions

```
DELETE /admin/schools/:schoolId/sessions
```

**Auth:** Required (Bearer token)

School ke saare active sessions ko force-expire karta hai, jisse saare users logout ho jate hain.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `schoolId` | string | School identifier |

**Expected Response (200):**
```json
{
  "success": true,
  "data": "5 sessions expired"
}
```

**Test Case:**
```yaml
name: "Expire school sessions"
prerequisites:
  - Login aur token generate karein
  - School "school-123" exist karta hai jisme active sessions hon
request:
  method: DELETE
  url: "/admin/schools/school-123/sessions"
  headers:
    Authorization: "Bearer <token>"
expect:
  status: 200
  body:
    success: true
    data: string
```

---

## 11. Send Notification to School

```
POST /admin/schools/:schoolId/notify
```

**Auth:** Required (Bearer token)

Specific school ko ek in-app notification banner send karta hai.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `schoolId` | string | School identifier |

**Request Body:**
```json
{
  "title": "Maintenance Alert",
  "message": "System will be down for maintenance on Sunday 2 AM–4 AM UTC.",
  "type": "warning"
}
```

| Field | Type | Required | Default | Allowed Values |
|-------|------|----------|---------|----------------|
| `title` | string | No | `"Message from Admin"` | Koi bhi string |
| `message` | string | No | `""` | Koi bhi string |
| `type` | string | No | `"info"` | `info`, `warning`, `error` |

**Expected Response (200):**
```json
{
  "success": true,
  "data": "Notification sent"
}
```

**Test Case:**
```yaml
name: "Send notification to school"
prerequisites:
  - Login aur token generate karein
  - School "school-123" exist karta hai
request:
  method: POST
  url: "/admin/schools/school-123/notify"
  headers:
    Authorization: "Bearer <token>"
  body:
    title: "Maintenance"
    message: "System maintenance scheduled"
    type: "warning"
expect:
  status: 200
  body:
    success: true
    data: "Notification sent"
```

---

## 12. Clear School Notification

```
DELETE /admin/schools/:schoolId/notify
```

**Auth:** Required (Bearer token)

Specific school ke liye active notification banner ko clear karta hai.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `schoolId` | string | School identifier |

**Expected Response (200):**
```json
{
  "success": true,
  "data": "Notification cleared"
}
```

**Test Case:**
```yaml
name: "Clear school notification"
prerequisites:
  - Login aur token generate karein
  - School "school-123" par koi active notification chal rahi hai
request:
  method: DELETE
  url: "/admin/schools/school-123/notify"
  headers:
    Authorization: "Bearer <token>"
expect:
  status: 200
  body:
    success: true
    data: "Notification cleared"
```

---

## 13. Get Wallet Ledger

```
GET /admin/schools/:schoolId/ledger
```

**Auth:** Required (Bearer token)

School ke liye wallet transaction history return karta hai. Isme saare credits, debits, refunds, aur promo redemptions include hote hain.

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
      "schoolId": "school-123",
      "type": "credit",
      "amount": "100.00",
      "description": "Promo code LAUNCH2026",
      "balanceAfter": "600.00",
      "createdAt": "2026-06-15T10:00:00Z"
    },
    {
      "id": 2,
      "schoolId": "school-123",
      "type": "debit",
      "amount": "25.00",
      "description": "SMS charges - June 2026",
      "balanceAfter": "575.00",
      "createdAt": "2026-06-20T00:00:00Z"
    }
  ]
}
```

**Test Case:**
```yaml
name: "Get wallet ledger"
prerequisites:
  - Login aur token generate karein
  - School "school-123" exist karta hai
request:
  method: GET
  url: "/admin/schools/school-123/ledger"
  headers:
    Authorization: "Bearer <token>"
expect:
  status: 200
  body:
    success: true
    data: array
```

---

## 14. Process Refund

```
POST /admin/schools/:schoolId/refund
```

**Auth:** Required (Bearer token)

School ke wallet me manually amount credit/refund karta hai. Amount decimal string hota hai.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `schoolId` | string | School identifier |

**Request Body:**
```json
{
  "amount": "50.00",
  "description": "Refund for unused SMS credits"
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `amount` | string | No | `"0"` | Decimal string, jitna amount credit karna hai |
| `description` | string | No | `"Manual adjustment"` | Refund ka reason |

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "transactionId": 42,
    "amount": "50.00",
    "newBalance": "625.00"
  }
}
```

**Error Responses:**

Invalid amount format (500):
```json
{
  "success": false,
  "message": "Invalid amount format"
}
```

**Test Case:**
```yaml
name: "Process refund"
prerequisites:
  - Login aur token generate karein
  - School "school-123" exist karta hai
request:
  method: POST
  url: "/admin/schools/school-123/refund"
  headers:
    Authorization: "Bearer <token>"
  body:
    amount: "50.00"
    description: "Refund for unused credits"
expect:
  status: 200
  body:
    success: true
    data: object
```

```yaml
name: "Process refund invalid amount"
request:
  method: POST
  url: "/admin/schools/school-123/refund"
  headers:
    Authorization: "Bearer <token>"
  body:
    amount: "not-a-number"
    description: "Invalid amount"
expect:
  status: 500
  body:
    success: false
    message: "Invalid amount format"
```

---

## 15. Export School

```
GET /admin/schools/:schoolId/export
```

**Auth:** Required (Bearer token)

Single school ke data ka JSON backup download karta hai. File download return karta hai.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `schoolId` | string | School identifier |

**Expected Response (200):**
- Content-Type: `application/json`
- Content-Disposition: `attachment; filename="school_{schoolId}_backup.json"`
- Body: School ka saara data contain karne wala streaming JSON object

**Test Case:**
```yaml
name: "Export single school"
prerequisites:
  - Login aur token generate karein
  - School "school-123" exist karta hai
request:
  method: GET
  url: "/admin/schools/school-123/export"
  headers:
    Authorization: "Bearer <token>"
expect:
  status: 200
  headers:
    content-type: "application/json"
    content-disposition: contains "attachment"
```

---

## 16. Import School

```
POST /admin/schools/:schoolId/import
```

**Auth:** Required (Bearer token)

Pehle se exported JSON payload se school data ko import/restore karta hai.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `schoolId` | string | School identifier |

**Request Body:**
```json
{
  "schoolName": "Springfield Elementary",
  "students": [ ... ],
  "employees": [ ... ],
  "resources": { ... }
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "imported": true,
    "studentsImported": 250,
    "employeesImported": 35,
    "message": "School data imported successfully"
  }
}
```

**Test Case:**
```yaml
name: "Import school data"
prerequisites:
  - Login aur token generate karein
  - School "school-123" exist karta hai
  - Pehle se exported JSON data available hai
request:
  method: POST
  url: "/admin/schools/school-123/import"
  headers:
    Authorization: "Bearer <token>"
  body:
    schoolName: "Springfield Elementary"
    students: []
    employees: []
    resources: {}
expect:
  status: 200
  body:
    success: true
    data: object
```