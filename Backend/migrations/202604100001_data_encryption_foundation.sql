-- Migration: Data Encryption Foundation
-- This migration adds support for field-level encryption of sensitive data
-- Includes encryption key management and helper functions

-- 1. Create encryption key management table
CREATE TABLE IF NOT EXISTS encryption_keys (
    key_id VARCHAR(255) PRIMARY KEY,
    key_version INTEGER NOT NULL DEFAULT 1,
    key_material BYTEA NOT NULL, -- Encrypted key material
    key_material_encrypted_with TEXT, -- Which key was used to encrypt this key (for key hierarchy)
    key_type VARCHAR(50) NOT NULL DEFAULT 'aes-256-gcm',
    key_usage VARCHAR(50) NOT NULL DEFAULT 'field_encryption',
    key_status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    activated_at TIMESTAMPTZ,
    deactivated_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    
    -- Audit fields
    created_by VARCHAR(255),
    last_rotated_at TIMESTAMPTZ,
    rotation_count INTEGER DEFAULT 0
);

-- Index for active keys
CREATE INDEX IF NOT EXISTS idx_encryption_keys_status ON encryption_keys(key_status);
CREATE INDEX IF NOT EXISTS idx_encryption_keys_usage ON encryption_keys(key_usage);
CREATE INDEX IF NOT EXISTS idx_encryption_keys_created_at ON encryption_keys(created_at DESC);

-- 2. Create encryption audit log table
CREATE TABLE IF NOT EXISTS encryption_audit_log (
    audit_id SERIAL PRIMARY KEY,
    school_id VARCHAR(255),
    operation VARCHAR(50) NOT NULL, -- 'encrypt', 'decrypt', 'key_rotation', 'key_creation'
    key_id VARCHAR(255) REFERENCES encryption_keys(key_id),
    entity_type VARCHAR(100), -- 'student', 'employee', 'salary', etc.
    entity_id VARCHAR(255),
    field_name VARCHAR(255),
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    performed_by VARCHAR(255),
    performed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    client_ip INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'
);

-- Index for audit queries
CREATE INDEX IF NOT EXISTS idx_encryption_audit_school ON encryption_audit_log(school_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_encryption_audit_operation ON encryption_audit_log(operation, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_encryption_audit_entity ON encryption_audit_log(entity_type, entity_id);

-- 3. Create data classification table
CREATE TABLE IF NOT EXISTS data_classification (
    classification_id SERIAL PRIMARY KEY,
    school_id VARCHAR(255) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    column_name VARCHAR(100) NOT NULL,
    json_path TEXT, -- For JSONB columns, the path to the sensitive field
    data_type VARCHAR(50) NOT NULL,
    classification_level VARCHAR(50) NOT NULL, -- 'public', 'internal', 'confidential', 'restricted', 'highly_restricted'
    encryption_required BOOLEAN NOT NULL DEFAULT true,
    encryption_key_id VARCHAR(255) REFERENCES encryption_keys(key_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    
    UNIQUE(school_id, table_name, column_name, json_path)
);

-- 4. Create helper functions for encryption/decryption

-- Function to check if a value is encrypted
CREATE OR REPLACE FUNCTION is_encrypted_value(value TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN value LIKE 'enc:%';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to extract key ID from encrypted value
CREATE OR REPLACE FUNCTION extract_key_id_from_encrypted(value TEXT)
RETURNS VARCHAR(255) AS $$
DECLARE
    parts TEXT[];
BEGIN
    IF NOT is_encrypted_value(value) THEN
        RETURN NULL;
    END IF;
    
    -- Format: enc:version:key_id:base64_data
    parts := string_to_array(substring(value from 5), ':');
    
    IF array_length(parts, 1) >= 2 THEN
        RETURN parts[2];
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to extract key version from encrypted value
CREATE OR REPLACE FUNCTION extract_key_version_from_encrypted(value TEXT)
RETURNS INTEGER AS $$
DECLARE
    parts TEXT[];
BEGIN
    IF NOT is_encrypted_value(value) THEN
        RETURN NULL;
    END IF;
    
    -- Format: enc:version:key_id:base64_data
    parts := string_to_array(substring(value from 5), ':');
    
    IF array_length(parts, 1) >= 1 THEN
        RETURN parts[1]::INTEGER;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 5. Create view for encryption key status
CREATE OR REPLACE VIEW encryption_key_status AS
SELECT 
    key_id,
    key_version,
    key_type,
    key_usage,
    key_status,
    created_at,
    activated_at,
    deactivated_at,
    expires_at,
    CASE 
        WHEN expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP THEN 'expired'
        WHEN key_status = 'active' THEN 'active'
        WHEN key_status = 'deactivated' THEN 'deactivated'
        ELSE key_status
    END as effective_status,
    rotation_count,
    CASE 
        WHEN expires_at IS NOT NULL THEN expires_at - CURRENT_TIMESTAMP
        ELSE NULL
    END as days_until_expiry
FROM encryption_keys;

-- 6. Create view for encryption audit summary
CREATE OR REPLACE VIEW encryption_audit_summary AS
SELECT 
    DATE(performed_at) as audit_date,
    school_id,
    operation,
    COUNT(*) as total_operations,
    SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_operations,
    SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) as failed_operations,
    COUNT(DISTINCT key_id) as distinct_keys_used,
    COUNT(DISTINCT performed_by) as distinct_users
FROM encryption_audit_log
GROUP BY DATE(performed_at), school_id, operation;

-- 7. Insert default data classifications for sensitive fields
INSERT INTO data_classification (school_id, table_name, column_name, json_path, data_type, classification_level, encryption_required)
VALUES 
    -- Student sensitive fields
    ('system', 'students', 'data', 'aadhaar_number', 'jsonb', 'highly_restricted', true),
    ('system', 'students', 'data', 'medical_records', 'jsonb', 'highly_restricted', true),
    ('system', 'students', 'data', 'contact.phone', 'jsonb', 'confidential', true),
    ('system', 'students', 'data', 'contact.email', 'jsonb', 'confidential', true),
    ('system', 'students', 'data', 'address', 'jsonb', 'confidential', true),
    ('system', 'students', 'data', 'father.aadhaar_number', 'jsonb', 'highly_restricted', true),
    ('system', 'students', 'data', 'mother.aadhaar_number', 'jsonb', 'highly_restricted', true),
    
    -- Employee sensitive fields
    ('system', 'employees', 'data', 'aadhaar_number', 'jsonb', 'highly_restricted', true),
    ('system', 'employees', 'data', 'salary', 'jsonb', 'restricted', true),
    ('system', 'employees', 'data', 'bank_details', 'jsonb', 'highly_restricted', true),
    ('system', 'employees', 'data', 'pan_number', 'jsonb', 'restricted', true),
    ('system', 'employees', 'data', 'contact.phone', 'jsonb', 'confidential', true),
    ('system', 'employees', 'data', 'contact.email', 'jsonb', 'confidential', true),
    
    -- Salary sensitive fields
    ('system', 'salaries', 'base_salary', NULL, 'numeric', 'restricted', true),
    ('system', 'salaries', 'total_salary', NULL, 'numeric', 'restricted', true),
    
    -- Fee sensitive fields (if any)
    ('system', 'student_fees', 'payments', NULL, 'jsonb', 'confidential', true)
ON CONFLICT (school_id, table_name, column_name, json_path) DO NOTHING;

-- 8. Create RLS policies for encryption tables
-- Note: These tables should only be accessible to system administrators
ALTER TABLE encryption_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE encryption_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_classification ENABLE ROW LEVEL SECURITY;

-- Policy for encryption_keys: Only super admins can access
CREATE POLICY encryption_keys_admin_only ON encryption_keys
    USING (current_setting('app.user_role', true) = 'super_admin');

-- Policy for encryption_audit_log: School admins can see their school's logs, super admins see all
CREATE POLICY encryption_audit_log_access ON encryption_audit_log
    USING (
        current_setting('app.user_role', true) = 'super_admin' 
        OR (
            current_setting('app.user_role', true) = 'school_admin' 
            AND school_id = current_setting('app.school_id', true)
        )
    );

-- Policy for data_classification: Read-only for school admins, full access for super admins
CREATE POLICY data_classification_access ON data_classification
    USING (
        current_setting('app.user_role', true) = 'super_admin'
        OR (
            current_setting('app.user_role', true) = 'school_admin'
            AND (school_id = 'system' OR school_id = current_setting('app.school_id', true))
        )
    );

-- 9. Create function to log encryption operations
CREATE OR REPLACE FUNCTION log_encryption_operation(
    p_school_id VARCHAR(255),
    p_operation VARCHAR(50),
    p_key_id VARCHAR(255),
    p_entity_type VARCHAR(100),
    p_entity_id VARCHAR(255),
    p_field_name VARCHAR(255),
    p_success BOOLEAN,
    p_error_message TEXT,
    p_performed_by VARCHAR(255),
    p_client_ip INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO encryption_audit_log (
        school_id,
        operation,
        key_id,
        entity_type,
        entity_id,
        field_name,
        success,
        error_message,
        performed_by,
        client_ip,
        user_agent,
        metadata
    ) VALUES (
        p_school_id,
        p_operation,
        p_key_id,
        p_entity_type,
        p_entity_id,
        p_field_name,
        p_success,
        p_error_message,
        p_performed_by,
        p_client_ip,
        p_user_agent,
        p_metadata
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create function to rotate encryption keys
CREATE OR REPLACE FUNCTION rotate_encryption_key(
    p_key_id VARCHAR(255),
    p_new_key_material BYTEA,
    p_activated_by VARCHAR(255)
)
RETURNS VARCHAR(255) AS $$
DECLARE
    v_new_key_id VARCHAR(255);
    v_old_key_record encryption_keys%ROWTYPE;
BEGIN
    -- Get the old key record
    SELECT * INTO v_old_key_record 
    FROM encryption_keys 
    WHERE key_id = p_key_id AND key_status = 'active';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Active key with ID % not found', p_key_id;
    END IF;
    
    -- Deactivate the old key
    UPDATE encryption_keys 
    SET 
        key_status = 'deactivated',
        deactivated_at = CURRENT_TIMESTAMP
    WHERE key_id = p_key_id;
    
    -- Generate new key ID
    v_new_key_id := encode(gen_random_bytes(16), 'hex');
    
    -- Insert the new key
    INSERT INTO encryption_keys (
        key_id,
        key_version,
        key_material,
        key_type,
        key_usage,
        key_status,
        activated_at,
        created_by,
        last_rotated_at,
        rotation_count
    ) VALUES (
        v_new_key_id,
        v_old_key_record.key_version + 1,
        p_new_key_material,
        v_old_key_record.key_type,
        v_old_key_record.key_usage,
        'active',
        CURRENT_TIMESTAMP,
        p_activated_by,
        CURRENT_TIMESTAMP,
        v_old_key_record.rotation_count + 1
    );
    
    -- Log the rotation
    PERFORM log_encryption_operation(
        NULL, -- system operation
        'key_rotation',
        v_new_key_id,
        'encryption_key',
        p_key_id,
        NULL,
        true,
        NULL,
        p_activated_by,
        NULL,
        NULL,
        jsonb_build_object('old_key_id', p_key_id, 'new_key_id', v_new_key_id)
    );
    
    RETURN v_new_key_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Migration completed
COMMENT ON TABLE encryption_keys IS 'Stores encryption keys for field-level data protection';
COMMENT ON TABLE encryption_audit_log IS 'Audit trail for all encryption/decryption operations';
COMMENT ON TABLE data_classification IS 'Defines classification and encryption requirements for sensitive data fields';