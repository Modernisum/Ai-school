# Conditional Leave Approval API

Covers conditional approval, response, and template routes.

## POST conditional approve leave

- **Endpoint:** `POST /api/school/:schoolId/attendance/leave/:leaveId/conditional/approve`
- **Handler:** `leave::apply_conditional_approval`
- **Request body:**
```json
{
  "approvalConditions": "Subject to submission of medical certificate within 48 hours.",
  "requiredDocuments": ["medical_certificate"],
  "deadline": "2026-06-14T23:59:59Z"
}
```
- **Success response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "conditionalId": "CA1781990000000",
    "leaveId": "LV_8821",
    "conditions": {
      "approvalConditions": "Subject to submission of medical certificate within 48 hours."
    },
    "status": "pending_response"
  }
}
```
- **Workflow rules:** Updates leave status to `conditionally_approved` and creates a conditional approval record.

### TC_ATTENDANCE_CONDITIONAL_001 Conditional approve success

```bash
curl -s -X POST "$BASE_URL/api/school/SCH-00021/attendance/leave/LV_8821/conditional/approve" \
  -H "$AUTH_HEADER" -H "Content-Type: application/json" \
  -d '{"approvalConditions":"Submit medical certificate within 48 hours"}' \
  | jq -e '.success == true and .data.conditionalId != null and .data.status == "pending_response"'
```

## POST respond to conditions

- **Endpoint:** `POST /api/school/:schoolId/attendance/leave/:leaveId/conditional/respond`
- **Handler:** `leave::respond_to_conditions`
- **Request body:**
```json
{
  "accepted": true,
  "responseText": "Medical certificate uploaded.",
  "attachments": ["medical_certificate.pdf"]
}
```
- **Success response:** `200 OK`
```json
{ "success": true }
```
- **Workflow rules:** `accepted:true` sets leave status to `approved`; `accepted:false` sets it to `rejected`.

### TC_ATTENDANCE_CONDITIONAL_002 Conditional response success

```bash
curl -s -X POST "$BASE_URL/api/school/SCH-00021/attendance/leave/LV_8821/conditional/respond" \
  -H "$AUTH_HEADER" -H "Content-Type: application/json" \
  -d '{"accepted":true,"responseText":"Medical certificate uploaded."}' \
  | jq -e '.success == true'
```

## GET conditional templates

- **Endpoint:** `GET /api/school/:schoolId/attendance/leave/conditional/templates`
- **Handler:** `leave::get_conditional_templates`
- **Success response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "template1",
      "name": "Standard Conditions",
      "description": "Default conditions for leave approval",
      "conditions": [
        { "type": "coverage_required", "value": "Find replacement for classes" },
        { "type": "documentation_required", "value": "Submit medical certificate" }
      ]
    }
  ]
}
```

### TC_ATTENDANCE_CONDITIONAL_003 List conditional templates success

```bash
curl -s -X GET "$BASE_URL/api/school/SCH-00021/attendance/leave/conditional/templates" \
  -H "$AUTH_HEADER" | jq -e '.success == true and (.data | type == "array")'
```

## POST create conditional template

- **Endpoint:** `POST /api/school/:schoolId/attendance/leave/conditional/templates`
- **Handler:** `leave::create_conditional_template`
- **Request body:**
```json
{
  "name": "Medical Certificate Required",
  "description": "Requires medical certificate for sick leave over 2 days.",
  "conditions": [
    { "type": "documentation_required", "value": "Submit medical certificate" }
  ]
}
```
- **Success response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "TEMP1781990000000",
    "name": "Medical Certificate Required",
    "schoolId": "SCH-00021",
    "conditions": []
  }
}
```

### TC_ATTENDANCE_CONDITIONAL_004 Create conditional template success

```bash
curl -s -X POST "$BASE_URL/api/school/SCH-00021/attendance/leave/conditional/templates" \
  -H "$AUTH_HEADER" -H "Content-Type: application/json" \
  -d '{"name":"Medical Certificate Required","description":"Requires medical certificate.","conditions":[]}' \
  | jq -e '.success == true and .data.id != null and .data.schoolId == "SCH-00021"'
```
