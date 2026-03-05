-- Add new columns to subjects table
ALTER TABLE subjects 
ADD COLUMN IF NOT EXISTS is_compulsory BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS category VARCHAR(255),
ADD COLUMN IF NOT EXISTS fee_type VARCHAR(50) DEFAULT 'monthly',
ADD COLUMN IF NOT EXISTS fee_interval INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS schedule_type VARCHAR(50) DEFAULT 'daily',
ADD COLUMN IF NOT EXISTS schedule_data JSONB DEFAULT '[]';

-- Add new columns to students table
ALTER TABLE students
ADD COLUMN IF NOT EXISTS enrolled_subjects JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS total_fees NUMERIC(15, 2) DEFAULT 0.00;
