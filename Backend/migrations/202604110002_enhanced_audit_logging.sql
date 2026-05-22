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
    COUNT(DISTINCT CASE WHEN record_type = 'dsar' AND status = 'completed' THEN id END) as dsar_completed,
    COUNT(DISTINCT CASE WHEN record_type = 'dsar' AND status IN ('received', 'processing') THEN id END) as dsar_pending,
    AVG(EXTRACT(EPOCH FROM (completed_date - created_at))/86400) FILTER (WHERE record_type = 'dsar' AND status = 'completed') as avg_dsar_completion_days,
    
    -- Consent metrics
    COUNT(DISTINCT CASE WHEN record_type = 'consent' AND status = 'active' THEN id END) as active_consents,
    COUNT(DISTINCT CASE WHEN record_type = 'consent' AND status = 'withdrawn' THEN id END) as withdrawn_consents,
    
    -- Breach metrics
    COUNT(DISTINCT CASE WHEN record_type = 'breach' AND severity IN ('high', 'critical') THEN id END) as critical_breaches,
    COUNT(DISTINCT CASE WHEN record_type = 'breach' AND status != 'resolved' THEN id END) as open_breaches
FROM (
    SELECT school_id, id, status, created_at, completed_date, NULL::VARCHAR as severity, 'dsar'::VARCHAR as record_type FROM dsar_requests
    UNION ALL
    SELECT school_id, id, status, given_at as created_at, NULL::TIMESTAMP WITH TIME ZONE as completed_date, NULL::VARCHAR as severity, 'consent'::VARCHAR as record_type FROM consent_records
    UNION ALL
    SELECT school_id, id, containment_status as status, detected_at as created_at, NULL::TIMESTAMP WITH TIME ZONE as completed_date, severity, 'breach'::VARCHAR as record_type FROM data_breach_logs
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
            NULL, -- request_id
            NULL, -- session_id
            NULL, -- api_endpoint
            NULL, -- http_method
            NULL, -- http_status_code
            'legal_obligation', -- legal_basis
            'Data protection and encryption', -- purpose_of_processing
            ARRAY['encryption_keys'], -- data_categories
            NEW.key_id, -- encryption_key_id
            NULL, -- encrypted_fields
            NULL -- developer_access_grant_id
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to log developer access activities
CREATE OR REPLACE FUNCTION log_developer_access_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND TG_TABLE_NAME = 'developer_access_grants' THEN
        PERFORM log_audit_event(
            COALESCE(NEW.target_school_id, 'system'),
            'developer_access',
            'access_granted',
            'developer',
            NEW.developer_id,
            NULL,
            NULL,
            NULL,
            'system',
            'developer_access',
            'Developer Access Grant',
            'grant_access',
            'success',
            NULL,
            NULL,
            jsonb_build_object('role', NEW.role, 'duration_minutes', NEW.duration_minutes),
            NULL,
            NULL, -- request_id
            NULL, -- session_id
            '/api/developer-access/requests/' || NEW.request_id || '/approve', -- api_endpoint
            'POST', -- http_method
            200, -- http_status_code
            'legitimate_interest', -- legal_basis
            'Developer access for debugging and support', -- purpose_of_processing
            ARRAY['system_access'], -- data_categories
            NULL, -- encryption_key_id
            NULL, -- encrypted_fields
            NEW.id -- developer_access_grant_id
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trg_log_encryption_key_usage ON encryption_keys;
CREATE TRIGGER trg_log_encryption_key_usage
    AFTER INSERT ON encryption_keys
    FOR EACH ROW
    EXECUTE FUNCTION log_encryption_key_usage();

DROP TRIGGER IF EXISTS trg_log_developer_access_activity ON developer_access_grants;
CREATE TRIGGER trg_log_developer_access_activity
    AFTER INSERT ON developer_access_grants
    FOR EACH ROW
    EXECUTE FUNCTION log_developer_access_activity();

-- ============================================================================
-- 9. Data Retention Cleanup Function
-- ============================================================================

CREATE OR REPLACE FUNCTION apply_retention_policies()
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER := 0;
    v_archived_count INTEGER := 0;
    v_anonymized_count INTEGER := 0;
    r RECORD;
BEGIN
    -- Process retention policies for each school
    FOR r IN 
        SELECT DISTINCT school_id FROM retention_policies WHERE is_active = true
    LOOP
        -- Delete expired data (based on retention period)
        WITH expired_data AS (
            DELETE FROM audit_events 
            WHERE school_id = r.school_id 
            AND event_timestamp < NOW() - INTERVAL '6 months'  -- Default 6 months for audit logs
            RETURNING *
        )
        SELECT COUNT(*) INTO v_deleted_count FROM expired_data;
        
        -- Archive old DSAR requests (older than 1 year)
        WITH archived_dsar AS (
            UPDATE dsar_requests 
            SET status = 'archived'
            WHERE school_id = r.school_id 
            AND status = 'completed'
            AND completed_date < NOW() - INTERVAL '1 year'
            RETURNING *
        )
        SELECT COUNT(*) INTO v_archived_count FROM archived_dsar;
        
        -- Anonymize old consent records (older than 7 years)
        WITH anonymized_consent AS (
            UPDATE consent_records 
            SET subject_name = 'ANONYMIZED',
                subject_email = NULL,
                subject_phone = NULL,
                ip_address = NULL,
                user_agent = NULL
            WHERE school_id = r.school_id 
            AND given_at < NOW() - INTERVAL '7 years'
            RETURNING *
        )
        SELECT COUNT(*) INTO v_anonymized_count FROM anonymized_consent;
    END LOOP;
    
    RETURN v_deleted_count + v_archived_count + v_anonymized_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 10. Compliance Reporting Views
-- ============================================================================

-- View for regulatory compliance reporting
CREATE OR REPLACE VIEW compliance_regulatory_report AS
SELECT 
    ae.school_id,
    DATE(ae.event_timestamp) as report_date,
    ae.event_type,
    COUNT(*) as total_events,
    COUNT(DISTINCT ae.actor_id) as unique_actors,
    COUNT(DISTINCT ae.resource_type) as resource_types_accessed,
    NULL::VARCHAR as data_categories_accessed,
    MIN(ae.event_timestamp) as first_event,
    MAX(ae.event_timestamp) as last_event
FROM audit_events ae
WHERE ae.event_timestamp >= NOW() - INTERVAL '30 days'
GROUP BY ae.school_id, DATE(ae.event_timestamp), ae.event_type;

-- View for data subject rights compliance
CREATE OR REPLACE VIEW dsar_compliance_report AS
SELECT 
    dr.school_id,
    DATE(dr.created_at) as request_date,
    dr.request_type,
    dr.status,
    dr.priority,
    CASE 
        WHEN dr.status = 'completed' THEN EXTRACT(EPOCH FROM (dr.completed_date - dr.created_at))/86400
        ELSE NULL 
    END as completion_days,
    dr.assigned_to,
    COUNT(DISTINCT cr.id) FILTER (WHERE cr.status = 'active') as active_consents_count
FROM dsar_requests dr
LEFT JOIN consent_records cr ON dr.school_id = cr.school_id 
    AND dr.data_subject_id = cr.subject_id 
    AND dr.data_subject_type = cr.subject_type
WHERE dr.created_at >= NOW() - INTERVAL '90 days'
GROUP BY dr.school_id, DATE(dr.created_at), dr.request_type, dr.status, dr.priority, dr.completed_date, dr.created_at, dr.assigned_to;

-- ============================================================================
-- 11. Migration Execution
-- ============================================================================

-- Run migration of existing audit logs
DO $$
DECLARE
    migrated_records INTEGER;
BEGIN
    migrated_records := migrate_existing_audit_logs();
    RAISE NOTICE 'Migrated % existing audit logs to enhanced schema', migrated_records;
END $$;

-- Create scheduled job for retention policy application (to be called by external scheduler)
COMMENT ON FUNCTION apply_retention_policies() IS 'Applies data retention policies - should be scheduled to run daily';

-- ============================================================================
-- 12. Grant Permissions
-- ============================================================================

-- Grant appropriate permissions (adjust based on your security model)
-- GRANT SELECT ON audit_events TO authenticated_user_role;
-- GRANT SELECT ON dsar_requests TO authenticated_user_role;
-- GRANT SELECT ON consent_records TO authenticated_user_role;
-- GRANT SELECT ON retention_policies TO authenticated_user_role;
-- GRANT SELECT ON data_breach_logs TO authenticated_user_role;
-- GRANT SELECT ON audit_daily_summary TO authenticated_user_role;
-- GRANT SELECT ON compliance_dashboard TO authenticated_user_role;
-- GRANT SELECT ON compliance_regulatory_report TO authenticated_user_role;
-- GRANT SELECT ON dsar_compliance_report TO authenticated_user_role;

-- GRANT INSERT ON audit_events TO application_role;
-- GRANT INSERT, UPDATE ON dsar_requests TO application_role;
-- GRANT INSERT, UPDATE ON consent_records TO application_role;
-- GRANT INSERT, UPDATE ON retention_policies TO application_role;
-- GRANT INSERT, UPDATE ON data_breach_logs TO application_role;

-- ============================================================================
-- 13. Migration Complete
-- ============================================================================

COMMENT ON TABLE audit_events IS 'Comprehensive audit logging for compliance with DPDPA 2023, GDPR, and other regulations';
COMMENT ON TABLE dsar_requests IS 'Data Subject Access Request tracking for compliance';
COMMENT ON TABLE consent_records IS 'Consent management records for data processing';
COMMENT ON TABLE retention_policies IS 'Data retention policies and schedules';
COMMENT ON TABLE data_breach_logs IS 'Data breach incident logging and tracking';

-- Migration Complete