DROP TABLE IF EXISTS audit_logs;

CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR(255) NOT NULL,
    target_type VARCHAR(255) NOT NULL,
    target_id VARCHAR(255) NOT NULL,
    action VARCHAR(255) NOT NULL,
    data JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_school ON audit_logs(school_id);
