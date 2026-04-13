-- Migration: Create attendance_reports table for storing generated reports
-- This table stores pre-generated attendance reports for caching and historical reference

CREATE TABLE IF NOT EXISTS attendance_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id VARCHAR NOT NULL,
    report_type VARCHAR NOT NULL, -- 'daily', 'monthly', 'custom', 'student', 'class', 'employee'
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    generated_at TIMESTAMP DEFAULT NOW(),
    file_path VARCHAR, -- Path to stored PDF/Excel file if exported
    file_format VARCHAR, -- 'pdf', 'excel', 'json'
    metadata JSONB DEFAULT '{}'::jsonb, -- Filters, parameters used for generation
    data JSONB DEFAULT '{}'::jsonb, -- Cached report data for quick retrieval
    status VARCHAR DEFAULT 'completed', -- 'pending', 'processing', 'completed', 'failed'
    generated_by VARCHAR, -- User/admin who requested the report
    expires_at TIMESTAMP, -- When cached data should be considered stale
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_attendance_reports_school_type 
ON attendance_reports(school_id, report_type, period_start DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_reports_generated_at 
ON attendance_reports(generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_reports_status 
ON attendance_reports(status) WHERE status = 'completed';

-- Add RLS policies for multi-tenancy
ALTER TABLE attendance_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Schools can only see their own reports
CREATE POLICY attendance_reports_school_policy ON attendance_reports
    USING (school_id = current_setting('app.current_school_id', true))
    WITH CHECK (school_id = current_setting('app.current_school_id', true));

-- Create a view for daily attendance summary
CREATE OR REPLACE VIEW daily_attendance_summary AS
SELECT 
    a.school_id,
    a.date,
    a.role,
    COUNT(*) as total,
    COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_count,
    COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_count,
    COUNT(CASE WHEN a.status = 'leave' THEN 1 END) as leave_count,
    COUNT(CASE WHEN a.status = 'holiday' THEN 1 END) as holiday_count,
    ROUND(
        COUNT(CASE WHEN a.status = 'present' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0),
        2
    ) as attendance_percentage
FROM attendance a
GROUP BY a.school_id, a.date, a.role;

-- Create a view for monthly attendance statistics
CREATE OR REPLACE VIEW monthly_attendance_stats AS
SELECT 
    a.school_id,
    DATE_TRUNC('month', a.date) as month,
    a.role,
    COUNT(DISTINCT a.date) as working_days,
    COUNT(DISTINCT a.user_id) as total_users,
    COUNT(*) as total_records,
    COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_count,
    COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_count,
    COUNT(CASE WHEN a.status = 'leave' THEN 1 END) as leave_count,
    ROUND(
        COUNT(CASE WHEN a.status = 'present' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0),
        2
    ) as overall_attendance_percentage
FROM attendance a
GROUP BY a.school_id, DATE_TRUNC('month', a.date), a.role;

-- Create a view for student attendance patterns
CREATE OR REPLACE VIEW student_attendance_patterns AS
SELECT 
    a.school_id,
    a.user_id as student_id,
    EXTRACT(MONTH FROM a.date) as month,
    EXTRACT(YEAR FROM a.date) as year,
    COUNT(*) as total_days,
    COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_days,
    COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_days,
    COUNT(CASE WHEN a.status = 'leave' THEN 1 END) as leave_days,
    ROUND(
        COUNT(CASE WHEN a.status = 'present' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0),
        2
    ) as attendance_percentage,
    -- Pattern detection: consecutive absences
    MAX(
        (SELECT COUNT(*) 
         FROM attendance a2 
         WHERE a2.school_id = a.school_id 
           AND a2.user_id = a.user_id 
           AND a2.status = 'absent' 
           AND a2.date BETWEEN a.date - INTERVAL '7 days' AND a.date)
    ) as max_consecutive_absences_7d
FROM attendance a
WHERE a.role = 'student'
GROUP BY a.school_id, a.user_id, EXTRACT(MONTH FROM a.date), EXTRACT(YEAR FROM a.date);