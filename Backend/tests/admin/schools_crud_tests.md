# Admin API — Super Admin Tests

Requires super admin token (`$SA_TOKEN`):

```bash
export SA_TOKEN=$(curl -s -X POST http://localhost:8080/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin@123"}' | jq -r '.token')
```

## Test: List All Schools

- **Endpoint**: `GET /api/admin/schools`
- **Expected**: 200

```bash
curl -s http://localhost:8080/api/admin/schools \
  -H "Authorization: Bearer $SA_TOKEN" | jq .
```

---

## Test: List Schools (filtered by status)

- **Endpoint**: `GET /api/admin/schools`
- **Query**: `?filters=[{"field":"status","op":"eq","value":"active"}]`
- **Expected**: 200

```bash
FILTERS='[{"field":"status","op":"eq","value":"active"}]'
curl -s -G "http://localhost:8080/api/admin/schools" \
  --data-urlencode "filters=$FILTERS" \
  -H "Authorization: Bearer $SA_TOKEN" | jq .
```

---

## Test: Get School Detail

- **Endpoint**: `GET /api/admin/schools/689225`
- **Expected**: 200

```bash
curl -s http://localhost:8080/api/admin/schools/689225 \
  -H "Authorization: Bearer $SA_TOKEN" | jq .
```

---

## Test: Update School Status

- **Endpoint**: `PATCH /api/admin/schools/689225`
- **Body**: `{ "status": "suspended" }`
- **Expected**: 200

```bash
curl -s -X PATCH http://localhost:8080/api/admin/schools/689225 \
  -H "Authorization: Bearer $SA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"suspended"}' | jq .
```

---

## Test: Change School Password

- **Endpoint**: `POST /api/admin/schools/689225/change-password`
- **Expected**: 200

```bash
curl -s -X POST http://localhost:8080/api/admin/schools/689225/change-password \
  -H "Authorization: Bearer $SA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"new_password":"newSecurePass789"}' | jq .
```

---

## Test: Set Session Duration

- **Endpoint**: `POST /api/admin/schools/689225/session-duration`
- **Body**: `{ "duration_hours": 8 }`
- **Expected**: 200

```bash
curl -s -X POST http://localhost:8080/api/admin/schools/689225/session-duration \
  -H "Authorization: Bearer $SA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"duration_hours":8}' | jq .
```

---

## Test: Expire All Sessions

- **Endpoint**: `POST /api/admin/schools/689225/expire-sessions`
- **Expected**: 200

```bash
curl -s -X POST http://localhost:8080/api/admin/schools/689225/expire-sessions \
  -H "Authorization: Bearer $SA_TOKEN" | jq .
```

---

## Test: Non-Admin Access Rejected

- **Endpoint**: `GET /api/admin/schools`
- **Headers**: Regular school token
- **Expected**: 403

```bash
curl -s http://localhost:8080/api/admin/schools \
  -H "Authorization: Bearer $TOKEN" | jq .
```
