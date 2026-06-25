# System API

Base path: `/admin`

Saare endpoints ko Bearer token ke throw authentication ki zaroorat hoti hai.

---

## 1. Manual Backup

```
POST /admin/backup
```

**Auth:** Required (Bearer token)

Manual database backup trigger karta hai. Backup `backup` service ke throw asynchronously perform kiya jata hai.

**Headers:**
| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <base64-token>` |

**Expected Response (200):**
```json
{
  "success": true,
  "data": "Manual backup completed successfully"
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

Backup failure (500):
```json
{
  "success": false,
  "message": "<backup error details>"
}
```

**Test Case:**
```yaml
name: "Trigger manual backup"
prerequisites:
  - Login aur token generate karein
request:
  method: POST
  url: "/admin/backup"
  headers:
    Authorization: "Bearer <token>"
expect:
  status: 200
  body:
    success: true
    data: "Manual database backup completed successfully"
```

---

## 2. Send Global Notification

```
POST /admin/notify/global
```

**Auth:** Required (Bearer token)

Platform ke saare schools ko ek notification banner broadcast karta hai. Yeh ek global message hota hai jo har ek school ke dashboard par visible hota hai.

**Request Body:**
```json
{
  "title": "Platform Update",
  "message": "New features are coming on July 1st! Check the changelog for details.",
  "type": "info"
}
```

| Field | Type | Required | Default | Allowed Values |
|-------|------|----------|---------|----------------|
| `title` | string | No | `"Global Message"` | Koi bhi string |
| `message` | string | No | `""` | Koi bhi string |
| `type` | string | No | `"info"` | `info`, `warning`, `error` |

**Expected Response (200):**
```json
{
  "success": true,
  "data": "Global update sent"
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
name: "Send global notification"
prerequisites:
  - Login aur token generate karein
request:
  method: POST
  url: "/admin/notify/global"
  headers:
    Authorization: "Bearer <token>"
  body:
    title: "Platform Update"
    message: "New features coming soon!"
    type: "info"
expect:
  status: 200
  body:
    success: true
    data: "Global update sent"
```

```yaml
name: "Send global notification with defaults"
prerequisites:
  - Login aur token generate karein
request:
  method: POST
  url: "/admin/notify/global"
  headers:
    Authorization: "Bearer <token>"
  body: {}
expect:
  status: 200
  body:
    success: true
    data: "Global update sent"
```

---

## 3. Clear Global Notification

```
DELETE /admin/notify/global
```

**Auth:** Required (Bearer token)

Current global notification banner ko clear/dismiss karta hai. Iske baad, schools ko yeh global message dikhna band ho jayega.

**Headers:**
| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <base64-token>` |

**Expected Response (200):**
```json
{
  "success": true,
  "data": "Global notifications cleared"
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
name: "Clear global notification"
prerequisites:
  - Login aur token generate karein
  - Ek global notification active hai
request:
  method: DELETE
  url: "/admin/notify/global"
  headers:
    Authorization: "Bearer <token>"
expect:
  status: 200
  body:
    success: true
    data: "Global notifications cleared"
```

```yaml
name: "Clear global notification when none active"
prerequisites:
  - Login aur token generate karein
request:
  method: DELETE
  url: "/admin/notify/global"
  headers:
    Authorization: "Bearer <token>"
expect:
  status: 200
  body:
    success: true
```