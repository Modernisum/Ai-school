-- Migration: 202603300000_add_space_ids_to_employee_responsibilities.sql
-- Description: Add space_ids JSONB column to employee_responsibilities to support multiple space assignments per role.

-- 1. Add column to employee_responsibilities
ALTER TABLE employee_responsibilities
ADD COLUMN IF NOT EXISTS space_ids JSONB DEFAULT '[]'::jsonb;

-- 2. Optional: Add an index for space_ids lookup (GIN index for JSONB)
-- This might not be strictly necessary unless we query assignments BY space ID frequently
CREATE INDEX IF NOT EXISTS idx_employee_responsibilities_space_ids ON employee_responsibilities USING GIN (space_ids);
