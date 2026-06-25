# Geo API

Provides hierarchical geographic data (countries → states → districts) with import/export capabilities.

**Base path:** `/school/:schoolId/system/geo`
**Legacy path:** `/geo` (without school prefix)

---

## 1. Get Countries

```
GET /school/:schoolId/system/geo/countries
GET /geo/countries
```

**Auth:** Not required

**Expected Response (200):**
```json
[
  {
    "id": 1,
    "name": "India",
    "code": "IN",
    "phone_code": "91"
  },
  {
    "id": 2,
    "name": "United States",
    "code": "US",
    "phone_code": "1"
  }
]
```

**Response Type:** `Json<Vec<Country>>`

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Country ID |
| `name` | string | Country name |
| `code` | string | ISO country code |
| `phone_code` | string | International dialing code |

**Error Handling:** Returns empty array `[]` on DB error.

**Test Case:**
```yaml
name: "Get all countries"
request:
  method: GET
  url: "/school/school-123/system/geo/countries"
expect:
  status: 200
  body: array
  body[0].id: number
  body[0].name: string
  body[0].code: string
  body[0].phone_code: string
```

---

## 2. Get States

```
GET /school/:schoolId/system/geo/states/:countryId
GET /geo/states/:country_id
```

**Auth:** Not required

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `schoolId` | string | School identifier |
| `countryId` | integer | Country ID |

**Expected Response (200):**
```json
[
  {
    "id": 1,
    "country_id": 1,
    "name": "Maharashtra"
  },
  {
    "id": 2,
    "country_id": 1,
    "name": "Karnataka"
  }
]
```

**Response Type:** `Json<Vec<StateModel>>`

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | State ID |
| `country_id` | integer | Parent country ID |
| `name` | string | State name |

**Error Handling:** Returns empty array `[]` on DB error.

**Test Cases:**
```yaml
name: "Get states for country"
request:
  method: GET
  url: "/school/school-123/system/geo/states/1"
expect:
  status: 200
  body: array
  body[0].id: number
  body[0].name: string
  body[0].country_id: 1

name: "Get states for non-existent country"
request:
  method: GET
  url: "/school/school-123/system/geo/states/99999"
expect:
  status: 200
  body: []
```

---

## 3. Get Districts

```
GET /school/:schoolId/system/geo/districts/:stateId
GET /geo/districts/:state_id
```

**Auth:** Not required

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `schoolId` | string | School identifier |
| `stateId` | integer | State ID |

**Expected Response (200):**
```json
[
  {
    "id": 1,
    "state_id": 1,
    "name": "Mumbai"
  },
  {
    "id": 2,
    "state_id": 1,
    "name": "Pune"
  }
]
```

**Response Type:** `Json<Vec<District>>`

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | District ID |
| `state_id` | integer | Parent state ID |
| `name` | string | District name |

**Error Handling:** Returns empty array `[]` on DB error.

**Test Cases:**
```yaml
name: "Get districts for state"
request:
  method: GET
  url: "/school/school-123/system/geo/districts/1"
expect:
  status: 200
  body: array
  body[0].id: number
  body[0].name: string
  body[0].state_id: 1

name: "Get districts for non-existent state"
request:
  method: GET
  url: "/school/school-123/system/geo/districts/99999"
expect:
  status: 200
  body: []
```

---

## 4. Export Geo Data

```
GET /school/:schoolId/system/geo/export
GET /geo/export
```

**Auth:** Not required

**Description:** Reads the local backup file `Backup/geo.json` and returns its contents as JSON.

**Expected Response (200) - File Exists:**
```json
{
  "countries": [
    {
      "id": 1,
      "name": "India",
      "code": "IN",
      "phone_code": "91",
      "states": [
        {
          "id": 1,
          "name": "Maharashtra",
          "districts": [
            { "id": 1, "name": "Mumbai" }
          ]
        }
      ]
    }
  ]
}
```

**Expected Response (200) - File Not Found or Invalid:**
```json
[]
```

**Note:** The content shape depends on what was previously imported. The endpoint reads from `Backup/geo.json` on the local filesystem.

**Test Cases:**
```yaml
name: "Export geo data"
request:
  method: GET
  url: "/school/school-123/system/geo/export"
expect:
  status: 200

name: "Export geo data when no file exists"
note: "Returns empty array if Backup/geo.json is missing"
request:
  method: GET
  url: "/school/school-123/system/geo/export"
expect:
  status: 200
  body: []
```

---

## 5. Import Geo Data

```
POST /school/:schoolId/system/geo/import
POST /geo/import                    (requires RLS middleware)
```

**Auth:**
- School-scoped: No additional auth
- Legacy: Requires `rls_middleware`

**Description:** Saves the provided JSON payload to `Backup/geo.json`, then triggers `auto_restore` to load data into the database.

**Request Body (any JSON structure):**
```json
{
  "countries": [
    {
      "name": "India",
      "code": "IN",
      "phone_code": "91",
      "states": [
        {
          "name": "Maharashtra",
          "districts": [
            { "name": "Mumbai" },
            { "name": "Pune" }
          ]
        }
      ]
    }
  ]
}
```

**Expected Response (200) - Success:**
```json
{
  "success": true,
  "message": "Geo data imported successfully"
}
```

**Expected Response (200) - Restore Failure:**
```json
{
  "success": false,
  "message": "Import error: <error details>"
}
```

**Note:** The `auto_restore` function is called after writing the file. If it fails, the error message is included in the response but the file is still written to disk.

**Test Cases:**
```yaml
name: "Import geo data"
request:
  method: POST
  url: "/school/school-123/system/geo/import"
  body:
    countries:
      - name: "India"
        code: "IN"
        phone_code: "91"
        states:
          - name: "Maharashtra"
            districts:
              - name: "Mumbai"
              - name: "Pune"
expect:
  status: 200
  body:
    success: true
    message: "Geo data imported successfully"

name: "Import empty geo data"
request:
  method: POST
  url: "/school/school-123/system/geo/import"
  body: {}
expect:
  status: 200
  body:
    success: boolean
```