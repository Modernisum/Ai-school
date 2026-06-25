# Workload Assessment API

Covers AI/workload impact assessment for leave records.

## POST assess workload

- **Endpoint:** `POST /api/school/:schoolId/attendance/leave/:leaveId/workload/assess`
- **Handler:** `leave::assess_workload`
- **Success response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "leaveId": "LV_8821",
    "employeeId": "EMP-00001",
    "workloadImpact": "medium",
    "impactScore": 60,
    "affectedResponsibilities": [
      {
        "responsibilityId": "RESP-10A-MATH-P2",
        "name": "Mathematics Period 2",
        "employeeType": "teacher",
        "sessionsAffected": 3,
        "coverageRequired": true,
        "matchingCoverageEmployees": []
      }
    ],
    "totalSessionsAffected": 3,
    "recommendations": [
      "Arrange coverage for affected responsibilities",
      "Notify covering employees via email"
    ],
    "riskLevel": "medium"
  }
}
```
- **Workflow rules:** Uses leave dates and employee responsibilities to estimate affected sessions. If no responsibilities exist, returns `workloadImpact: low`.

### TC_ATTENDANCE_WORKLOAD_001 Assess workload success

```bash
curl -s -X POST "$BASE_URL/api/school/SCH-00021/attendance/leave/LV_8821/workload/assess" \
  -H "$AUTH_HEADER" | jq -e '.success == true and .data.workloadImpact != null and .data.affectedResponsibilities != null'
```

## GET workload assessment

- **Endpoint:** `GET /api/school/:schoolId/attendance/leave/:leaveId/workload/assessment`
- **Handler:** `leave::get_workload_assessment`
- **Success response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "leaveId": "LV_8821",
    "workloadImpact": "medium",
    "impactScore": 60,
    "recommendations": []
  }
}
```
- **Workflow rules:** Tries stored assessment first; if not found, recalculates using `assess_workload`.

### TC_ATTENDANCE_WORKLOAD_002 Get workload assessment success

```bash
curl -s -X GET "$BASE_URL/api/school/SCH-00021/attendance/leave/LV_8821/workload/assessment" \
  -H "$AUTH_HEADER" | jq -e '.success == true and .data.leaveId == "LV_8821"'
```
