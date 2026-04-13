-- Drop the AI provider tables in reverse order of dependencies

-- Drop views first
DROP VIEW IF EXISTS ai_provider_status;

-- Drop triggers
DROP TRIGGER IF EXISTS update_school_ai_config_updated_at ON school_ai_config;
DROP TRIGGER IF EXISTS update_ai_providers_updated_at ON ai_providers;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS ai_provider_health;
DROP TABLE IF EXISTS ai_provider_usage;
DROP TABLE IF EXISTS school_ai_config;
DROP TABLE IF EXISTS ai_providers;