-- Add AI metadata and scheduling columns to the tasks table
ALTER TABLE tasks 
    ADD COLUMN IF NOT EXISTS deadline TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'Medium',
    ADD COLUMN IF NOT EXISTS entity_type VARCHAR(100),
    ADD COLUMN IF NOT EXISTS entity_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS ai_metadata JSONB DEFAULT '{}';
