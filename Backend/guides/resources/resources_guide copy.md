# Resources Domain Guide

## Overview

The **Resources** domain manages school inventory, spaces, materials, events, awards, documents, and file storage. All endpoints are nested under the school-level prefix:

```
/school/:schoolId/resources
```

## Sub-Domains

| Sub-Domain | File | Endpoint Count |
|------------|------|----------------|
| [Spaces](./api/01-spaces.md) | `spaces.rs` | 17 |
| [Materials](./api/02-materials.md) | `materials.rs` | 11 |
| [Events](./api/03-events.md) | `events.rs` | 4 |
| [Awards](./api/04-awards.md) | `award.rs` | 2 |
| [Documents](./api/05-documents.md) | `document_upload.rs` + `documentbox.rs` | 2 |
| [Storage](./api/06-storage.md) | `storage.rs` | 4 |

## Common Patterns

### Authentication

All write endpoints require `TenantContext` injected via `Extension`. Read-only endpoints may skip it.

### Public API

The public API path (`/school/:schoolId/resources/public/*`) uses `api_key_auth` middleware and requires specific scopes (e.g., `read:students`).

### Event Publishing

Mutation endpoints publish `ResponsibilityEvent` events via WebSocket for real-time updates:
- `CategoryCreated`, `CategoryDeleted`
- `SpaceCreated`, `SpaceUpdated`, `SpaceDeleted`
- `MaterialCreated`, `MaterialUpdated`, `MaterialDeleted`

### Response Format

All responses follow the standard envelope:

```json
{
  "success": true|false,
  "data": { ... },
  "message": "optional error message"
}
```

### Error Handling

Endpoints return `AppResult<impl IntoResponse>` or `impl IntoResponse` directly. Common HTTP status codes:
- `200 OK` - Success
- `400 BAD_REQUEST` - Validation error
- `403 FORBIDDEN` - Permission denied / scope mismatch
- `404 NOT_FOUND` - Resource not found
- `500 INTERNAL_SERVER_ERROR` - Server error