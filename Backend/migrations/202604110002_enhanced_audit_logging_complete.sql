-- Complete Enhanced Audit Logging Migration (continuation)

-- Complete the log_encryption_key_usage function
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
    STRING_AGG(DISTINCT ae.data_category, ', ') as data_categories_accessed,
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
GRANT SELECT ON audit_events TO authenticated_user_role;
GRANT SELECT ON dsar_requests TO authenticated_user_role;
GRANT SELECT ON consent_records TO authenticated_user_role;
GRANT SELECT ON retention_policies TO authenticated_user_role;
GRANT SELECT ON data_breach_logs TO authenticated_user_role;
GRANT SELECT ON audit_daily_summary TO authenticated_user_role;
GRANT SELECT ON compliance_dashboard TO authenticated_user_role;
GRANT SELECT ON compliance_regulatory_report TO authenticated_user_role;
GRANT SELECT ON dsar_compliance_report TO authenticated_user_role;

GRANT INSERT ON audit_events TO application_role;
GRANT INSERT, UPDATE ON dsar_requests TO application_role;
GRANT INSERT, UPDATE ON consent_records TO application_role;
GRANT INSERT, UPDATE ON retention_policies TO application_role;
GRANT INSERT, UPDATE ON data_breach_logs TO application_role;

-- ============================================================================
-- 13. Migration Complete
-- ============================================================================

COMMENT ON TABLE audit_events IS 'Comprehensive audit logging for compliance with DPDPA 2023, GDPR, and other regulations';
COMMENT ON TABLE dsar_requests IS 'Data Subject Access Request tracking for compliance';
COMMENT ON TABLE consent_records IS 'Consent management records for data processing';
COMMENT ON TABLE retention_policies IS 'Data retention policies and schedules';
COMMENT ON TABLE data_breach_logs IS 'Data breach incident logging and tracking';

RAISE NOTICE 'Enhanced audit logging framework migration completed successfully';