-- Migration: 202604110000_responsibility_performance_indexes.sql
-- Description: Add performance indexes for responsibility system queries (Phase 7 - Code Quality & Performance)

-- 1. Composite index for filtering responsibilities by school and employee_type
-- This optimizes the common query: SELECT * FROM responsibilities WHERE school_id = ? AND employee_type = ?
CREATE INDEX IF NOT EXISTS idx_responsibilities_school_employee_type 
ON responsibilities(school_id, employee_type);

-- 2. Index for ordering by created_at (common in list queries)
CREATE INDEX IF NOT EXISTS idx_responsibilities_created_at 
ON responsibilities(created_at DESC);

-- 3. Index for name search (ILIKE operations)
-- This helps with queries like: SELECT * FROM responsibilities WHERE name ILIKE '%search%'
CREATE INDEX IF NOT EXISTS idx_responsibilities_name_trgm 
ON responsibilities USING gin(name gin_trgm_ops);

-- 4. GIN index for space_ids array in employee_responsibilities
-- This optimizes JSONB array containment queries: WHERE space_ids @> '["space1"]'
CREATE INDEX IF NOT EXISTS idx_employee_responsibilities_space_ids 
ON employee_responsibilities USING gin(space_ids);

-- 5. Composite index for employee_responsibilities queries by school and responsibility
-- Optimizes: SELECT * FROM employee_responsibilities WHERE school_id = ? AND responsibility_id = ?
CREATE INDEX IF NOT EXISTS idx_employee_responsibilities_school_responsibility 
ON employee_responsibilities(school_id, responsibility_id);

-- 6. Index for responsibility_history table (if it exists)
-- Check if table exists before creating index
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'responsibility_history') THEN
        CREATE INDEX IF NOT EXISTS idx_responsibility_history_responsibility_id 
        ON responsibility_history(responsibility_id);
        
        CREATE INDEX IF NOT EXISTS idx_responsibility_history_created_at 
        ON responsibility_history(created_at DESC);
    END IF;
END $$;

-- 7. Index for scheduled_reports table (added in Phase 6)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'scheduled_reports') THEN
        CREATE INDEX IF NOT EXISTS idx_scheduled_reports_school_id 
        ON scheduled_reports(school_id);
        
        CREATE INDEX IF NOT EXISTS idx_scheduled_reports_report_type 
        ON scheduled_reports(report_type);
        
        CREATE INDEX IF NOT EXISTS idx_scheduled_reports_schedule_next_run 
        ON scheduled_reports(schedule_next_run);
    END IF;
END $$;

-- 8. Index for analytics queries on monthly_price and student_fee
-- Helps with aggregation queries in analytics
CREATE INDEX IF NOT EXISTS idx_responsibilities_monthly_price 
ON responsibilities(monthly_price);

CREATE INDEX IF NOT EXISTS idx_responsibilities_student_fee 
ON responsibilities(student_fee);

-- 9. Enable pg_trgm extension if not already enabled (required for trigram indexes)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 10. Add comment for documentation
COMMENT ON INDEX idx_responsibilities_school_employee_type IS 'Optimizes filtering responsibilities by school and employee type';
COMMENT ON INDEX idx_responsibilities_created_at IS 'Optimizes ordering responsibilities by creation date';
COMMENT ON INDEX idx_responsibilities_name_trgm IS 'Enables fast text search on responsibility names using trigram matching';
COMMENT ON INDEX idx_employee_responsibilities_space_ids IS 'Enables fast array containment queries on space_ids';
COMMENT ON INDEX idx_employee_responsibilities_school_responsibility IS 'Optimizes queries filtering employee responsibilities by school and responsibility';
COMMENT ON INDEX idx_responsibilities_monthly_price IS 'Optimizes analytics queries aggregating by monthly price';
COMMENT ON INDEX idx_responsibilities_student_fee IS 'Optimizes analytics queries aggregating by student fee';