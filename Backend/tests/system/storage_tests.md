# System API — Storage Tests

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

## Test: Upload Large File (should be rejected)

- **Endpoint**: `POST /api/system/storage/upload`
- **File**: >50MB
- **Expected**: 413 Payload Too Large

```bash
dd if=/dev/zero of=/tmp/large_file.bin bs=1M count=51 2>/dev/null
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8080/api/system/storage/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/large_file.bin" \
  -F "school_id=689225" \
  -F "user_type=teacher"
rm /tmp/large_file.bin
```
