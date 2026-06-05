-- Create ai_providers table for multi-provider AI architecture
-- This is a global configuration table (not per-school) stored in public schema

CREATE TABLE IF NOT EXISTS system_config (
    config_key TEXT PRIMARY KEY,
    config_value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ai_providers (
    provider_id SERIAL PRIMARY KEY,
    provider_type VARCHAR(50) NOT NULL,
    provider_name VARCHAR(100) NOT NULL,
    config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Add constraints
    CONSTRAINT valid_provider_type CHECK (
        provider_type IN ('google_gemini', 'openai', 'anthropic', 'azure_openai', 'local_model', 'custom')
    ),
    CONSTRAINT config_is_object CHECK (jsonb_typeof(config) = 'object')
);

-- Create index for faster lookups by provider type
CREATE INDEX idx_ai_providers_type ON ai_providers(provider_type);

-- Create index for active providers
CREATE INDEX idx_ai_providers_active ON ai_providers(is_active) WHERE is_active = true;

-- Create school_ai_config table for per-school AI configuration
-- This table uses Row-Level Security (RLS) to ensure each school can only access its own configuration
CREATE TABLE school_ai_config (
    school_id VARCHAR(50) NOT NULL,
    provider_id INTEGER NOT NULL REFERENCES ai_providers(provider_id) ON DELETE CASCADE,
    default_model VARCHAR(100),
    embedding_model VARCHAR(100),
    max_monthly_cost DECIMAL(10,2),
    features_enabled JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    PRIMARY KEY (school_id, provider_id)
);

-- Create index for school-specific lookups
CREATE INDEX idx_school_ai_config_school ON school_ai_config(school_id);
CREATE INDEX idx_school_ai_config_provider ON school_ai_config(provider_id);

-- Create ai_provider_usage table for tracking usage and costs
CREATE TABLE ai_provider_usage (
    usage_id BIGSERIAL PRIMARY KEY,
    school_id VARCHAR(50) NOT NULL,
    provider_id INTEGER NOT NULL REFERENCES ai_providers(provider_id) ON DELETE CASCADE,
    operation_type VARCHAR(50) NOT NULL, -- 'text_generation', 'embedding', 'chat', etc.
    input_tokens INTEGER,
    output_tokens INTEGER,
    total_tokens INTEGER,
    cost DECIMAL(10,6),
    model_used VARCHAR(100),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Add metadata
    metadata JSONB DEFAULT '{}'
);

-- Create indexes for usage analytics
CREATE INDEX idx_ai_provider_usage_school ON ai_provider_usage(school_id, timestamp);
CREATE INDEX idx_ai_provider_usage_provider ON ai_provider_usage(provider_id, timestamp);
CREATE INDEX idx_ai_provider_usage_operation ON ai_provider_usage(operation_type, timestamp);

-- Create ai_provider_health table for tracking provider health status
CREATE TABLE ai_provider_health (
    health_id BIGSERIAL PRIMARY KEY,
    provider_id INTEGER NOT NULL REFERENCES ai_providers(provider_id) ON DELETE CASCADE,
    healthy BOOLEAN NOT NULL,
    latency_ms INTEGER,
    error_message TEXT,
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for recent health checks
CREATE INDEX idx_ai_provider_health_recent ON ai_provider_health(provider_id, checked_at DESC);

-- Insert default Gemini provider configuration (migrating from existing system_config)
INSERT INTO ai_providers (provider_type, provider_name, config, is_active)
VALUES (
    'google_gemini',
    'Google Gemini (Legacy)',
    jsonb_build_object(
        'api_key', COALESCE((SELECT config_value FROM system_config WHERE config_key = 'GEMINI_API_KEY'), ''),
        'text_model', 'gemini-1.5-pro',
        'embedding_model', 'text-embedding-004'
    ),
    true
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_ai_providers_updated_at
    BEFORE UPDATE ON ai_providers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_school_ai_config_updated_at
    BEFORE UPDATE ON school_ai_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create view for provider status
CREATE VIEW ai_provider_status AS
SELECT 
    p.provider_id,
    p.provider_type,
    p.provider_name,
    p.is_active,
    p.created_at,
    p.updated_at,
    h.healthy,
    h.latency_ms,
    h.checked_at as last_health_check,
    COUNT(DISTINCT s.school_id) as school_count,
    COALESCE(SUM(u.total_tokens), 0) as total_tokens_used,
    COALESCE(SUM(u.cost), 0) as total_cost
FROM ai_providers p
LEFT JOIN ai_provider_health h ON p.provider_id = h.provider_id 
    AND h.checked_at = (SELECT MAX(checked_at) FROM ai_provider_health WHERE provider_id = p.provider_id)
LEFT JOIN school_ai_config s ON p.provider_id = s.provider_id
LEFT JOIN ai_provider_usage u ON p.provider_id = u.provider_id
GROUP BY p.provider_id, p.provider_type, p.provider_name, p.is_active, p.created_at, p.updated_at, h.healthy, h.latency_ms, h.checked_at;

-- Add comment for documentation
COMMENT ON TABLE ai_providers IS 'Global AI provider configurations for multi-provider architecture';
COMMENT ON TABLE school_ai_config IS 'Per-school AI configuration with RLS for data isolation';
COMMENT ON TABLE ai_provider_usage IS 'Tracks AI provider usage and costs for billing and analytics';
COMMENT ON TABLE ai_provider_health IS 'Tracks health status of AI providers for monitoring';