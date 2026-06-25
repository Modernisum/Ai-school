# System Domain Guide

## Overview

The **System** domain provides infrastructure-level APIs: geo data, recovery/audit, API key management, developer access control, and generic CRUD operations. All endpoints are nested under the school-level prefix:

```
/school/:schoolId/system
```

## Sub-Domains

| Sub-Domain | File | Endpoint Count |
|------------|------|----------------|
| [Geo](./api/01-geo.md) | `geo.rs` | 5 |
| [Recovery & Audit](./api/02-recovery.md) | `recovery.rs` | 4 |
| [API Keys](./api/03-api-keys.md) | `api_keys.rs` | 3 |
| [Developer Access](./api/04-developer-access.md) | `developer_access.rs` | 10 |
| [Generic CRUD](./api/05-generic-crud.md) | `generic_handlers.rs` | 5 |

## Legacy Routes

Some geo endpoints are also available at root level (without `/school/:schoolId` prefix):

```
GET  /geo/countries
GET  /geo/states/:country_id
GET  /geo/districts/:state_id
GET  /geo/export
POST /geo/import          (requires RLS middleware)
```

## Common Patterns

### Response Format

All endpoints return a standard JSON envelope:

```json
{
  "success": true|false,
  "data": { ... },
  "message": "optional error message"
}
```

### Auth

- **Geo endpoints:** No auth required (legacy geo import uses RLS middleware)
- **Recovery endpoints:** No `TenantContext` required (read/undo operations)
- **API Keys:** No `TenantContext` required
- **Developer Access:** No `TenantContext` required
- **Generic CRUD:** No `TenantContext` required

### Error Handling

- `200 OK` — Success
- `201 CREATED` — Resource created
- `400 BAD_REQUEST` — Validation error / unauthorized table / duplicate
- `404 NOT_FOUND` — Resource not found
- `500 INTERNAL_SERVER_ERROR` — Server error
- `501 NOT_IMPLEMENTED` — Placeholder endpoint