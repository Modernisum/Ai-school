-- Up
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR(50) NOT NULL,
    target_type TEXT NOT NULL, -- e.g., 'exam', 'attendance', 'fee'
    target_id TEXT NOT NULL, -- e.g., student_id or class_id
    action TEXT NOT NULL, -- e.g., 'submit_marks', 'mark_present'
    data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_school ON audit_logs(school_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs(school_id, target_type, target_id);

-- Down
DROP TABLE IF EXISTS audit_logs;
