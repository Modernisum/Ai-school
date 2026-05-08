# System API — Storage Tests

## Test: Upload File

- **Endpoint**: `POST /api/system/storage/upload`
- **Params**: `school_id=TEST001&user_type=teacher`
- **Expected**: 200, public URL

```bash
echo "test content" > /tmp/test_upload.txt
curl -s -X POST http://localhost:8080/api/system/storage/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/test_upload.txt" \
  -F "school_id=TEST001" \
  -F "user_type=teacher" | jq .
```

```json
{
  "success": true,
  "data": {
    "public_url": "http://localhost:8080/uploads/TEST001/abc123_test_upload.txt",
    "file_name": "test_upload.txt",
    "size_bytes": 12
  }
}
```

---

## Test: Mark File as Permanent

- **Endpoint**: `POST /api/system/storage/mark-permanent`
- **Expected**: 200

```bash
curl -s -X POST http://localhost:8080/api/system/storage/mark-permanent \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" \
  -H "Content-Type: application/json" \
  -d '{
    "school_id": "TEST001",
    "file_url": "http://localhost:8080/uploads/TEST001/abc123_test_upload.txt"
  }' | jq .
```

---

## Test: List Files

- **Endpoint**: `GET /api/system/TEST001/files`
- **Expected**: 200

```bash
curl -s http://localhost:8080/api/system/TEST001/files \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" | jq .
```

---

## Test: Delete File by URL

- **Endpoint**: `DELETE /api/system/storage/delete`
- **Expected**: 200

```bash
curl -s -X DELETE http://localhost:8080/api/system/storage/delete \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-School-ID: TEST001" \
  -H "Content-Type: application/json" \
  -d '{
    "school_id": "TEST001",
    "file_url": "http://localhost:8080/uploads/TEST001/abc123_test_upload.txt"
  }' | jq .
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
  -F "school_id=TEST001" \
  -F "user_type=teacher"
rm /tmp/large_file.bin
```
