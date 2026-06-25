# Timetable API Contract

Isme `timetable::generate_timetable`, `timetable::list_timetables`, `timetable::get_timetable`, `timetable::approve_timetable`, and `timetable::delete_timetable` cover hote hain.

---

## `POST /api/school/:schoolId/academic/timetable/generate`

- Handler: `rust/src/domain/academic/timetable.rs::generate_timetable`
- Purpose: Ek class ke liye timetable configuration generate karna.

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

- Agar omit kiya jaye toh `periodsPerDay` default hokar 8 ho jata hai.
- Agar omit kiya jaye toh `workingDays` default hokar `[1,2,3,4,5]` ho jata hai.
- `periodDurationMinutes` default hokar 40 ho jata hai.
- `breakDurationMinutes` default hokar 10 ho jata hai.
- Agar `has_conflicts == true` ho, toh timetable ko approve na karein.

### Test cases

#### Generate conflict-free timetable

- Type: positive
- Preconditions: Requested slots ke liye teachers aur rooms available hain.
- Expected HTTP status: `200`
- Expected response: `conflicts` khali hoga aur `has_conflicts` false hoga.

#### Generate with teacher double-booking

- Type: conflict
- Preconditions: Overlapping slots me availability ke bina same teacher ki requirement hai.
- Expected HTTP status: `200`
- Expected response: `conflicts` me teacher conflict hoga aur `has_conflicts` true hoga.

#### Missing requirements

- Type: negative
- Body me `requirements` ko omit kiya gaya hai.
- Expected HTTP status: `500` ya request deserialization behavior ke according Axum JSON validation error.

#### Tenant isolation

- Type: tenant-isolation
- Preconditions: Same class/teacher/room IDs kisi dusre school me exist karte hain.
- Expected response: Generated timetable sirf requested `schoolId` ke data ka use karega.

---

## `GET /api/school/:schoolId/academic/timetable/`

- Handler: `rust/src/domain/academic/timetable.rs::list_timetables`
- Purpose: Ek school ke timetable configs ki list return karna.

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
- Expected response: `data` me requested school ke configs hone chahiye.

#### Empty list

- Type: positive
- Expected HTTP status: `200`
- Expected response: `{ success: true, data: [] }`

---

## `GET /api/school/:schoolId/academic/timetable/:configId`

- Handler: `rust/src/domain/academic/timetable.rs::get_timetable`
- Purpose: ID ke throw ek timetable config return karna.

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
- Expected HTTP status: `404` ya aisa error hona chahiye jisse kisi dusre school ka data leak na ho.

---

## `POST /api/school/:schoolId/academic/timetable/:configId/approve`

- Handler: `rust/src/domain/academic/timetable.rs::approve_timetable`
- Purpose: Ek generated timetable ko approve karna.

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

Approve tabhi karein jag conflict validation pass ho jaye.

### Test cases

#### Approve conflict-free timetable

- Type: positive
- Preconditions: `has_conflicts == false`.
- Expected HTTP status: `200`
- Database/state assertion: Engine behavior ke according timetable status approved/active ho jata hai.

#### Approve timetable with conflicts

- Type: workflow
- Preconditions: `has_conflicts == true`.
- Expected HTTP status: Status update se pehle hi fail ho jana chahiye.

#### Approve missing config

- Type: negative
- Expected HTTP status: `500` based on current handler behavior.

---

## `DELETE /api/school/:schoolId/academic/timetable/:configId`

- Handler: `rust/src/domain/academic/timetable.rs::delete_timetable`
- Purpose: Ek timetable config ko delete karna.

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
- Preconditions: Timetable active/approved nahi hai.
- Expected HTTP status: `200`

#### Delete active timetable

- Type: workflow
- Preconditions: Timetable active/approved hai.
- Expected HTTP status: Fail hona chahiye jag tak ki product deletion allow na karta ho.

#### Delete missing config

- Type: negative
- Expected HTTP status: `200` current SQL delete behavior ke basis par, par response me ideal case me not found details honi chahiye.
