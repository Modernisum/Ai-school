# Python v1 AI Embedding, Search & RAG API Contract

Covers embedding generation, semantic document search, and RAG document ingestion endpoints from `python/app/api/v1/ai.py`.

Source:
- Router: `python/app/api/v1/ai.py:11`
- Orchestrator: `python/app/services/ai/orchestrator.py`

---

## `POST /api/school/{schoolId}/ai/chat/embedding/{schoolId_2}`

### Purpose

Generate a vector embedding for a given text input.

### Auth

Bearer token via `get_db_with_rls`.

### Handler

`python/app/api/v1/ai.py:385-399`

### Path params

- `schoolId` (string, required): School tenant ID.
- `schoolId_2` (string, required): Currently unused.

### Request body

```json
{
  "text": "The quick brown fox jumps over the lazy dog"
}
```

### Expected success response

**Status:** `200`

```json
{
  "success": true,
  "data": [0.0123, -0.0456, 0.0789, ...]
}
```

### Expected error responses

Missing text (HTTP 400):

```json
{
  "detail": "text is required"
}
```

### Important rules

- Embedding is generated via `orchestrator.generate_embedding()`.
- The returned `data` is a list of floats representing the embedding vector.

### Test cases

#### TC_PYV1_AI_025 Generate embedding

- Type: positive
- Request:
  - Method: `POST`
  - Route: `/api/school/SCH-00021/ai/chat/embedding/anyvalue`
  - Header: `Authorization: Bearer <token>`
  - Body: `{ "text": "Sample text for embedding" }`
- Expected HTTP status: `200`
- Expected response: `success == true`, `data` is an array of floats.

#### TC_PYV1_AI_026 Generate embedding empty text

- Type: negative
- Request:
  - Method: `POST`
  - Route: `/api/school/SCH-00021/ai/chat/embedding/anyvalue`
  - Header: `Authorization: Bearer <token>`
  - Body: `{ "text": "" }`
- Expected HTTP status: `400`
- Expected response: `detail == "text is required"`.

---

## `POST /api/school/{schoolId}/ai/chat/embedding/{schoolId_2}/search`

### Purpose

Perform semantic search over ingested documents.

### Auth

Bearer token via `get_db_with_rls`.

### Handler

`python/app/api/v1/ai.py:401-417`

### Path params

- `schoolId` (string, required): School tenant ID.
- `schoolId_2` (string, required): Currently unused.

### Request body

```json
{
  "query": "attendance policies",
  "limit": 5
}
```

`limit` defaults to `5` if not provided.

### Expected success response

**Status:** `200`

```json
{
  "success": true,
  "data": [
    {
      "document_id": "doc_001",
      "content": "Attendance policy states...",
      "score": 0.92,
      "metadata": {}
    }
  ]
}
```

### Expected error responses

Missing query (HTTP 400):

```json
{
  "detail": "query is required"
}
```

### Important rules

- Search is performed via `orchestrator.search_documents()`.
- The `schoolId` is passed for tenant isolation.

### Test cases

#### TC_PYV1_AI_027 Search documents

- Type: positive
- Request:
  - Method: `POST`
  - Route: `/api/school/SCH-00021/ai/chat/embedding/anyvalue/search`
  - Header: `Authorization: Bearer <token>`
  - Body: `{ "query": "attendance", "limit": 3 }`
- Expected HTTP status: `200`
- Expected response: `success == true`, `data` is an array.

#### TC_PYV1_AI_028 Search without query

- Type: negative
- Request:
  - Method: `POST`
  - Route: `/api/school/SCH-00021/ai/chat/embedding/anyvalue/search`
  - Header: `Authorization: Bearer <token>`
  - Body: `{}`
- Expected HTTP status: `400`
- Expected response: `detail == "query is required"`.

---

## `POST /api/school/{schoolId}/ai/chat/rag/ingest/{schoolId_2}`

### Purpose

Ingest a document into the RAG (Retrieval Augmented Generation) system for later semantic search.

### Auth

Bearer token via `get_db_with_rls`.

### Handler

`python/app/api/v1/ai.py:419-430`

### Path params

- `schoolId` (string, required): School tenant ID.
- `schoolId_2` (string, required): Currently unused.

### Request body

```json
{
  "content": "The school attendance policy requires students to maintain 75% attendance...",
  "metadata": {
    "source": "school_policy_doc",
    "category": "attendance"
  }
}
```

### Expected success response

**Status:** `200`

```json
{
  "success": true,
  "data": {
    "document_id": "doc_002",
    "chunks": 3,
    "status": "ingested"
  }
}
```

### Important rules

- Ingestion is handled by `orchestrator.analysis.ingest_document()`.
- `metadata` is optional and can be any JSON object.

### Test cases

#### TC_PYV1_AI_029 Ingest document

- Type: positive
- Request:
  - Method: `POST`
  - Route: `/api/school/SCH-00021/ai/chat/rag/ingest/anyvalue`
  - Header: `Authorization: Bearer <token>`
  - Body: `{ "content": "Policy document text...", "metadata": { "source": "handbook" } }`
- Expected HTTP status: `200`
- Expected response: `success == true`, `data` is an object with ingestion result.

#### TC_PYV1_AI_030 Ingest document without metadata

- Type: positive
- Request:
  - Method: `POST`
  - Route: `/api/school/SCH-00021/ai/chat/rag/ingest/anyvalue`
  - Header: `Authorization: Bearer <token>`
  - Body: `{ "content": "Simple document text" }`
- Expected HTTP status: `200`
- Expected response: `success == true`.