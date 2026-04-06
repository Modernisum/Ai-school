-- Migration: Add enhanced fields to complaints table
-- Date: 2026-04-03

-- 1. Ensure the table is named 'complaints' and has the new fields
DO $$ 
BEGIN
    -- Check if 'complains' exists and rename to 'complaints' if so
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'complains') THEN
        ALTER TABLE complains RENAME TO complaints;
    END IF;
END $$;

-- 2. Add new columns to 'complaints'
ALTER TABLE complaints 
ADD COLUMN IF NOT EXISTS complaint_id VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS sender_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS sender_type VARCHAR(50), -- 'student', 'employee'
ADD COLUMN IF NOT EXISTS target_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS target_type VARCHAR(50); -- 'student', 'employee'

-- 3. Rename 'title' to 'subject' if 'title' exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'complaints' AND column_name = 'title') THEN
        ALTER TABLE complaints RENAME COLUMN title TO subject;
    END IF;
END $$;

-- 4. Ensure indices for performance
CREATE INDEX IF NOT EXISTS idx_complaints_sender ON complaints (school_id, sender_id);
CREATE INDEX IF NOT EXISTS idx_complaints_target ON complaints (school_id, target_id);
CREATE INDEX IF NOT EXISTS idx_complaints_id ON complaints (complaint_id);
