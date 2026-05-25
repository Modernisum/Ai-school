# System API — Health & Configuration Tests

> Routes are CORRECTLY documented (both `/health` and `/api/school/{schoolId}/system/` paths).

---

## Actual Route Table

| # | Endpoint | Method | Handler |
|---|----------|--------|---------|
| 1 | `/health` | GET | `unified_health_check` |
| 2 | `/api/school/:schoolId/system/config` | GET/PUT | system config |
| 3 | `/api/school/:schoolId/system/api-keys` | POST/GET | API key management |
| 4 | `/api/school/:schoolId/system/api-keys/:keyId` | DELETE | `revoke_api_key` |

---

## Test: Health Check

- **Endpoint**: `GET /health`
- **Expected**: 200, healthy status

```bash
curl -s http://localhost:8080/health | jq .
```

```json
{
  "status": "healthy",
  "checks": {
    "database": true,
    "redis": true,
    "storage": true,
    "disk": true
  },
  "uptime_seconds": 3600
}
```

---

## Test: Get System Config

- **Endpoint**: `GET /api/school/689225/system/config`
- **Expected**: 200

```bash
curl -s http://localhost:8080/api/school/689225/system/config \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" | jq .
```

---

## Test: Update System Config

- **Endpoint**: `PUT /api/school/689225/system/config`
- **Expected**: 200

```bash
curl -s -X PUT http://localhost:8080/api/school/689225/system/config \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" \
  -H "Content-Type: application/json" \
  -d '{"config_key":"MAX_STUDENTS_PER_CLASS","config_value":"60"}' | jq .
```

---

## Test: Get API Keys

- **Endpoint**: `GET /api/school/689225/system/api-keys`
- **Expected**: 200

```bash
curl -s http://localhost:8080/api/school/689225/system/api-keys \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" | jq .
```

---

## Test: Create API Key

- **Endpoint**: `POST /api/school/689225/system/api-keys`
- **Expected**: 201

```bash
curl -s -X POST http://localhost:8080/api/school/689225/system/api-keys \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" \
  -H "Content-Type: application/json" \
  -d '{"name":"Integration Key","scopes":["read:students","read:fees"]}' | jq .
```

---

## Test: Revoke API Key

- **Endpoint**: `DELETE /api/school/689225/system/api-keys/{keyId}`
- **Expected**: 200

```bash
curl -s -X DELETE http://localhost:8080/api/school/689225/system/api-keys/KEY_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" | jq .
```

---

## ⚠️ Issues Found

| # | Issue | Severity |
|---|-------|----------|
| 1 | Health test was already correct ✅ | None |
| 2 | Config + API keys tests were already correct ✅ | None |
