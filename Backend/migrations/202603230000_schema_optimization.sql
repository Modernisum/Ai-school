-- Migration: SQL Schema Optimization & Performance Tuning (2026)
-- Target: Public Schema with RLS for High Scalability

-- 1. Core Performance Indexes for Search
CREATE INDEX IF NOT EXISTS idx_students_school_name ON students (school_id, name);
CREATE INDEX IF NOT EXISTS idx_students_school_contact ON students (school_id, contact);
CREATE INDEX IF NOT EXISTS idx_attendance_school_date ON attendance (school_id, date);

-- 2. RLS Filter Indexes (Crucial for multi-tenant scalability)
-- These ensure that every RLS-protected query has an index-backed filter on school_id.
CREATE INDEX IF NOT EXISTS idx_employees_school_id ON employees (school_id);
CREATE INDEX IF NOT EXISTS idx_classes_school_id ON classes (school_id);
CREATE INDEX IF NOT EXISTS idx_subjects_school_id ON subjects (school_id);
CREATE INDEX IF NOT EXISTS idx_batches_school_id ON batches (school_id);
CREATE INDEX IF NOT EXISTS idx_sections_school_id ON sections (school_id);
CREATE INDEX IF NOT EXISTS idx_announcements_school_id ON announcements (school_id);
CREATE INDEX IF NOT EXISTS idx_materials_school_id ON materials (school_id);
CREATE INDEX IF NOT EXISTS idx_leave_apps_school_id ON leave_applications (school_id);
CREATE INDEX IF NOT EXISTS idx_awards_school_id ON awards (school_id);
CREATE INDEX IF NOT EXISTS idx_complaints_school_id ON complaints (school_id);
CREATE INDEX IF NOT EXISTS idx_reminders_school_id ON reminders (school_id);
CREATE INDEX IF NOT EXISTS idx_doc_box_school_id ON document_box (school_id);
CREATE INDEX IF NOT EXISTS idx_space_materials_school_id ON space_materials (school_id);
CREATE INDEX IF NOT EXISTS idx_space_employees_school_id ON space_employees (school_id);
CREATE INDEX IF NOT EXISTS idx_material_loc_school_id ON material_locations (school_id);

-- 3. GIN Indexes for JSONB Search (Highly optimized for AI queries)
CREATE INDEX IF NOT EXISTS idx_schools_data_gin ON schools USING GIN (data);
CREATE INDEX IF NOT EXISTS idx_employees_data_gin ON employees USING GIN (data);
CREATE INDEX IF NOT EXISTS idx_classes_sections_gin ON classes USING GIN (sections);

-- 4. Audit & History Optimization
CREATE INDEX IF NOT EXISTS idx_student_history_timeline ON student_history (student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_audit_logs_entity ON system_audit_logs (entity_type, entity_id);

-- 5. Constraint Hardening & Data Integrity
ALTER TABLE students ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE employees ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE attendance ALTER COLUMN school_id SET NOT NULL;

-- 6. AI-Friendly Schema Documentation (Comments)
COMMENT ON TABLE students IS 'Core tenant-isolated table for student records.';
COMMENT ON COLUMN students.school_id IS 'Primary isolation key for multi-tenancy (RLS).';
COMMENT ON COLUMN students.data IS 'JSONB blob for extensible profile data.';

COMMENT ON TABLE global_users IS 'Unified identity table for cross-tenant login discovery.';
COMMENT ON TABLE attendance IS 'Temporal records of student and employee presence presence.';
COMMENT ON TABLE student_history IS 'Versioned history of student record changes for auditing.';
