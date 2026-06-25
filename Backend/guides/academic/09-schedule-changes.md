# Schedule Changes API Contract

Isme `schedule_change::request_change`, `schedule_change::list_pending`, `schedule_change::approve_change`, aur `schedule_change::reject_change` cover hote hain.

---

## `POST /api/school/:schoolId/academic/changes/request`

- Handler: `rust/src/domain/academic/schedule_change.rs::request_change`
- Purpose: Schedule change request submit karna, jaise ki class swap ya timetable adjustment.

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
- Database/state assertion: `schedule_change_requests` table me row insert hoti hai jisme `status = pending` aur `requested_by` tenant user par set hota hai.

#### Submit request without reason

- Type: negative
- Body me `reason` omit kiya gaya hai.
- Expected HTTP status: `200` current SQL behavior ke basis par, par ideal case me validation fail hona chahiye.

#### Invalid date range

- Type: boundary
- Body me `dateTo`, `dateFrom` se pehle hai.
- Expected behavior: Validation fail hona chahiye; current handler date range validate nahi karta.

#### Tenant isolation

- Type: tenant-isolation
- Expected database assertion: Row sirf requested `school_id` ke liye insert honi chahiye.

---

## `GET /api/school/:schoolId/academic/changes/pending`

- Handler: `rust/src/domain/academic/schedule_change.rs::list_pending`
- Purpose: School ke liye pending schedule change requests ki list return karna.

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
- Expected response: Sirf `status = pending` waali requests hi return honi chahiye.

#### Empty list

- Type: positive
- Expected HTTP status: `200`
- Expected response: `{ success: true, data: [] }`

#### Non-pending statuses excluded

- Type: workflow
- Preconditions: Approved aur rejected requests exist karti hain.
- Expected HTTP status: `200`
- Expected response: Approved/rejected requests return nahi honi chahiye.

---

## `POST /api/school/:schoolId/academic/changes/:id/approve`

- Handler: `rust/src/domain/academic/schedule_change.rs::approve_change`
- Purpose: Pending schedule change request ko approve karna.

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
- Database/state assertion: `schedule_change_requests.status = approved` ho jata hai, `approved_by` tenant user set ho jata hai, `updated_at` set ho jata hai.

#### Approve already approved request

- Type: idempotency
- Expected HTTP status: `200` based on current SQL update behavior.

#### Approve request from another school

- Type: tenant-isolation
- Expected behavior: Kisi dusre school ki request ko update nahi karna chahiye.
- Current behavior note: SQL cross-school update ko prevent karta hai, par koi row-count error return nahi hota.

---

## `POST /api/school/:schoolId/academic/changes/:id/reject`

- Handler: `rust/src/domain/academic/schedule_change.rs::reject_change`
- Purpose: Schedule change request ko reject karna.

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
- Database/state assertion: `status = rejected` ho jata hai, `admin_note` set ho jata hai, `approved_by` tenant user set ho jata hai.

#### Reject without note

- Type: positive
- Body: `{}`
- Expected HTTP status: `200`
- Database/state assertion: `admin_note` empty string ban jata hai.

#### Reject request from another school

- Type: tenant-isolation
- Expected behavior: Kisi dusre school ki request ko update nahi karna chahiye.
