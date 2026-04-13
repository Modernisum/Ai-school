# OCR & Document Processing APIs - Expected Responses

## Authentication Requirements
- **OCR API**: API Key authentication (X-API-Key header)
- **File Upload**: Supports multipart/form-data for document uploads
- **URL Processing**: Also supports JSON payload with document URLs

## 1. POST /api/ocr-routes/extract - Extract Text from Document
### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": {
    "document_id": "doc_ocr_123456",
    "processing_time_ms": 2450,
    "page_count": 3,
    "language_detected": "eng",
    "confidence_score": 0.92,
    "extracted_text": "This is a sample document containing important information.\n\nSection 1: Introduction\nThis document outlines the terms and conditions for the agreement.\n\nSection 2: Terms\n1. All parties must comply with the regulations.\n2. Payments are due within 30 days.\n3. Confidentiality must be maintained.\n\nSection 3: Signatures\n_________________________\nJohn Doe\nDate: 2024-04-12",
    "pages": [
      {
        "page_number": 1,
        "text": "This is a sample document containing important information.",
        "confidence": 0.95,
        "dimensions": {"width": 210, "height": 297, "unit": "mm"}
      },
      {
        "page_number": 2,
        "text": "Section 1: Introduction\nThis document outlines the terms and conditions for the agreement.",
        "confidence": 0.93,
        "dimensions": {"width": 210, "height": 297, "unit": "mm"}
      },
      {
        "page_number": 3,
        "text": "Section 2: Terms\n1. All parties must comply with the regulations.\n2. Payments are due within 30 days.\n3. Confidentiality must be maintained.",
        "confidence": 0.91,
        "dimensions": {"width": 210, "height": 297, "unit": "mm"}
      }
    ],
    "metadata": {
      "file_name": "sample_document.pdf",
      "file_size_bytes": 1048576,
      "mime_type": "application/pdf",
      "ocr_engine": "tesseract",
      "engine_version": "5.3.0"
    }
  }
}
```

### Error Responses
- **HTTP 400**: Invalid document format or unsupported file type
- **HTTP 401**: Missing or invalid API key
- **HTTP 413**: Document too large (exceeds size limit)
- **HTTP 415**: Unsupported media type
- **HTTP 500**: OCR processing failed

## 2. POST /api/ocr-routes/extract (JSON with URL) - Extract Text from Document URL
### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": {
    "document_id": "doc_ocr_789012",
    "processing_time_ms": 3200,
    "page_count": 5,
    "language_detected": "eng",
    "confidence_score": 0.88,
    "extracted_text": "ANNUAL REPORT 2024\n\nFinancial Summary\nRevenue: $5,200,000\nExpenses: $3,800,000\nNet Profit: $1,400,000\n\nKey Performance Indicators\nCustomer Satisfaction: 92%\nEmployee Retention: 88%\nProject Completion: 95%",
    "tables": [
      {
        "table_index": 1,
        "page": 2,
        "data": [
          ["Quarter", "Revenue", "Expenses", "Profit"],
          ["Q1", "$1,200,000", "$900,000", "$300,000"],
          ["Q2", "$1,300,000", "$950,000", "$350,000"],
          ["Q3", "$1,350,000", "$980,000", "$370,000"],
          ["Q4", "$1,350,000", "$970,000", "$380,000"]
        ],
        "confidence": 0.85
      }
    ],
    "metadata": {
      "source_url": "https://example.com/sample_document.pdf",
      "file_size_bytes": 2097152,
      "mime_type": "application/pdf",
      "ocr_engine": "tesseract",
      "engine_version": "5.3.0",
      "table_extraction": true,
      "preprocessing_applied": {
        "deskew": true,
        "denoise": true,
        "binarize": true
      }
    }
  }
}
```

### Error Responses
- **HTTP 400**: Invalid URL or inaccessible document
- **HTTP 401**: Missing or invalid API key
- **HTTP 404**: Document not found at URL
- **HTTP 408**: URL request timeout
- **HTTP 500**: OCR processing failed

## 3. POST /api/ocr-routes/extract (Advanced Options) - Extract Text with Advanced Processing
### Expected Successful Response (HTTP 200)
```json
{
  "success": true,
  "data": {
    "document_id": "doc_ocr_345678",
    "processing_time_ms": 5100,
    "page_count": 1,
    "language_detected": "eng+hin",
    "confidence_score": 0.76,
    "extracted_text": "महत्वपूर्ण नोट\nImportant Note\n\nदिनांक: 12 अप्रैल 2024\nDate: April 12, 2024\n\nविषय: परीक्षा परिणाम\nSubject: Examination Results\n\nप्रिय छात्र,\nDear Student,\n\nआपका परिणाम 95% है।\nYour result is 95%.\n\nहस्ताक्षर:\nSignature:\n\n____________\nजॉन डो\nJohn Doe",
    "structured_data": {
      "sections": [
        {
          "type": "heading",
          "text": "महत्वपूर्ण नोट\nImportant Note",
          "bounding_box": [50, 50, 500, 100]
        },
        {
          "type": "date",
          "text": "दिनांक: 12 अप्रैल 2024\nDate: April 12, 2024",
          "bounding_box": [50, 120, 400, 150]
        },
        {
          "type": "subject",
          "text": "विषय: परीक्षा परिणाम\nSubject: Examination Results",
          "bounding_box": [50, 160, 450, 190]
        },
        {
          "type": "body",
          "text": "प्रिय छात्र,\nDear Student,\n\nआपका परिणाम 95% है।\nYour result is 95%.",
          "bounding_box": [50, 200, 500, 280]
        },
        {
          "type": "signature",
          "text": "हस्ताक्षर:\nSignature:\n\n____________\nजॉन डो\nJohn Doe",
          "bounding_box": [50, 300, 300, 380],
          "signature_detected": true
        }
      ]
    },
    "handwriting_detected": true,
    "handwriting_confidence": 0.68,
    "signatures_detected": 1,
    "layout_preserved": true,
    "metadata": {
      "file_name": "handwritten_note.jpg",
      "file_size_bytes": 524288,
      "mime_type": "image/jpeg",
      "ocr_engine": "tesseract",
      "engine_version": "5.3.0",
      "languages": ["eng", "hin"],
      "advanced_features": {
        "handwriting_detection": true,
        "signature_detection": true,
        "layout_preservation": true,
        "multilingual_support": true
      }
    }
  }
}
```

### Error Responses
- **HTTP 400**: Invalid advanced options or unsupported language combination
- **HTTP 401**: Missing or invalid API key
- **HTTP 413**: Document too large for advanced processing
- **HTTP 422**: Handwriting detection requested but not supported for this document
- **HTTP 500**: Advanced OCR processing failed

## OCR Configuration Options
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `language` | string | Language code(s) for OCR (e.g., "eng", "eng+hin") | "eng" |
| `output_format` | string | Output format: "text", "json", "structured" | "json" |
| `extract_tables` | boolean | Whether to extract table data | false |
| `detect_handwriting` | boolean | Attempt to detect and process handwriting | false |
| `preserve_layout` | boolean | Preserve document layout in output | false |
| `extract_signatures` | boolean | Detect and extract signature regions | false |
| `confidence_threshold` | float | Minimum confidence score (0.0-1.0) | 0.7 |
| `preprocess_options` | object | Image preprocessing options | {} |

## Supported Document Formats
| Format | MIME Type | Notes |
|--------|-----------|-------|
| PDF | application/pdf | Multi-page support |
| JPEG | image/jpeg | Single image |
| PNG | image/png | Single image |
| TIFF | image/tiff | Multi-page support |
| BMP | image/bmp | Single image |

## Supported Languages
| Language | Code | Notes |
|----------|------|-------|
| English | eng | Primary language |
| Hindi | hin | Devanagari script |
| Spanish | spa | Latin script |
| French | fra | Latin script |
| Multiple | eng+hin | Combined language detection |

## Test Data Dependencies
1. **Sample Documents**: Need test PDFs, images for OCR processing
2. **API Key**: Valid API key for OCR service authentication
3. **Network Access**: For URL-based document fetching
4. **Storage**: Temporary storage for uploaded documents
5. **OCR Engine**: Tesseract or other OCR engine availability

## Testing Notes
1. **Performance**: OCR processing can be CPU-intensive; expect 2-10 second response times
2. **Accuracy**: Confidence scores indicate OCR accuracy (0.7+ is generally acceptable)
3. **Multilingual**: Mixed language documents may have lower confidence
4. **Handwriting**: Handwriting detection is less accurate than printed text
5. **Tables**: Table extraction works best with clear borders and alignment
6. **File Size**: Large documents (>10MB) may timeout or fail
7. **Image Quality**: Low-quality scans reduce accuracy significantly

## Success Criteria
1. ✅ Text extraction from PDF documents with high accuracy (>90% confidence)
2. ✅ Text extraction from image formats (JPEG, PNG, TIFF, BMP)
3. ✅ Multilingual support for English and Hindi documents
4. ✅ Table data extraction with structured output
5. ✅ Handwriting detection (when enabled)
6. ✅ Signature detection in documents
7. ✅ Layout preservation for formatted documents
8. ✅ URL-based document processing
9. ✅ Appropriate error handling for unsupported formats
10. ✅ Comprehensive metadata in response
11. ✅ Confidence scoring for quality assessment
12. ✅ Page-level extraction with dimensions