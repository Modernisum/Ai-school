-- Migration: Add Material Requirements table for Vacancy Tracking
CREATE TABLE space_material_requirements (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR(255) NOT NULL,
    space_id VARCHAR(255) NOT NULL,
    material_name VARCHAR(255) NOT NULL,
    required_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(school_id, space_id, material_name)
);

-- Index for faster lookups during space detail retrieval
CREATE INDEX idx_space_mat_req_lookup ON space_material_requirements(school_id, space_id);
