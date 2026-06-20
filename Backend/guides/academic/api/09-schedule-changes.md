# Schedule Changes API Contract

Covers `schedule_change::request_change`, `schedule_change::list_pending`, `schedule_change::approve_change`, and `schedule_change::reject_change`.

---

## `POST /api/school/:schoolId/academic/changes/request`

- Handler: `rust/src/domain/academic/schedule_change.rs::request_change`
- Purpose: Submit a schedule change request, such as a class swap or timetable adjustment.

### Request

Path params:

- `schoolId`

Body:

```json
{
  "type": "swap",
  "reason": "Doctor appointment",
  "dateFrom": "2026-06-20",
  "dateTo": "2026-06-20",
  "blockCapMinutes": 90,
  "sourceClassId": "CLS_10A",
  "sourceSubjectId": "SUB-MATH",
  "targetClassId": "CLS_9B",
  "targetSubjectId": "SUB-MATH"
}
```

### Expected success response

`200 OK`

```json
{
  "success": true,
  "message": "Change request submitted"
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

#### Submit valid swap request

- Type: positive
- Request: `POST /api/school/SCH-001/academic/changes/request`
- Body: Valid swap payload.
- Expected HTTP status: `200`
- Database/state assertion: `schedule_change_requests` row is inserted with `status = pending` and `requested_by` set to tenant user.

#### Submit request without reason

- Type: negative
- Body omits `reason`.
- Expected HTTP status: `200` based on current SQL behavior, but should ideally fail validation.

#### Invalid date range

- Type: boundary
- Body has `dateTo` before `dateFrom`.
- Expected behavior: Should fail validation; current handler does not validate date range.

#### Tenant isolation

- Type: tenant-isolation
- Expected database assertion: Row is inserted only for requested `school_id`.

---

## `GET /api/school/:schoolId/academic/changes/pending`

- Handler: `rust/src/domain/academic/schedule_change.rs::list_pending`
- Purpose: List pending schedule change requests for a school.

### Expected success response

`200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "type": "swap",
      "requestedBy": "EMP-00109",
      "status": "pending",
      "reason": "Doctor appointment",
      "sourceClassId": "CLS_10A",
      "targetClassId": "CLS_9B",
      "dateFrom": "2026-06-20",
      "dateTo": "2026-06-20",
      "createdAt": "2026-06-19T09:00:00Z"
    }
  ]
}
```

### Test cases

#### Pending list

- Type: positive
- Expected HTTP status: `200`
- Expected response: Only `status = pending` requests are returned.

#### Empty list

- Type: positive
- Expected HTTP status: `200`
- Expected response: `{ success: true, data: [] }`

#### Non-pending statuses excluded

- Type: workflow
- Preconditions: Approved and rejected requests exist.
- Expected HTTP status: `200`
- Expected response: Approved/rejected requests are not returned.

---

## `POST /api/school/:schoolId/academic/changes/:id/approve`

- Handler: `rust/src/domain/academic/schedule_change.rs::approve_change`
- Purpose: Approve a pending schedule change request.

### Expected success response

`200 OK`

```json
{
  "success": true
}
```

### Test cases

#### Approve pending request

- Type: positive
- Request: `POST /api/school/SCH-001/academic/changes/1/approve`
- Expected HTTP status: `200`
- Database/state assertion: `schedule_change_requests.status = approved`, `approved_by` is tenant user, `updated_at` is set.

#### Approve already approved request

- Type: idempotency
- Expected HTTP status: `200` based on current SQL update behavior.

#### Approve request from another school

- Type: tenant-isolation
- Expected behavior: Should not update another school's request.
- Current behavior note: SQL prevents cross-school update, but no row-count error is returned.

---

## `POST /api/school/:schoolId/academic/changes/:id/reject`

- Handler: `rust/src/domain/academic/schedule_change.rs::reject_change`
- Purpose: Reject a schedule change request.

### Request

Body:

```json
{
  "adminNote": "Not possible due to exam schedule."
}
```

### Expected success response

`200 OK`

```json
{
  "success": true
}
```

### Test cases

#### Reject pending request with note

- Type: positive
- Request: `POST /api/school/SCH-001/academic/changes/1/reject`
- Body: `{ "adminNote": "Not possible due to exam schedule." }`
- Expected HTTP status: `200`
- Database/state assertion: `status = rejected`, `admin_note` is set, `approved_by` is tenant user.

#### Reject without note

- Type: positive
- Body: `{}`
- Expected HTTP status: `200`
- Database/state assertion: `admin_note` becomes empty string.

#### Reject request from another school

- Type: tenant-isolation
- Expected behavior: Should not update another school's request.
