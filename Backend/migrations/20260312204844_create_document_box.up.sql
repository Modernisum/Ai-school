CREATE TABLE IF NOT EXISTS document_box (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    doc_type VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_document_box_school FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_document_box_school_user ON document_box(school_id, user_id);
