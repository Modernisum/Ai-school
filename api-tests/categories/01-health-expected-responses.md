# Health Check APIs - Expected Responses

This document outlines the expected responses for each health check API endpoint.

## 1. GET /health - Basic Health Check

**Expected Response:**
- **Status Code:** 200 OK
- **Content-Type:** text/plain
- **Response Body:** `"OK"` or similar health status message
- **No authentication required**

**Validation Criteria:**
- Response status should be 200
- Response should contain a simple health status message

## 2. GET /health/detailed - Detailed Health Check

**Expected Response:**
- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Response Body Structure:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "storage": "available"
  },
  "version": "1.0.0",
  "uptime": "5d 3h 12m"
}
```

**Validation Criteria:**
- Status should be "healthy" or similar
- All services should show "connected" or "available"
- Should include timestamp and version information

## 3. GET /health/ready - Readiness Check

**Expected Response:**
- **Status Code:** 200 OK if ready, 503 Service Unavailable if not ready
- **Content-Type:** text/plain or application/json
- **Response Body:** `"ready"` or JSON with readiness status

**Validation Criteria:**
- Should return 200 when all dependencies are ready
- Should return 503 if any critical dependency is unavailable

## 4. GET /health/alive - Liveness Check

**Expected Response:**
- **Status Code:** 200 OK
- **Content-Type:** text/plain
- **Response Body:** `"alive"` or similar

**Validation Criteria:**
- Always returns 200 if the application process is running
- Used by Kubernetes/container orchestrators

## Common Error Responses

**503 Service Unavailable:**
- When database connection fails
- When external services are unreachable

**500 Internal Server Error:**
- When there's an unexpected application error

## Testing Notes

1. All health endpoints should be publicly accessible (no authentication)
2. Response times should be under 100ms for basic health checks
3. Detailed health check may take longer if checking multiple services
4. The `/health/ready` endpoint is critical for deployment rollouts
5. The `/health/alive` endpoint is used for process health monitoring

## Response Examples

**Successful Detailed Health Check:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "storage": "available",
    "ai_services": "available"
  },
  "version": "1.2.3",
  "uptime": "2d 5h 30m 15s"
}
```

**Not Ready Response:**
```json
{
  "status": "unhealthy",
  "timestamp": "2024-01-01T12:00:00Z",
  "services": {
    "database": "disconnected",
    "redis": "connected",
    "storage": "available"
  },
  "errors": ["Database connection failed"]
}