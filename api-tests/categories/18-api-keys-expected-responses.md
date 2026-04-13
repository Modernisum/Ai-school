# API Key Management APIs - Expected Responses

## Overview
API Key Management allows schools to generate, manage, and revoke API keys for programmatic access to the system. Keys use SHA-256 hashing for security and support scoped permissions.

## Authentication Requirements
- **Generate/List/Revoke APIs**: Require RLS authentication (X-School-ID, X-Admin-ID headers)
- **API Key Authentication**: Uses X-API-Key header for accessing protected endpoints

## 1. POST /api/school/:schoolId/api-keys - Generate API Key
Creates a new API key with specified scopes. The plaintext key is returned only once.

### Request Body
```json
{
  "name": "Test API Key",
  "scopes": ["students:read", "attendance:write"]
}
```

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "key_id": "AbC123def456",
  "api_key": "vk_AbC123def456_7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v",
  "message": "Store this key safely! It will not be shown again."
}
```

#### Response Fields
- `key_id`: Unique identifier for the key (12-character alphanumeric)
- `api_key`: Full API key in format `vk_{key_id}_{secret}` (44 characters total)
- `message`: Security warning about one-time display

### Error Responses
- **400 Bad Request**: Missing name or scopes
- **401 Unauthorized**: Invalid RLS headers
- **500 Internal Server Error**: Database failure

## 2. GET /api/school/:schoolId/api-keys - List API Keys
Retrieves all API keys for the school.

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "api_keys": [
    {
      "id": 1,
      "key_id": "AbC123def456",
      "name": "Test API Key",
      "scopes": ["students:read", "attendance:write"],
      "status": "active",
      "last_used_at": null,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### Response Fields
- `api_keys`: Array of key objects
  - `id`: Database ID
  - `key_id`: Unique key identifier
  - `name`: Human-readable name
  - `scopes`: Array of permission scopes
  - `status`: "active", "revoked", or "expired"
  - `last_used_at`: ISO timestamp of last usage (null if never used)
  - `created_at`: ISO timestamp of creation

### Error Responses
- **401 Unauthorized**: Invalid RLS headers
- **500 Internal Server Error**: Database failure

## 3. DELETE /api/school/:schoolId/api-keys/:keyId - Revoke API Key
Marks an API key as revoked (soft delete).

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "message": "API key revoked"
}
```

### Error Responses
- **401 Unauthorized**: Invalid RLS headers
- **404 Not Found**: Key not found
- **500 Internal Server Error**: Database failure

## 4. API Key Authentication Middleware
The `api_key_auth` middleware validates API keys and injects context.

### Successful Authentication
When a valid API key is provided in `X-API-Key` header:
- Returns HTTP 200 with requested endpoint response
- Injects `ApiKeyContext` into request extensions:
  ```rust
  ApiKeyContext {
    school_id: "school123",
    scopes: ["students:read", "attendance:write"]
  }
  ```
- Updates `last_used_at` timestamp asynchronously

### Failed Authentication (HTTP 401)
```json
{
  "success": false,
  "message": "Unauthorized"
}
```

## Scopes Reference
API keys support fine-grained permission scopes:

| Scope | Description | Access Level |
|-------|-------------|--------------|
| `students:read` | Read student data | Read-only |
| `students:write` | Create/update students | Write |
| `attendance:read` | Read attendance records | Read-only |
| `attendance:write` | Mark attendance | Write |
| `fees:read` | Read fee information | Read-only |
| `fees:write` | Process payments | Write |
| `employees:read` | Read employee data | Read-only |
| `employees:write` | Manage employees | Write |
| `*:read` | Read all resources | Read-only (wildcard) |
| `*:write` | Write all resources | Write (wildcard) |

## Key Format
API keys follow the format: `vk_{key_id}_{secret}`
- Prefix: `vk_` (Vidhyam Key)
- Key ID: 12-character alphanumeric (e.g., `AbC123def456`)
- Secret: 32-character alphanumeric (e.g., `7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v`)
- Total length: 44 characters

## Security Considerations
1. **One-time Display**: Plaintext key shown only at creation
2. **SHA-256 Hashing**: Keys stored as hashes, not plaintext
3. **Scoped Permissions**: Least privilege principle
4. **Revocation**: Immediate invalidation via status update
5. **Usage Tracking**: `last_used_at` timestamp for audit

## Test Data Dependencies
1. **School Context**: Requires valid school ID and admin ID
2. **Database**: `api_keys` table must exist with proper schema
3. **Middleware**: API key auth middleware must be registered on target routes

## Testing Notes
1. **Key Generation**: Test with various scope combinations
2. **Authentication**: Verify middleware works with valid/invalid keys
3. **Revocation**: Ensure revoked keys cannot authenticate
4. **Scope Enforcement**: Test that scopes restrict access appropriately
5. **Concurrent Usage**: Multiple keys should work independently

## Success Criteria
- [ ] API key generation returns valid key with correct format
- [ ] Generated key can authenticate to protected endpoints
- [ ] List endpoint shows all keys with correct metadata
- [ ] Revocation immediately prevents authentication
- [ ] Invalid keys return 401 Unauthorized
- [ ] Scopes are properly enforced on protected routes
- [ ] `last_used_at` updates after successful authentication
- [ ] Database operations handle errors gracefully