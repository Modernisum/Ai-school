# Resources API — Document Tests

> Base URL: `/api/school/{schoolId}/resources/documents`
> Auth: `X-School-ID` + `X-Admin-ID` headers (RLS middleware)
> Test school: `689225`

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────────┐
│  routes/document_upload.rs     HTTP Handler (upload)       │
│  routes/documentbox.rs         HTTP Handler (list)         │
│  (src/routes/)                                             │
├────────────────────────────────────────────────────────────┤
│  logic/storage_engine.rs       StorageEngine               │
│  (src/logic/storage_engine.rs) File storage (S3/local)    │
├────────────────────────────────────────────────────────────┤
│  repository/resource_repo.rs   SQL queries for documents   │
└────────────────────────────────────────────────────────────┘
```

---

## Document: Upload

- **Endpoint**: `POST /api/school/689225/resources/documents/upload`
- **Method**: POST
- **Handler**: `document_upload::upload_document` (`src/routes/document_upload.rs:9`)
- **Body**: `multipart/form-data`

### Call Chain

| Step | File | Line | Code |
|------|------|------|------|
| 1. Handler | `routes/document_upload.rs` | 9+ | Extracts file from multipart |
| 2. Handler | `routes/document_upload.rs` | ... | `storage.upload(file)` — saves to disk/S3 |
| 3. Handler | `routes/document_upload.rs` | ... | `repo.save_document_metadata(...)` |

### Action Check — Bug Found! ❌
- **Worth it?** ✅ Yes — document management
- **Bug?** ❌ **No download endpoint** — uploaded files cannot be retrieved via API
- **Bug?** ❌ **No delete endpoint** — uploaded files cannot be removed
- **Bug?** ❌ **No file type validation** — should restrict to PDF/images

### Usage
```bash
curl -s -X POST "http://localhost:8080/api/school/689225/resources/documents/upload" \
  -H "X-School-ID: 689225" \
  -H "X-Admin-ID: admin1" \
  -F "file=@/path/to/document.pdf" \
  -F "spaceName=PhysicsLab-A" \
  -F "category=invoice" | jq .
```

---

## Document: Upload (by Student)

- **Endpoint**: `POST /api/school/689225/resources/documents/upload/student/{studentId}`
- **Method**: POST
- **Handler**: Same handler as above (`document_upload::upload_document`)

### Action Check ⚠️
- **Worth it?** ✅ Yes — student-specific documents
- **Bug?** ⚠️ Same issues as general upload (no download, no delete)

### Usage
```bash
curl -s -X POST "http://localhost:8080/api/school/689225/resources/documents/upload/student/STU001" \
  -H "X-School-ID: 689225" \
  -H "X-Admin-ID: admin1" \
  -F "file=@/path/to/report.pdf" | jq .
```

---

## Document: List

- **Endpoint**: `GET /api/school/689225/resources/documents/box`
- **Method**: GET
- **Handler**: `documentbox::list_documents` (`src/routes/documentbox.rs:9`)

### Call Chain

| Step | File | Line | Code |
|------|------|------|------|
| 1. Handler | `routes/documentbox.rs` | 14 | `repo.list_documents(school_id)` |
| 2. Repo impl | `repository/resource_repo.rs` | (search) | `SELECT * FROM documents WHERE school_id = $1` |

### Action Check ⚠️
- **Worth it?** ✅ Yes — document inventory
- **Bug?** ⚠️ No pagination, no search/filter

### Usage
```bash
curl -s "http://localhost:8080/api/school/689225/resources/documents/box" \
  -H "X-School-ID: 689225" \
  -H "X-Admin-ID: admin1" | jq .
```

---

## ⚠️ All Issues Found

| # | Issue | Severity | Fix |
|---|-------|----------|-----|
| 1 | **No download endpoint** — can't retrieve uploaded files | **High** | Add `GET /documents/{id}/download` |
| 2 | **No delete endpoint** — can't remove uploaded files | **High** | Add `DELETE /documents/{id}` |
| 3 | **No file type validation** | Medium | Restrict to PDF, images in handler |
| 4 | No pagination on list | Low | Add `?page=` and `?limit=` |
| 5 | Document routes feel disconnected from "resources" module | Low | Consider separate `/documents` module |
