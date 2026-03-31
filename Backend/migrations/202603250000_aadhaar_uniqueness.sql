-- Migration: Enforce Global Aadhaar Uniqueness
-- This migration adds unique indexes to ensure Aadhaar numbers are unique across all schools.
-- It uses a normalized comparison (stripping spaces) to prevent formatting-based duplicates.

-- 1. Create a function to normalize Aadhaar numbers for indexing
CREATE OR REPLACE FUNCTION normalize_aadhaar(text) RETURNS text AS $$
    SELECT REPLACE($1, ' ', '');
$$ LANGUAGE SQL IMMUTABLE;

-- 2. Add Unique Index to students table (Global)
-- NOTE: If this fails, it means you have existing duplicates that must be resolved manually.
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_aadhaar_global_unique 
ON students (normalize_aadhaar(aadhaar_number)) 
WHERE aadhaar_number IS NOT NULL AND aadhaar_number != '';

-- 3. Add Unique Index to employees table (Global)
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_aadhaar_global_unique 
ON employees (normalize_aadhaar(aadhaar_number)) 
WHERE aadhaar_number IS NOT NULL AND aadhaar_number != '';
