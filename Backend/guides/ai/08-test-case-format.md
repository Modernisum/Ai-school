# Python v1 API Test Case Format

Use this format for every Python v1 endpoint test case. Keep tests deterministic and avoid production data.

## Test setup

```bash
BASE_URL="http://localhost:8000"
SCHOOL_ID="SCH-00021"
```

The Python backend runs on port `8000` by default (`python/main.py:4`). Do NOT use port `8080` (Rust).

## Auth token helper

Get a school admin token:

```bash
TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/school/login" \
  -H "Content-Type: application/json" \
  -d "{\"schoolId\":\"$SCHOOL_ID\",\"password\":\"change-me\"}" \
  | jq -r '.accessToken // empty')
```

Use the token in subsequent requests:

```bash
curl -s -X GET "$BASE_URL/api/school/$SCHOOL_ID/ai/sessions" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

## Common assertions

Success:

```bash
jq -e '.success == true'
```

Error with message:

```bash
jq -e '.success == false and (.message | length > 0)'
```

FastAPI error (HTTPException):

```bash
jq -e '.detail | length > 0'
```

Token present:

```bash
jq -e '.accessToken | type == "string" and length > 0'
```

## Test template

```md
### TC_PYV1_<AREA>_<NNN> <Short title>

Endpoint:

```bash
METHOD /api/...
```

Request:

```bash
curl -s -X METHOD "$BASE_URL/api/..." \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{...}' | jq .
```

Expected:

- Status: `200`
- `.success == true`
- Specific field assertions
```

## Naming convention

Test case IDs follow the pattern: `TC_PYV1_<AREA>_<NNN>`

| Area | Prefix | File |
|---|---|---|
| Auth | `TC_PYV1_AUTH` | `01-auth.md` |
| AI Stateless & Sessions | `TC_PYV1_AI` | `02-ai-stateless-sessions.md` |
| AI Config & Cache | `TC_PYV1_AI` | `03-ai-config-cache.md` |
| AI Embedding & RAG | `TC_PYV1_AI` | `04-ai-embedding-rag.md` |
| AI Tasks & Exams | `TC_PYV1_AI` | `05-ai-tasks-exams.md` |
| Academic | `TC_PYV1_ACAD` | `06-academic.md` |
| Stubs | `TC_PYV1_STUB` | `07-stubs.md` |

## Recommended test-case categories

### Positive happy path

Confirms the endpoint works with valid data and returns the documented success response.

### Missing required field

Confirms validation fails cleanly when required fields are absent.

### Invalid path parameter

Confirms behavior for missing, malformed, or non-existent IDs.

### Token validation

Confirms bearer token, expired token, invalid token, and missing token behavior.

### Tenant isolation

Confirms requests remain scoped to the correct school and cannot read or mutate another school's data.

### Boundary value

Confirms limits such as empty strings, zero values, and default fallbacks.

### Idempotency/update behavior

Confirms update/upsert endpoints behave predictably when the same record is submitted again.

## Route coverage checklist

| File | Test IDs |
|---|---|
| `01-auth.md` | `TC_PYV1_AUTH_001` to `TC_PYV1_AUTH_017` |
| `02-ai-stateless-sessions.md` | `TC_PYV1_AI_001` to `TC_PYV1_AI_016` |
| `03-ai-config-cache.md` | `TC_PYV1_AI_017` to `TC_PYV1_AI_024` |
| `04-ai-embedding-rag.md` | `TC_PYV1_AI_025` to `TC_PYV1_AI_030` |
| `05-ai-tasks-exams.md` | `TC_PYV1_AI_031` to `TC_PYV1_AI_034` |
| `06-academic.md` | `TC_PYV1_ACAD_001` to `TC_PYV1_ACAD_007` |
| `07-stubs.md` | `TC_PYV1_STUB_001` to `TC_PYV1_STUB_007` |

## Test data rules

- Use disposable school IDs and disposable employee/student IDs.
- Do not run destructive tests on production data.
- Do not commit real tokens, passwords, or API keys.
- If a test needs a school admin token, create it through `POST /api/auth/school/login` in the test setup.
- Python backend port is `8000`; Rust backend port is `8080`. Use the correct port for the backend being tested.