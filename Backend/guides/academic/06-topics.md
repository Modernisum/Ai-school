# Topics API Contract

Isme `topic::create_topic` cover hota hai.

---

## `POST /api/school/:schoolId/academic/topics`

- Handler: `rust/src/domain/academic/topic.rs::create_topic`
- Purpose: Ek responsibility/subject ke under academic topic create karna.

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

Aap `responsibilityId` ya `subjectId` me se koi bhi use kar sakte hain.

### Expected success response

`200 OK`

Current handler directly service/repository data return karta hai, bina kisi wrapper ke.

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

### Important rules aur gaps

- Current handler `schoolId` path parameter ko ignore karta hai.
- Repository `topics` table me bina `school_id` column ke insert karta hai jo SQL me dikhaya gaya hai.
- Jab tak backend scope fix nahi hota, tab tak is endpoint ko ek tenant-isolation gap ki tarah treat karein.

### Test cases

#### Create topic with responsibilityId

- Type: positive
- Request: `POST /api/school/SCH-001/academic/topics`
- Body: `{ "responsibilityId": "SUB-MATH", "name": "Linear Equations", "description": "Basic algebra topic" }`
- Expected HTTP status: `200`
- Expected response: JSON object jisme `id`, `responsibilityId`, `name`, aur `description` honge.

#### Create topic with subjectId alias

- Type: compatibility
- Body me `responsibilityId` ke bajaye `subjectId` use kiya gaya hai.
- Expected HTTP status: `200`

#### Missing name

- Type: negative
- Body me `name` omit kiya gaya hai.
- Expected HTTP status: `500` current DB behavior ke basis par.

#### Tenant isolation gap

- Type: tenant-isolation
- Preconditions: Same responsibility/subject multiple schools me exist karta hai.
- Expected behavior: Backend ko topic creation ko `schoolId` ke scope me rakhna chahiye.
- Current behavior note: Handler `schoolId` ko service/repository me pass nahi karta hai.
