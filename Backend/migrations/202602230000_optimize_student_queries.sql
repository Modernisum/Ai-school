-- Optimization: Add indexes for student queries
-- This migration adds essential indexes to improve query performance

-- Index for filtering students by school_id
CREATE INDEX IF NOT EXISTS idx_students_school_id 
    ON students(school_id);

-- Index for looking up students by student_id
CREATE INDEX IF NOT EXISTS idx_students_student_id 
    ON students(student_id);

-- Index for filtering by class_name
CREATE INDEX IF NOT EXISTS idx_students_class_name 
    ON students(class_name);

-- Index for filtering by status
CREATE INDEX IF NOT EXISTS idx_students_status 
    ON students(status);

-- Composite index for common queries: school_id + class_name + status
CREATE INDEX IF NOT EXISTS idx_students_school_class_status 
    ON students(school_id, class_name, status);

-- Similar indexes for student_fees table
CREATE INDEX IF NOT EXISTS idx_student_fees_school_id 
    ON student_fees(school_id);

CREATE INDEX IF NOT EXISTS idx_student_fees_student_id 
    ON student_fees(student_id);

CREATE INDEX IF NOT EXISTS idx_student_fees_status 
    ON student_fees(status);

-- Indexes for other commonly queried tables
CREATE INDEX IF NOT EXISTS idx_employees_school_id 
    ON employees(school_id);

CREATE INDEX IF NOT EXISTS idx_employees_employee_id 
    ON employees(employee_id);

CREATE INDEX IF NOT EXISTS idx_classes_school_id 
    ON classes(school_id);

CREATE INDEX IF NOT EXISTS idx_subjects_school_id 
    ON subjects(school_id);

CREATE INDEX IF NOT EXISTS idx_attendance_school_id 
    ON attendance(school_id);

CREATE INDEX IF NOT EXISTS idx_attendance_school_user_date 
    ON attendance(school_id, user_id, date);
