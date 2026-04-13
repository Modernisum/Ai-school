-- Enhanced Audit Logging & Compliance Framework Migration
-- This migration creates comprehensive audit tables for regulatory compliance (DPDPA 2023, GDPR)
-- and integrates with the existing encryption and developer access systems.

-- ============================================================================
-- 1. Enhanced Audit Events Table (replaces system_audit_logs)
-- ============================================================================

-- Drop existing audit_logs table if exists (we'll migrate data later)
-- CREATE TABLE IF NOT EXISTS audit_logs_backup AS SELECT * FROM audit_logs;

CREATE TABLE IF NOT EXISTS audit_events (
    id BIGSERIAL PRIMARY KEY,
    event_id UUID NOT NULL DEFAULT gen_random_uuid(),
    school_id VARCHAR(50) NOT NULL,
    
    -- Event metadata
    event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
        'authentication', 'data_access', 'data_modification', 'configuration', 
        'security', 'compliance', 'system', 'developer_access', 'encryption'
    )),
    event_subtype VARCHAR(50),
    
    -- Actor information
    actor_type VARCHAR(50) NOT NULL CHECK (actor_type IN ('user', 'system', 'api_key', 'integration', 'developer', 'admin')),
    actor_id VARCHAR(100),
    actor_name VARCHAR(255),
    actor_ip INET,
    actor_user_agent TEXT,
    
    -- Resource information
    resource_type VARCHAR(50),
    resource_id VARCHAR(100),
    resource_name TEXT,
    
    -- Action details
    action VARCHAR(100) NOT NULL,
    action_status VARCHAR(20) NOT NULL CHECK (action_status IN ('success', 'failure', 'denied', 'partial')),
    failure_reason TEXT,
    
    -- Data changes (for modification events)
    old_values JSONB,
    new_values JSONB,
    delta JSONB,
    
    -- Context
    request_id VARCHAR(100),
    session_id VARCHAR(100),
    api_endpoint VARCHAR(255),
    http_method VARCHAR(10),
    http_status_code INTEGER,
    
    -- Compliance fields
    legal_basis VARCHAR(50) CHECK (legal_basis IN ('consent', 'contract', 'legal_obligation', 'legitimate_interest', 'vital_interest', 'public_task')),
    purpose_of_processing TEXT,
    data_categories TEXT[],
    
    -- Technical metadata
    application_version VARCHAR(50),
    deployment_mode VARCHAR(20) DEFAULT 'saas',
    
    -- Encryption metadata (for encrypted data access)
    encryption_key_id VARCHAR(100) REFERENCES encryption_keys(key_id) ON DELETE SET NULL,
    encrypted_fields TEXT[],
    
    -- Developer access context
    developer_access_grant_id INTEGER REFERENCES developer_access_grants(id) ON DELETE SET NULL,
    
    -- Indexes for performance
    CONSTRAINT audit_events_event_id_unique UNIQUE (event_id)
);

-- Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_audit_events_school_timestamp ON audit_events(school_id, event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_actor ON audit_events(actor_type, actor_id, event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_resource ON audit_events(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_action_status ON audit_events(action_status, event_timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_events_event_type ON audit_events(event_type, event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_developer_access ON audit_events(developer_access_grant_id) WHERE developer_access_grant_id IS NOT NULL;

-- ============================================================================
-- 2. Data Subject Access Request (DSAR) Logs
-- ============================================================================

CREATE TABLE IF NOT EXISTS dsar_requests (
    id BIGSERIAL PRIMARY KEY,
    request_id UUID NOT NULL DEFAULT gen_random_uuid(),
    school_id VARCHAR(50) NOT NULL,
    
    -- Requestor information
    data_subject_type VARCHAR(50) NOT NULL CHECK (data_subject_type IN ('student', 'employee', 'parent', 'guardian', 'other')),
    data_subject_id VARCHAR(100) NOT NULL,
    data_subject_name VARCHAR(255),
    data_subject_email VARCHAR(255),
    data_subject_phone VARCHAR(50),
    
    -- Request details
    request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('access', 'correction', 'deletion', 'restriction', 'portability', 'objection')),
    request_description TEXT,
    requested_data_categories TEXT[],
    
    -- Status tracking
    status VARCHAR(50) NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processing', 'completed', 'rejected', 'cancelled')),
    priority VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    
    -- Legal compliance
    legal_basis VARCHAR(50),
    verification_method VARCHAR(50),
    verification_date TIMESTAMPTZ,
    
    -- Processing
    assigned_to VARCHAR(100), -- admin/employee ID
    due_date TIMESTAMPTZ,
    completed_date TIMESTAMPTZ,
    completion_notes TEXT,
    
    -- Response data
    response_data JSONB, -- The actual data provided to the subject
    response_format VARCHAR(50) DEFAULT 'json',
    response_delivery_method VARCHAR(50),
    
    -- Audit trail
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by VARCHAR(100),
    
    -- Indexes
    CONSTRAINT dsar_requests_request_id_unique UNIQUE (request_id)
);

CREATE INDEX IF NOT EXISTS idx_dsar_requests_school_status ON dsar_requests(school_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_dsar_requests_data_subject ON dsar_requests(data_subject_type, data_subject_id);
CREATE INDEX IF NOT EXISTS idx_dsar_requests_created_at ON dsar_requests(created_at DESC);

-- ============================================================================
-- 3. Consent Management Logs
-- ============================================================================

CREATE TABLE IF NOT EXISTS consent_records (
    id BIGSERIAL PRIMARY KEY,
    school_id VARCHAR(50) NOT NULL,
    
    -- Subject information
    subject_type VARCHAR(50) NOT NULL CHECK (subject_type IN ('student', 'employee', 'parent', 'guardian')),
    subject_id VARCHAR(100) NOT NULL,
    
    -- Consent details
    consent_type VARCHAR(100) NOT NULL,
    consent_version VARCHAR(50) NOT NULL,
    consent_text TEXT,
    purposes TEXT[] NOT NULL, -- Array of purposes for which consent is given
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'withdrawn', 'expired', 'superseded')),
    
    -- Dates
    given_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    withdrawn_at TIMESTAMPTZ,
    
    -- Method and context
    collection_method VARCHAR(50) CHECK (collection_method IN ('web_form', 'mobile_app', 'paper_form', 'verbal', 'email', 'api')),
    collection_point VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    
    -- Audit
    recorded_by VARCHAR(100),
    last_verified_at TIMESTAMPTZ,
    
    -- Indexes
    UNIQUE(school_id, subject_type, subject_id, consent_type, consent_version)
);

CREATE INDEX IF NOT EXISTS idx_consent_records_subject ON consent_records(subject_type, subject_id, status);
CREATE INDEX IF NOT EXISTS idx_consent_records_expiry ON consent_records(expires_at) WHERE status = 'active';

-- ============================================================================
-- 4. Data Retention Policies
-- ============================================================================

CREATE TABLE IF NOT EXISTS retention_policies (
    id BIGSERIAL PRIMARY KEY,
    school_id VARCHAR(50) NOT NULL,
    
    -- Policy details
    policy_name VARCHAR(255) NOT NULL,
    description TEXT,
    data_category VARCHAR(100) NOT NULL,
    retention_period_months INTEGER NOT NULL,
    retention_basis VARCHAR(50) NOT NULL CHECK (retention_basis IN ('legal_requirement', 'business_need', 'consent_period')),
    
    -- Disposition actions
    disposition_action VARCHAR(50) NOT NULL CHECK (disposition_action IN ('delete', 'archive', 'anonymize', 'retain')),
    disposition_trigger VARCHAR(50) NOT NULL CHECK (disposition_trigger IN ('period_end', 'consent_withdrawal', 'account_closure')),
    
    -- Compliance
    legal_reference TEXT,
    applies_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    applies_to TIMESTAMPTZ,
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(100) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by VARCHAR(100),
    
    -- Indexes
    UNIQUE(school_id, data_category, policy_name)
);

CREATE INDEX IF NOT EXISTS idx_retention_policies_active ON retention_policies(school_id, is_active, data_category);

-- ============================================================================
-- 5. Data Breach Logs
-- ============================================================================

CREATE TABLE IF NOT EXISTS data_breach_logs (
    id BIGSERIAL PRIMARY KEY,
    breach_id UUID NOT NULL DEFAULT gen_random_uuid(),
    school_id VARCHAR(50) NOT NULL,
    
    -- Breach details
    breach_type VARCHAR(50) NOT NULL CHECK (breach_type IN ('unauthorized_access', 'data_loss', 'data_leak', 'system_compromise')),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT NOT NULL,
    
    -- Impact assessment
    affected_data_categories TEXT[],
    affected_subjects_count INTEGER,
    affected_subjects_types TEXT[],
    
    -- Timeline
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    occurred_from TIMESTAMPTZ,
    occurred_to TIMESTAMPTZ,
    
    -- Response
    containment_status VARCHAR(50) NOT NULL DEFAULT 'investigating' CHECK (containment_status IN ('investigating', 'contained', 'mitigated', 'resolved')),
    response_actions TEXT[],
    notification_sent BOOLEAN DEFAULT false,
    notification_date TIMESTAMPTZ,
    
    -- Regulatory reporting
    reported_to_authorities BOOLEAN DEFAULT false,
    authority_name VARCHAR(255),
    report_date TIMESTAMPTZ,
    report_reference VARCHAR(255),
    
    -- Root cause
    root_cause_category VARCHAR(100),
    root_cause_description TEXT,
    
    -- Preventive measures
    preventive_measures_taken TEXT[],
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(100) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Indexes
    CONSTRAINT data_breach_logs_breach_id_unique UNIQUE (breach_id)
);

CREATE INDEX IF NOT EXISTS idx_data_breach_logs_severity ON data_breach_logs(severity, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_breach_logs_school_status ON data_breach_logs(school_id, containment_status);

-- ============================================================================
-- 6. Audit Summary Views
-- ============================================================================

-- View for daily audit summaries
CREATE OR REPLACE VIEW audit_daily_summary AS
SELECT 
    school_id,
    DATE(event_timestamp) as audit_date,
    event_type,
    action_status,
    COUNT(*) as event_count,
    COUNT(DISTINCT actor_id) as unique_actors,
    COUNT(DISTINCT resource_type) as unique_resource_types
FROM audit_events
WHERE event_timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY school_id, DATE(event_timestamp), event_type, action_status;

-- View for compliance dashboard
CREATE OR REPLACE VIEW compliance_dashboard AS
SELECT 
    school_id,
    -- DSAR metrics
    COUNT(DISTINCT CASE WHEN status = 'completed' THEN id END) as dsar_completed,
    COUNT(DISTINCT CASE WHEN status IN ('received', 'processing') THEN id END) as dsar_pending,
    AVG(EXTRACT(EPOCH FROM (completed_date - created_at))/86400) FILTER (WHERE status = 'completed') as avg_dsar_completion_days,
    
    -- Consent metrics
    COUNT(DISTINCT CASE WHEN status = 'active' THEN id END) as active_consents,
    COUNT(DISTINCT CASE WHEN status = 'withdrawn' THEN id END) as withdrawn_consents,
    
    -- Breach metrics
    COUNT(DISTINCT CASE WHEN severity IN ('high', 'critical') THEN id END) as critical_breaches,
    COUNT(DISTINCT CASE WHEN containment_status != 'resolved' THEN id END) as open_breaches
FROM (
    SELECT school_id, id, status, created_at, completed_date FROM dsar_requests
    UNION ALL
    SELECT school_id, id, status, given_at as created_at, NULL as completed_date FROM consent_records
    UNION ALL
    SELECT school_id, id, containment_status as status, detected_at as created_at, NULL as completed_date FROM data_breach_logs
) combined
GROUP BY school_id;

-- ============================================================================
-- 7. Functions for Audit Logging
-- ============================================================================

-- Function to log audit event with comprehensive context
CREATE OR REPLACE FUNCTION log_audit_event(
    p_school_id VARCHAR,
    p_event_type VARCHAR,
    p_event_subtype VARCHAR,
    p_actor_type VARCHAR,
    p_actor_id VARCHAR,
    p_actor_name VARCHAR,
    p_actor_ip INET,
    p_actor_user_agent TEXT,
    p_resource_type VARCHAR,
    p_resource_id VARCHAR,
    p_resource_name TEXT,
    p_action VARCHAR,
    p_action_status VARCHAR,
    p_failure_reason TEXT,
    p_old_values JSONB,
    p_new_values JSONB,
    p_delta JSONB,
    p_request_id VARCHAR,
    p_session_id VARCHAR,
    p_api_endpoint VARCHAR,
    p_http_method VARCHAR,
    p_http_status_code INTEGER,
    p_legal_basis VARCHAR,
    p_purpose_of_processing TEXT,
    p_data_categories TEXT[],
    p_encryption_key_id VARCHAR,
    p_encrypted_fields TEXT[],
    p_developer_access_grant_id INTEGER
) RETURNS UUID AS $$
DECLARE
    v_event_id UUID;
BEGIN
    INSERT INTO audit_events (
        school_id,
        event_type,
        event_subtype,
        actor_type,
        actor_id,
        actor_name,
        actor_ip,
        actor_user_agent,
        resource_type,
        resource_id,
        resource_name,
        action,
        action_status,
        failure_reason,
        old_values,
        new_values,
        delta,
        request_id,
        session_id,
        api_endpoint,
        http_method,
        http_status_code,
        legal_basis,
        purpose_of_processing,
        data_categories,
        encryption_key_id,
        encrypted_fields,
        developer_access_grant_id
    ) VALUES (
        p_school_id,
        p_event_type,
        p_event_subtype,
        p_actor_type,
        p_actor_id,
        p_actor_name,
        p_actor_ip,
        p_actor_user_agent,
        p_resource_type,
        p_resource_id,
        p_resource_name,
        p_action,
        p_action_status,
        p_failure_reason,
        p_old_values,
        p_new_values,
        p_delta,
        p_request_id,
        p_session_id,
        p_api_endpoint,
        p_http_method,
        p_http_status_code,
        p_legal_basis,
        p_purpose_of_processing,
        p_data_categories,
        p_encryption_key_id,
        p_encrypted_fields,
        p_developer_access_grant_id
    ) RETURNING event_id INTO v_event_id;
    
    RETURN v_event_id;
END;
$$ LANGUAGE plpgsql;

-- Function to migrate existing audit logs to new schema
CREATE OR REPLACE FUNCTION migrate_existing_audit_logs()
RETURNS INTEGER AS $$
DECLARE
    migrated_count INTEGER := 0;
BEGIN
    -- Check if old table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_audit_logs') THEN
        INSERT INTO audit_events (
            school_id,
            event_type,
            event_subtype,
            actor_type,
            actor_id,
            actor_name,
            resource_type,
            resource_id,
            action,
            action_status,
            old_values,
            new_values,
            delta,
            event_timestamp
        )
        SELECT 
            school_id,
            CASE 
                WHEN entity_type = 'AUTH' THEN 'authentication'
                ELSE 'data_modification'
            END as event_type,
            LOWER(action_type) as event_subtype,
            'user' as actor_type,
            admin_id as actor_id,
            NULL as actor_name,
            LOWER(entity_type) as resource_type,
            entity_id as resource_id,
            action_type as action,
            'success' as action_status,
            NULL as old_values,
            changed_data as new_values,
            NULL as delta,
            created_at as event_timestamp
        FROM system_audit_logs
        WHERE created_at >= NOW() - INTERVAL '90 days';
        
        GET DIAGNOSTICS migrated_count = ROW_COUNT;
    END IF;
    
    RETURN migrated_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. Triggers for Automated Compliance
-- ============================================================================

-- Trigger to automatically log encryption key usage
CREATE OR REPLACE FUNCTION log_encryption_key_usage()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM log_audit_event(
            NEW.school_id,
            'encryption',
            'key_usage',
            'system',
            'encryption_service',
            'Encryption Service',
            NULL,
            NULL,
            'encryption_key',
            NEW.key_id,
            NEW.key_name,
            'encrypt_data',
            'success',
            NULL,
            NULL,
            jsonb_build_object('algorithm', NEW.algorithm, 'key_size', NEW.key_size),
            NULL,
