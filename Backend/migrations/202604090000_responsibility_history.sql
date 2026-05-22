-- Responsibility History and Versioning Migration
-- This migration adds support for tracking responsibility assignment history and rollback functionality

-- Create responsibility_assignment_history table
CREATE TABLE IF NOT EXISTS responsibility_assignment_history (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR(255) NOT NULL,
    responsibility_id VARCHAR(255) NOT NULL,
    employee_id VARCHAR(255) NOT NULL,
    space_ids TEXT[],
    action VARCHAR(50) NOT NULL, -- 'assigned', 'removed', 'updated'
    previous_space_ids TEXT[],
    performed_by VARCHAR(255) NOT NULL,
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reason TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    metadata JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT fk_responsibility_history_responsibility 
        FOREIGN KEY (responsibility_id) 
        REFERENCES responsibilities(responsibility_id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_responsibility_history_employee 
        FOREIGN KEY (employee_id) 
        REFERENCES employees(employee_id) 
        ON DELETE CASCADE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_responsibility_history_school 
    ON responsibility_assignment_history(school_id);
CREATE INDEX IF NOT EXISTS idx_responsibility_history_responsibility 
    ON responsibility_assignment_history(responsibility_id);
CREATE INDEX IF NOT EXISTS idx_responsibility_history_employee 
    ON responsibility_assignment_history(employee_id);
CREATE INDEX IF NOT EXISTS idx_responsibility_history_performed_at 
    ON responsibility_assignment_history(performed_at DESC);

-- Create responsibility_version table for tracking responsibility changes
CREATE TABLE IF NOT EXISTS responsibility_version (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR(255) NOT NULL,
    responsibility_id VARCHAR(255) NOT NULL,
    version INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    employee_type VARCHAR(100),
    revenue DECIMAL(10, 2) DEFAULT 0,
    space_ids TEXT[],
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_current BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT fk_responsibility_version_responsibility 
        FOREIGN KEY (responsibility_id) 
        REFERENCES responsibilities(responsibility_id) 
        ON DELETE CASCADE,
    UNIQUE(responsibility_id, version)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_responsibility_version_school 
    ON responsibility_version(school_id);
CREATE INDEX IF NOT EXISTS idx_responsibility_version_responsibility 
    ON responsibility_version(responsibility_id);
CREATE INDEX IF NOT EXISTS idx_responsibility_version_is_current 
    ON responsibility_version(is_current);

-- Create function to update is_current flag when new version is created
CREATE OR REPLACE FUNCTION update_responsibility_version_current()
RETURNS TRIGGER AS $$
BEGIN
    -- Set is_current to FALSE for all previous versions
    UPDATE responsibility_version 
    SET is_current = FALSE 
    WHERE responsibility_id = NEW.responsibility_id 
    AND id != NEW.id;
    
    -- Set is_current to TRUE for the new version
    NEW.is_current = TRUE;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update is_current flag
DROP TRIGGER IF EXISTS trigger_update_responsibility_version_current 
    ON responsibility_version;
CREATE TRIGGER trigger_update_responsibility_version_current
    BEFORE INSERT ON responsibility_version
    FOR EACH ROW
    EXECUTE FUNCTION update_responsibility_version_current();

-- Create function to get next version number
CREATE OR REPLACE FUNCTION get_next_responsibility_version(p_responsibility_id VARCHAR)
RETURNS INTEGER AS $$
DECLARE
    v_next_version INTEGER;
BEGIN
    SELECT COALESCE(MAX(version), 0) + 1
    INTO v_next_version
    FROM responsibility_version
    WHERE responsibility_id = p_responsibility_id;
    
    RETURN v_next_version;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE responsibility_assignment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE responsibility_version ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY responsibility_assignment_history_school_policy 
    ON responsibility_assignment_history
    FOR ALL 
    USING (school_id = current_setting('app.current_school_id')::VARCHAR);

CREATE POLICY responsibility_version_school_policy 
    ON responsibility_version
    FOR ALL 
    USING (school_id = current_setting('app.current_school_id')::VARCHAR);

-- Add comment
COMMENT ON TABLE responsibility_assignment_history IS 'Tracks history of responsibility assignments for audit trail and rollback';
COMMENT ON TABLE responsibility_version IS 'Tracks version history of responsibilities for rollback functionality';
