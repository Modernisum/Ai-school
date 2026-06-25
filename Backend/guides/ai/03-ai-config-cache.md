# Python v1 AI Config, Cache & Suggest API Contract

Covers AI configuration management, query suggestions, cache invalidation, and health check endpoints from `python/app/api/v1/ai.py`.

Source:
- Router: `python/app/api/v1/ai.py:11`
- Orchestrator: `python/app/services/ai/orchestrator.py`

---

## `GET /api/school/{schoolId}/ai/suggest`

### Purpose

Get query suggestions based on partial input text, using cached query history.

### Auth

Bearer token via `get_db_with_rls`.

### Handler

`python/app/api/v1/ai.py:229-254`

### Path params

- `schoolId` (string, required): School tenant ID.

### Query params

| Param | Type | Required | Default | Description |
|---|---|---|---|---|
| `q` | string | yes (min 2 chars) | - | Partial query text to search |
| `limit` | int | no | `5` | Max suggestions to return |

### Expected success response

**Status:** `200`

```json
{
  "success": true,
  "suggestions": [
    {
      "text": "What is the attendance rate for class 10?",
      "count": 42,
      "similarity": 1.0
    },
    {
      "text": "What is the attendance trend this month?",
      "count": 15,
      "similarity": 1.0
    }
  ]
}
```

Empty query returns:

```json
{
  "success": true,
  "suggestions": []
}
```

### Important rules

- Uses PostgreSQL `ILIKE` for fast text matching against `ai_query_cache`.
- Matches both school-specific (`school_id = :sid`) and global (`school_id = 'GLOBAL'`) cached queries.
- Results ordered by `search_count DESC`.
- `similarity` is currently hardcoded to `1.0` (no semantic similarity).

### Test cases

#### TC_PYV1_AI_017 Suggest with partial query

- Type: positive
- Request:
  - Method: `GET`
  - Route: `/api/school/SCH-00021/ai/suggest?q=attend&limit=3`
  - Header: `Authorization: Bearer <token>`
- Expected HTTP status: `200`
- Expected response: `success == true`, `suggestions` is array, each item has `text`, `count`, `similarity`.

#### TC_PYV1_AI_018 Suggest with empty query

- Type: boundary
- Request:
  - Method: `GET`
  - Route: `/api/school/SCH-00021/ai/suggest?q=`
  - Header: `Authorization: Bearer <token>`
- Expected HTTP status: `200`
- Expected response: `success == true`, `suggestions` is an empty array.

---

## `POST /api/school/{schoolId}/ai/cache/invalidate`

### Purpose

Invalidate a cached AI response from both PostgreSQL and Redis.

### Auth

Bearer token via `get_db_with_rls`.

### Handler

`python/app/api/v1/ai.py:256-274`

### Path params

- `schoolId` (string, required): School tenant ID.

### Request body

```json
{
  "question_text": "What is the attendance rate for class 10?"
}
```

### Expected success response

**Status:** `200`

```json
{
  "success": true,
  "deleted_rows": 1
}
```

### Important rules

- Deletes from `ai_query_cache` where `question_text` matches AND (`school_id = :sid` OR `school_id = 'GLOBAL'`).
- Also calls Redis cache invalidation via `orchestrator.chat_handler.cache_service`.
- `deleted_rows` is the row count from PostgreSQL delete.

### Test cases

#### TC_PYV1_AI_019 Invalidate cache

- Type: positive
- Preconditions: A cached query exists for the question text.
- Request:
  - Method: `POST`
  - Route: `/api/school/SCH-00021/ai/cache/invalidate`
  - Header: `Authorization: Bearer <token>`
  - Body: `{ "question_text": "What is the attendance rate?" }`
- Expected HTTP status: `200`
- Expected response: `success == true`, `deleted_rows` >= 0.
- Database assertion: Row no longer exists in `ai_query_cache`.

---

## `GET /api/school/{schoolId}/ai/chat/config/{schoolId_2}`

### Purpose

Get AI provider configuration for the school, including which providers are configured.

### Auth

Bearer token via `get_db_with_rls`.

### Handler

`python/app/api/v1/ai.py:277-308`

### Path params

- `schoolId` (string, required): School tenant ID (used for the query).
- `schoolId_2` (string, required): **Currently unused** - the handler uses `schoolId` only.

### Expected success response

**Status:** `200`

```json
{
  "success": true,
  "data": [
    {
      "provider_id": 1,
      "provider_type": "openai",
      "provider_name": "OpenAI",
      "default_model": "gpt-4o",
      "embedding_model": "text-embedding-3-small",
      "max_monthly_cost": 100.0,
      "features_enabled": {"chat": true, "embedding": true},
      "is_configured": true
    },
    {
      "provider_id": 2,
      "provider_type": "gemini",
      "provider_name": "Google Gemini",
      "default_model": null,
      "embedding_model": null,
      "max_monthly_cost": null,
      "features_enabled": null,
      "is_configured": false
    }
  ]
}
```

### Important rules

- LEFT JOINs `ai_providers` (active only) with `school_ai_config`.
- `is_configured` is `true` when `default_model` is not null.
- `max_monthly_cost` is cast to float when not null.

### Test cases

#### TC_PYV1_AI_020 Get AI config

- Type: positive
- Request:
  - Method: `GET`
  - Route: `/api/school/SCH-00021/ai/chat/config/anyvalue`
  - Header: `Authorization: Bearer <token>`
- Expected HTTP status: `200`
- Expected response: `success == true`, `data` is array of provider objects with `provider_id`, `provider_type`, `is_configured`.

---

## `PUT /api/school/{schoolId}/ai/chat/config/{schoolId_2}`

### Purpose

Create or update AI provider configuration for a school. Uses upsert (INSERT ON CONFLICT).

### Auth

Bearer token via `get_db_with_rls`.

### Handler

`python/app/api/v1/ai.py:310-348`

### Path params

- `schoolId` (string, required): School tenant ID.
- `schoolId_2` (string, required): Currently unused.

### Request body

```json
{
  "provider_id": 1,
  "default_model": "gpt-4o",
  "embedding_model": "text-embedding-3-small",
  "max_monthly_cost": 100.0,
  "features_enabled": {
    "chat": true,
    "embedding": true
  }
}
```

All fields except `provider_id` are optional.

### Expected success response

**Status:** `200`

```json
{
  "success": true
}
```

### Expected error responses

Provider not active (HTTP 400):

```json
{
  "detail": "Provider not active or doesn't exist"
}
```

### Important rules

- Provider must exist and be active in `ai_providers` table.
- Uses `ON CONFLICT (school_id, provider_id) DO UPDATE` for upsert.
- `features_enabled` is stored as JSON string in the database.

### Test cases

#### TC_PYV1_AI_021 Update AI config

- Type: positive
- Preconditions: Active provider exists.
- Request:
  - Method: `PUT`
  - Route: `/api/school/SCH-00021/ai/chat/config/anyvalue`
  - Header: `Authorization: Bearer <token>`
  - Body: `{ "provider_id": 1, "default_model": "gpt-4o" }`
- Expected HTTP status: `200`
- Expected response: `success == true`.
- Database assertion: Row in `school_ai_config` updated.

#### TC_PYV1_AI_022 Update config with inactive provider

- Type: negative
- Preconditions: Provider ID is not active.
- Request:
  - Method: `PUT`
  - Route: `/api/school/SCH-00021/ai/chat/config/anyvalue`
  - Header: `Authorization: Bearer <token>`
  - Body: `{ "provider_id": 999 }`
- Expected HTTP status: `400`
- Expected response: `detail == "Provider not active or doesn't exist"`.

---

## `DELETE /api/school/{schoolId}/ai/chat/config/{schoolId_2}/{providerId}`

### Purpose

Delete a school's AI provider configuration.

### Auth

Bearer token via `get_db_with_rls`.

### Handler

`python/app/api/v1/ai.py:350-366`

### Path params

- `schoolId` (string, required): School tenant ID.
- `schoolId_2` (string, required): Currently unused.
- `providerId` (int, required): Provider ID to remove config for.

### Expected success response

**Status:** `200`

```json
{
  "success": true,
  "deleted": true
}
```

If no config existed:

```json
{
  "success": true,
  "deleted": false
}
```

### Test cases

#### TC_PYV1_AI_023 Delete AI config

- Type: positive
- Preconditions: Config exists for the school and provider.
- Request:
  - Method: `DELETE`
  - Route: `/api/school/SCH-00021/ai/chat/config/anyvalue/1`
  - Header: `Authorization: Bearer <token>`
- Expected HTTP status: `200`
- Expected response: `success == true`, `deleted == true`.
- Database assertion: Row no longer exists in `school_ai_config`.

---

## `GET /api/school/{schoolId}/ai/chat/health/{schoolId_2}`

### Purpose

Health check returning active AI provider systems.

### Auth

Bearer token via `get_db_with_rls`.

### Handler

`python/app/api/v1/ai.py:368-382`

### Path params

- `schoolId` (string, required): School tenant ID (unused in query).
- `schoolId_2` (string, required): Currently unused.

### Expected success response

**Status:** `200`

```json
{
  "success": true,
  "data": {
    "health": "OK",
    "active_providers": [
      { "type": "openai", "name": "OpenAI" },
      { "type": "gemini", "name": "Google Gemini" }
    ]
  }
}
```

### Important rules

- Query is not scoped to `schoolId` - returns all active providers globally.
- The `schoolId` and `schoolId_2` path params are accepted but not used in the query.

### Test cases

#### TC_PYV1_AI_024 AI health check

- Type: positive
- Request:
  - Method: `GET`
  - Route: `/api/school/SCH-00021/ai/chat/health/anyvalue`
  - Header: `Authorization: Bearer <token>`
- Expected HTTP status: `200`
- Expected response: `success == true`, `data.health == "OK"`, `data.active_providers` is an array.