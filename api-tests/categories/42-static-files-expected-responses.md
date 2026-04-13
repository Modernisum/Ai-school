# Static File Serving APIs - Expected Responses

## Authentication Requirements
- **X-School-ID**: Required for all endpoints
- **X-Admin-ID**: Required for upload and delete operations
- **Content-Type**: `multipart/form-data` for file uploads

## 1. POST /api/storage/upload - Upload File

### Request Format
Multipart form data with fields:
- `file`: Required, the file to upload
- `description`: Optional, file description
- `category`: Optional, file category (documents, images, videos, etc.)
- `isPublic`: Optional, boolean indicating if file is publicly accessible

### Successful Response (200 OK)
```json
{
  "success": true,
  "files": [
    {
      "success": true,
      "file_id": "file-1234567890",
      "url": "https://storage.example.com/files/abc123def456.txt",
      "file_name": "test-file.txt",
      "size": 1024,
      "content_type": "text/plain",
      "hash": "abc123def4567890",
      "public_url": "https://storage.example.com/files/abc123def456.txt",
      "uploaded_at": "2024-03-15T10:30:00Z"
    }
  ]
}
```

### Response for Duplicate File
```json
{
  "success": true,
  "files": [
    {
      "success": true,
      "file_id": "file-1234567890",
      "url": "https://storage.example.com/files/abc123def456.txt",
      "file_name": "test-file.txt",
      "size": 1024,
      "content_type": "text/plain",
      "hash": "abc123def4567890",
      "duplicate": true,
      "message": "File already exists, using existing copy"
    }
  ]
}
```

## 2. GET /api/storage/files - List Files

### Query Parameters
- `school_id`: Optional, filter by school ID
- `user_id`: Optional, filter by user who uploaded
- `category`: Optional, filter by file category
- `limit`: Optional, max records (default: 50)
- `offset`: Optional, pagination offset (default: 0)

### Successful Response (200 OK)
```json
{
  "success": true,
  "files": [
    {
      "id": "FILE001",
      "file_name": "test-file.txt",
      "original_name": "test-file.txt",
      "size": 1024,
      "content_type": "text/plain",
      "hash": "abc123def4567890",
      "school_id": "SCH001",
      "user_id": "admin123",
      "uploaded_at": "2024-03-15T10:30:00Z",
      "public_url": "https://storage.example.com/files/abc123def456.txt",
      "category": "documents",
      "description": "Test document for upload",
      "metadata": {
        "checksum": "abc123def4567890",
        "storage_path": "/files/abc123def456.txt",
        "is_public": true
      }
    },
    {
      "id": "FILE002",
      "file_name": "school-logo.png",
      "original_name": "logo.png",
      "size": 20480,
      "content_type": "image/png",
      "hash": "def456abc1237890",
      "school_id": "SCH001",
      "user_id": "admin123",
      "uploaded_at": "2024-03-14T14:20:00Z",
      "public_url": "https://storage.example.com/images/def456abc123.png",
      "category": "images",
      "description": "School logo",
      "metadata": {
        "checksum": "def456abc1237890",
        "storage_path": "/images/def456abc123.png",
        "is_public": true,
        "dimensions": "800x600"
      }
    }
  ],
  "pagination": {
    "total": 45,
    "limit": 50,
    "offset": 0
  }
}
```

## 3. GET /api/storage/files/:hash - Get File by Hash

### Successful Response (200 OK)
```json
{
  "success": true,
  "file": {
    "id": "FILE001",
    "file_name": "test-file.txt",
    "original_name": "test-file.txt",
    "size": 1024,
    "content_type": "text/plain",
    "hash": "abc123def4567890",
    "school_id": "SCH001",
    "user_id": "admin123",
    "uploaded_at": "2024-03-15T10:30:00Z",
    "public_url": "https://storage.example.com/files/abc123def456.txt",
    "category": "documents",
    "description": "Test document for upload",
    "metadata": {
      "checksum": "abc123def4567890",
      "storage_path": "/files/abc123def456.txt",
      "is_public": true,
      "upload_ip": "192.168.1.100",
      "user_agent": "PostmanRuntime/7.36.0"
    }
  }
}
```

## 4. DELETE /api/storage/files/:fileId - Delete File

### Successful Response (200 OK)
```json
{
  "success": true,
  "message": "File deleted successfully",
  "data": {
    "file_id": "FILE001",
    "deleted_at": "2024-03-15T11:00:00Z",
    "deleted_by": "admin123"
  }
}
```

## Error Responses

### 400 Bad Request (File Validation)
```json
{
  "success": false,
  "message": "File type 'application/exe' is not allowed for security reasons."
}
```

### 413 Payload Too Large
```json
{
  "success": false,
  "message": "File size exceeds maximum limit of 50MB"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "File not found"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "You do not have permission to delete this file"
}
```

## Testing Notes
1. **Allowed File Types**: Images (jpeg, png, webp, gif), PDF, documents (doc, docx, xls, xlsx), videos (mp4), archives (zip), CSV, plain text
2. **File Size Limits**: Maximum 50MB per file
3. **Duplicate Detection**: Files are deduplicated by hash - identical files share storage
4. **Public vs Private**: Files can be marked as public (accessible via URL) or private (requires authentication)
5. **Categories**: Organized by type: documents, images, videos, audio, archives, other

## Performance Expectations
- File upload: < 5 seconds for 10MB file
- File retrieval: < 200ms for metadata, < 2 seconds for file download
- Duplicate detection: < 100ms via hash lookup
- List operations: < 300ms for 1000 files

## Security Considerations
1. **File Type Validation**: Strict whitelist of allowed MIME types
2. **Virus Scanning**: All uploaded files should be scanned for malware
3. **Access Control**: Files are scoped to school and user
4. **Signed URLs**: Time-limited signed URLs for secure access
5. **Audit Trail**: All file operations are logged

## Storage Architecture
1. **Content-Addressable Storage**: Files stored by hash for deduplication
2. **CDN Integration**: Public files served via CDN for performance
3. **Backup Strategy**: Regular backups of file metadata and storage
4. **Cleanup Policy**: Automated cleanup of orphaned files
5. **Compression**: Automatic compression for certain file types

## Integration Points
1. **Document Management**: Integration with document box and materials
2. **User Profile**: Profile pictures and user uploads
3. **Announcements**: File attachments for announcements
4. **Complaints**: Attachment support for complaint tickets
5. **AI Services**: File processing for OCR and content analysis