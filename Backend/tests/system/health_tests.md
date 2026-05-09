# System API — Health & Configuration Tests

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

## Test: Health Check (Docker)

- **Endpoint**: `GET /health`
- **Expected**: 200 (curl via HEALTHCHECK)

```bash
docker exec $(docker ps -q -f name=backend) curl -f http://localhost:8080/health || echo "UNHEALTHY"
```

---

## Test: Get System Config

- **Endpoint**: `GET /api/system/689225/config`
- **Expected**: 200

```bash
curl -s http://localhost:8080/api/system/689225/config \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" | jq .
```

---

## Test: Update System Config

- **Endpoint**: `PUT /api/system/689225/config`
- **Expected**: 200

```bash
curl -s -X PUT http://localhost:8080/api/system/689225/config \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" \
  -H "Content-Type: application/json" \
  -d '{"config_key":"MAX_STUDENTS_PER_CLASS","config_value":"60"}' | jq .
```

---

## Test: Get API Keys

- **Endpoint**: `GET /api/system/689225/api-keys`
- **Expected**: 200

```bash
curl -s http://localhost:8080/api/system/689225/api-keys \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" | jq .
```

---

## Test: Create API Key

- **Endpoint**: `POST /api/system/689225/api-keys`
- **Expected**: 201

```bash
curl -s -X POST http://localhost:8080/api/system/689225/api-keys \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" \
  -H "Content-Type: application/json" \
  -d '{"name":"Integration Key","scopes":["read:students","read:fees"]}' | jq .
```

---

## Test: Revoke API Key

- **Endpoint**: `DELETE /api/system/689225/api-keys/KEY_ID`
- **Expected**: 200

```bash
curl -s -X DELETE http://localhost:8080/api/system/689225/api-keys/KEY_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" | jq .
```
