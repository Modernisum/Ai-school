# Storage & Upload Management APIs - Expected Responses

## Authentication Requirements
- **Authentication:** RLS (Row Level Security) middleware
- **Required Headers:**
  - `X-School-ID`: School identifier
  - `X-Admin-ID`: Admin user identifier
- **Upload Token:** Not required for basic uploads (uses RLS auth)

## 1. POST /api/storage/upload - Upload File (Multipart)

### Request Format
- **Method:** POST
- **Content-Type:** multipart/form-data
- **Parameters:**
  - `file`: File to upload (required)
  - `folder`: Optional folder name (e.g., "documents", "images")

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "url": "https://storage.example.com/files/abc123def456.jpg",
  "file_id": "789",
  "file_name": "test-image.jpg",
  "size": 102400,
  "content_type": "image/jpeg"
}
```

### Duplicate File Response
```json
{
  "success": true,
  "url": "https://storage.example.com/files/abc123def456.jpg",
  "file_id": "789",
  "file_name": "test-image.jpg",
  "duplicate": true
}
```

### Response Structure
- **success:** Boolean indicating operation status
- **url:** Public URL to access the uploaded file
- **file_id:** Database ID of the file record
- **file_name:** Original filename
- **size:** File size in bytes (optional)
- **content_type:** MIME type of the file (optional)
- **duplicate:** Boolean indicating if file was a duplicate (optional)

### Error Responses
- **400 Bad Request:** No file provided, invalid file type, or file too large
- **401 Unauthorized:** Missing or invalid RLS headers
- **413 Payload Too Large:** File exceeds size limit
- **415 Unsupported Media Type:** File type not allowed
- **500 Internal Server Error:** Storage service failure

## 2. GET /api/storage/files - List Files

### Request Format
- **Method:** GET
- **Query Parameters:**
  - `school_id`: Optional filter by school
  - `user_id`: Optional filter by user

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "files": [
    {
      "id": "123",
      "school_id": "school_001",
      "user_id": "admin_001",
      "file_name": "document.pdf",
      "file_size": 204800,
      "content_type": "application/pdf",
      "public_url": "https://storage.example.com/files/abc123.pdf",
      "uploaded_at": "2024-01-15T10:30:00Z",
      "folder": "documents"
    },
    {
      "id": "124",
      "school_id": "school_001",
      "user_id": "admin_001",
      "file_name": "image.jpg",
      "file_size": 51200,
      "content_type": "image/jpeg",
      "public_url": "https://storage.example.com/files/def456.jpg",
      "uploaded_at": "2024-01-15T11:15:00Z",
      "folder": "images"
    }
  ]
}
```

### Response Structure
- **success:** Boolean indicating operation status
- **files:** Array of file metadata objects
  - **id:** File database ID
  - **school_id:** School identifier
  - **user_id:** User who uploaded the file
  - **file_name:** Original filename
  - **file_size:** Size in bytes
  - **content_type:** MIME type
  - **public_url:** Public access URL
  - **uploaded_at:** ISO 8601 timestamp
  - **folder:** Storage folder (optional)

### Error Responses
- **401 Unauthorized:** Missing or invalid RLS headers
- **500 Internal Server Error:** Database query failure

## 3. DELETE /api/storage/files/:id - Delete File by ID

### Request Format
- **Method:** DELETE
- **Path Parameter:** `id` - File database ID

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "message": "File deleted"
}
```

### Response Structure
- **success:** Boolean indicating operation status
- **message:** Descriptive message

### Error Responses
- **401 Unauthorized:** Missing or invalid RLS headers
- **403 Forbidden:** File doesn't belong to user's school
- **404 Not Found:** File with given ID not found
- **500 Internal Server Error:** File deletion failure

## 4. DELETE /api/storage/file-by-url - Delete File by URL

### Request Format
- **Method:** DELETE
- **Query Parameter:** `url` - Public URL of the file

### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "message": "File reference removed"
}
```

### Response Structure
- **success:** Boolean indicating operation status
- **message:** Descriptive message

### Error Responses
- **400 Bad Request:** Missing URL parameter
- **401 Unauthorized:** Missing or invalid RLS headers
- **403 Forbidden:** File doesn't belong to user's school
- **404 Not Found:** File with given URL not found
- **500 Internal Server Error:** Database deletion failure

## Test Data Dependencies

### Sample File Data
```json
{
  "test_files": [
    {
      "id": "123",
      "school_id": "school_001",
      "user_id": "admin_001",
      "file_name": "test-document.pdf",
      "file_size": 204800,
      "content_type": "application/pdf",
      "public_url": "https://storage.example.com/files/test123.pdf",
      "uploaded_at": "2024-01-15T10:30:00Z"
    },
    {
      "id": "124",
      "school_id": "school_001",
      "user_id": "admin_001",
      "file_name": "test-image.jpg",
      "file_size": 51200,
      "content_type": "image/jpeg",
      "public_url": "https://storage.example.com/files/test456.jpg",
      "uploaded_at": "2024-01-15T11:15:00Z"
    }
  ]
}
```

### Environment Variables
- **schoolId:** school_001
- **adminId:** admin_001
- **fileId:** 123 (for DELETE tests)
- **fileUrl:** https://storage.example.com/files/test123.pdf

## Testing Notes

### 1. File Upload Scenarios
- Single file upload with valid MIME type
- Duplicate file detection (same hash)
- Large file handling (size limits)
- Invalid file types (blocked MIME types)
- Folder organization (optional folder parameter)

### 2. Security Considerations
- RLS header validation (X-School-ID, X-Admin-ID)
- Tenant isolation (school-specific file access)
- File ownership verification
- URL-based deletion security

### 3. Performance Considerations
- Upload response time for different file sizes
- Concurrent upload handling
- List files pagination (if implemented)
- Cache efficiency for duplicate detection

### 4. Integration Points
- Storage service (local filesystem or cloud)
- Database metadata storage
- Redis caching for duplicate detection
- File processing pipeline

## Success Criteria

### Functional Requirements
- ✅ File upload with multipart/form-data works correctly
- ✅ Duplicate file detection returns existing file URL
- ✅ File listing returns correct metadata
- ✅ File deletion by ID works with proper authorization
- ✅ File deletion by URL works with proper authorization
- ✅ Error handling for invalid inputs works correctly

### Non-Functional Requirements
- ✅ Upload response time < 5s for 10MB files
- ✅ List files response time < 500ms
- ✅ Memory usage remains stable during uploads
- ✅ Concurrent uploads don't cause data corruption

### Security Requirements
- ✅ RLS headers required for all endpoints
- ✅ Tenant isolation enforced (school-specific access)
- ✅ File type validation (whitelisted MIME types)
- ✅ Size limits enforced
- ✅ Ownership verification for deletions

### Data Integrity Requirements
- ✅ File metadata stored correctly in database
- ✅ Public URLs are accessible and correct
- ✅ Deletion removes both file and metadata
- ✅ Duplicate detection prevents storage waste