# Python v1 API Contract Index

This index is the route map for every endpoint registered in `python/app/api/v1/`. Each linked file contains request contracts, expected responses, error behavior, workflow rules, and test cases.

All routers are mounted in `python/app/main.py:62-65`:

- `ai_router` → `/api`
- `academic_router` → `/api`
- `auth_router` → already has `/api/auth` prefix on the router
- `stubs_router` → no prefix (catch-all last)

Server runs on `http://localhost:8000` by default (`python/main.py:4`).

## Route groups

| Group | File | Routes covered | Main workflow |
|---|---|---|---|
| Auth | [01-auth.md](./01-auth.md) | `POST /api/auth/school/login`, `POST /api/auth/school`, `POST /api/auth/school/verify-token`, `POST /api/auth/refresh`, `POST /api/auth/school/logout`, `POST /api/auth/logout`, `POST /api/auth/school/change-password` | School admin login, token management, logout, password change |
| AI Stateless & Sessions | [02-ai-stateless-sessions.md](./02-ai-stateless-sessions.md) | `POST /api/school/{schoolId}/query`, `POST /api/school/{schoolId}/ai/session`, `GET /api/school/{schoolId}/ai/sessions`, `GET /api/school/{schoolId}/ai/session/{sessionId}/history`, `POST /api/school/{schoolId}/ai/session/{sessionId}/query`, `POST /api/school/{schoolId}/ai/session/{sessionId}/query/stream`, `DELETE /api/school/{schoolId}/ai/session/{sessionId}`, `PUT /api/school/{schoolId}/ai/session/{sessionId}`, `PATCH /api/school/{schoolId}/ai/session/{sessionId}/archive` | General AI query, chat session CRUD, streaming |
| AI Config & Cache | [03-ai-config-cache.md](./03-ai-config-cache.md) | `GET /api/school/{schoolId}/ai/suggest`, `POST /api/school/{schoolId}/ai/cache/invalidate`, `GET /api/school/{schoolId}/ai/chat/config/{schoolId_2}`, `PUT /api/school/{schoolId}/ai/chat/config/{schoolId_2}`, `DELETE /api/school/{schoolId}/ai/chat/config/{schoolId_2}/{providerId}`, `GET /api/school/{schoolId}/ai/chat/health/{schoolId_2}` | Query suggestions, cache invalidation, AI provider config CRUD, health check |
| AI Embedding & RAG | [04-ai-embedding-rag.md](./04-ai-embedding-rag.md) | `POST /api/school/{schoolId}/ai/chat/embedding/{schoolId_2}`, `POST /api/school/{schoolId}/ai/chat/embedding/{schoolId_2}/search`, `POST /api/school/{schoolId}/ai/chat/rag/ingest/{schoolId_2}` | Generate embeddings, semantic search, RAG document ingestion |
| AI Tasks & Exams | [05-ai-tasks-exams.md](./05-ai-tasks-exams.md) | `POST /api/school/{schoolId}/ai/chat/{schoolId_2}/tasks/generate`, `POST /api/school/{schoolId}/ai/chat/{schoolId_2}/tasks/reorganize`, `POST /api/school/{schoolId}/ai/chat/{schoolId_2}/exam/generate` | AI weekly task generation, task reorganization, exam generation (AI router) |
| Academic | [06-academic.md](./06-academic.md) | `POST /api/school/{schoolId}/academic/exams/ai/generate`, `POST /api/school/{schoolId}/academic/exams/ai/regenerate-question`, `POST /api/school/{schoolId}/academic/exams/submit-test`, `POST /api/school/{schoolId}/academic/syllabus/{responsibilityId}/plot`, `POST /api/school/{schoolId}/academic/syllabus/{responsibilityId}/micro-plan`, `POST /api/school/{schoolId}/academic/period-plans/restructure` | AI exam generation, auto-grading, syllabus planning, period restructure |
| Stubs | [07-stubs.md](./07-stubs.md) | `GET /api/school/{school_id}/notification`, `DELETE /api/school/{school_id}/notification`, `POST /api/school/{school_id}/ai/ocr`, `* /api/{full_path:path}` | School notifications, OCR document extraction, catch-all for unported routes |
| Test format | [08-test-case-format.md](./08-test-case-format.md) | Shared test-case template | Standard format for all Python v1 tests |
| Test data | [09-test-data.md](./09-test-data.md) | Shared test data rules | Disposable schools, tokens, and environment notes |

## Common response shape

Most success responses use:

```json
{
  "success": true,
  "message": "..."
}
```

Or with data wrapper:

```json
{
  "success": true,
  "data": {}
}
```

Most error responses use:

```json
{
  "success": false,
  "message": "Error description"
}
```

HTTP status codes used:
- `200` - Success
- `400` - Bad request / validation error
- `401` - Unauthorized / invalid credentials
- `404` - Route not yet implemented (catch-all)
- `500` - Internal server error

## Auth

Python v1 uses JWT-based stateless auth. The `get_db_with_rls` dependency in `python/app/middleware/rls.py` enforces tenant isolation. Endpoints that require auth typically have `Depends(get_db_with_rls)` or check `Authorization` header manually.

## Important current-code notes

- `python/app/api/v1/auth.py` does NOT use `get_db_with_rls`; it opens its own DB session via `async_session_factory()`. This means auth endpoints are not tenant-scoped by the middleware.
- `python/app/api/v1/auth.py:20-21` - `POST /api/auth/school/login` and `POST /api/auth/school` are the same handler (decorator alias).
- `python/app/api/v1/auth.py:132-133` - `POST /api/auth/school/logout` and `POST /api/auth/logout` are the same handler.
- `python/app/api/v1/ai.py` has many routes with duplicate `{schoolId_2}` path params (e.g., `GET /api/school/{schoolId}/ai/chat/config/{schoolId_2}`). The second param is currently unused - the handler uses `schoolId` only.
- `python/app/api/v1/ai.py:61` has a dead code comment `uuid_v4_placeholder_or_uuid()` before `import uuid` on line 62.
- `python/app/api/v1/stubs.py:179` catch-all route will shadow any route not explicitly registered before it. Order matters in `python/app/main.py:62-65`.
- `python/app/api/v1/stubs.py:71` contains a hardcoded Gemini API key (`AIzaSyAcpd2loWLizjNP1TgenvHiA7WbaEguvbU`). This should be treated as a mock/test key and never used in production.
- The Python backend runs on port `8000` while Rust runs on `8080`. Test curl commands must use the correct port.
- `python/app/api/v1/academic.py` re-instantiates `AiOrchestrator()` on line 10 while `ai.py` also does on line 12. These are separate instances.