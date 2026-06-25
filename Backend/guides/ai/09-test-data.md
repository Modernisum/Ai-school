# Python v1 Test Data Rules

Use disposable data for all Python v1 API tests. Do not put production credentials, real tokens, API keys, or real school secrets in documentation or tests.

## Local environment

```bash
BASE_URL="http://localhost:8000"
SCHOOL_ID="SCH-00021"
```

The Python backend runs on port `8000` (`python/main.py:4`). Do NOT use port `8080` (Rust backend).

## School admin login helper

```bash
TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/school/login" \
  -H "Content-Type: application/json" \
  -d "{\"schoolId\":\"$SCHOOL_ID\",\"password\":\"change-me\"}" \
  | jq -r '.accessToken // empty')

if [ -z "$TOKEN" ]; then
  echo "ERROR: Could not obtain auth token"
  exit 1
fi
```

## Authenticated request helper

```bash
api_call() {
  local method="$1" url="$2" body="$3"
  if [ -n "$body" ]; then
    curl -s -X "$method" "$BASE_URL$url" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "$body"
  else
    curl -s -X "$method" "$BASE_URL$url" \
      -H "Authorization: Bearer $TOKEN"
  fi
}
```

## Suggested disposable values

| Area | Example | Notes |
|---|---|---|
| School ID | `SCH-AUTH-001` | Use a prefix that clearly marks test data |
| Employee ID | `EMP-TEST-001` | Use a prefix that is not a real employee |
| Student ID | `STD-TEST-001` | Use a prefix that is not a real student |
| Subject ID | `SUB-TEST-001` | Test subject reference |
| Class ID | `CLS-TEST-10` | Test class reference |
| Session ID | `uuid.uuid4()` | Generated per test; track for cleanup |
| Provider ID | `1` | Use active provider from `ai_providers` table |
| Question text | `"test query for cache"` | Unique text to avoid collision with real data |
| Password | `"test-password-123"` | Never reuse production passwords |
| File URL (OCR) | `"https://example.com/test-aadhaar.png"` | Use a test-only file URL |

## Assertions

Common success assertions:

```bash
jq -e '.success == true'
jq -e '.accessToken | type == "string" and length > 0'
jq -e '.data != null'
jq -e '.session_id | type == "string" and length > 0'
jq -e '.deleted == true'
jq -e '.valid == true'
```

Common error assertions:

```bash
jq -e '.success == false and (.message | length > 0)'
jq -e '.detail | length > 0'
```

## Database assertions

For tests that mutate state, assert the smallest safe database effect:

- **Login** should not create new rows; only reads from `auth` and `schools`.
- **Change password** should update `auth.password` and set `auth.password_temp = false`.
- **Create session** should insert into `ai_chat_sessions` with the returned `session_id`.
- **Delete session** should remove the row from `ai_chat_sessions`.
- **Rename session** should update `ai_chat_sessions.title` and `updated_at`.
- **Archive session** should toggle `ai_chat_sessions.is_active`.
- **Update AI config** should upsert into `school_ai_config`.
- **Delete AI config** should remove the row from `school_ai_config`.
- **Invalidate cache** should delete from `ai_query_cache`.
- **Clear notification** should set `schools.notification = NULL`.
- **Ingest RAG document** should create document chunks in the vector store.

## Cleanup rules

- Prefer tests that use unique IDs and can be left as inactive test rows.
- For destructive tests, clean only the rows created by the test.
- Never clean shared demo or production schools.
- Keep cleanup commands out of committed docs unless they are safe and idempotent.
- AI sessions created during tests should be deleted in test teardown, or use uniquely identifiable titles.

## Environment-specific notes

- **Mock mode:** The OCR endpoint (`stubs.py`) returns mock data when no valid Gemini API key is configured. Tests for OCR should expect mock data in CI/dev environments.
- **Port conflict:** Python backend (8000) and Rust backend (8080) may run simultaneously. Ensure test scripts target the correct port.
- **DB session:** Auth endpoints (`auth.py`) and stubs endpoints (`stubs.py`) use `async_session_factory()` directly, not `get_db_with_rls`. This means they are not subject to RLS middleware tenant checks.
- **Catch-all route:** The stubs catch-all (`* /api/{full_path:path}`) will match any unregistered route. If a test gets a 404 with "not yet implemented", the route may not be registered in `python/app/main.py`.

## Never commit

- Real Gemini API keys, OpenAI keys, or any third-party API credentials.
- Real JWT secrets or signing keys.
- Production school IDs, passwords, or personal data.
- Database connection strings with credentials.
- The hardcoded key in `python/app/api/v1/stubs.py:71` is a mock key; do not replace it with a real key in docs.