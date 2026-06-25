# Python v1 Stubs API Contract

Covers school notifications, OCR document extraction, and the catch-all route from `python/app/api/v1/stubs.py`.

Source:
- Router: `python/app/api/v1/stubs.py:11`
- No prefix - mounted directly in `python/app/main.py:65`

---

## `GET /api/school/{school_id}/notification`

### Purpose

Fetch pending Super Admin notification for a school. Stored in `schools.notification` JSONB column.

### Auth

None. Opens its own DB session via `async_session_factory()`.

### Handler

`python/app/api/v1/stubs.py:15-34`

### Path params

- `school_id` (string, required): School tenant ID.

### Expected success response

**Status:** `200`

With notification:

```json
{
  "success": true,
  "notification": {
    "title": "Update Required",
    "message": "Please update your school profile",
    "type": "warning",
    "created_at": "2026-06-20"
  }
}
```

Without notification:

```json
{
  "success": true,
  "notification": null
}
```

### Important rules

- If the `schools` table doesn't exist yet (during migration), returns `{ "success": true, "notification": null }` silently.
- Does NOT use `get_db_with_rls` - no tenant isolation enforcement.

### Test cases

#### TC_PYV1_STUB_001 Get notification with data

- Type: positive
- Preconditions: School has a notification set in `schools.notification`.
- Request:
  - Method: `GET`
  - Route: `/api/school/SCH-00021/notification`
- Expected HTTP status: `200`
- Expected response: `success == true`, `notification` is a non-null object.

#### TC_PYV1_STUB_002 Get notification without data

- Type: boundary
- Preconditions: School has no notification set.
- Request:
  - Method: `GET`
  - Route: `/api/school/SCH-00021/notification`
- Expected HTTP status: `200`
- Expected response: `success == true`, `notification == null`.

---

## `DELETE /api/school/{school_id}/notification`

### Purpose

Clear the Super Admin notification for a school (user clicked "I Understand").

### Auth

None. Opens its own DB session via `async_session_factory()`.

### Handler

`python/app/api/v1/stubs.py:37-51`

### Path params

- `school_id` (string, required): School tenant ID.

### Expected success response

**Status:** `200`

```json
{
  "success": true,
  "message": "Notification cleared"
}
```

### Expected error responses

Internal error (HTTP 500):

```json
{
  "success": false,
  "message": "<error details>"
}
```

### Important rules

- Sets `schools.notification = NULL` for the given school.
- Does NOT use `get_db_with_rls`.

### Test cases

#### TC_PYV1_STUB_003 Clear notification

- Type: positive
- Preconditions: School has a notification set.
- Request:
  - Method: `DELETE`
  - Route: `/api/school/SCH-00021/notification`
- Expected HTTP status: `200`
- Expected response: `success == true`, `message == "Notification cleared"`.
- Database assertion: `schools.notification IS NULL`.

---

## `POST /api/school/{school_id}/ai/ocr`

### Purpose

Extract structured fields from Aadhaar or other student document images using Google Gemini API.

### Auth

None. No DB session dependency.

### Handler

`python/app/api/v1/stubs.py:55-175`

### Path params

- `school_id` (string, required): School tenant ID (not used in processing).

### Request body

```json
{
  "file_url": "https://storage.example.com/documents/aadhaar_card.pdf",
  "doc_type": "aadhaar"
}
```

`doc_type` defaults to `"aadhaar"`.

### Expected success response (mock mode)

**Status:** `200`

```json
{
  "success": true,
  "extractedFields": {
    "aadhaar_number": "1234-5678-9012",
    "date_of_birth": "2010-05-15",
    "father_name": "Test Father",
    "mother_name": "Test Mother",
    "address": "123 Test Street, New Delhi, India",
    "gender": "Male"
  }
}
```

### Expected success response (live mode)

**Status:** `200`

```json
{
  "success": true,
  "extractedFields": {
    "aadhaar_number": "1234-5678-9012",
    "date_of_birth": "2010-05-15",
    "father_name": "Rajesh Kumar",
    "mother_name": "Sunita Kumar",
    "address": "45, MG Road, Bangalore, Karnataka",
    "gender": "Male"
  }
}
```

### Expected error responses

Missing file_url (HTTP 400):

```json
{
  "success": false,
  "message": "file_url is required"
}
```

Gemini API error (HTTP 500):

```json
{
  "success": false,
  "message": "Gemini API returned code 500: <response text>"
}
```

No candidates in response (HTTP 500):

```json
{
  "success": false,
  "message": "No candidates in Gemini response"
}
```

### Important rules

- **CRITICAL:** `python/app/api/v1/stubs.py:71` contains a hardcoded Gemini API key. This key (`AIzaSyAcpd2loWLizjNP1TgenvHiA7WbaEguvbU`) is treated as a mock/test key. Do NOT use this in production or commit new keys.
- When `GEMINI_API_KEY` is not set, empty, or equals the mock key, a simulated response is returned without calling the Gemini API.
- The handler uses `httpx.AsyncClient` to call Gemini's `generateContent` API.
- MIME type is determined from the file URL extension: `.pdf`, `.png`, `.webp`, `.gif`, defaulting to `image/jpeg`.
- The Gemini prompt instructs the model to return only JSON.
- Extracted fields are normalized: `aadhaarNumber` → `aadhaar_number`, `dob` → `date_of_birth`, `fatherName` → `father_name`, `motherName` → `mother_name`.

### Test cases

#### TC_PYV1_STUB_004 OCR mock mode

- Type: positive
- Preconditions: No valid Gemini API key configured (mock mode).
- Request:
  - Method: `POST`
  - Route: `/api/school/SCH-00021/ai/ocr`
  - Body: `{ "file_url": "https://example.com/aadhaar.png", "doc_type": "aadhaar" }`
- Expected HTTP status: `200`
- Expected response: `success == true`, `extractedFields` contains mock data with all fields.

#### TC_PYV1_STUB_005 OCR missing file_url

- Type: negative
- Request:
  - Method: `POST`
  - Route: `/api/school/SCH-00021/ai/ocr`
  - Body: `{ "doc_type": "aadhaar" }`
- Expected HTTP status: `400`
- Expected response: `message == "file_url is required"`.

---

## `* /api/{full_path:path}` (Catch-all)

### Purpose

Catch-all route for any endpoint not yet ported from Rust to Python. Returns a 404 with a hint.

### Auth

None.

### Handler

`python/app/api/v1/stubs.py:179-188`

### Path params

- `full_path` (string): Any path under `/api/`.

### Methods

`GET`, `POST`, `PUT`, `PATCH`, `DELETE`

### Expected response

**Status:** `404`

```json
{
  "success": false,
  "message": "Route /api/some/unported/endpoint not yet implemented in Python backend",
  "hint": "This endpoint exists in the Rust backend - porting in progress"
}
```

### Important rules

- This is the LAST router registered in `python/app/main.py:65`. Any route not matched by `ai_router`, `academic_router`, `auth_router`, or `stubs_router` specific routes will hit this catch-all.
- The catch-all uses `{full_path:path}` which matches any remaining path segments.
- If a new route is added to the Python backend, ensure it is registered before this catch-all.

### Test cases

#### TC_PYV1_STUB_006 Catch-all for unported route

- Type: positive
- Request:
  - Method: `GET`
  - Route: `/api/some/unported/endpoint`
- Expected HTTP status: `404`
- Expected response: `success == false`, `message` contains "not yet implemented", `hint` contains "Rust backend".

#### TC_PYV1_STUB_007 Catch-all POST

- Type: boundary
- Request:
  - Method: `POST`
  - Route: `/api/random/path`
  - Body: `{ "test": true }`
- Expected HTTP status: `404`
- Expected response: `success == false`.