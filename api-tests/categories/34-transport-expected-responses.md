# Transport Management APIs - Expected Responses

## Authentication Requirements
- **RLS Required:** Yes
- **Headers Required:** `X-School-ID`, `X-Admin-ID`
- **Redis:** GPS updates published to Redis Pub/Sub for real-time tracking

## 1. POST /api/transport/:schoolId/gps/:vehicleId - Publish GPS Update

### Request
```json
{
  "lat": 28.6139,
  "lng": 77.2090,
  "speed": 45.5
}
```

### Success Response (200 OK)
```
"GPS Updated"
```

### Error Responses
#### 500 Internal Server Error (Redis Connection Failed)
- Implicit failure - returns 200 OK even if Redis fails (graceful degradation)

## Validation Criteria
1. **GPS Data:** Should accept latitude, longitude, and optional speed
2. **Redis Publishing:** Should publish to Redis channel `school:{schoolId}:transport:{vehicleId}`
3. **Timestamp:** Event includes current timestamp in seconds since Unix epoch
4. **Graceful Degradation:** Should return 200 OK even if Redis is unavailable

## Expected Redis Event Format
```json
{
  "vehicle_id": "VEH001",
  "lat": 28.6139,
  "lng": 77.2090,
  "speed": 45.5,
  "timestamp": 1744529400
}
```

## Testing Notes
- Requires Redis for Pub/Sub functionality
- Clients can subscribe to vehicle-specific channels for real-time updates
- Test with valid GPS coordinates (latitude: -90 to 90, longitude: -180 to 180)
- Test with missing speed field (should default to 0.0)
- Verify Redis message format matches expected structure
- Test concurrent updates for multiple vehicles