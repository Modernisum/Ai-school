# Timetable Enhanced API Contract

Covers `timetable_enhanced::issue_box`, `timetable_enhanced::view_filtered`, and `timetable_enhanced::suggest_substitute`.

---

## `GET /api/school/:schoolId/academic/timetable-issue-box/:configId`

- Handler: `rust/src/domain/academic/timetable_enhanced.rs::issue_box`
- Purpose: Return conflict and validation issues for a timetable config.

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
- Preconditions: Timetable has no conflicts.
- Expected HTTP status: `200`
- Expected response: `data.issues` is empty.

#### Teacher double-booking

- Type: conflict
- Expected HTTP status: `200`
- Expected response: `issues` contains `type = teacher_double_booking`.

#### Room double-booking

- Type: conflict
- Expected HTTP status: `200`
- Expected response: `issues` contains a room/space conflict.

#### Missing config

- Type: negative
- Expected HTTP status: `500` based on current handler behavior.

---

## `GET /api/school/:schoolId/academic/timetable-view/:configId`

- Handler: `rust/src/domain/academic/timetable_enhanced.rs::view_filtered`
- Purpose: Return a filtered timetable view.

### Request

Query params:

- Optional `type`:
  - `global`: default, no filtering.
  - `teachers`: only slots with a non-empty `teacher_id`.
  - `non-teachers`: only slots with no teacher ID.

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
- Expected response: `viewType = global`; slots are not filtered.

#### Teachers-only view

- Type: positive
- Request: `GET /api/school/SCH-001/academic/timetable-view/<configId>?type=teachers`
- Expected HTTP status: `200`
- Expected response: Every returned slot has a non-empty `teacher_id`.

#### Non-teachers-only view

- Type: positive
- Request: `GET /api/school/SCH-001/academic/timetable-view/<configId>?type=non-teachers`
- Expected HTTP status: `200`
- Expected response: Every returned slot has no `teacher_id`.

#### Missing config

- Type: negative
- Expected HTTP status: `404`

---

## `GET /api/school/:schoolId/academic/timetable-substitute/:spaceId/:responsibilityId/:day/:period`

- Handler: `rust/src/domain/academic/timetable_enhanced.rs::suggest_substitute`
- Purpose: Suggest free proxy/substitute teachers for a space, responsibility, day, and period.

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
- Preconditions: At least one teacher is free and subject-matched.
- Expected HTTP status: `200`
- Expected response: `data[0].rank = 1` and `isSubjectMatch = true`.

#### No available substitute

- Type: positive
- Preconditions: No teacher is free for requested day/period.
- Expected HTTP status: `200`
- Expected response: `{ success: true, data: [], totalCandidates: 0 }`

#### Invalid day

- Type: boundary
- Path uses `day = 0` or `day > 7`.
- Expected HTTP status: Should fail validation; current handler accepts `usize`.

#### Tenant isolation

- Type: tenant-isolation
- Preconditions: Same teacher IDs exist in another school.
- Expected response: Only candidates from requested `schoolId` are returned.
