-- Migration: Add class_name column to attendance table for bulk operations
-- Created: 2026-04-11

-- Add class_name column to attendance table
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS class_name VARCHAR;

-- Add index for faster class-based queries
CREATE INDEX IF NOT EXISTS idx_attendance_class_date 
ON attendance(school_id, class_name, date);

-- Update existing records where class_name can be inferred
-- For students: get class_name from students table
UPDATE attendance a
SET class_name = s.class_name
FROM students s
WHERE a.school_id = s.school_id 
  AND a.user_id = s.student_id 
  AND a.role = 'student'
  AND a.class_name IS NULL;

-- For employees: get department from employee data
UPDATE attendance a
SET class_name = COALESCE(e.data->>'department', e.employee_type)
FROM employees e
WHERE a.school_id = e.school_id 
  AND a.user_id = e.employee_id 
  AND a.role = 'employee'
  AND a.class_name IS NULL;

-- Add comment to column
COMMENT ON COLUMN attendance.class_name IS 'Class/department name for filtering bulk attendance operations';