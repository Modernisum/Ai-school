# Awards API

Base path: `/school/:schoolId/resources/awards`

---

## 1. List Awards

```
GET /school/:schoolId/resources/awards
```

**Auth:** Not required

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `schoolId` | string | School identifier |

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `student_id` | string | No | Filter awards by student ID |

**Expected Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "studentId": "student-456",
      "title": "Best Science Project",
      "description": "Awarded for outstanding project on renewable energy",
      "date": "2026-06-15",
      "eventId": 1
    }
  ]
}
```

**Test Cases:**
```yaml
name: "List all awards"
request:
  method: GET
  url: "/school/school-123/resources/awards"
expect:
  status: 200
  body:
    success: true
    data: array

name: "List awards filtered by student_id"
request:
  method: GET
  url: "/school/school-123/resources/awards?student_id=student-456"
expect:
  status: 200
  body:
    success: true
    data: array
```

---

## 2. Create Award (Internal)

```
POST /school/:schoolId/resources/awards
```

**Auth:** Required (`TenantContext`)

**Status:** `#[allow(dead_code)]` — implemented but **not currently routed** in the public API. Available for internal/service-level use.

**Request Body:**
```json
{
  "studentId": "student-456",
  "title": "Best Science Project",
  "description": "Awarded for outstanding project on renewable energy",
  "date": "2026-06-15",
  "eventId": 1
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "studentId": "student-456",
    "title": "Best Science Project"
  }
}
```

**Test Case:**
```yaml
name: "Create award (internal)"
note: "This endpoint is not currently routed in the public API"
request:
  method: POST
  url: "/school/school-123/resources/awards"
  body:
    studentId: "student-456"
    title: "Best Science Project"
    description: "Outstanding renewable energy project"
    date: "2026-06-15"
    eventId: 1
expect:
  status: 200
  body:
    success: true
    data.title: "Best Science Project"
```