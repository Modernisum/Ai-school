# Geo & Location Management APIs - Expected Responses

## Authentication Requirements
- **Authentication:** None (public endpoints)
- **Headers:** Only Content-Type: application/json required
- **Rate Limiting:** Standard rate limits apply

## 1. GET /api/geo/countries - Get All Countries

### Expected Successful Response (HTTP 200)
```json
[
  {
    "id": 101,
    "name": "India",
    "code": "IN",
    "phone_code": "+91"
  },
  {
    "id": 102,
    "name": "United States",
    "code": "US",
    "phone_code": "+1"
  },
  {
    "id": 103,
    "name": "United Kingdom",
    "code": "GB",
    "phone_code": "+44"
  }
]
```

### Response Structure
- **Array of Country Objects:** Returns all countries in the database
- **id:** Integer primary key
- **name:** Country name (string)
- **code:** ISO country code (string, 2 characters)
- **phone_code:** International dialing code (string)

### Error Responses
- **500 Internal Server Error:** Database connection issues
- **404 Not Found:** No countries in database (returns empty array [])

## 2. GET /api/geo/states/:countryId - Get States by Country

### Expected Successful Response (HTTP 200)
```json
[
  {
    "id": 201,
    "country_id": 101,
    "name": "Maharashtra"
  },
  {
    "id": 202,
    "country_id": 101,
    "name": "Delhi"
  },
  {
    "id": 203,
    "country_id": 101,
    "name": "Karnataka"
  }
]
```

### Response Structure
- **Array of State Objects:** Returns states for the specified country
- **id:** Integer primary key
- **country_id:** Foreign key to countries table
- **name:** State/Province name (string)

### Error Responses
- **400 Bad Request:** Invalid country ID format
- **404 Not Found:** Country not found or no states for that country (returns empty array [])
- **500 Internal Server Error:** Database error

## 3. GET /api/geo/districts/:stateId - Get Districts by State

### Expected Successful Response (HTTP 200)
```json
[
  {
    "id": 301,
    "state_id": 201,
    "name": "Mumbai"
  },
  {
    "id": 302,
    "state_id": 201,
    "name": "Pune"
  },
  {
    "id": 303,
    "state_id": 201,
    "name": "Nagpur"
  }
]
```

### Response Structure
- **Array of District Objects:** Returns districts for the specified state
- **id:** Integer primary key
- **state_id:** Foreign key to states table
- **name:** District name (string)

### Error Responses
- **400 Bad Request:** Invalid state ID format
- **404 Not Found:** State not found or no districts for that state (returns empty array [])
- **500 Internal Server Error:** Database error

## 4. GET /api/geo/export - Export Geo Data as JSON

### Expected Successful Response (HTTP 200)
```json
{
  "countries": [
    {
      "id": 101,
      "name": "India",
      "code": "IN",
      "phone_code": "+91"
    }
  ],
  "states": [
    {
      "id": 201,
      "country_id": 101,
      "name": "Maharashtra"
    }
  ],
  "districts": [
    {
      "id": 301,
      "state_id": 201,
      "name": "Mumbai"
    }
  ]
}
```

### Response Structure
- **countries:** Array of all country objects
- **states:** Array of all state objects
- **districts:** Array of all district objects
- **Note:** Returns data from Backup/geo.json file if exists, otherwise empty array []

### Error Responses
- **200 OK with empty array:** If Backup/geo.json doesn't exist or is invalid JSON
- **500 Internal Server Error:** File system permission issues

## 5. POST /api/geo/import - Import Geo Data from JSON

### Request Body Example
```json
{
  "countries": [
    {
      "id": 101,
      "name": "India",
      "code": "IN",
      "phone_code": "+91"
    }
  ],
  "states": [
    {
      "id": 201,
      "country_id": 101,
      "name": "Maharashtra"
    }
  ],
  "districts": [
    {
      "id": 301,
      "state_id": 201,
      "name": "Mumbai"
    }
  ]
}
```

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "message": "Geo data imported successfully"
}
```

### Response Structure
- **success:** Boolean indicating operation status
- **message:** Descriptive message about the operation result

### Error Responses
- **400 Bad Request:** Invalid JSON structure or missing required fields
- **500 Internal Server Error:** Database import failure, backup.auto_restore() error
- **422 Unprocessable Entity:** Data validation errors

## Test Data Dependencies

### Sample Data for Testing
```json
{
  "countries": [
    {"id": 101, "name": "India", "code": "IN", "phone_code": "+91"},
    {"id": 102, "name": "United States", "code": "US", "phone_code": "+1"},
    {"id": 103, "name": "United Kingdom", "code": "GB", "phone_code": "+44"}
  ],
  "states": [
    {"id": 201, "country_id": 101, "name": "Maharashtra"},
    {"id": 202, "country_id": 101, "name": "Delhi"},
    {"id": 203, "country_id": 101, "name": "Karnataka"},
    {"id": 204, "country_id": 102, "name": "California"},
    {"id": 205, "country_id": 102, "name": "Texas"}
  ],
  "districts": [
    {"id": 301, "state_id": 201, "name": "Mumbai"},
    {"id": 302, "state_id": 201, "name": "Pune"},
    {"id": 303, "state_id": 201, "name": "Nagpur"},
    {"id": 304, "state_id": 204, "name": "Los Angeles"},
    {"id": 305, "state_id": 204, "name": "San Francisco"}
  ]
}
```

### Environment Variables
- **countryId:** 101 (India)
- **stateId:** 201 (Maharashtra)
- **districtId:** 301 (Mumbai)

## Testing Notes

### 1. Data Integrity
- Test that country → state → district relationships are maintained
- Verify that importing data doesn't create duplicates
- Check that exported data matches imported data

### 2. Edge Cases
- Empty database (no countries/states/districts)
- Invalid IDs in path parameters
- Malformed JSON in import request
- Large dataset import/export performance

### 3. Integration Points
- Backup/restore functionality integration
- Database transaction handling
- File system operations for export/import

### 4. Performance Considerations
- Response time for large datasets
- Memory usage during export/import
- Concurrent access handling

## Success Criteria

### Functional Requirements
- ✅ All 5 endpoints return correct HTTP status codes
- ✅ GET endpoints return proper data structures
- ✅ POST /import correctly processes valid JSON
- ✅ Export/import round-trip preserves data integrity
- ✅ Error handling for invalid inputs works correctly

### Non-Functional Requirements
- ✅ Response time < 500ms for GET endpoints
- ✅ Response time < 2s for POST /import with moderate data
- ✅ Memory usage remains stable during operations
- ✅ Concurrent requests don't cause data corruption

### Security Requirements
- ✅ No authentication required (public endpoints)
- ✅ Input validation for path parameters
- ✅ JSON schema validation for import data
- ✅ No SQL injection vulnerabilities