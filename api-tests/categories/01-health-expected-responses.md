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

**Purpose:** Checks if the app is fully initialized and ready to handle user requests (Database connected, cache loaded).

**Expected Response:**
- **Status Code:** 200 OK if ready, 503 Service Unavailable if not ready
- **Content-Type:** application/json
- **Response Body Structure:**
```json
{
  "status": "ready"
}
```
**Error Response Body (503):**
```json
{
  "status": "not_ready",
  "database": "disconnected",
  "redis": "ok"
}
```

**When it is used:**
- **Deployment Rollouts:** Kubernetes uses this during a "Rolling Update". If the new version of your app says it's not ready, K8s won't send traffic to it yet, preventing users from seeing errors while the app is still starting up.
- **Dependency Failure:** If the Database goes down, this should return 503 so that the Load Balancer stops sending traffic to this specific instance.

## 4. GET /health/alive - Liveness Check

**Purpose:** Checks if the application process is running (not crashed or deadlocked).

**Expected Response:**
- **Status Code:** 200 OK
- **Content-Type:** text/plain
- **Response Body:** `"alive"` or similar

**When it is used:**
- **Auto-Healing:** Container orchestrators (Kubernetes/Docker) call this every few seconds. If the app stops responding (e.g., due to a memory leak or deadlock), the orchestrator will automatically **Kill and Restart** the container.
- **Process Monitoring:** Used as a heartbeat to ensure the web server hasn't "hanged".

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