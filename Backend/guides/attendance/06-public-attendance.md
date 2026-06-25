# Public Attendance API

Covers the API-key protected public attendance read route.

## GET public attendance by date

- **Endpoint:** `GET /api/school/:schoolId/attendance/public/attendance/:date`
- **Handler:** `attendance::get_attendance_public`
- **Intended auth:** API key middleware with `X-API-Key` header and `read:attendance` scope.
- **Current-code note:** Global RLS middleware may also require a bearer token because this path is not listed in the public path allow-list. If manual curl fails with missing authorization, add this path to `middleware/rls.rs` public paths or send a valid bearer token in test env.

### Request headers

```http
X-API-Key: <active_api_key_with_read_attendance_scope>
Authorization: Bearer <token> # may be needed due current global middleware
```

### Success response

`200 OK`

```json
{
  "success": true,
  "date": "2026-06-20",
  "attendance": [
    {
      "user_id": "STD-00001",
      "status": "present",
      "in_time": "08:55:00"
    }
  ]
}
```

### Forbidden response

`403 FORBIDDEN`

```json
{
  "success": false,
  "message": "Missing required scope: read:attendance"
}
```

### Unauthorized response

`401 UNAUTHORIZED`

```json
{
  "success": false,
  "message": "Missing authorization token"
}
```

## TC_ATTENDANCE_PUBLIC_001 Public attendance success

```bash
curl -s -X GET "$BASE_URL/api/school/SCH-00021/attendance/public/attendance/2026-06-20" \
  -H "X-API-Key: $PUBLIC_ATTENDANCE_API_KEY" \
  -H "$AUTH_HEADER" \
  | jq -e '.success == true and .date == "2026-06-20" and (.attendance | type == "array")'
```

## TC_ATTENDANCE_PUBLIC_002 Public attendance missing scope

```bash
curl -s -X GET "$BASE_URL/api/school/SCH-00021/attendance/public/attendance/2026-06-20" \
  -H "X-API-Key: $API_KEY_WITHOUT_READ_ATTENDANCE" \
  -H "$AUTH_HEADER" \
  | jq -e '.success == false and (.message | contains("read:attendance"))'
```
