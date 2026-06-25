# Config API

Base path: `/admin`

---

## 1. Get Config

```
GET /admin/config/:key
```

**Auth:** Required (Bearer token)

Key ke throw system configuration value ko retrieve karta hai.

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `key` | string | Configuration key (e.g., `site_name`, `max_schools`) |

**Headers:**
| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <base64-token>` |

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "key": "site_name",
    "value": "Modernisum Platform",
    "updatedAt": "2026-01-15T00:00:00Z"
  }
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

Key not found (500):
```json
{
  "success": false,
  "message": "config key not found"
}
```

**Test Case:**
```yaml
name: "Get config by key"
prerequisites:
  - Login aur token generate karein
  - Config key "site_name" exist karti hai
request:
  method: GET
  url: "/admin/config/site_name"
  headers:
    Authorization: "Bearer <token>"
expect:
  status: 200
  body:
    success: true
    data.key: "site_name"
```

```yaml
name: "Get config missing key"
prerequisites:
  - Login aur token generate karein
request:
  method: GET
  url: "/admin/config/nonexistent_key"
  headers:
    Authorization: "Bearer <token>"
expect:
  status: 500
  body:
    success: false
```

---

## 2. Update Config

```
POST /admin/config
```

**Auth:** Required (Bearer token)

System configuration key-value pair ko create ya update karta hai.

**Request Body:**
```json
{
  "key": "site_name",
  "value": "Modernisum 2.0"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `key` | string | Yes | Configuration key |
| `value` | string | Yes | Configuration value |

**Expected Response (200):**
```json
{
  "success": true,
  "data": "Config updated"
}
```

**Error Responses:**

Missing key (400):
```json
{
  "success": false,
  "message": "key is required"
}
```

Unauthorized (401):
```json
{
  "success": false,
  "message": "Missing admin token"
}
```

**Test Case:**
```yaml
name: "Update config"
prerequisites:
  - Login aur token generate karein
request:
  method: POST
  url: "/admin/config"
  headers:
    Authorization: "Bearer <token>"
  body:
    key: "site_name"
    value: "Modernisum 2.0"
expect:
  status: 200
  body:
    success: true
    data: "Config updated"
```

```yaml
name: "Update config missing key"
prerequisites:
  - Login aur token generate karein
request:
  method: POST
  url: "/admin/config"
  headers:
    Authorization: "Bearer <token>"
  body:
    key: ""
    value: "some value"
expect:
  status: 400
  body:
    success: false
    message: "key is required"
```