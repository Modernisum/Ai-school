# Leave API — Approval Tests

> **⚠️ BUG FIX**: All routes moved from `/api/leave/{schoolId}` to `/api/school/{schoolId}/leave/` (correct nesting)

---

## Actual Route Table

| # | Endpoint | Method | Handler |
|---|----------|--------|---------|
| 1 | `/api/school/:schoolId/leave/:leaveId/approve` | POST | `approve_leave` |
| 2 | `/api/school/:schoolId/leave/:leaveId/reject` | POST | `reject_leave` |
| 3 | `/api/school/:schoolId/leave/queue` | GET | `get_leave_queue` |
| 4 | `/api/school/:schoolId/leave/:leaveId/extend` | POST | `extend_leave` |
| 5 | `/api/school/:schoolId/leave/:leaveId/reduce` | POST | `reduce_leave` |
| 6 | `/api/school/:schoolId/leave/:leaveId/pdf` | GET | `download_leave_pdf` |
| 7 | `/api/school/:schoolId/leave/details/:leaveId` | GET | `get_leave_details` |

---

## Test: Approve Leave

- **Endpoint**: `POST /api/school/689225/leave/{leaveId}/approve`
- **Expected**: 200

```bash
curl -s -X POST http://localhost:8080/api/school/689225/leave/1/approve \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" \
  -H "Content-Type: application/json" \
  -d '{"approved_by":"ADMIN001","remarks":"Approved"}' | jq .
```

---

## Test: Reject Leave

- **Endpoint**: `POST /api/school/689225/leave/{leaveId}/reject`
- **Expected**: 200

```bash
curl -s -X POST http://localhost:8080/api/school/689225/leave/1/reject \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" \
  -H "Content-Type: application/json" \
  -d '{"rejected_by":"ADMIN001","remarks":"Staff shortage"}' | jq .
```

---

## Test: Leave Queue

- **Endpoint**: `GET /api/school/689225/leave/queue`
- **Expected**: 200, pending queue sorted by priority

```bash
curl -s http://localhost:8080/api/school/689225/leave/queue \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" | jq .
```

---

## ⚠️ Issues Found

| # | Issue | Severity |
|---|-------|----------|
| 1 | **Wrong URL prefix** — was `/api/leave/...`, correct is `/api/school/{schoolId}/leave/` | **Fixed** |
| 2 | **`POST /api/leave/689225/LEAVE_ID/cancel`** — this route doesn't exist in domain/leave.rs | **Removed** |
| 3 | **`POST /api/leave/689225/queue`** — actual route is `GET /queue` (get_leave_queue), not POST | **Fixed** |
