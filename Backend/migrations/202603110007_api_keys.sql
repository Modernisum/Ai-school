-- Phase 4.2: API Keys & Developer Portal
-- Allows schools to generate scoped API keys for external integrations

CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR(50) NOT NULL,
    key_id VARCHAR(50) NOT NULL UNIQUE, -- Public identifier of the key
    key_hash VARCHAR(64) NOT NULL,     -- SHA-256 hash of the full key
    name VARCHAR(100) NOT NULL,        -- Friendly name (e.g. "Tally Integration")
    scopes TEXT[] NOT NULL DEFAULT '{}', -- e.g. {'read:students', 'write:fees'}
    rate_limit_per_min INTEGER DEFAULT 60,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'revoked'
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_school ON api_keys(school_id);
