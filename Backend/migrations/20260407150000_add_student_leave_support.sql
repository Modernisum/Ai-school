-- Add Student Leave Support
-- Allows students to apply for leave through Chatra app

-- 1. Add student_id column to leave_applications table
ALTER TABLE leave_applications
ADD COLUMN IF NOT EXISTS student_id VARCHAR,
ADD COLUMN IF NOT EXISTS applicant_type VARCHAR(20) DEFAULT 'employee' CHECK (applicant_type IN ('employee', 'student'));

-- 2. Create index for student_id
CREATE INDEX IF NOT EXISTS idx_leave_applications_student ON leave_applications(school_id, student_id);

-- 3. Update existing records to set applicant_type
UPDATE leave_applications
SET applicant_type = 'employee'
WHERE applicant_type IS NULL OR applicant_type = '';
