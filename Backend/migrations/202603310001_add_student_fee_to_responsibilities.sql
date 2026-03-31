-- Migration: 202603310001_add_student_fee_to_responsibilities.sql
-- Description: Add student_fee column to responsibilities to automate student fees.

-- 1. Add column to responsibilities
ALTER TABLE responsibilities
ADD COLUMN IF NOT EXISTS student_fee DECIMAL(12, 2) DEFAULT 0;
