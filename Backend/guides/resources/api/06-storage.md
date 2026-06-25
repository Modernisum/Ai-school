# Storage API

Base path: `/school/:schoolId/resources/storage`

Storage provides file upload, listing, and deletion with tenant isolation, duplicate detection, and security hardening.

---

## Allowed MIME Types

The upload endpoint accepts only these content types:

| Category | Types |
|----------|-------|
| Images | `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `image/svg+xml` |
| Documents | `application/pdf` |
| Video | `video/mp4` |
| Data | `text/csv`, `text/plain` |

---

## 1. Upload File

```
POST /school/:schoolId/resources/storage/upload
```

**Auth:** Required (`TenantContext`)

**Content-Type:** `multipart/form-data`

**Form Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | file | Yes | The file to upload |
| `profile` | file | No | Profile image upload |
| `material` | file | No | Material attachment upload |
| `complain` | file | No | Complaint attachment upload |

**Folder Categorization (based on field name):**

| Field Name Contains | Upload Folder |
|--------------------|---------------|
| `profile` | `profiles/` |
| `material` | `materials/` |
| `complain` | `complains/` |
| anything else | `misc/` |

**Security Features:**
1. **Filename sanitization:** Removes path traversal (`../`), null bytes, control characters. Only alphanumeric, dash, underscore, dot, and space allowed. Prevents hidden files. Max 200 chars.
2. **MIME whitelist:** Rejects any content type not in the allowed list.
3. **Duplicate detection:** Redis-first (sub-millisecond), then DB fallback. Returns existing URL if hash matches.
4. **Tenant isolation:** Metadata is linked to `school_id` and `user_id` from `TenantContext`.

**Expected Response (200) - Single File Success:**
```json
{
  "url": "https://cdn.example.com/uploads/misc/abc123.jpg"
}
```

**Expected Response (200) - Duplicate File:**
```json
{
  "url": "https://cdn.example.com/uploads/misc/abc123.jpg"
}
```

**Error Response (400) - Invalid File Type:**
```json
{
  "success": false,
  "message": "File type 'application/x-msdownload' is not allowed. Only images (JPG, PNG, WebP, GIF, SVG), PDF, MP4, CSV, and TXT are permitted."
}
```

**Error Response (400) - Invalid Filename:**
```json
{
  "success": false,
  "message": "Invalid filename. Only alphanumeric characters, dots, hyphens, and spaces are allowed."
}
```

**Error Response (400) - No Files:**
```json
{
  "success": false,
  "message": "No valid files found in request"
}
```

**Test Cases:**
```yaml
name: "Upload valid image file"
request:
  method: POST
  url: "/school/school-123/resources/storage/upload"
  multipart:
    - field: "file"
      filename: "test-image.jpg"
      content_type: "image/jpeg"
      data: <binary image data>
expect:
  status: 200
  body:
    url: string

name: "Upload with forbidden file type"
request:
  method: POST
  url: "/school/school-123/resources/storage/upload"
  multipart:
    - field: "file"
      filename: "malware.exe"
      content_type: "application/x-msdownload"
      data: <binary data>
expect:
  status: 400
  body:
    success: false

name: "Upload with path traversal filename"
request:
  method: POST
  url: "/school/school-123/resources/storage/upload"
  multipart:
    - field: "file"
      filename: "../../../etc/passwd"
      content_type: "text/plain"
      data: "test"
expect:
  status: 400
  body:
    success: false

name: "Upload duplicate file (Redis cache hit)"
prerequisites:
  - Upload the same file first time
request:
  method: POST
  url: "/school/school-123/resources/storage/upload"
  multipart:
    - field: "file"
      filename: "test-image.jpg"
      content_type: "image/jpeg"
      data: <same binary as first upload>
expect:
  status: 200
  body:
    url: string
    # URL should match the first upload's URL

name: "Upload file to profile folder"
request:
  method: POST
  url: "/school/school-123/resources/storage/upload"
  multipart:
    - field: "profile"
      filename: "avatar.jpg"
      content_type: "image/jpeg"
      data: <binary image data>
expect:
  status: 200
  body:
    url: string
```

---

## 2. List Files

```
GET /school/:schoolId/resources/storage/files
```

**Auth:** Required (`TenantContext`)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `school_id` | string | No | Filter by school (super admins only) |
| `user_id` | string | No | Filter by user (super admins only) |

**Tenant Isolation Rules:**

| User Type | `school_id` Filter | `user_id` Filter |
|-----------|--------------------|--------------------|
| Super Admin | From query param (optional) | From query param (optional) |
| Regular User | Locked to their school | Locked to their user ID |

**Expected Response (200):**
```json
{
  "success": true,
  "files": [
    {
      "id": 1,
      "file_name": "test-image.jpg",
      "content_type": "image/jpeg",
      "file_size": 102400,
      "file_path": "uploads/misc/abc123.jpg",
      "public_url": "https://cdn.example.com/uploads/misc/abc123.jpg",
      "school_id": "school-123",
      "user_id": "admin-1",
      "created_at": "2026-06-21T10:00:00Z"
    }
  ]
}
```

**Error Response (500):**
```json
{
  "success": false,
  "message": "Error description"
}
```

**Test Cases:**
```yaml
name: "List files as regular user"
request:
  method: GET
  url: "/school/school-123/resources/storage/files"
expect:
  status: 200
  body:
    success: true
    files: array

name: "List files as super admin with optional filters"
note: "Requires super admin token"
request:
  method: GET
  url: "/school/school-123/resources/storage/files?school_id=school-456"
expect:
  status: 200
  body:
    success: true
    files: array
```

---

## 3. Delete File by ID

```
DELETE /school/:schoolId/resources/storage/files/:id
```

**Auth:** Required (`TenantContext`)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `schoolId` | string | School identifier |
| `id` | integer | File metadata ID |

**Tenant Isolation:** Non-super-admins can only delete files belonging to their own school. Super admins can delete any file.

**Expected Response (200):**
```json
{
  "success": true,
  "message": "File deleted"
}
```

**Error Response (403 - Access Denied):**
```json
{
  "success": false,
  "message": "Access Denied: You do not own this file"
}
```

**Error Response (404):**
```json
{
  "success": false,
  "message": "File not found"
}
```

**Error Response (500):**
```json
{
  "success": false,
  "message": "Error description"
}
```

**Note:** Deletes the file from disk first, then removes the DB metadata record. If disk deletion fails, the DB record is still removed.

**Test Cases:**
```yaml
name: "Delete file by ID"
prerequisites:
  - Upload a file and note its id
request:
  method: DELETE
  url: "/school/school-123/resources/storage/files/1"
expect:
  status: 200
  body:
    success: true
    message: "File deleted"

name: "Delete file from another school's tenant"
note: "Requires a regular user token from school-456"
prerequisites:
  - Upload a file as school-123 user
request:
  method: DELETE
  url: "/school/school-456/resources/storage/files/1"
  # Using school-456 user's auth token
expect:
  status: 403
  body:
    success: false
    message: "Access Denied: You do not own this file"

name: "Delete non-existent file"
request:
  method: DELETE
  url: "/school/school-123/resources/storage/files/99999"
expect:
  status: 404
  body:
    success: false
    message: "File not found"
```

---

## 4. Delete File by URL

```
DELETE /school/:schoolId/resources/storage/file-by-url
```

**Auth:** Required (`TenantContext`)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | The public URL of the file to delete |

**Tenant Isolation:** The deletion is scoped to the tenant's `school_id`. Only files belonging to the current school can be deleted via this endpoint.

**Expected Response (200):**
```json
{
  "success": true,
  "message": "File reference removed"
}
```

**Error Response (500):**
```json
{
  "success": false,
  "message": "Error description"
}
```

**Test Cases:**
```yaml
name: "Delete file by URL"
prerequisites:
  - Upload a file and get its URL
request:
  method: DELETE
  url: "/school/school-123/resources/storage/file-by-url?url=https%3A%2F%2Fcdn.example.com%2Fuploads%2Fmisc%2Fabc123.jpg"
expect:
  status: 200
  body:
    success: true
    message: "File reference removed"

name: "Delete file by URL from wrong school"
prerequisites:
  - Upload a file as school-123, get its URL
request:
  method: DELETE
  url: "/school/school-456/resources/storage/file-by-url?url=https%3A%2F%2Fcdn.example.com%2Fuploads%2Fmisc%2Fabc123.jpg"
  # Using school-456 user's auth token
expect:
  status: 500
  body:
    success: false
```

---

## 5. Serve Uploaded Files (Static)

```
GET /school/:schoolId/resources/storage/uploads/*
```

**Auth:** `upload_auth_middleware`

**Description:** Serves static files from the configured `UPLOAD_DIR` (defaults to `./uploads`). This is a `nest_service` that mounts the `tower_http::services::ServeDir`.

**Configuration:**
- Environment variable: `UPLOAD_DIR` (default: `./uploads`)

**Test Case:**
```yaml
name: "Serve uploaded file"
prerequisites:
  - Upload a file to storage
request:
  method: GET
  url: "/school/school-123/resources/storage/uploads/misc/abc123.jpg"
  headers:
    # Required upload auth headers
expect:
  status: 200
  content_type: "image/jpeg"
```