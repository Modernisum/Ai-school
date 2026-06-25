# API Keys API

Manages API key generation, listing, and revocation for school-level API access.

**Base path:** `/school/:schoolId/system/api-keys`

---

## Security Model

- API keys are prefixed with `vk_` (vidhyam key)
- Format: `vk_<12-char-id>_<32-char-secret>`
- The full key is hashed with SHA-256 before storage
- The plaintext key is returned **only once** at creation time

---

## 1. Generate API Key

```
POST /school/:schoolId/system/api-keys
```

**Auth:** Not required

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `schoolId` | string | School identifier |

**Request Body:**
```json
{
  "name": "Mobile App Integration",
  "scopes": ["read:students", "read:academic"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Human-readable key name |
| `scopes` | array of strings | Yes | List of permission scopes (e.g., `read:students`, `read:academic`) |

**Expected Response (200):**
```json
{
  "success": true,
  "key_id": "aB3xK9mPqR7s",
  "api_key": "vk_aB3xK9mPqR7s_w2E5tY8uI1oP4aS7dF0gH3jK6L9zX2cV5bN",
  "message": "Store this key safely! It will not be shown again."
}
```

| Field | Type | Description |
|-------|------|-------------|
| `key_id` | string | 12-character alphanumeric ID |
| `api_key` | string | Full plaintext key (`vk_<id>_<secret>`) — shown only once |
| `message` | string | Warning to store the key safely |

**Note:** The `api_key` field is the plaintext key. It is NEVER stored in the database — only the SHA-256 hash is persisted.

**Error Response (500):**
```json
{
  "success": false,
  "message": "Error description"
}
```

**Test Cases:**
```yaml
name: "Generate API key"
request:
  method: POST
  url: "/school/school-123/system/api-keys"
  body:
    name: "Mobile App"
    scopes:
      - "read:students"
      - "read:academic"
expect:
  status: 200
  body:
    success: true
    key_id: string
    api_key: string
    message: "Store this key safely! It will not be shown again."

name: "Generate API key - verify key format"
request:
  method: POST
  url: "/school/school-123/system/api-keys"
  body:
    name: "Test Key"
    scopes: ["read:students"]
expect:
  status: 200
  body:
    api_key: /^vk_[a-zA-Z0-9]{12}_[a-zA-Z0-9]{32}$/
```

---

## 2. List API Keys

```
GET /school/:schoolId/system/api-keys
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
  "api_keys": [
    {
      "key_id": "aB3xK9mPqR7s",
      "name": "Mobile App Integration",
      "scopes": ["read:students", "read:academic"],
      "created_at": "2026-06-21T10:00:00Z",
      "is_active": true
    },
    {
      "key_id": "xY8zW4vU1tR6",
      "name": "Web Dashboard",
      "scopes": ["*"],
      "created_at": "2026-06-20T08:00:00Z",
      "is_active": false
    }
  ]
}
```

**Note:** The plaintext key is NEVER returned in list responses. Only metadata (key_id, name, scopes, status) is shown.

**Error Response (500):**
```json
{
  "success": false,
  "message": "Error description"
}
```

**Test Cases:**
```yaml
name: "List API keys"
prerequisites:
  - Generate at least 1 API key
request:
  method: GET
  url: "/school/school-123/system/api-keys"
expect:
  status: 200
  body:
    success: true
    api_keys: array

name: "List API keys - verify no plaintext keys"
prerequisites:
  - Generate at least 1 API key
request:
  method: GET
  url: "/school/school-123/system/api-keys"
expect:
  status: 200
  body:
    api_keys[0].key_id: string
    # Assert: api_key field is NOT present
```

---

## 3. Revoke API Key

```
DELETE /school/:schoolId/system/api-keys/:keyId
```

**Auth:** Not required

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `schoolId` | string | School identifier |
| `keyId` | string | The 12-character key ID to revoke |

**Expected Response (200):**
```json
{
  "success": true,
  "message": "API key revoked"
}
```

**Note:** Revocation marks the key as inactive. It does NOT delete the record. Revoked keys cannot be used for authentication but remain in the listing for audit purposes.

**Error Response (500):**
```json
{
  "success": false,
  "message": "Error description"
}
```

**Test Cases:**
```yaml
name: "Revoke API key"
prerequisites:
  - Generate an API key, note its key_id
request:
  method: DELETE
  url: "/school/school-123/system/api-keys/aB3xK9mPqR7s"
expect:
  status: 200
  body:
    success: true
    message: "API key revoked"

name: "Revoke non-existent API key"
request:
  method: DELETE
  url: "/school/school-123/system/api-keys/NonExistent"
expect:
  status: 500
  body:
    success: false
```