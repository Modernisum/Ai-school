-- OCR Extractions table for storing document processing results
CREATE TABLE IF NOT EXISTS ocr_extractions (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR(255) NOT NULL,
    doc_type VARCHAR(50) NOT NULL,
    file_url TEXT NOT NULL,
    raw_text TEXT,
    extracted_fields JSONB NOT NULL DEFAULT '{}',
    entity_type VARCHAR(20),
    entity_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ocr_school_id ON ocr_extractions(school_id);
CREATE INDEX IF NOT EXISTS idx_ocr_entity ON ocr_extractions(school_id, entity_type, entity_id);
