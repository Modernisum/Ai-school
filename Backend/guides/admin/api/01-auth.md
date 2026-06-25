# Auth API

Base path: `/admin`

---

## 1. Admin Login

```
POST /admin/login
```

**Auth:** Required nahi hai

Super admin ko authenticate karta hai aur ek bearer token return karta hai. Token base64-encoded `username:password` string hota hai.

**Request Body:**
```json
{
  "username": "admin",
  "password": "supersecret"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "accessToken": "YWRtaW46c3VwZXJzZWNyZXQ=",
  "message": "Super admin login successful"
}
```

**Error Responses:**

Invalid credentials (401):
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

Missing username (400):
```json
{
  "success": false,
  "message": "username required"
}
```

Missing password (400):
```json
{
  "success": false,
  "message": "password required"
}
```

**Test Case:**
```yaml
name: "Admin login success"
request:
  method: POST
  url: "/admin/login"
  body:
    username: "admin"
    password: "supersecret"
expect:
  status: 200
  body:
    success: true
    accessToken: string
```

```yaml
name: "Admin login missing username"
request:
  method: POST
  url: "/admin/login"
  body:
    password: "supersecret"
expect:
  status: 400
  body:
    success: false
    message: "username required"
```

```yaml
name: "Admin login wrong password"
request:
  method: POST
  url: "/admin/login"
  body:
    username: "admin"
    password: "wrongpassword"
expect:
  status: 401
  body:
    success: false
```

---

## 2. Get Admin Profile

```
GET /admin/profile
```

**Auth:** Required (Bearer token)

Currently authenticated super admin ka profile return karta hai. Username ko base64-decoded token se extract kiya jata hai.

**Headers:**
| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <base64-token>` |

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "username": "admin",
    "profileImageUrl": "https://example.com/avatar.png",
    "createdAt": "2025-01-01T00:00:00Z"
  }
}
```

**Error Responses:**

Missing/malformed token (401):
```json
{
  "success": false,
  "message": "Missing admin token"
}
```

Invalid token (401):
```json
{
  "success": false,
  "message": "Invalid admin credentials"
}
```

**Test Case:**
```yaml
name: "Get admin profile"
prerequisites:
  - Login aur token generate karein
request:
  method: GET
  url: "/admin/profile"
  headers:
    Authorization: "Bearer <token>"
expect:
  status: 200
  body:
    success: true
    data.username: "admin"
```

```yaml
name: "Get admin profile without token"
request:
  method: GET
  url: "/admin/profile"
expect:
  status: 401
  body:
    success: false
    message: "Missing admin token"
```

---

## 3. Update Admin Credentials

```
POST /admin/update-credentials
```

**Auth:** Required nahi hai (validation ke liye body me current credentials use karta hai)

Super admin ka username, password, aur optionally profile image URL update karta hai.

**Request Body:**
```json
{
  "currentUsername": "admin",
  "currentPassword": "supersecret",
  "newUsername": "newadmin",
  "newPassword": "newsecret123",
  "profileImageUrl": "https://example.com/new-avatar.png"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": "Super admin credentials updated successfully"
}
```

**Error Responses:**

Missing new credentials (400):
```json
{
  "success": false,
  "message": "newUsername and newPassword are required"
}
```

Current credentials wrong (400):
```json
{
  "success": false,
  "message": "Current credentials do not match"
}
```

**Test Case:**
```yaml
name: "Update admin credentials"
prerequisites:
  - Current admin credentials valid hain
request:
  method: POST
  url: "/admin/update-credentials"
  body:
    currentUsername: "admin"
    currentPassword: "supersecret"
    newUsername: "newadmin"
    newPassword: "newsecret123"
expect:
  status: 200
  body:
    success: true
    data: "Super admin credentials updated successfully"
```

```yaml
name: "Update admin credentials missing fields"
request:
  method: POST
  url: "/admin/update-credentials"
  body:
    currentUsername: "admin"
    currentPassword: "supersecret"
    newUsername: ""
    newPassword: ""
expect:
  status: 400
  body:
    success: false
    message: "newUsername and newPassword are required"
```