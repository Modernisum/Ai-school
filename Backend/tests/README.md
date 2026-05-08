# Backend API Tests

Run the backend server locally before executing tests:

```bash
cd Backend
cargo run
```

## Authentication

All tests require a valid JWT token. Obtain one by logging in:

```bash
export TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/school/login \
  -H "Content-Type: application/json" \
  -d '{"schoolId":"DEMO","password":"admin@123"}' | jq -r '.token // .data.token')
```

## Universal Query Parameters

All list endpoints support:

| Param     | Format                                                     |
|-----------|------------------------------------------------------------|
| filters   | `[{"field":"status","op":"eq","value":"active"}]`          |
| sort      | `field:asc,field2:desc`                                    |
| page      | number (default 1)                                         |
| per_page  | number (default 25, max 100)                               |
| fields    | comma-separated field names (sparse fieldsets)             |
| search    | full-text search term                                      |
| from      | start date (YYYY-MM-DD)                                    |
| to        | end date (YYYY-MM-DD)                                      |

Supported filter ops: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `in`, `nin`, `like`, `between`

## Response Format

All endpoints return:

```json
{
  "success": true,
  "data": { ... },
  "pagination": { "page": 1, "per_page": 25, "total": 100, "total_pages": 4 },
  "message": "optional message"
}
```

## Test Data Setup

Before running domain tests, seed test data:

```bash
# Initialize test school with sample data
curl -X POST http://localhost:8080/api/admin/test/seed \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```
