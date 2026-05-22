-- Developer Access Controls Migration
-- Implements role-based access control and data anonymization for developer access

-- 1. Create developer roles for production access control
DO $$ 
BEGIN
    -- Create developer roles with NOLOGIN (they will be assigned to actual users)
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'developer_readonly') THEN
        CREATE ROLE developer_readonly WITH NOLOGIN;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'developer_emergency') THEN
        CREATE ROLE developer_emergency WITH NOLOGIN;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'developer_audit') THEN
        CREATE ROLE developer_audit WITH NOLOGIN;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'developer_data_engineer') THEN
        CREATE ROLE developer_data_engineer WITH NOLOGIN;
    END IF;
END $$;

-- 2. Create access request tracking table
CREATE TABLE IF NOT EXISTS developer_access_requests (
    id SERIAL PRIMARY KEY,
    developer_id VARCHAR(255) NOT NULL,
    developer_email VARCHAR(255) NOT NULL,
    requested_role VARCHAR(50) NOT NULL CHECK (requested_role IN ('readonly', 'emergency', 'audit', 'data_engineer')),
    justification TEXT NOT NULL,
    requested_tables TEXT[] NOT NULL,
    requested_columns TEXT[],
    duration_hours INTEGER NOT NULL DEFAULT 4,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'revoked')),
    approver_id VARCHAR(255),
    approver_email VARCHAR(255),
    approval_notes TEXT,
    approved_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create active access grants table
CREATE TABLE IF NOT EXISTS developer_access_grants (
    id SERIAL PRIMARY KEY,
    request_id INTEGER REFERENCES developer_access_requests(id) ON DELETE CASCADE,
    developer_id VARCHAR(255) NOT NULL,
    granted_role VARCHAR(50) NOT NULL,
    pg_role_name VARCHAR(100) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revocation_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create developer activity audit table
CREATE TABLE IF NOT EXISTS developer_activity_audit (
    id SERIAL PRIMARY KEY,
    developer_id VARCHAR(255) NOT NULL,
    developer_email VARCHAR(255) NOT NULL,
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('query', 'login', 'logout', 'access_grant', 'access_revoke', 'data_export')),
    target_table VARCHAR(100),
    target_schema VARCHAR(100),
    query_text TEXT,
    rows_affected INTEGER,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create views with anonymized data for developer access
-- Students view with anonymized sensitive data
CREATE OR REPLACE VIEW developer_students_view AS
SELECT 
    s.id,
    s.student_id,
    s.school_id,
    s.class_name,
    s.name,
    s.roll_number,
    s.section,
    s.status,
    s.created_at,
    s.updated_at,
    -- Anonymized sensitive data based on current_user role
    CASE 
        WHEN CURRENT_USER IN ('developer_readonly', 'developer_data_engineer') THEN 
            '***MASKED***'
        ELSE 
            s.aadhaar_number 
    END as aadhaar_number,
    CASE 
        WHEN CURRENT_USER IN ('developer_readonly', 'developer_data_engineer') THEN 
            CONCAT(SUBSTRING(s.contact, 1, 3), '****', SUBSTRING(s.contact, 8, 4))
        ELSE 
            s.contact 
    END as contact,
    CASE 
        WHEN CURRENT_USER IN ('developer_readonly', 'developer_data_engineer') THEN 
            CONCAT(SUBSTRING(s.alternative_contact, 1, 3), '****', SUBSTRING(s.alternative_contact, 8, 4))
        ELSE 
            s.alternative_contact 
    END as alternative_contact,
    CASE 
        WHEN CURRENT_USER IN ('developer_readonly', 'developer_data_engineer') THEN 
            CONCAT(SUBSTRING(s.email, 1, 3), '***@***', SUBSTRING(s.email FROM '@(.*)$'))
        ELSE 
            s.email 
    END as email,
    -- Other fields that should be visible
    s.father_name,
    s.mother_name,
    s.dob,
    s.gender,
    s.address_line1,
    s.address_city,
    s.address_state,
    s.address_pincode,
    s.tc_number,
    s.transport_enabled,
    s.transport_radius,
    s.additional_subjects,
    s.admission_date,
    s.room_number,
    s.enrolled_subjects,
    s.total_fees,
    s.student_type,
    s.profile_image_url
FROM students s;

-- Employees view with anonymized sensitive data
CREATE OR REPLACE VIEW developer_employees_view AS
SELECT 
    e.id,
    e.employee_id,
    e.school_id,
    e.employee_type,
    e.data,
    e.created_at,
    e.updated_at,
    -- Extract and anonymize sensitive fields from JSONB data
    CASE 
        WHEN CURRENT_USER IN ('developer_readonly', 'developer_data_engineer') THEN 
            '***MASKED***'
        ELSE 
            e.data->>'aadhaarNumber'
    END as aadhaar_number,
    CASE 
        WHEN CURRENT_USER IN ('developer_readonly', 'developer_data_engineer') THEN 
            CONCAT(SUBSTRING(e.data->>'contact', 1, 3), '****', SUBSTRING(e.data->>'contact', 8, 4))
        ELSE 
            e.data->>'contact'
    END as contact,
    CASE 
        WHEN CURRENT_USER IN ('developer_readonly', 'developer_data_engineer') THEN 
            CONCAT(SUBSTRING(e.data->>'alternativeContact', 1, 3), '****', SUBSTRING(e.data->>'alternativeContact', 8, 4))
        ELSE 
            e.data->>'alternativeContact'
    END as alternative_contact,
    CASE 
        WHEN CURRENT_USER IN ('developer_readonly', 'developer_data_engineer') THEN 
            CONCAT(SUBSTRING(e.data->>'email', 1, 3), '***@***', SUBSTRING(e.data->>'email' FROM '@(.*)$'))
        ELSE 
            e.data->>'email'
    END as email,
    -- Salary masking
    CASE 
        WHEN CURRENT_USER IN ('developer_readonly', 'developer_data_engineer') THEN 
            '***MASKED***'
        ELSE 
            e.data->>'salary'
    END as salary
FROM employees e;

-- 6. Grant permissions to developer roles
-- Readonly developers can only select from views (not tables)
GRANT SELECT ON developer_students_view TO developer_readonly;
GRANT SELECT ON developer_employees_view TO developer_readonly;
GRANT SELECT ON developer_access_requests TO developer_readonly;
GRANT SELECT ON developer_access_grants TO developer_readonly;
GRANT SELECT ON developer_activity_audit TO developer_readonly;

-- Data engineers get the same as readonly
GRANT SELECT ON developer_students_view TO developer_data_engineer;
GRANT SELECT ON developer_employees_view TO developer_data_engineer;

-- Audit developers can see everything but not modify
GRANT SELECT ON ALL TABLES IN SCHEMA public TO developer_audit;

-- Emergency developers get limited write access (monitored)
GRANT SELECT, INSERT, UPDATE ON developer_students_view TO developer_emergency;
GRANT SELECT, INSERT, UPDATE ON developer_employees_view TO developer_emergency;

-- 7. Create functions for access management
-- Function to grant temporary role to developer
CREATE OR REPLACE FUNCTION grant_developer_access(
    p_developer_id VARCHAR,
    p_developer_email VARCHAR,
    p_role VARCHAR,
    p_duration_hours INTEGER DEFAULT 4
) RETURNS INTEGER AS $$
DECLARE
    v_pg_role_name VARCHAR;
    v_grant_id INTEGER;
    v_temp_role_name VARCHAR;
BEGIN
    -- Generate temporary role name
    v_temp_role_name := 'temp_dev_' || REPLACE(p_developer_id, '-', '_') || '_' || EXTRACT(EPOCH FROM NOW())::INT;
    
    -- Create temporary role
    EXECUTE 'CREATE ROLE ' || v_temp_role_name || ' WITH NOLOGIN';
    
    -- Grant the base role to temporary role
    EXECUTE 'GRANT ' || p_role || ' TO ' || v_temp_role_name;
    
    -- Grant the temporary role to the developer's actual user
    -- Note: In production, this would be tied to actual PostgreSQL users
    -- For now, we just record the grant
    
    -- Insert into access grants table
    INSERT INTO developer_access_grants (
        developer_id,
        granted_role,
        pg_role_name,
        start_time,
        end_time
    ) VALUES (
        p_developer_id,
        p_role,
        v_temp_role_name,
        NOW(),
        NOW() + (p_duration_hours || ' hours')::INTERVAL
    ) RETURNING id INTO v_grant_id;
    
    RETURN v_grant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to revoke developer access
CREATE OR REPLACE FUNCTION revoke_developer_access(
    p_grant_id INTEGER,
    p_reason TEXT DEFAULT 'Manual revocation'
) RETURNS VOID AS $$
DECLARE
    v_pg_role_name VARCHAR;
BEGIN
    -- Get the PostgreSQL role name
    SELECT pg_role_name INTO v_pg_role_name
    FROM developer_access_grants
    WHERE id = p_grant_id AND is_active = TRUE;
    
    IF FOUND THEN
        -- Drop the temporary role
        EXECUTE 'DROP ROLE IF EXISTS ' || v_pg_role_name;
        
        -- Update the grant record
        UPDATE developer_access_grants
        SET 
            is_active = FALSE,
            revoked_at = NOW(),
            revocation_reason = p_reason
        WHERE id = p_grant_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and auto-revoke expired access
CREATE OR REPLACE FUNCTION check_expired_access_grants()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
    v_grant RECORD;
BEGIN
    FOR v_grant IN 
        SELECT id, pg_role_name
        FROM developer_access_grants
        WHERE is_active = TRUE AND end_time < NOW()
    LOOP
        -- Auto-revoke expired access
        PERFORM revoke_developer_access(v_grant.id, 'Access expired automatically');
        v_count := v_count + 1;
    END LOOP;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_developer_access_requests_status ON developer_access_requests(status);
CREATE INDEX IF NOT EXISTS idx_developer_access_requests_developer ON developer_access_requests(developer_id);
CREATE INDEX IF NOT EXISTS idx_developer_access_grants_active ON developer_access_grants(is_active);
CREATE INDEX IF NOT EXISTS idx_developer_access_grants_end_time ON developer_access_grants(end_time);
CREATE INDEX IF NOT EXISTS idx_developer_activity_audit_developer ON developer_activity_audit(developer_id);
CREATE INDEX IF NOT EXISTS idx_developer_activity_audit_created ON developer_activity_audit(created_at);

-- 9. Create scheduled job to clean up expired access (using pg_cron if available)
COMMENT ON FUNCTION check_expired_access_grants() IS 'Call this function periodically to auto-revoke expired developer access';

-- 10. Create row level security policy for developer activity audit
ALTER TABLE developer_activity_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY developer_activity_audit_policy ON developer_activity_audit
    USING (developer_id = CURRENT_USER OR CURRENT_USER IN ('developer_audit', 'postgres'));

-- Log the migration (disabled as SQLx handles migration history)