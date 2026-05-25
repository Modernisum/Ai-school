# Leave API — Coverage & Conditional Approval Tests

> **⚠️ BUG FIX**: All routes moved from `/api/leave/{schoolId}` to `/api/school/{schoolId}/leave/` (correct nesting)

---

## Actual Route Table

| # | Endpoint | Method | Handler |
|---|----------|--------|---------|
| 1 | `/api/school/:schoolId/leave/:leaveId/conditional/approve` | POST | `apply_conditional_approval` |
| 2 | `/api/school/:schoolId/leave/:leaveId/conditional/respond` | POST | `respond_to_conditions` |
| 3 | `/api/school/:schoolId/leave/conditional/templates` | GET/POST | `get/create_conditional_template` |
| 4 | `/api/school/:schoolId/leave/:leaveId/coverage/assign` | POST | `assign_coverage` |
| 5 | `/api/school/:schoolId/leave/:leaveId/coverage/available` | GET | `get_available_coverages` |
| 6 | `/api/school/:schoolId/leave/coverage/:coverageId/accept` | POST | `accept_coverage` |
| 7 | `/api/school/:schoolId/leave/:leaveId/workload/assess` | POST | `assess_workload` |
| 8 | `/api/school/:schoolId/leave/notifications` | GET | `get_notifications` |
| 9 | `/api/school/:schoolId/leave/notifications/:notificationId/read` | POST | `mark_notification_read` |
| 10 | `/api/school/:schoolId/leave/feature-flags` | GET/POST | `get/update_feature_flags` |

---

## Test: Conditional Approval

- **Endpoint**: `POST /api/school/689225/leave/{leaveId}/conditional/approve`
- **Expected**: 200

```bash
curl -s -X POST http://localhost:8080/api/school/689225/leave/1/conditional/approve \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" \
  -H "Content-Type: application/json" \
  -d '{
    "conditions": {
      "find_replacement": true,
      "complete_pending_tasks": true,
      "handover_notes": true
    }
  }' | jq .
```

---

## Test: Get Notifications

- **Endpoint**: `GET /api/school/689225/leave/notifications?unread_only=true`
- **Expected**: 200

```bash
curl -s "http://localhost:8080/api/school/689225/leave/notifications?unread_only=true" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" | jq .
```

---

## Test: Mark Notification Read

- **Endpoint**: `POST /api/school/689225/leave/notifications/{notificationId}/read`
- **Expected**: 200

```bash
curl -s -X POST http://localhost:8080/api/school/689225/leave/notifications/1/read \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" | jq .
```

---

## ⚠️ Issues Found

| # | Issue | Severity |
|---|-------|----------|
| 1 | **Wrong URL prefix** — was `/api/leave/...`, correct is `/api/school/{schoolId}/leave/` | **Fixed** |
| 2 | **`POST /api/leave/689225/conflicts`** — this route doesn't exist in domain/leave.rs | **Removed** |
