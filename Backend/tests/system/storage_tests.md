# System API — Storage Tests

> **⚠️ NOTE**: Storage routes are currently nested under `/api/auth/storage/` (this is a known bug — they should be under `/api/storage/`).

---

## Actual Route Table

| # | Endpoint | Method | Handler |
|---|----------|--------|---------|
| 1 | `/api/auth/storage/upload` | POST | `storage::upload_file` |
| 2 | `/api/auth/storage/files` | GET | `storage::list_files` |
| 3 | `/api/auth/storage/files/:id` | DELETE | `storage::delete_file` |
| 4 | `/api/auth/storage/file-by-url` | DELETE | `storage::delete_file_by_url` |

---

## Test: Upload File

- **Endpoint**: `POST /api/auth/storage/upload`
- **Params**: `school_id=689225&user_type=teacher`
- **Expected**: 200, public URL

```bash
echo "test content" > /tmp/test_upload.txt
curl -s -X POST http://localhost:8080/api/auth/storage/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/test_upload.txt" \
  -F "school_id=689225" \
  -F "user_type=teacher" | jq .
```

```json
{
  "success": true,
  "data": {
    "public_url": "http://localhost:8080/uploads/689225/abc123_test_upload.txt",
    "file_name": "test_upload.txt",
    "size_bytes": 12
  }
}
```

---

## Test: List Files

- **Endpoint**: `GET /api/auth/storage/files`
- **Expected**: 200

```bash
curl -s http://localhost:8080/api/auth/storage/files \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" | jq .
```

---

## Test: Delete File by URL

- **Endpoint**: `DELETE /api/auth/storage/file-by-url`
- **Expected**: 200

```bash
curl -s -X DELETE "http://localhost:8080/api/auth/storage/file-by-url?url=http://localhost:8080/uploads/689225/abc123_test_upload.txt" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" | jq .
```

---

## Test: Delete File by ID

- **Endpoint**: `DELETE /api/auth/storage/files/{fileId}`
- **Expected**: 200

```bash
curl -s -X DELETE http://localhost:8080/api/auth/storage/files/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: 689225" | jq .
```

---

## Test: Upload Large File (should be rejected)

- **Endpoint**: `POST /api/auth/storage/upload`
- **File**: >50MB
- **Expected**: 413 Payload Too Large

```bash
dd if=/dev/zero of=/tmp/large_file.bin bs=1M count=51 2>/dev/null
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8080/api/auth/storage/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/large_file.bin" \
  -F "school_id=689225" \
  -F "user_type=teacher"
rm /tmp/large_file.bin
```

---

## ⚠️ Issues Found

| # | Issue | Severity |
|---|-------|----------|
| 1 | **`/api/system/storage/upload`** used in large file test — this route DOES NOT EXIST | **Fixed → used `/api/auth/storage/upload`** |
| 2 | **Storage routes mislocated** under `/api/auth/storage/` instead of `/api/storage/` | Medium (known bug) |
| 3 | Missing delete by ID route (`/auth/storage/files/:id`) not documented | **Fixed — added** |
