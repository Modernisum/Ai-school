# Events API

Base path: `/school/:schoolId/resources/events`

---

## 1. List Events

```
GET /school/:schoolId/resources/events
```

**Auth:** Not required

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `schoolId` | string | School identifier |

**Expected Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Science Fair 2026",
      "description": "Annual science exhibition",
      "startDate": "2026-08-15T09:00:00Z",
      "endDate": "2026-08-16T17:00:00Z",
      "location": "Main Hall",
      "createdAt": "2026-06-01T00:00:00Z"
    }
  ]
}
```

**Test Case:**
```yaml
name: "List events"
request:
  method: GET
  url: "/school/school-123/resources/events"
expect:
  status: 200
  body:
    success: true
    data: array
```

---

## 2. Create Event

```
POST /school/:schoolId/resources/events
```

**Auth:** Required (`TenantContext`)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `schoolId` | string | School identifier |

**Request Body:**
```json
{
  "title": "Science Fair 2026",
  "description": "Annual science exhibition",
  "startDate": "2026-08-15T09:00:00Z",
  "endDate": "2026-08-16T17:00:00Z",
  "location": "Main Hall"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Science Fair 2026",
    "description": "Annual science exhibition",
    "startDate": "2026-08-15T09:00:00Z",
    "endDate": "2026-08-16T17:00:00Z",
    "location": "Main Hall"
  }
}
```

**Test Case:**
```yaml
name: "Create event"
request:
  method: POST
  url: "/school/school-123/resources/events"
  body:
    title: "Science Fair 2026"
    description: "Annual science exhibition"
    startDate: "2026-08-15T09:00:00Z"
    endDate: "2026-08-16T17:00:00Z"
    location: "Main Hall"
expect:
  status: 200
  body:
    success: true
    data.title: "Science Fair 2026"
```

---

## 3. Update Event

```
PATCH /school/:schoolId/resources/events/:eventId
```

**Auth:** Required (`TenantContext`)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `schoolId` | string | School identifier |
| `eventId` | integer | Event ID to update |

**Request Body (any JSON fields to update):**
```json
{
  "title": "Updated Science Fair 2026",
  "location": "New Hall"
}
```

**Expected Response (200):**
```json
{
  "success": true
}
```

**Test Case:**
```yaml
name: "Update event"
prerequisites:
  - Create event with id 1
request:
  method: PATCH
  url: "/school/school-123/resources/events/1"
  body:
    title: "Updated Science Fair 2026"
expect:
  status: 200
  body:
    success: true
```

---

## 4. Delete Event

```
DELETE /school/:schoolId/resources/events/:eventId
```

**Auth:** Required (`TenantContext`)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `schoolId` | string | School identifier |
| `eventId` | integer | Event ID to delete |

**Expected Response (200):**
```json
{
  "success": true
}
```

**Test Case:**
```yaml
name: "Delete event"
prerequisites:
  - Create event with id 1
request:
  method: DELETE
  url: "/school/school-123/resources/events/1"
expect:
  status: 200
  body:
    success: true
```