# Timetable API Contract

Covers `timetable::generate_timetable`, `timetable::list_timetables`, `timetable::get_timetable`, `timetable::approve_timetable`, and `timetable::delete_timetable`.

---

## `POST /api/school/:schoolId/academic/timetable/generate`

- Handler: `rust/src/domain/academic/timetable.rs::generate_timetable`
- Purpose: Generate a timetable configuration for a class.

### Request

Path params:

- `schoolId`

Body:

```json
{
  "classId": "CLS_10A",
  "className": "10-A",
  "periodsPerDay": 6,
  "workingDays": [1, 2, 3, 4, 5],
  "requirements": [
    {
      "subjectId": "SUB-MATH",
      "subjectName": "Mathematics",
      "teacherId": "EMP-00109",
      "teacherName": "Sunita Rao",
      "periodsPerWeek": 5,
      "roomType": "classroom"
    }
  ],
  "season": "2026-Q2",
  "startTime": "08:00",
  "endTime": "14:00",
  "periodDurationMinutes": 45,
  "breakDurationMinutes": 10
}
```

### Expected success response

`200 OK`

```json
{
  "success": true,
  "config_id": "550e8400-e29b-41d4-a716-446655440000",
  "class_id": "CLS_10A",
  "class_name": "10-A",
  "total_slots": 30,
  "slots": [
    {
      "day": 1,
      "period": 1,
      "subject_id": "SUB-MATH",
      "subject_name": "Mathematics",
      "teacher_id": "EMP-00109",
      "teacher_name": "Sunita Rao",
      "room_id": "R-102",
      "is_free_period": false
    }
  ],
  "conflicts": [],
  "has_conflicts": false
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

- `periodsPerDay` defaults to 8 if omitted.
- `workingDays` defaults to `[1,2,3,4,5]` if omitted.
- `periodDurationMinutes` defaults to 40.
- `breakDurationMinutes` defaults to 10.
- Do not approve a timetable when `has_conflicts == true`.

### Test cases

#### Generate conflict-free timetable

- Type: positive
- Preconditions: Teachers and rooms are available for requested slots.
- Expected HTTP status: `200`
- Expected response: `conflicts` is empty and `has_conflicts` is false.

#### Generate with teacher double-booking

- Type: conflict
- Preconditions: Same teacher is required in overlapping slots with no availability.
- Expected HTTP status: `200`
- Expected response: `conflicts` contains a teacher conflict and `has_conflicts` is true.

#### Missing requirements

- Type: negative
- Body omits `requirements`.
- Expected HTTP status: `500` or Axum JSON validation error depending request deserialization behavior.

#### Tenant isolation

- Type: tenant-isolation
- Preconditions: Same class/teacher/room IDs exist in another school.
- Expected response: Generated timetable uses only data for requested `schoolId`.

---

## `GET /api/school/:schoolId/academic/timetable/`

- Handler: `rust/src/domain/academic/timetable.rs::list_timetables`
- Purpose: List timetable configs for a school.

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": [
    {
      "configId": "550e8400-e29b-41d4-a716-446655440000",
      "classId": "CLS_10A",
      "className": "10-A",
      "status": "draft",
      "createdAt": "2026-06-19T09:00:00Z"
    }
  ]
}
```

### Test cases

#### Multiple configs

- Type: positive
- Expected HTTP status: `200`
- Expected response: `data` contains configs for the requested school.

#### Empty list

- Type: positive
- Expected HTTP status: `200`
- Expected response: `{ success: true, data: [] }`

---

## `GET /api/school/:schoolId/academic/timetable/:configId`

- Handler: `rust/src/domain/academic/timetable.rs::get_timetable`
- Purpose: Get one timetable config by ID.

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": {
    "configId": "550e8400-e29b-41d4-a716-446655440000",
    "classId": "CLS_10A",
    "className": "10-A",
    "status": "draft",
    "slots": [],
    "conflicts": []
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

#### Existing config

- Type: positive
- Expected HTTP status: `200`

#### Missing config

- Type: negative
- Expected HTTP status: `404`

#### Config from another school

- Type: tenant-isolation
- Expected HTTP status: Should be `404` or an error that does not leak another school's data.

---

## `POST /api/school/:schoolId/academic/timetable/:configId/approve`

- Handler: `rust/src/domain/academic/timetable.rs::approve_timetable`
- Purpose: Approve a generated timetable.

### Expected success response

`200 OK`

```json
{
  "success": true,
  "message": "Timetable approved and notifications sent"
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

### Important rule

Approve only after conflict validation passes.

### Test cases

#### Approve conflict-free timetable

- Type: positive
- Preconditions: `has_conflicts == false`.
- Expected HTTP status: `200`
- Database/state assertion: Timetable status becomes approved/active according to engine behavior.

#### Approve timetable with conflicts

- Type: workflow
- Preconditions: `has_conflicts == true`.
- Expected HTTP status: Should fail before status update.

#### Approve missing config

- Type: negative
- Expected HTTP status: `500` based on current handler behavior.

---

## `DELETE /api/school/:schoolId/academic/timetable/:configId`

- Handler: `rust/src/domain/academic/timetable.rs::delete_timetable`
- Purpose: Delete a timetable config.

### Expected success response

`200 OK`

```json
{
  "success": true,
  "message": "Timetable deleted"
}
```

### Test cases

#### Delete draft timetable

- Type: positive
- Preconditions: Timetable is not active/approved.
- Expected HTTP status: `200`

#### Delete active timetable

- Type: workflow
- Preconditions: Timetable is active/approved.
- Expected HTTP status: Should fail unless product allows deletion.

#### Delete missing config

- Type: negative
- Expected HTTP status: `200` based on current SQL delete behavior, but response should ideally distinguish not found.
