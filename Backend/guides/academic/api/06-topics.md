# Topics API Contract

Covers `topic::create_topic`.

---

## `POST /api/school/:schoolId/academic/topics`

- Handler: `rust/src/domain/academic/topic.rs::create_topic`
- Purpose: Create an academic topic under a responsibility/subject.

### Request

Path params:

- `schoolId`

Body:

```json
{
  "responsibilityId": "SUB-MATH",
  "subjectId": "SUB-MATH",
  "name": "Linear Equations",
  "description": "Basic algebra topic"
}
```

Either `responsibilityId` or `subjectId` can be used.

### Expected success response

`200 OK`

Current handler returns service/repository data directly, without a wrapper.

```json
{
  "id": 1,
  "responsibilityId": "SUB-MATH",
  "subjectId": "SUB-MATH",
  "name": "Linear Equations",
  "description": "Basic algebra topic"
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

### Important rules and gaps

- Current handler ignores the `schoolId` path parameter.
- Repository inserts into `topics` without a `school_id` column in the shown SQL.
- Treat this endpoint as a tenant-isolation gap until backend scope is fixed.

### Test cases

#### Create topic with responsibilityId

- Type: positive
- Request: `POST /api/school/SCH-001/academic/topics`
- Body: `{ "responsibilityId": "SUB-MATH", "name": "Linear Equations", "description": "Basic algebra topic" }`
- Expected HTTP status: `200`
- Expected response: JSON object containing `id`, `responsibilityId`, `name`, and `description`.

#### Create topic with subjectId alias

- Type: compatibility
- Body uses `subjectId` instead of `responsibilityId`.
- Expected HTTP status: `200`

#### Missing name

- Type: negative
- Body omits `name`.
- Expected HTTP status: `500` based on current DB behavior.

#### Tenant isolation gap

- Type: tenant-isolation
- Preconditions: Same responsibility/subject exists in multiple schools.
- Expected behavior: Backend should scope topic creation to `schoolId`.
- Current behavior note: Handler does not pass `schoolId` to service/repository.
