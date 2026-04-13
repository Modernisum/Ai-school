# Document Upload APIs - Expected Responses

This document outlines the expected responses for Document Upload API endpoints.

## Authentication Requirements
- **RLS Authentication Required:** Yes
- **Required Headers:**
  - `X-School-ID`: School identifier
  - `X-Admin-ID`: Admin user identifier
- **Access Level:** School admin, teachers, or authorized staff

## Overview
Document Upload APIs handle metadata for documents stored in the document box system. These endpoints manage document records, including student documents, reports, certificates, and other files. Actual file uploads are handled through the Storage API (`/api/storage/upload`), while this API manages the document metadata and organization.

## 1. POST /api/document/upload/:schoolId - Upload Document Metadata

**Request Body Structure:**
```json
{
  "student_id": "STU001",
  "document_type": "report_card",
  "title": "Annual Report Card 2024",
  "description": "Annual academic performance report for student",
  "file_url": "https://storage.example.com/reports/student_001_report_2024.pdf",
  "file_name": "student_001_report_2024.pdf",
  "file_size": 204800,
  "mime_type": "application/pdf",
  "tags": ["academic", "report", "2024"],
  "visibility": "student",
  "expiry_date": "2025-12-31"
}
```

**Field Descriptions:**
| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| `student_id` | Yes | Student ID this document belongs to | "STU001" |
| `document_type` | Yes | Type of document | "report_card", "certificate", "id_proof", "medical", "other" |
| `title` | Yes | Document title | "Annual Report Card 2024" |
| `description` | No | Detailed description | "Annual academic performance report" |
| `file_url` | Yes | URL to the actual file (from storage API) | "https://storage.example.com/reports/..." |
| `file_name` | Yes | Original filename | "student_001_report_2024.pdf" |
| `file_size` | No | File size in bytes | 204800 |
| `mime_type` | No | MIME type of file | "application/pdf" |
| `tags` | No | Array of tags for categorization | ["academic", "report", "2024"] |
| `visibility` | No | Who can view this document | "student", "parent", "teacher", "admin" |
| `expiry_date` | No | Document expiry date (for temporary documents) | "2025-12-31" |

**Expected Successful Response:**
- **Status Code:** 201 Created
- **Content-Type:** application/json
- **Response Body Structure:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "student_id": "STU001",
    "student_name": "John Doe",
    "document_type": "report_card",
    "title": "Annual Report Card 2024",
    "description": "Annual academic performance report for student",
    "file_url": "https://storage.example.com/reports/student_001_report_2024.pdf",
    "file_name": "student_001_report_2024.pdf",
    "file_size": 204800,
    "mime_type": "application/pdf",
    "tags": ["academic", "report", "2024"],
    "visibility": "student",
    "expiry_date": "2025-12-31",
    "uploaded_by": "admin_001",
    "uploaded_at": "2024-03-15T10:30:00Z",
    "download_url": "https://storage.example.com/signed/student_001_report_2024.pdf?token=abc123",
    "status": "active"
  }
}
```

**Validation Criteria:**
- Should return 201 Created status
- Should include created document with generated ID
- Should validate student exists
- Should generate signed download URL for the file
- Should set default values: `status` = "active", `uploaded_at` = current timestamp
- Should include student name from student record

**Error Responses:**
- **400 Bad Request:** Missing required fields, invalid data format
- **404 Not Found:** Student not found
- **409 Conflict:** Document with same file_url already exists for student
- **401 Unauthorized:** Missing or invalid RLS headers

## 2. DELETE /api/document/upload/:schoolId/:documentId - Delete Document

**Path Parameters:**
- `schoolId`: School identifier
- `documentId`: Document ID to delete (numeric)

**Expected Successful Response:**
- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Response Body Structure:**
```json
{
  "success": true,
  "message": "Document deleted successfully"
}
```

**Validation Criteria:**
- Should return 200 OK status
- Should soft delete or remove document record
- Should maintain audit trail of deletion
- Should not delete the actual file from storage (handled separately)

**Error Responses:**
- **404 Not Found:** Document not found
- **401 Unauthorized:** Missing or invalid RLS headers
- **403 Forbidden:** User not authorized to delete this document

## Document Types Reference

| Type | Description | Common Use Cases |
|------|-------------|------------------|
| `report_card` | Academic report cards | Term reports, annual reports, progress reports |
| `certificate` | Achievement certificates | Awards, participation, completion certificates |
| `id_proof` | Identity documents | Aadhaar card, birth certificate, passport |
| `medical` | Medical records | Health reports, vaccination records, fitness certificates |
| `admission` | Admission documents | Application forms, fee receipts, transfer certificates |
| `leave` | Leave applications | Medical leave, casual leave applications |
| `fee` | Fee-related documents | Fee receipts, payment proofs, scholarship letters |
| `other` | Other documents | Miscellaneous documents |

## Visibility Levels

| Level | Description | Who Can View |
|-------|-------------|--------------|
| `student` | Student only | Student themselves |
| `parent` | Student and parents | Student and their parents |
| `teacher` | Teachers and above | Teachers, admin, student, parents |
| `admin` | Admin only | School administrators only |
| `public` | Public access | Anyone with link (limited use) |

## Integration with Storage API

1. **File Upload First:** Use `/api/storage/upload` to upload actual file
2. **Get File URL:** Storage API returns public URL for uploaded file
3. **Create Document Record:** Use this endpoint to create document metadata with file URL
4. **Signed URLs:** System generates signed download URLs for secure access

## Testing Notes

1. **Student Validation:** Documents require valid student ID
2. **File URL Validation:** File URL should be from trusted storage domain
3. **Duplicate Prevention:** Same file_url should not be registered multiple times for same student
4. **Expiry Handling:** Documents with past expiry_date may be automatically archived
5. **Access Control:** Visibility levels enforce who can view documents
6. **Audit Trail:** All document operations should be logged

## Success Criteria

1. ✅ Both endpoints return expected HTTP status codes
2. ✅ Document creation returns valid document data with ID
3. ✅ Document deletion works correctly
4. ✅ Student validation works (rejects invalid student IDs)
5. ✅ RLS headers are properly validated
6. ✅ Error handling works for missing required fields
7. ✅ Signed download URLs are generated correctly
8. ✅ Document types and visibility levels are properly handled