# Coverage and Proxy Assignment API

Covers coverage assignment, available coverages, and acceptance.

## POST assign coverage

- **Endpoint:** `POST /api/school/:schoolId/attendance/leave/:leaveId/coverage/assign`
- **Handler:** `leave::assign_coverage`
- **Request body:**
```json
{
  "originalEmployeeId": "EMP-00001",
  "coveringEmployeeId": "EMP-00302",
  "responsibilityId": "RESP-10A-MATH-P2",
  "coveragePeriodStart": "2026-06-12",
  "coveragePeriodEnd": "2026-06-15",
  "notes": "Cover period 2 for class 10-A"
}
```
- **Success response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "originalEmployeeId": "EMP-00001",
    "coveringEmployeeId": "EMP-00302",
    "responsibilityId": "RESP-10A-MATH-P2",
    "coveragePeriodStart": "2026-06-12",
    "coveragePeriodEnd": "2026-06-15",
    "notes": "Cover period 2 for class 10-A",
    "coverageId": "COV1781990000000",
    "status": "assigned",
    "createdAt": "2026-06-20T00:00:00Z"
  }
}
```
- **Required fields:** `originalEmployeeId`, `coveringEmployeeId`, `responsibilityId`, `coveragePeriodStart`, `coveragePeriodEnd`.
- **Error response:** `500 INTERNAL_SERVER_ERROR` with missing-field message if any required field is absent.

### TC_ATTENDANCE_COVERAGE_001 Assign coverage success

```bash
curl -s -X POST "$BASE_URL/api/school/SCH-00021/attendance/leave/LV_8821/coverage/assign" \
  -H "$AUTH_HEADER" -H "Content-Type: application/json" \
  -d '{
    "originalEmployeeId":"EMP-00001",
    "coveringEmployeeId":"EMP-00302",
    "responsibilityId":"RESP-10A-MATH-P2",
    "coveragePeriodStart":"2026-06-12",
    "coveragePeriodEnd":"2026-06-15",
    "notes":"Cover period 2"
  }' | jq -e '.success == true and .data.coverageId != null and .data.status == "assigned"'
```

## GET available coverages

- **Endpoint:** `GET /api/school/:schoolId/attendance/leave/:leaveId/coverage/available`
- **Handler:** `leave::get_available_coverages`
- **Success response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "coverageId": "COV1781990000000",
      "status": "assigned",
      "coveringEmployeeId": "EMP-00302",
      "responsibilityId": "RESP-10A-MATH-P2"
    }
  ]
}
```

### TC_ATTENDANCE_COVERAGE_002 List available coverages success

```bash
curl -s -X GET "$BASE_URL/api/school/SCH-00021/attendance/leave/LV_8821/coverage/available" \
  -H "$AUTH_HEADER" | jq -e '.success == true and (.data | type == "array")'
```

## POST accept coverage

- **Endpoint:** `POST /api/school/:schoolId/attendance/leave/coverage/:coverageId/accept`
- **Handler:** `leave::accept_coverage`
- **Path params:** `schoolId`, `coverageId`
- **Success response:** `200 OK`
```json
{ "success": true }
```
- **Workflow rules:** Marks coverage accepted for the employee inferred from auth/tenant context.

### TC_ATTENDANCE_COVERAGE_003 Accept coverage success

```bash
curl -s -X POST "$BASE_URL/api/school/SCH-00021/attendance/leave/coverage/COV1781990000000/accept" \
  -H "$AUTH_HEADER" | jq -e '.success == true'
```
