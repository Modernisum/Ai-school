# Support API

Base path: `/admin/support`

Saare endpoints ko Bearer token ke throw authentication ki zaroorat hoti hai.

---

## 1. List Support Requests

```
GET /admin/support
```

**Auth:** Required (Bearer token)

Schools dwara submit ki gayi saari support requests return karta hai. Isme pending aur resolved dono tarah ki requests include hoti hain.

**Headers:**
| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <base64-token>` |

**Expected Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "schoolName": "Springfield Elementary",
      "contactInfo": "admin@springfield.edu",
      "message": "Unable to add new students. Getting error 500.",
      "status": "pending",
      "createdAt": "2026-06-20T14:30:00Z",
      "resolvedAt": null
    },
    {
      "id": 2,
      "schoolName": "Greenfield High",
      "contactInfo": "Need help with billing",
      "message": "Our wallet was charged twice for SMS credits.",
      "status": "resolved",
      "createdAt": "2026-06-18T09:00:00Z",
      "resolvedAt": "2026-06-19T11:00:00Z"
    }
  ]
}
```

**Error Responses:**

Unauthorized (401):
```json
{
  "success": false,
  "message": "Missing admin token"
}
```

**Test Case:**
```yaml
name: "List support requests"
prerequisites:
  - Login aur token generate karein
  - Kam se kam ek support request exist karti hai
request:
  method: GET
  url: "/admin/support"
  headers:
    Authorization: "Bearer <token>"
expect:
  status: 200
  body:
    success: true
    data: array
```

---

## 2. Resolve Support Request

```
PATCH /admin/support/:id/resolve
```

**Auth:** Required (Bearer token)

Ek support request ko resolved mark karta hai.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | integer | Support request ID |

**Expected Response (200):**
```json
{
  "success": true,
  "data": "Request marked as resolved"
}
```

**Error Responses:**

Unauthorized (401):
```json
{
  "success": false,
  "message": "Missing admin token"
}
```

Request not found (500):
```json
{
  "success": false,
  "message": "Support request not found"
}
```

**Test Case:**
```yaml
name: "Resolve support request"
prerequisites:
  - Login aur token generate karein
  - ID 1 ke sath support request exist karti hai aur status pending hai
request:
  method: PATCH
  url: "/admin/support/1/resolve"
  headers:
    Authorization: "Bearer <token>"
expect:
  status: 200
  body:
    success: true
    data: "Request marked as resolved"
```

```yaml
name: "Resolve non-existent support request"
prerequisites:
  - Login aur token generate karein
request:
  method: PATCH
  url: "/admin/support/99999/resolve"
  headers:
    Authorization: "Bearer <token>"
expect:
  status: 500
  body:
    success: false
```