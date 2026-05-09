# Leave API — Approval Tests

## Test: Approve Leave

- **Endpoint**: `POST /api/leave/689225/LEAVE_ID/approve`
- **Expected**: 200

```bash
curl -s -X POST http://localhost:8080/api/leave/689225/1/approve \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" \
  -H "Content-Type: application/json" \
  -d '{"approved_by":"ADMIN001","remarks":"Approved"}' | jq .
```

---

## Test: Reject Leave

- **Endpoint**: `POST /api/leave/689225/LEAVE_ID/reject`
- **Expected**: 200

```bash
curl -s -X POST http://localhost:8080/api/leave/689225/1/reject \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" \
  -H "Content-Type: application/json" \
  -d '{"rejected_by":"ADMIN001","remarks":"Staff shortage"}' | jq .
```

---

## Test: Cancel Leave (employee self-cancel)

- **Endpoint**: `POST /api/leave/689225/LEAVE_ID/cancel`
- **Expected**: 200

```bash
curl -s -X POST http://localhost:8080/api/leave/689225/1/cancel \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" | jq .
```

---

## Test: Leave Queue

- **Endpoint**: `POST /api/leave/689225/queue`
- **Expected**: 200, pending queue sorted by priority

```bash
curl -s -X POST http://localhost:8080/api/leave/689225/queue \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" \
  -H "Content-Type: application/json" \
  -d '{"sort_by":"created_at","order":"asc"}' | jq .
```
