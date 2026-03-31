-- Migration: Space Requirements & Vacancy Tracking
-- Purpose: Track required personnel counts for specific infrastructure spaces.

CREATE TABLE IF NOT EXISTS space_requirements (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR(255) NOT NULL,
    space_id VARCHAR(255) NOT NULL,
    responsibility_id VARCHAR(255) NOT NULL,
    required_count INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(school_id, space_id, responsibility_id)
);

-- Indices for performance-critical vacancy lookups
CREATE INDEX IF NOT EXISTS idx_space_req_lookup ON space_requirements (school_id, space_id);
CREATE INDEX IF NOT EXISTS idx_space_req_role ON space_requirements (responsibility_id);

-- Comment for AI and future developers
COMMENT ON TABLE space_requirements IS 'Stores the expected personnel count for specific roles within a space (e.g., 7 Teachers for a Classroom).';
