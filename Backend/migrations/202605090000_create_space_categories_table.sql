-- Create space_categories table for managing space categories
-- Each school can have multiple categories (e.g., classroom, lab, office)

CREATE TABLE IF NOT EXISTS space_categories (
    id BIGSERIAL PRIMARY KEY,
    school_id VARCHAR NOT NULL,
    name VARCHAR NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(school_id, name)
);

-- Index for faster lookups by school
CREATE INDEX IF NOT EXISTS idx_space_categories_school_id ON space_categories(school_id);