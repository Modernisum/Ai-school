# Transport API Contract

Covers `publish_gps`, `get_bus_location`, `get_driver_students`, `mark_pickup_attendance`.

---

## `POST /api/school/:schoolId/operations/transport/gps/:vehicleId`

- Handler: `rust/src/domain/operations/transport.rs::publish_gps`
- Purpose: Update vehicle GPS coordinates and publish to Redis for real-time tracking.
- Auth/Tenant: Scoped to `schoolId` and `vehicleId`. No strict tenant auth check in handler.
- Redis: Stores location with TTL 600s; publishes to `school:{schoolId}:transport:{vehicleId}` channel.

### Request

Path params:

- `schoolId`: school/tenant identifier.
- `vehicleId`: vehicle identifier (e.g., `VEH-992`).

Body:

```json
{
  "lat": 28.6139,
  "lng": 77.2090,
  "speed": 35.8
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `lat` | f64 | Yes | Latitude coordinate |
| `lng` | f64 | Yes | Longitude coordinate |
| `speed` | f64/null | No | Current speed in km/h |

### Expected success response

`200 OK`

```
GPS Updated
```

### Expected error response

Currently panics if `REDIS_URL` is not set:

```
thread panicked: REDIS_URL env var must be set
```

### Important rules

- `REDIS_URL` environment variable is required.
- Location is stored in Redis with key `school:{schoolId}:transport:{vehicleId}` and TTL of 600 seconds.
- Event is published to Redis Pub/Sub channel with the same key.
- `speed` defaults to `0.0` if not provided.
- Returns plain text `"GPS Updated"`, not JSON.

### Test cases

#### Publish GPS update

- Type: positive
- Preconditions: `REDIS_URL` is set and Redis is running.
- Request: `POST /api/school/SCH-001/operations/transport/gps/VEH-992`
- Body: `{ "lat": 28.6139, "lng": 77.2090, "speed": 35.8 }`
- Expected HTTP status: `200`
- Expected response: `"GPS Updated"`
- Redis/state assertion: Key `school:SCH-001:transport:VEH-992` exists with GPS data.

#### Publish GPS without speed

- Type: boundary
- Request body: `{ "lat": 28.6139, "lng": 77.2090 }`
- Expected HTTP status: `200`
- Expected response: `"GPS Updated"`
- Redis/state assertion: Stored event has `speed: 0.0`.

#### Publish GPS with missing lat/lng

- Type: negative
- Request body: `{ "speed": 35.8 }`
- Expected HTTP status: `422` or `400` (Axum deserialization error)
- Expected response: JSON error about missing required fields.

---

## `GET /api/school/:schoolId/operations/transport/bus-location/:vehicleId`

- Handler: `rust/src/domain/operations/transport.rs::get_bus_location`
- Purpose: Get the latest GPS location for a vehicle from Redis cache.
- Auth/Tenant: Scoped to `schoolId` and `vehicleId`.

### Request

Path params:

- `schoolId`: school/tenant identifier.
- `vehicleId`: vehicle identifier.

### Expected success response (data available)

`200 OK`

```json
{
  "success": true,
  "data": {
    "vehicle_id": "VEH-992",
    "lat": 28.6139,
    "lng": 77.2090,
    "speed": 35.8,
    "timestamp": 1718978400
  }
}
```

### Expected response (no data)

`404 NOT_FOUND`

```json
{
  "success": false,
  "message": "No GPS data available"
}
```

### Expected response (Redis not configured)

`503 SERVICE_UNAVAILABLE`

```json
{
  "success": false,
  "message": "Redis not configured"
}
```

### Important rules

- If `REDIS_URL` is empty or not set, returns `503` immediately.
- Reads from Redis key `school:{schoolId}:transport:{vehicleId}`.
- Data expires after 600 seconds from last publish.

### Test cases

#### Get active bus location

- Type: positive
- Preconditions: GPS data was recently published for `VEH-992`.
- Request: `GET /api/school/SCH-001/operations/transport/bus-location/VEH-992`
- Expected HTTP status: `200`
- Expected response: `success: true`, `data.lat` and `data.lng` are valid coordinates.

#### Get location for inactive vehicle

- Type: negative
- Preconditions: No GPS data published for `VEH-999` or data expired.
- Request: `GET /api/school/SCH-001/operations/transport/bus-location/VEH-999`
- Expected HTTP status: `404`
- Expected response: `{ success: false, message: "No GPS data available" }`

#### Redis not configured

- Type: negative
- Preconditions: `REDIS_URL` not set.
- Expected HTTP status: `503`
- Expected response: `{ success: false, message: "Redis not configured" }`

---

## `GET /api/school/:schoolId/operations/transport/driver-students`

- Handler: `rust/src/domain/operations/transport.rs::get_driver_students`
- Purpose: List students assigned to a driver's vehicle route.
- Auth/Tenant: Uses `TenantContext.admin_id` as the driver ID.

### Request

Path params:

- `schoolId`: school/tenant identifier.

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": [
    {
      "studentId": "STD-001",
      "name": "Jane Doe",
      "pickupStop": "East Crossing",
      "dropStop": "West Gate",
      "class": "CLS_10A"
    }
  ],
  "count": 1
}
```

### Expected error response

`500 INTERNAL_SERVER_ERROR`

```json
{
  "success": false,
  "message": "<error message>"
}
```

### Important rules

- Driver identity is derived from `TenantContext.admin_id`.
- Response includes `count` field with total students.

### Test cases

#### List driver students

- Type: positive
- Preconditions: Driver `DRV-001` authenticated and has students assigned.
- Request: `GET /api/school/SCH-001/operations/transport/driver-students`
- Expected HTTP status: `200`
- Expected response: `success: true`, `data` contains student list, `count` matches array length.

#### Driver with no students

- Type: positive
- Preconditions: Driver has no assigned students.
- Expected HTTP status: `200`
- Expected response: `{ success: true, data: [], count: 0 }`

---

## `POST /api/school/:schoolId/operations/transport/mark-pickup`

- Handler: `rust/src/domain/operations/transport.rs::mark_pickup_attendance`
- Purpose: Mark student pickup/drop-off attendance for transport.
- Auth/Tenant: Uses `TenantContext.admin_id` as the marker.
- Side effect: Creates attendance records via `attendance.mark_attendance`.

### Request

Path params:

- `schoolId`: school/tenant identifier.

Body:

```json
{
  "studentIds": ["STD-001", "STD-002"],
  "status": "picked_up",
  "vehicleId": "VEH-992"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `studentIds` | string[] | Yes | List of student IDs to mark |
| `status` | string | Yes | Pickup status (e.g., `picked_up`, `dropped_off`) |
| `vehicleId` | string | No | Vehicle identifier |

### Expected success response

`200 OK`

```json
{
  "success": true,
  "marked": 2,
  "total": 2
}
```

### Important rules

- Each student is marked individually via `attendance.mark_attendance`.
- `marked` is the count of successfully marked students.
- `total` is the total number of student IDs requested.
- Attendance date is set to today (UTC).
- Note in attendance record: `"Driver pickup — {status}"`.
- Individual failures are silently skipped — `marked` may be less than `total`.

### Test cases

#### Mark all students picked up

- Type: positive
- Request: `POST /api/school/SCH-001/operations/transport/mark-pickup`
- Body: `{ "studentIds": ["STD-001", "STD-002"], "status": "picked_up", "vehicleId": "VEH-992" }`
- Expected HTTP status: `200`
- Expected response: `{ success: true, marked: 2, total: 2 }`
- Database/state assertion: Attendance records created for both students with today's date.

#### Partial marking (some fail)

- Type: boundary
- Preconditions: `STD-001` attendance service fails.
- Request body: `{ "studentIds": ["STD-001", "STD-002"], "status": "picked_up" }`
- Expected HTTP status: `200`
- Expected response: `{ success: true, marked: 1, total: 2 }`

#### Mark drop-off

- Type: positive
- Request body: `{ "studentIds": ["STD-001"], "status": "dropped_off", "vehicleId": "VEH-992" }`
- Expected HTTP status: `200`
- Database/state assertion: Attendance status is `dropped_off`.