# Leave Applications API

Covers leave create/list/approve/reject/extend/reduce/PDF routes.

## POST create leave

- **Endpoint:** `POST /api/school/:schoolId/attendance/leave/`
- **Handler:** `leave::create_leave`
- **Request body:**
```json
{
  "fromDate": "2026-06-12",
  "toDate": "2026-06-15",
  "role": "student",
  "leaveType": "sick",
  "reason": "Severe medical procedure recovery",
  "employeeId": "EMP-00001",
  "studentId": "STD-00001"
}
```
- **Success response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": 123,
    "leaveId": "LV_8821",
    "status": "pending",
    "fromDate": "2026-06-12",
    "toDate": "2026-06-15"
  }
}
```
- **Workflow rules:** Student leaves longer than 3 days are auto-escalated by adding `requiresAdminApproval: true` and `escalationReason`.

### TC_ATTENDANCE_LEAVE_001 Create leave success

```bash
curl -s -X POST "$BASE_URL/api/school/SCH-00021/attendance/leave/" \
  -H "$AUTH_HEADER" -H "Content-Type: application/json" \
  -d '{"fromDate":"2026-06-12","toDate":"2026-06-15","role":"employee","leaveType":"sick","reason":"Medical recovery"}' \
  | jq -e '.success == true and .data.status != null'
```

## GET list leaves

- **Endpoint:** `GET /api/school/:schoolId/attendance/leave/`
- **Handler:** `leave::list_leaves`
- **Success response:** `200 OK`
```json
{
  "success": true,
  "data": [
    { "id": 123, "status": "pending", "fromDate": "2026-06-12", "toDate": "2026-06-15" }
  ]
}
```

### TC_ATTENDANCE_LEAVE_002 List leaves success

```bash
curl -s -X GET "$BASE_URL/api/school/SCH-00021/attendance/leave/" \
  -H "$AUTH_HEADER" | jq -e '.success == true and (.data | type == "array")'
```

## POST approve leave

- **Endpoint:** `POST /api/school/:schoolId/attendance/leave/:leaveId/approve`
- **Handler:** `leave::approve_leave`
- **Success response:** `200 OK`
```json
{ "success": true, "message": "Leave approved" }
```

### TC_ATTENDANCE_LEAVE_003 Approve leave success

```bash
curl -s -X POST "$BASE_URL/api/school/SCH-00021/attendance/leave/LV_8821/approve" \
  -H "$AUTH_HEADER" | jq -e '.success == true and .message == "Leave approved"'
```

## POST reject leave

- **Endpoint:** `POST /api/school/:schoolId/attendance/leave/:leaveId/reject`
- **Handler:** `leave::reject_leave`
- **Success response:** `200 OK`
```json
{ "success": true, "message": "Leave rejected" }
```

### TC_ATTENDANCE_LEAVE_004 Reject leave success

```bash
curl -s -X POST "$BASE_URL/api/school/SCH-00021/attendance/leave/LV_8821/reject" \
  -H "$AUTH_HEADER" | jq -e '.success == true and .message == "Leave rejected"'
```

## POST extend leave

- **Endpoint:** `POST /api/school/:schoolId/attendance/leave/:leaveId/extend`
- **Handler:** `leave::extend_leave`
- **Request body:** `{ "days": 2 }`
- **Success response:** `200 OK`
```json
{ "success": true, "message": "Leave duration extended" }
```

### TC_ATTENDANCE_LEAVE_005 Extend leave success

```bash
curl -s -X POST "$BASE_URL/api/school/SCH-00021/attendance/leave/LV_8821/extend" \
  -H "$AUTH_HEADER" -H "Content-Type: application/json" \
  -d '{"days":2}' | jq -e '.success == true and .message == "Leave duration extended"'
```

## POST reduce leave

- **Endpoint:** `POST /api/school/:schoolId/attendance/leave/:leaveId/reduce`
- **Handler:** `leave::reduce_leave`
- **Request body:** `{ "days": 1 }`
- **Success response:** `200 OK`
```json
{ "success": true, "message": "Leave duration reduced" }
```

### TC_ATTENDANCE_LEAVE_006 Reduce leave success

```bash
curl -s -X POST "$BASE_URL/api/school/SCH-00021/attendance/leave/LV_8821/reduce" \
  -H "$AUTH_HEADER" -H "Content-Type: application/json" \
  -d '{"days":1}' | jq -e '.success == true and .message == "Leave duration reduced"'
```

## GET download leave PDF

- **Endpoint:** `GET /api/school/:schoolId/attendance/leave/:leaveId/pdf`
- **Handler:** `leave::download_leave_pdf`
- **Success response:** `200 OK`
```http
Content-Type: application/pdf
Content-Disposition: attachment; filename="Leave_Letter.pdf"
```
- **Workflow rules:** Handler searches leaves by `id` or `leaveId`, then generates a PDF letter with applicant, role, dates, status, and reason.

### TC_ATTENDANCE_LEAVE_007 Download leave PDF success

```bash
curl -s -D /tmp/leave-pdf.headers -o /tmp/leave-letter.pdf \
  -X GET "$BASE_URL/api/school/SCH-00021/attendance/leave/LV_8821/pdf" \
  -H "$AUTH_HEADER"
test "$(head -c 4 /tmp/leave-letter.pdf | od -An -t x1 | tr -d ' \n')" = "%PDF"
```
