-- Migration: 202603250003_upgrade_responsibilities.sql
-- Description: Add metadata columns for granular role management.

-- 1. Add columns to responsibilities table
ALTER TABLE responsibilities
ADD COLUMN IF NOT EXISTS space_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS employee_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS monthly_price DECIMAL(12, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}';

-- 2. Add index for space lookup
CREATE INDEX IF NOT EXISTS idx_responsibilities_space_id ON responsibilities(space_id);
