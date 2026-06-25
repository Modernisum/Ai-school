# Holidays API

Covers school holiday CRUD and holiday date checks.

## GET list school holidays

- **Endpoint:** `GET /api/school/:schoolId/attendance/holidays?month=8&year=2026`
- **Handler:** `attendance::list_school_holidays`
- **Query params:**
  - `month` integer, optional. If provided, returns that month.
  - `year` integer, optional. Defaults to current year.
- **Success response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "HOL-001",
      "date": "2026-08-15",
      "title": "Independence Day",
      "description": "National holiday",
      "classes": null,
      "fullRange": { "from": "2026-08-15", "to": "2026-08-15" }
    }
  ]
}
```
- **Workflow rules:** If `month` is absent, returns academic-year range Apr-Mar.

### TC_ATTENDANCE_HOLIDAY_001 List holidays success

```bash
curl -s -G "$BASE_URL/api/school/SCH-00021/attendance/holidays" \
  -H "$AUTH_HEADER" --data-urlencode 'month=8' --data-urlencode 'year=2026' \
  | jq -e '.success == true and (.data | type == "array")'
```

## POST create school holiday

- **Endpoint:** `POST /api/school/:schoolId/attendance/holidays`
- **Handler:** `attendance::create_school_holiday`
- **Request body:**
```json
{
  "fromDate": "2026-08-15",
  "toDate": "2026-08-15",
  "title": "Independence Day",
  "description": "National holiday",
  "classes": ["10-A"],
  "exemptEmployees": [],
  "exemptStudents": []
}
```
- **Success response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "00000000-0000-0000-0000-000000000001",
    "title": "Independence Day",
    "fromDate": "2026-08-15",
    "toDate": "2026-08-15"
  }
}
```
- **Error response:** `400 BAD_REQUEST` if `fromDate` missing.

### TC_ATTENDANCE_HOLIDAY_002 Create holiday success

```bash
curl -s -X POST "$BASE_URL/api/school/SCH-00021/attendance/holidays" \
  -H "$AUTH_HEADER" -H "Content-Type: application/json" \
  -d '{"fromDate":"2026-08-15","toDate":"2026-08-15","title":"Independence Day"}' \
  | jq -e '.success == true and .data.id != null'
```

## GET check school holiday

- **Endpoint:** `GET /api/school/:schoolId/attendance/holidays/check?date=2026-08-15`
- **Handler:** `attendance::check_school_holiday`
- **Query param:** `date` string, required
- **Success response when holiday exists:** `200 OK`
```json
{
  "success": true,
  "isHoliday": true,
  "holidayId": "HOL-001",
  "reason": "Independence Day"
}
```
- **Success response when not holiday:** `200 OK`
```json
{ "success": true, "isHoliday": false }
```

### TC_ATTENDANCE_HOLIDAY_003 Check holiday success

```bash
curl -s -G "$BASE_URL/api/school/SCH-00021/attendance/holidays/check" \
  -H "$AUTH_HEADER" --data-urlencode 'date=2026-08-15' \
  | jq -e '.success == true and (.isHoliday == true or .isHoliday == false)'
```

## GET holiday detail

- **Endpoint:** `GET /api/school/:schoolId/attendance/holidays/:holidayId`
- **Handler:** `attendance::get_holiday_detail`
- **Success response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "HOL-001",
    "title": "Independence Day",
    "fromDate": "2026-08-15",
    "toDate": "2026-08-15"
  }
}
```
- **Error response:** `404 NOT_FOUND` through `AppError`.

### TC_ATTENDANCE_HOLIDAY_004 Get holiday detail success

```bash
curl -s -X GET "$BASE_URL/api/school/SCH-00021/attendance/holidays/HOL-001" \
  -H "$AUTH_HEADER" | jq -e '.success == true and .data.id == "HOL-001"'
```

## DELETE school holiday

- **Endpoint:** `DELETE /api/school/:schoolId/attendance/holidays/:holidayId`
- **Handler:** `attendance::delete_school_holiday`
- **Success response:** `200 OK`
```json
{ "success": true }
```

### TC_ATTENDANCE_HOLIDAY_005 Delete holiday success

```bash
curl -s -X DELETE "$BASE_URL/api/school/SCH-00021/attendance/holidays/HOL-001" \
  -H "$AUTH_HEADER" | jq -e '.success == true'
```
