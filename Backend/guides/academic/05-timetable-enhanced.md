# Timetable Enhanced API Contract

Isme `timetable_enhanced::issue_box`, `timetable_enhanced::view_filtered`, aur `timetable_enhanced::suggest_substitute` cover hote hain.

---

## `GET /api/school/:schoolId/academic/timetable-issue-box/:configId`

- Handler: `rust/src/domain/academic/timetable_enhanced.rs::issue_box`
- Purpose: Timetable config ke liye conflict aur validation issues return karna.

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": {
    "issues": [
      {
        "type": "teacher_double_booking",
        "description": "Teacher EMP-00109 is scheduled at two classes at Day 1 Period 3"
      }
    ]
  }
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

### Test cases

#### No issues

- Type: positive
- Preconditions: Timetable me koi conflicts nahi hain.
- Expected HTTP status: `200`
- Expected response: `data.issues` khali hoga.

#### Teacher double-booking

- Type: conflict
- Expected HTTP status: `200`
- Expected response: `issues` me `type = teacher_double_booking` hoga.

#### Room double-booking

- Type: conflict
- Expected HTTP status: `200`
- Expected response: `issues` me room/space conflict hoga.

#### Missing config

- Type: negative
- Expected HTTP status: `500` based on current handler behavior.

---

## `GET /api/school/:schoolId/academic/timetable-view/:configId`

- Handler: `rust/src/domain/academic/timetable_enhanced.rs::view_filtered`
- Purpose: Filtered timetable view return karna.

### Request

Query params:

- Optional `type`:
  - `global`: default, koi filtering nahi.
  - `teachers`: sirf wahi slots jisme `teacher_id` empty na ho.
  - `non-teachers`: sirf wahi slots jisme teacher ID na ho.

### Expected success response

`200 OK`

```json
{
  "success": true,
  "viewType": "teachers",
  "data": {
    "configId": "550e8400-e29b-41d4-a716-446655440000",
    "classId": "CLS_10A",
    "className": "10-A",
    "slots": [
      {
        "day": 1,
        "period": 1,
        "subject_id": "SUB-MATH",
        "teacher_id": "EMP-00109"
      }
    ]
  }
}
```

### Expected not found response

`404 NOT_FOUND`

```json
{
  "success": false,
  "message": "<error message>"
}
```

### Test cases

#### Global view

- Type: positive
- Request: `GET /api/school/SCH-001/academic/timetable-view/<configId>`
- Expected HTTP status: `200`
- Expected response: `viewType = global`; slots filter nahi honge.

#### Teachers-only view

- Type: positive
- Request: `GET /api/school/SCH-001/academic/timetable-view/<configId>?type=teachers`
- Expected HTTP status: `200`
- Expected response: Har returned slot me `teacher_id` empty nahi hona chahiye.

#### Non-teachers-only view

- Type: positive
- Request: `GET /api/school/SCH-001/academic/timetable-view/<configId>?type=non-teachers`
- Expected HTTP status: `200`
- Expected response: Har returned slot me `teacher_id` nahi hona chahiye.

#### Missing config

- Type: negative
- Expected HTTP status: `404`

---

## `GET /api/school/:schoolId/academic/timetable-substitute/:spaceId/:responsibilityId/:day/:period`

- Handler: `rust/src/domain/academic/timetable_enhanced.rs::suggest_substitute`
- Purpose: Kisi space, responsibility, day, aur period ke liye free proxy/substitute teachers suggest karna.

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": [
    {
      "rank": 1,
      "employeeId": "EMP-00302",
      "name": "David Miller",
      "freePeriodsToday": 4,
      "isSubjectMatch": true,
      "score": 92
    }
  ],
  "totalCandidates": 1
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

### Test cases

#### Subject-matched free teacher

- Type: positive
- Preconditions: Kam se kam ek teacher free aur subject-matched hona chahiye.
- Expected HTTP status: `200`
- Expected response: `data[0].rank = 1` aur `isSubjectMatch = true` hoga.

#### No available substitute

- Type: positive
- Preconditions: Requested day/period ke liye koi teacher free nahi hai.
- Expected HTTP status: `200`
- Expected response: `{ success: true, data: [], totalCandidates: 0 }`

#### Invalid day

- Type: boundary
- Path me `day = 0` ya `day > 7` use kiya gaya hai.
- Expected behavior: Validation fail hona chahiye; current handler `usize` accept karta hai.

#### Tenant isolation

- Type: tenant-isolation
- Preconditions: Same teacher IDs kisi dusre school me exist karte hain.
- Expected response: Sirf requested `schoolId` ke candidates return hone chahiye.
