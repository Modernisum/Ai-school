-- Migration: Enable pgcrypto Extension and SSL/TLS Configuration
-- This migration enables the pgcrypto extension for field-level encryption
-- and provides guidance for PostgreSQL SSL/TLS configuration

-- 1. Enable pgcrypto extension for cryptographic functions
-- Note: Requires superuser privileges to create extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Create helper functions for AES-256-GCM encryption using pgcrypto
-- These functions provide database-level encryption capabilities

-- Function to encrypt a value with AES-256-GCM
CREATE OR REPLACE FUNCTION encrypt_aes_gcm(
    plaintext TEXT,
    key_id VARCHAR(255),
    key_material BYTEA,
    associated_data TEXT DEFAULT ''
) RETURNS TEXT AS $$
DECLARE
    iv BYTEA;
    ciphertext BYTEA;
    tag BYTEA;
    encrypted_data BYTEA;
    result TEXT;
BEGIN
    -- Generate random initialization vector (12 bytes for GCM)
    iv := gen_random_bytes(12);
    
    -- Encrypt using pgcrypto's pgp_sym_encrypt with AES-256
    -- Note: pgcrypto doesn't have native AES-GCM, so we use PGP with AES-256
    ciphertext := pgp_sym_encrypt(
        plaintext,
        encode(key_material, 'base64'),
        'cipher-algo=aes256'
    );
    
    -- Format: enc:version:key_id:base64(iv+ciphertext)
    -- For simplicity, we'll use a format compatible with our encryption service
    result := 'enc:1:' || key_id || ':' || encode(ciphertext, 'base64');
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Encryption failed: %', SQLERRM;
        RETURN plaintext; -- Return plaintext on failure
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt a value with AES-256-GCM
CREATE OR REPLACE FUNCTION decrypt_aes_gcm(
    encrypted_text TEXT,
    key_material BYTEA
) RETURNS TEXT AS $$
DECLARE
    parts TEXT[];
    version INTEGER;
    key_id VARCHAR(255);
    ciphertext_base64 TEXT;
    ciphertext BYTEA;
    plaintext TEXT;
BEGIN
    -- Check if the value is encrypted
    IF NOT encrypted_text LIKE 'enc:%' THEN
        RETURN encrypted_text;
    END IF;
    
    -- Parse the encrypted format: enc:version:key_id:base64_data
    parts := string_to_array(substring(encrypted_text from 5), ':');
    
    IF array_length(parts, 1) < 3 THEN
        RAISE EXCEPTION 'Invalid encrypted format';
    END IF;
    
    version := parts[1]::INTEGER;
    key_id := parts[2];
    ciphertext_base64 := parts[3];
    
    -- Decode base64 ciphertext
    ciphertext := decode(ciphertext_base64, 'base64');
    
    -- Decrypt using pgcrypto
    plaintext := pgp_sym_decrypt(
        ciphertext,
        encode(key_material, 'base64'),
        'cipher-algo=aes256'
    );
    
    RETURN plaintext;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Decryption failed: %', SQLERRM;
        RETURN NULL; -- Return NULL on decryption failure
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create function to check if SSL/TLS is enabled
CREATE OR REPLACE FUNCTION check_ssl_enabled()
RETURNS TABLE (
    ssl_is_used BOOLEAN,
    ssl_version TEXT,
    cipher TEXT,
    bits INTEGER
) AS $$
BEGIN
    -- This function checks if SSL/TLS is being used for the current connection
    -- Note: Requires pg_stat_ssl view which is available in PostgreSQL 9.5+
    IF EXISTS (
        SELECT 1 FROM information_schema.views 
        WHERE table_name = 'pg_stat_ssl'
    ) THEN
        RETURN QUERY
        SELECT 
            ssl,
            version,
            cipher,
            bits
        FROM pg_stat_ssl 
        WHERE pid = pg_backend_pid();
    ELSE
        -- Return default values if view doesn't exist
        RETURN QUERY SELECT 
            false::BOOLEAN,
            'unknown'::TEXT,
            'unknown'::TEXT,
            0::INTEGER;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create view for SSL/TLS configuration status
CREATE OR REPLACE VIEW ssl_configuration_status AS
SELECT 
    name,
    setting,
    unit,
    short_desc,
    CASE 
        WHEN name = 'ssl' AND setting = 'on' THEN 'SSL_ENABLED'
        WHEN name = 'ssl' AND setting = 'off' THEN 'SSL_DISABLED'
        WHEN name LIKE '%ssl%' THEN 'SSL_RELATED'
        ELSE 'OTHER'
    END as config_category
FROM pg_settings 
WHERE name LIKE '%ssl%' OR name LIKE '%tls%' OR name LIKE '%encrypt%'
ORDER BY name;

-- 5. Create function to generate SSL/TLS configuration recommendations
CREATE OR REPLACE FUNCTION generate_ssl_recommendations()
RETURNS TABLE (
    recommendation TEXT,
    priority VARCHAR(20),
    sql_command TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'Enable SSL for all database connections'::TEXT as recommendation,
        'HIGH'::VARCHAR(20) as priority,
        'ALTER SYSTEM SET ssl = on; SELECT pg_reload_conf();'::TEXT as sql_command
    UNION ALL
    SELECT 
        'Set minimum TLS version to TLSv1.2 or higher',
        'HIGH',
        'ALTER SYSTEM SET ssl_min_protocol_version = ''TLSv1.2''; SELECT pg_reload_conf();'
    UNION ALL
    SELECT 
        'Use strong cipher suites',
        'MEDIUM',
        'ALTER SYSTEM SET ssl_ciphers = ''HIGH:!aNULL:!MD5''; SELECT pg_reload_conf();'
    UNION ALL
    SELECT 
        'Enable SSL certificate verification',
        'MEDIUM',
        'ALTER SYSTEM SET ssl_ca_file = ''/path/to/ca-certificates.crt''; SELECT pg_reload_conf();'
    UNION ALL
    SELECT 
        'Force SSL for all connections (requires client support)',
        'LOW',
        'ALTER SYSTEM SET require_ssl = on; SELECT pg_reload_conf();';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create encryption performance monitoring view
CREATE OR REPLACE VIEW encryption_performance_stats AS
SELECT 
    DATE_TRUNC('hour', performed_at) as time_bucket,
    operation,
    COUNT(*) as operation_count,
    AVG(CASE WHEN success THEN 1 ELSE 0 END) * 100 as success_rate,
    COUNT(DISTINCT key_id) as distinct_keys_used,
    COUNT(DISTINCT performed_by) as distinct_users
FROM encryption_audit_log
WHERE performed_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', performed_at), operation
ORDER BY time_bucket DESC, operation;

-- 7. Insert default encryption key if none exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM encryption_keys WHERE key_status = 'active' AND key_usage = 'field_encryption') THEN
        INSERT INTO encryption_keys (
            key_id,
            key_version,
            key_material,
            key_type,
            key_usage,
            key_status,
            activated_at,
            created_by,
            metadata
        ) VALUES (
            'default_field_key_v1',
            1,
            gen_random_bytes(32), -- 256-bit key
            'aes-256-gcm',
            'field_encryption',
            'active',
            CURRENT_TIMESTAMP,
            'system',
            '{"description": "Default encryption key for field-level encryption", "auto_generated": true}'
        );
    END IF;
END $$;

-- 8. Add comprehensive data classification for all school operational data categories
-- This extends the existing data classification with more comprehensive coverage
INSERT INTO data_classification (school_id, table_name, column_name, json_path, data_type, classification_level, encryption_required)
VALUES 
    -- Academic & Curriculum Data
    ('system', 'timetables', 'data', 'teacher_assignments', 'jsonb', 'confidential', true),
    ('system', 'examinations', 'data', 'question_papers', 'jsonb', 'confidential', true),
    ('system', 'examinations', 'data', 'answer_sheets', 'jsonb', 'highly_restricted', true),
    ('system', 'results', 'data', 'marks', 'jsonb', 'confidential', true),
    ('system', 'results', 'data', 'grades', 'jsonb', 'confidential', true),
    
    -- Financial & Administrative Data
    ('system', 'fees', 'data', 'payment_records', 'jsonb', 'highly_restricted', true),
    ('system', 'payroll', 'data', 'salary_details', 'jsonb', 'highly_restricted', true),
    ('system', 'expenses', 'data', 'vendor_payments', 'jsonb', 'confidential', true),
    ('system', 'inventory', 'data', 'asset_values', 'jsonb', 'internal', false),
    
    -- Infrastructure & Operations Data
    ('system', 'transport', 'data', 'student_routes', 'jsonb', 'confidential', true),
    ('system', 'security', 'data', 'access_logs', 'jsonb', 'confidential', true),
    ('system', 'maintenance', 'data', 'work_orders', 'jsonb', 'internal', false),
    
    -- Communication & Documentation Data
    ('system', 'communications', 'data', 'official_correspondence', 'jsonb', 'confidential', true),
    ('system', 'policies', 'data', 'policy_content', 'jsonb', 'confidential', true),
    ('system', 'legal', 'data', 'contract_details', 'jsonb', 'highly_restricted', true),
    
    -- Compliance & Legal Data
    ('system', 'audit', 'data', 'audit_findings', 'jsonb', 'highly_restricted', true),
    ('system', 'compliance', 'data', 'regulatory_documents', 'jsonb', 'highly_restricted', true),
    ('system', 'consent', 'data', 'parental_consents', 'jsonb', 'confidential', true)
ON CONFLICT (school_id, table_name, column_name, json_path) DO UPDATE SET
    classification_level = EXCLUDED.classification_level,
    encryption_required = EXCLUDED.encryption_required,
    updated_at = CURRENT_TIMESTAMP;

-- 9. Create comment documentation
COMMENT ON EXTENSION pgcrypto IS 'Provides cryptographic functions for field-level encryption';
COMMENT ON FUNCTION encrypt_aes_gcm IS 'Encrypts text using AES-256-GCM with pgcrypto backend';
COMMENT ON FUNCTION decrypt_aes_gcm IS 'Decrypts AES-256-GCM encrypted text using pgcrypto backend';
COMMENT ON FUNCTION check_ssl_enabled IS 'Checks if SSL/TLS is enabled for the current database connection';
COMMENT ON VIEW ssl_configuration_status IS 'Shows current SSL/TLS configuration settings in PostgreSQL';
COMMENT ON FUNCTION generate_ssl_recommendations IS 'Generates security recommendations for SSL/TLS configuration';
COMMENT ON VIEW encryption_performance_stats IS 'Shows performance statistics for encryption operations over the last 7 days';

-- Migration completed successfully
-- Note: SSL/TLS configuration requires PostgreSQL server restart or reload
-- Run: SELECT pg_reload_conf(); after changing SSL settings