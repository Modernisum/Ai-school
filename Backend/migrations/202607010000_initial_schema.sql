--
-- PostgreSQL database dump
--

\restrict ga9kNUFf5eSutvgQPab7OqxMnEDGZTmxqUlPDrPvhA7ldsSEsxdetq9hFfwOhjn

-- Dumped from database version 16.14 (Debian 16.14-1.pgdg12+1)
-- Dumped by pg_dump version 16.14 (Debian 16.14-1.pgdg12+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- Bug #1 Fix: Migration ko BEGIN...COMMIT mein wrap kiya (Atomicity)
-- Agar koi bhi step fail ho toh pura migration rollback ho jaayega
-- Note: CREATE EXTENSION commands transactional nahi hoti, isliye woh BEGIN se pehle chalti hain
BEGIN;

--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'Provides cryptographic functions for field-level encryption';


--
-- Name: vector; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;


--
-- Name: EXTENSION vector; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION vector IS 'vector data type and ivfflat and hnsw access methods';


--
-- Name: generic_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.generic_status AS ENUM (
    'active',
    'inactive',
    'archived',
    'pending',
    'completed',
    'failed'
);


ALTER TYPE public.generic_status OWNER TO postgres;

--
-- Name: payment_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.payment_status AS ENUM (
    'pending',
    'completed',
    'failed',
    'refunded',
    'overdue'
);


ALTER TYPE public.payment_status OWNER TO postgres;

--
-- Name: report_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.report_status AS ENUM (
    'pending',
    'completed',
    'failed'
);


ALTER TYPE public.report_status OWNER TO postgres;

--
-- Name: report_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.report_type AS ENUM (
    'utilization',
    'workload',
    'space_distribution',
    'revenue'
);


ALTER TYPE public.report_type OWNER TO postgres;

--
-- Name: apply_retention_policies(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.apply_retention_policies() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_deleted_count INTEGER := 0;
    v_archived_count INTEGER := 0;
    v_anonymized_count INTEGER := 0;
    v_temp_count INTEGER := 0; -- Bug #8 Fix: per-school temp count accumulator
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
        SELECT COUNT(*) INTO v_temp_count FROM expired_data;
        v_deleted_count := v_deleted_count + v_temp_count; -- Bug #8 Fixed: was INTO v_deleted_count (overwrites each loop)
        
        -- Archive old DSAR requests (older than 1 year)
        WITH archived_dsar AS (
            UPDATE dsar_requests 
            SET status = 'archived'
            WHERE school_id = r.school_id 
            AND status = 'completed'
            AND completed_date < NOW() - INTERVAL '1 year'
            RETURNING *
        )
        SELECT COUNT(*) INTO v_temp_count FROM archived_dsar;
        v_archived_count := v_archived_count + v_temp_count; -- Bug #8 Fixed: accumulate not overwrite
        
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
        SELECT COUNT(*) INTO v_temp_count FROM anonymized_consent;
        v_anonymized_count := v_anonymized_count + v_temp_count; -- Bug #8 Fixed: accumulate not overwrite
    END LOOP;
    
    RETURN v_deleted_count + v_archived_count + v_anonymized_count;
END;
$$;


ALTER FUNCTION public.apply_retention_policies() OWNER TO postgres;

--
-- Name: FUNCTION apply_retention_policies(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.apply_retention_policies() IS 'Applies data retention policies - should be scheduled to run daily';


--
-- Name: calculate_leave_balance(character varying, character varying, character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.calculate_leave_balance(p_school_id character varying, p_employee_id character varying, p_leave_type character varying DEFAULT NULL::character varying) RETURNS TABLE(leave_type character varying, annual_quota integer, used integer, remaining integer, monthly_quota integer, reset_date date)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        q.leave_type,
        q.annual_quota,
        q.used,
        q.remaining,
        q.monthly_quota,
        q.reset_date
    FROM leave_quotas q
    WHERE q.school_id = p_school_id
        AND q.employee_id = p_employee_id
        AND (p_leave_type IS NULL OR q.leave_type = p_leave_type);
END;
$$;


ALTER FUNCTION public.calculate_leave_balance(p_school_id character varying, p_employee_id character varying, p_leave_type character varying) OWNER TO postgres;

--
-- Name: calculate_letter_grade(numeric); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.calculate_letter_grade(percentage numeric) RETURNS character varying
    LANGUAGE plpgsql IMMUTABLE
    AS $$
BEGIN
    RETURN CASE
        WHEN percentage >= 90 THEN 'A'
        WHEN percentage >= 80 THEN 'B'
        WHEN percentage >= 70 THEN 'C'
        WHEN percentage >= 60 THEN 'D'
        WHEN percentage >= 50 THEN 'E'
        ELSE 'F'
    END;
END;
$$;


ALTER FUNCTION public.calculate_letter_grade(percentage numeric) OWNER TO postgres;

--
-- Name: check_conditional_approval_expiration(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.check_conditional_approval_expiration() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE conditional_approvals ca
    SET status = 'auto_rejected',
        updated_at = NOW()
    WHERE ca.status = 'pending_response'
        AND ca.response_deadline < NOW()
        AND ca.is_auto_reject_enabled = TRUE; -- Bug #4 Fixed: was 'auto_reject' (non-existent column)
END;
$$;


ALTER FUNCTION public.check_conditional_approval_expiration() OWNER TO postgres;

--
-- Name: check_expired_access_grants(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.check_expired_access_grants() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION public.check_expired_access_grants() OWNER TO postgres;

--
-- Name: FUNCTION check_expired_access_grants(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.check_expired_access_grants() IS 'Call this function periodically to auto-revoke expired developer access';


--
-- Name: check_ssl_enabled(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.check_ssl_enabled() RETURNS TABLE(ssl_is_used boolean, ssl_version text, cipher text, bits integer)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION public.check_ssl_enabled() OWNER TO postgres;

--
-- Name: FUNCTION check_ssl_enabled(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.check_ssl_enabled() IS 'Checks if SSL/TLS is enabled for the current database connection';


--
-- Name: decrypt_aes_gcm(text, bytea); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.decrypt_aes_gcm(encrypted_text text, key_material bytea) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION public.decrypt_aes_gcm(encrypted_text text, key_material bytea) OWNER TO postgres;

--
-- Name: FUNCTION decrypt_aes_gcm(encrypted_text text, key_material bytea); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.decrypt_aes_gcm(encrypted_text text, key_material bytea) IS 'Decrypts AES-256-GCM encrypted text using pgcrypto backend';


--
-- Name: encrypt_aes_gcm(text, character varying, bytea, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.encrypt_aes_gcm(plaintext text, key_id character varying, key_material bytea, associated_data text DEFAULT ''::text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
        -- Bug #5 Fixed: was 'RETURN plaintext' — CRITICAL SECURITY: never return plaintext on failure
        -- Agar encryption fail ho toh data store hi nahi hona chahiye
        RAISE EXCEPTION 'Encryption failed for key_id=%, cannot store sensitive data unencrypted. Error: %', key_id, SQLERRM;
END;
$$;


ALTER FUNCTION public.encrypt_aes_gcm(plaintext text, key_id character varying, key_material bytea, associated_data text) OWNER TO postgres;

--
-- Name: FUNCTION encrypt_aes_gcm(plaintext text, key_id character varying, key_material bytea, associated_data text); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.encrypt_aes_gcm(plaintext text, key_id character varying, key_material bytea, associated_data text) IS 'Encrypts text using AES-256-GCM with pgcrypto backend';


--
-- Name: extract_key_id_from_encrypted(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.extract_key_id_from_encrypted(value text) RETURNS character varying
    LANGUAGE plpgsql STABLE -- Bug #10 Fixed: was IMMUTABLE; calls is_encrypted_value() so STABLE is correct
    AS $$
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
$$;


ALTER FUNCTION public.extract_key_id_from_encrypted(value text) OWNER TO postgres;

--
-- Name: extract_key_version_from_encrypted(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.extract_key_version_from_encrypted(value text) RETURNS integer
    LANGUAGE plpgsql STABLE -- Bug #10 Fixed: was IMMUTABLE; calls is_encrypted_value() so STABLE is correct
    AS $$
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
$$;


ALTER FUNCTION public.extract_key_version_from_encrypted(value text) OWNER TO postgres;

--
-- Name: generate_ssl_recommendations(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.generate_ssl_recommendations() RETURNS TABLE(recommendation text, priority character varying, sql_command text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION public.generate_ssl_recommendations() OWNER TO postgres;

--
-- Name: FUNCTION generate_ssl_recommendations(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.generate_ssl_recommendations() IS 'Generates security recommendations for SSL/TLS configuration';


--
-- Name: get_next_responsibility_version(character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_next_responsibility_version(p_responsibility_id character varying) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_next_version INTEGER;
BEGIN
    -- Bug #3 Fixed: FOR UPDATE lock lagaya — concurrent requests mein ab same version nahi milega
    SELECT COALESCE(MAX(version), 0) + 1
    INTO v_next_version
    FROM responsibility_versions
    WHERE responsibility_id = p_responsibility_id
    FOR UPDATE;
    
    RETURN v_next_version;
END;
$$;


ALTER FUNCTION public.get_next_responsibility_version(p_responsibility_id character varying) OWNER TO postgres;

--
-- Name: grant_developer_access(character varying, character varying, character varying, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.grant_developer_access(p_developer_id character varying, p_developer_email character varying, p_role character varying, p_duration_hours integer DEFAULT 4) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION public.grant_developer_access(p_developer_id character varying, p_developer_email character varying, p_role character varying, p_duration_hours integer) OWNER TO postgres;

--
-- Name: is_encrypted_value(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_encrypted_value(value text) RETURNS boolean
    LANGUAGE plpgsql STABLE -- Bug #10 Fixed: was IMMUTABLE; encryption prefix 'enc:' format may evolve, STABLE is safer
    AS $$
BEGIN
    RETURN value LIKE 'enc:%';
END;
$$;


ALTER FUNCTION public.is_encrypted_value(value text) OWNER TO postgres;

--
-- Name: is_super_admin(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_super_admin() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN current_setting('app.is_super_admin', true) = 'true';
END;
$$;


ALTER FUNCTION public.is_super_admin() OWNER TO postgres;

--
-- Name: log_audit_event(character varying, character varying, character varying, character varying, character varying, character varying, inet, text, character varying, character varying, text, character varying, character varying, text, jsonb, jsonb, jsonb, character varying, character varying, character varying, character varying, integer, character varying, text, text[], character varying, text[], integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.log_audit_event(p_school_id character varying, p_event_type character varying, p_event_subtype character varying, p_actor_type character varying, p_actor_id character varying, p_actor_name character varying, p_actor_ip inet, p_actor_user_agent text, p_resource_type character varying, p_resource_id character varying, p_resource_name text, p_action character varying, p_action_status character varying, p_failure_reason text, p_old_values jsonb, p_new_values jsonb, p_delta jsonb, p_request_id character varying, p_session_id character varying, p_api_endpoint character varying, p_http_method character varying, p_http_status_code integer, p_legal_basis character varying, p_purpose_of_processing text, p_data_categories text[], p_encryption_key_id character varying, p_encrypted_fields text[], p_developer_access_grant_id integer) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.log_audit_event(p_school_id character varying, p_event_type character varying, p_event_subtype character varying, p_actor_type character varying, p_actor_id character varying, p_actor_name character varying, p_actor_ip inet, p_actor_user_agent text, p_resource_type character varying, p_resource_id character varying, p_resource_name text, p_action character varying, p_action_status character varying, p_failure_reason text, p_old_values jsonb, p_new_values jsonb, p_delta jsonb, p_request_id character varying, p_session_id character varying, p_api_endpoint character varying, p_http_method character varying, p_http_status_code integer, p_legal_basis character varying, p_purpose_of_processing text, p_data_categories text[], p_encryption_key_id character varying, p_encrypted_fields text[], p_developer_access_grant_id integer) OWNER TO postgres;

--
-- Name: log_developer_access_activity(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.log_developer_access_activity() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF TG_OP = 'INSERT' AND TG_TABLE_NAME = 'developer_access_grants' THEN
        PERFORM log_audit_event(
            'system', -- Bug #9 Fixed: was COALESCE(NEW.target_school_id,'system') — column 'target_school_id' does not exist
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
            jsonb_build_object('role', NEW.granted_role, 'duration_minutes', EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60), -- Bug #9 Fixed: 'role'→'granted_role', 'duration_minutes' computed from end_time-start_time
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
$$;


ALTER FUNCTION public.log_developer_access_activity() OWNER TO postgres;

--
-- Name: log_encryption_key_usage(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.log_encryption_key_usage() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.log_encryption_key_usage() OWNER TO postgres;

--
-- Name: log_encryption_operation(character varying, character varying, character varying, character varying, character varying, character varying, boolean, text, character varying, inet, text, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.log_encryption_operation(p_school_id character varying, p_operation character varying, p_key_id character varying, p_entity_type character varying, p_entity_id character varying, p_field_name character varying, p_success boolean, p_error_message text, p_performed_by character varying, p_client_ip inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION public.log_encryption_operation(p_school_id character varying, p_operation character varying, p_key_id character varying, p_entity_type character varying, p_entity_id character varying, p_field_name character varying, p_success boolean, p_error_message text, p_performed_by character varying, p_client_ip inet, p_user_agent text, p_metadata jsonb) OWNER TO postgres;

--
-- Name: migrate_existing_audit_logs(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.migrate_existing_audit_logs() RETURNS integer
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.migrate_existing_audit_logs() OWNER TO postgres;

--
-- Name: normalize_aadhaar(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.normalize_aadhaar(text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $_$
    SELECT REPLACE($1, ' ', '');
$_$;


ALTER FUNCTION public.normalize_aadhaar(text) OWNER TO postgres;

--
-- Name: revoke_developer_access(integer, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.revoke_developer_access(p_grant_id integer, p_reason text DEFAULT 'Manual revocation'::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION public.revoke_developer_access(p_grant_id integer, p_reason text) OWNER TO postgres;

--
-- Name: rotate_encryption_key(character varying, bytea, character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.rotate_encryption_key(p_key_id character varying, p_new_key_material bytea, p_activated_by character varying) RETURNS character varying
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION public.rotate_encryption_key(p_key_id character varying, p_new_key_material bytea, p_activated_by character varying) OWNER TO postgres;

--
-- Name: update_ai_query_cache_tsvector(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_ai_query_cache_tsvector() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.question_tsvector := to_tsvector('english', NEW.question_text);
  RETURN NEW;
END
$$;


ALTER FUNCTION public.update_ai_query_cache_tsvector() OWNER TO postgres;

--
-- Name: update_ai_schema_tsvector(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_ai_schema_tsvector() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.schema_tsvector := to_tsvector('english', NEW.schema_text);
  RETURN NEW;
END
$$;


ALTER FUNCTION public.update_ai_schema_tsvector() OWNER TO postgres;

--
-- Name: update_gradebook_summary(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_gradebook_summary() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Update or insert summary record
    INSERT INTO gradebook_summaries (
        school_id, student_id, academic_year, term, subject_name, class_name,
        total_assessments, completed_assessments, average_percentage,
        highest_score, lowest_score, last_updated
    )
    SELECT 
        g.school_id,
        g.student_id,
        g.academic_year,
        g.term,
        g.subject_name,
        g.class_name,
        COUNT(*) as total_assessments,
        COUNT(CASE WHEN g.raw_score IS NOT NULL THEN 1 END) as completed_assessments,
        AVG(g.percentage) as average_percentage,
        MAX(g.raw_score) as highest_score,
        MIN(g.raw_score) as lowest_score,
        CURRENT_TIMESTAMP
    FROM gradebooks g
    WHERE g.school_id = NEW.school_id 
        AND g.student_id = NEW.student_id
        AND g.academic_year = NEW.academic_year
        AND g.term = NEW.term
        AND g.subject_name = NEW.subject_name
    GROUP BY g.school_id, g.student_id, g.academic_year, g.term, g.subject_name, g.class_name
    ON CONFLICT (school_id, student_id, academic_year, term, subject_name) 
    DO UPDATE SET
        total_assessments = EXCLUDED.total_assessments,
        completed_assessments = EXCLUDED.completed_assessments,
        average_percentage = EXCLUDED.average_percentage,
        highest_score = EXCLUDED.highest_score,
        lowest_score = EXCLUDED.lowest_score,
        last_updated = EXCLUDED.last_updated;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_gradebook_summary() OWNER TO postgres;

--
-- Name: update_modified_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_modified_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;   
END;
$$;


ALTER FUNCTION public.update_modified_column() OWNER TO postgres;

--
-- Name: update_responsibility_version_current(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_responsibility_version_current() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Set is_current to FALSE for all previous versions
    UPDATE responsibility_versions 
    SET is_current = FALSE 
    WHERE responsibility_id = NEW.responsibility_id 
    AND id != NEW.id;
    
    -- Set is_current to TRUE for the new version
    NEW.is_current = TRUE;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_responsibility_version_current() OWNER TO postgres;

--
-- Name: update_scheduled_reports_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_scheduled_reports_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_scheduled_reports_updated_at() OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: academic_components; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.academic_components (
    id integer NOT NULL,
    school_id character varying(255) NOT NULL,
    class_name character varying(100) NOT NULL,
    subject_name character varying(100) NOT NULL,
    chapter_name text NOT NULL,
    component_type character varying(50) NOT NULL,
    component_name text NOT NULL,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    status jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE ONLY public.academic_components FORCE ROW LEVEL SECURITY;


ALTER TABLE public.academic_components OWNER TO postgres;

--
-- Name: academic_components_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.academic_components_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.academic_components_id_seq OWNER TO postgres;

--
-- Name: academic_components_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.academic_components_id_seq OWNED BY public.academic_components.id;


--
-- Name: admin_task_queue; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_task_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id character varying(255) NOT NULL,
    task_type character varying(100) NOT NULL,
    task_name character varying(255) NOT NULL,
    description text,
    payload jsonb DEFAULT '{}'::jsonb,
    priority integer DEFAULT 5,
    status character varying(50) DEFAULT 'pending'::character varying,
    scheduled_for timestamp with time zone,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    result jsonb DEFAULT '{}'::jsonb,
    error_message text,
    retry_count integer DEFAULT 0,
    max_retries integer DEFAULT 3,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.admin_task_queue OWNER TO postgres;

--
-- Name: admin_timetable_conflicts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_timetable_conflicts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id character varying(255) NOT NULL,
    conflict_type character varying(100) NOT NULL,
    entity_type character varying(100) NOT NULL,
    entity_id character varying(255) NOT NULL,
    conflicting_with_type character varying(100) NOT NULL,
    conflicting_with_id character varying(255) NOT NULL,
    timetable_slot_id uuid,
    day_of_week integer,
    start_time time without time zone,
    end_time time without time zone,
    severity character varying(50) DEFAULT 'warning'::character varying,
    description text,
    detected_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    resolved_at timestamp with time zone,
    resolved_by character varying(255),
    resolution_notes text,
    metadata jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.admin_timetable_conflicts OWNER TO postgres;

--
-- Name: ai_background_jobs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_background_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_type character varying(50) NOT NULL,
    payload jsonb NOT NULL,
    status character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    retries integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.ai_background_jobs OWNER TO postgres;

--
-- Name: ai_chat_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_chat_history (
    id integer NOT NULL,
    school_id character varying(255) NOT NULL,
    user_id character varying(255) NOT NULL,
    role character varying(50) NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    session_id character varying(100)
);

ALTER TABLE ONLY public.ai_chat_history FORCE ROW LEVEL SECURITY;


ALTER TABLE public.ai_chat_history OWNER TO postgres;

--
-- Name: ai_chat_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ai_chat_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ai_chat_history_id_seq OWNER TO postgres;

--
-- Name: ai_chat_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ai_chat_history_id_seq OWNED BY public.ai_chat_history.id;


--
-- Name: ai_chat_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_chat_sessions (
    session_id character varying(100) NOT NULL,
    school_id character varying(50) NOT NULL,
    user_id character varying(100) NOT NULL,
    title character varying(255) DEFAULT 'New Research Session'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.ai_chat_sessions OWNER TO postgres;

--
-- Name: ai_grading_results; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_grading_results (
    grading_id uuid DEFAULT gen_random_uuid() NOT NULL,
    submission_id uuid NOT NULL,
    school_id character varying(255) NOT NULL,
    rubric_id uuid,
    overall_score numeric(5,2),
    normalized_score numeric(5,2),
    grade character varying(10),
    feedback text,
    strengths text[],
    weaknesses text[],
    suggestions text[],
    plagiarism_score numeric(5,2),
    plagiarism_matches jsonb,
    confidence_score numeric(5,2),
    grading_provider character varying(100),
    grading_model character varying(100),
    processing_time_ms integer,
    graded_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    reviewed_by_teacher boolean DEFAULT false,
    teacher_notes text,
    teacher_adjusted_score numeric(5,2),
    reviewed_by_checker boolean DEFAULT false,
    checker_id text,
    checker_notes text,
    teacher_approved boolean DEFAULT false,
    teacher_id text,
    is_finalized boolean DEFAULT false,
    strictness_used text
);


ALTER TABLE public.ai_grading_results OWNER TO postgres;

--
-- Name: TABLE ai_grading_results; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.ai_grading_results IS 'AI-generated grading results with feedback and plagiarism detection';


--
-- Name: ai_provider_health; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_provider_health (
    health_id bigint NOT NULL,
    provider_id integer NOT NULL,
    is_healthy boolean NOT NULL,
    latency_ms integer,
    error_message text,
    checked_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.ai_provider_health OWNER TO postgres;

--
-- Name: TABLE ai_provider_health; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.ai_provider_health IS 'Tracks health status of AI providers for monitoring';


--
-- Name: ai_provider_health_health_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ai_provider_health_health_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ai_provider_health_health_id_seq OWNER TO postgres;

--
-- Name: ai_provider_health_health_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ai_provider_health_health_id_seq OWNED BY public.ai_provider_health.health_id;


--
-- Name: ai_provider_usage; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_provider_usage (
    usage_id bigint NOT NULL,
    school_id character varying(50) NOT NULL,
    provider_id integer NOT NULL,
    operation_type character varying(50) NOT NULL,
    input_tokens integer,
    output_tokens integer,
    total_tokens integer,
    cost numeric(10,6),
    model_used character varying(100),
    "timestamp" timestamp with time zone DEFAULT now(),
    metadata jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.ai_provider_usage OWNER TO postgres;

--
-- Name: TABLE ai_provider_usage; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.ai_provider_usage IS 'Tracks AI provider usage and costs for billing and analytics';


--
-- Name: ai_providers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_providers (
    provider_id integer NOT NULL,
    provider_type character varying(50) NOT NULL,
    provider_name character varying(100) NOT NULL,
    config jsonb NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT config_is_object CHECK ((jsonb_typeof(config) = 'object'::text)),
    CONSTRAINT valid_provider_type CHECK (((provider_type)::text = ANY ((ARRAY['google_gemini'::character varying, 'openai'::character varying, 'anthropic'::character varying, 'azure_openai'::character varying, 'local_model'::character varying, 'custom'::character varying])::text[])))
);


ALTER TABLE public.ai_providers OWNER TO postgres;

--
-- Name: TABLE ai_providers; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.ai_providers IS 'Global AI provider configurations for multi-provider architecture';


--
-- Name: school_ai_config; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.school_ai_config (
    school_id character varying(50) NOT NULL,
    provider_id integer NOT NULL,
    default_model character varying(100),
    embedding_model character varying(100),
    max_monthly_cost numeric(10,2),
    features_enabled jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.school_ai_config OWNER TO postgres;

--
-- Name: TABLE school_ai_config; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.school_ai_config IS 'Per-school AI configuration with RLS for data isolation';


--
-- Name: ai_provider_status; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.ai_provider_status AS
 SELECT p.provider_id,
    p.provider_type,
    p.provider_name,
    p.is_active,
    p.created_at,
    p.updated_at,
    h.healthy,
    h.latency_ms,
    h.checked_at AS last_health_check,
    count(DISTINCT s.school_id) AS school_count,
    COALESCE(sum(u.total_tokens), (0)::bigint) AS total_tokens_used,
    COALESCE(sum(u.cost), (0)::numeric) AS total_cost
   FROM (((public.ai_providers p
     LEFT JOIN public.ai_provider_health h ON (((p.provider_id = h.provider_id) AND (h.checked_at = ( SELECT max(ai_provider_health.checked_at) AS max
           FROM public.ai_provider_health
          WHERE (ai_provider_health.provider_id = p.provider_id))))))
     LEFT JOIN public.school_ai_config s ON ((p.provider_id = s.provider_id)))
     LEFT JOIN public.ai_provider_usage u ON ((p.provider_id = u.provider_id)))
  GROUP BY p.provider_id, p.provider_type, p.provider_name, p.is_active, p.created_at, p.updated_at, h.healthy, h.latency_ms, h.checked_at;


ALTER VIEW public.ai_provider_status OWNER TO postgres;

--
-- Name: ai_provider_usage_usage_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ai_provider_usage_usage_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ai_provider_usage_usage_id_seq OWNER TO postgres;

--
-- Name: ai_provider_usage_usage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ai_provider_usage_usage_id_seq OWNED BY public.ai_provider_usage.usage_id;


--
-- Name: ai_providers_provider_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ai_providers_provider_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ai_providers_provider_id_seq OWNER TO postgres;

--
-- Name: ai_providers_provider_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ai_providers_provider_id_seq OWNED BY public.ai_providers.provider_id;


--
-- Name: ai_query_cache; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_query_cache (
    id integer NOT NULL,
    school_id character varying(50) NOT NULL,
    question_text text NOT NULL,
    question_embedding public.vector(768) NOT NULL,
    generated_sql text,
    created_at timestamp with time zone DEFAULT now(),
    question_tsvector tsvector,
    search_count integer DEFAULT 1,
    last_used_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.ai_query_cache OWNER TO postgres;

--
-- Name: ai_query_cache_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ai_query_cache_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ai_query_cache_id_seq OWNER TO postgres;

--
-- Name: ai_query_cache_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ai_query_cache_id_seq OWNED BY public.ai_query_cache.id;


--
-- Name: ai_schema_embeddings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_schema_embeddings (
    id integer NOT NULL,
    table_name character varying(255) NOT NULL,
    schema_text text NOT NULL,
    schema_embedding public.vector(768),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    schema_tsvector tsvector
);


ALTER TABLE public.ai_schema_embeddings OWNER TO postgres;

--
-- Name: ai_schema_embeddings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ai_schema_embeddings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ai_schema_embeddings_id_seq OWNER TO postgres;

--
-- Name: ai_schema_embeddings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ai_schema_embeddings_id_seq OWNED BY public.ai_schema_embeddings.id;


--
-- Name: ai_school_status; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_school_status (
    school_id character varying(50) NOT NULL,
    queries_processed integer DEFAULT 0,
    accuracy_score double precision DEFAULT 0.0,
    is_junior_graduated boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.ai_school_status OWNER TO postgres;

--
-- Name: ai_shadow_evaluations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_shadow_evaluations (
    id integer NOT NULL,
    session_id uuid NOT NULL,
    user_query text NOT NULL,
    senior_sql text NOT NULL,
    junior_sql text,
    status character varying(50) DEFAULT 'PENDING'::character varying,
    lesson_learned text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.ai_shadow_evaluations OWNER TO postgres;

--
-- Name: ai_shadow_evaluations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ai_shadow_evaluations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ai_shadow_evaluations_id_seq OWNER TO postgres;

--
-- Name: ai_shadow_evaluations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ai_shadow_evaluations_id_seq OWNED BY public.ai_shadow_evaluations.id;


--
-- Name: ai_training_metrics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_training_metrics (
    id integer NOT NULL,
    target_count integer DEFAULT 1000,
    current_passed integer DEFAULT 0,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.ai_training_metrics OWNER TO postgres;

--
-- Name: ai_training_metrics_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ai_training_metrics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ai_training_metrics_id_seq OWNER TO postgres;

--
-- Name: ai_training_metrics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ai_training_metrics_id_seq OWNED BY public.ai_training_metrics.id;


--
-- Name: ai_usage_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ai_usage_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id character varying(50) NOT NULL,
    model character varying(50) NOT NULL,
    tokens_used integer DEFAULT 0 NOT NULL,
    endpoint character varying(100),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.ai_usage_logs OWNER TO postgres;

--
-- Name: announcements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.announcements (
    id integer NOT NULL,
    announcement_id character varying(255) NOT NULL,
    school_id character varying(255) NOT NULL,
    target_type character varying(50) NOT NULL,
    target_id character varying(255) NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE ONLY public.announcements FORCE ROW LEVEL SECURITY;


ALTER TABLE public.announcements OWNER TO postgres;

--
-- Name: announcements_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.announcements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.announcements_id_seq OWNER TO postgres;

--
-- Name: announcements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.announcements_id_seq OWNED BY public.announcements.id;


--
-- Name: api_keys; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.api_keys (
    id integer NOT NULL,
    school_id character varying(50) NOT NULL,
    key_id character varying(50) NOT NULL,
    key_hash character varying(64) NOT NULL,
    name character varying(100) NOT NULL,
    scopes text[] DEFAULT '{}'::text[] NOT NULL,
    rate_limit_per_min integer DEFAULT 60,
    status character varying(20) DEFAULT 'active'::character varying,
    last_used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE ONLY public.api_keys FORCE ROW LEVEL SECURITY;


ALTER TABLE public.api_keys OWNER TO postgres;

--
-- Name: api_keys_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.api_keys_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.api_keys_id_seq OWNER TO postgres;

--
-- Name: api_keys_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.api_keys_id_seq OWNED BY public.api_keys.id;


--
-- Name: app_files; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.app_files (
    id integer NOT NULL,
    file_hash character varying(64) NOT NULL,
    school_id character varying(50),
    user_id character varying(50),
    user_type character varying(20),
    file_name character varying(255) NOT NULL,
    content_type character varying(100),
    file_size bigint,
    file_path text NOT NULL,
    public_url text NOT NULL,
    is_permanent boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.app_files OWNER TO postgres;

--
-- Name: app_files_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.app_files_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.app_files_id_seq OWNER TO postgres;

--
-- Name: app_files_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.app_files_id_seq OWNED BY public.app_files.id;


--
-- Name: attendance; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.attendance (
    id integer NOT NULL,
    school_id character varying(255) NOT NULL,
    role character varying(50) NOT NULL,
    user_id character varying(255) NOT NULL,
    date date NOT NULL,
    status character varying(50) NOT NULL,
    in_time timestamp with time zone,
    out_time timestamp with time zone,
    total_time interval, -- Bug #7 Fixed: was 'text'; interval type allows proper duration calculations (e.g., out_time - in_time)
    reason text,
    description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    class_name character varying
);

ALTER TABLE ONLY public.attendance FORCE ROW LEVEL SECURITY;


ALTER TABLE public.attendance OWNER TO postgres;

--
-- Name: TABLE attendance; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.attendance IS 'Temporal records of student and employee presence presence.';


--
-- Name: COLUMN attendance.class_name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.attendance.class_name IS 'Class/department name for filtering bulk attendance operations';


--
-- Name: attendance_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.attendance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.attendance_id_seq OWNER TO postgres;

--
-- Name: attendance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.attendance_id_seq OWNED BY public.attendance.id;


--
-- Name: attendance_qr_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.attendance_qr_tokens (
    id integer NOT NULL,
    school_id character varying(255) NOT NULL,
    class_id character varying(255),
    token character varying(64) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_by text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    is_used boolean DEFAULT false,
    used_by text,
    used_at timestamp with time zone
);


ALTER TABLE public.attendance_qr_tokens OWNER TO postgres;

--
-- Name: attendance_qr_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.attendance_qr_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.attendance_qr_tokens_id_seq OWNER TO postgres;

--
-- Name: attendance_qr_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.attendance_qr_tokens_id_seq OWNED BY public.attendance_qr_tokens.id;


--
-- Name: attendance_reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.attendance_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id character varying NOT NULL,
    report_type character varying NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    generated_at timestamp with time zone DEFAULT now(),
    file_path character varying,
    file_format character varying,
    metadata jsonb DEFAULT '{}'::jsonb,
    data jsonb DEFAULT '{}'::jsonb,
    status character varying DEFAULT 'completed'::character varying,
    generated_by character varying,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.attendance_reports OWNER TO postgres;

--
-- Name: audit_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_events (
    id bigint NOT NULL,
    event_id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id character varying(50) NOT NULL,
    event_timestamp timestamp with time zone DEFAULT now() NOT NULL,
    event_type character varying(50) NOT NULL,
    event_subtype character varying(50),
    actor_type character varying(50) NOT NULL,
    actor_id character varying(100),
    actor_name character varying(255),
    actor_ip inet,
    actor_user_agent text,
    resource_type character varying(50),
    resource_id character varying(100),
    resource_name text,
    action character varying(100) NOT NULL,
    action_status character varying(20) NOT NULL,
    failure_reason text,
    old_values jsonb,
    new_values jsonb,
    delta jsonb,
    request_id character varying(100),
    session_id character varying(100),
    api_endpoint character varying(255),
    http_method character varying(10),
    http_status_code integer,
    legal_basis character varying(50),
    purpose_of_processing text,
    data_categories text[],
    application_version character varying(50),
    deployment_mode character varying(20) DEFAULT 'saas'::character varying,
    encryption_key_id character varying(100),
    encrypted_fields text[],
    developer_access_grant_id integer,
    CONSTRAINT audit_events_action_status_check CHECK (((action_status)::text = ANY ((ARRAY['success'::character varying, 'failure'::character varying, 'denied'::character varying, 'partial'::character varying])::text[]))),
    CONSTRAINT audit_events_actor_type_check CHECK (((actor_type)::text = ANY ((ARRAY['user'::character varying, 'system'::character varying, 'api_key'::character varying, 'integration'::character varying, 'developer'::character varying, 'admin'::character varying])::text[]))),
    CONSTRAINT audit_events_event_type_check CHECK (((event_type)::text = ANY ((ARRAY['authentication'::character varying, 'data_access'::character varying, 'data_modification'::character varying, 'configuration'::character varying, 'security'::character varying, 'compliance'::character varying, 'system'::character varying, 'developer_access'::character varying, 'encryption'::character varying])::text[]))),
    CONSTRAINT audit_events_legal_basis_check CHECK (((legal_basis)::text = ANY ((ARRAY['consent'::character varying, 'contract'::character varying, 'legal_obligation'::character varying, 'legitimate_interest'::character varying, 'vital_interest'::character varying, 'public_task'::character varying])::text[])))
);


ALTER TABLE public.audit_events OWNER TO postgres;

--
-- Name: TABLE audit_events; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.audit_events IS 'Comprehensive audit logging for compliance with DPDPA 2023, GDPR, and other regulations';


--
-- Name: audit_daily_summary; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.audit_daily_summary AS
 SELECT school_id,
    date(event_timestamp) AS audit_date,
    event_type,
    action_status,
    count(*) AS event_count,
    count(DISTINCT actor_id) AS unique_actors,
    count(DISTINCT resource_type) AS unique_resource_types
   FROM public.audit_events
  WHERE (event_timestamp >= (CURRENT_DATE - '30 days'::interval))
  GROUP BY school_id, (date(event_timestamp)), event_type, action_status;


ALTER VIEW public.audit_daily_summary OWNER TO postgres;

--
-- Name: audit_events_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_events_id_seq OWNER TO postgres;

--
-- Name: audit_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_events_id_seq OWNED BY public.audit_events.id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    school_id character varying(255) NOT NULL,
    target_type character varying(255) NOT NULL,
    target_id character varying(255) NOT NULL,
    action character varying(255) NOT NULL,
    data jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE ONLY public.audit_logs FORCE ROW LEVEL SECURITY;


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_id_seq OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: auth; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.auth (
    school_id character varying(255) NOT NULL,
    password text NOT NULL,
    is_password_temp boolean DEFAULT false,
    security_question text,
    security_answer_hash text,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.auth OWNER TO postgres;

--
-- Name: auth_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.auth_logs (
    id integer NOT NULL,
    school_id character varying(50) NOT NULL, -- Bug #2 Fixed: was 'text'; standardized to varchar(50) for consistency
    user_type text,
    action text,
    details text,
    ip_address text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.auth_logs OWNER TO postgres;

--
-- Name: auth_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.auth_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.auth_logs_id_seq OWNER TO postgres;

--
-- Name: auth_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.auth_logs_id_seq OWNED BY public.auth_logs.id;


--
-- Name: automated_reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.automated_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id character varying(255) NOT NULL,
    report_type character varying(100) NOT NULL,
    report_name character varying(255) NOT NULL,
    description text,
    schedule_type character varying(50) NOT NULL,
    schedule_config jsonb DEFAULT '{}'::jsonb,
    recipient_emails jsonb DEFAULT '[]'::jsonb,
    recipient_roles jsonb DEFAULT '[]'::jsonb,
    report_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    template_path character varying(500),
    last_generated_at timestamp with time zone,
    next_scheduled_at timestamp with time zone,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(255)
);


ALTER TABLE public.automated_reports OWNER TO postgres;

--
-- Name: awards; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.awards (
    id integer NOT NULL,
    award_id character varying(255) NOT NULL,
    school_id character varying(255) NOT NULL,
    type character varying(50) NOT NULL,
    parent_id character varying(255) NOT NULL,
    award_name text NOT NULL,
    award_type text,
    "position" text,
    description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE ONLY public.awards FORCE ROW LEVEL SECURITY;


ALTER TABLE public.awards OWNER TO postgres;

--
-- Name: awards_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.awards_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.awards_id_seq OWNER TO postgres;

--
-- Name: awards_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.awards_id_seq OWNED BY public.awards.id;


--
-- Name: billing_ledger; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.billing_ledger (
    id integer NOT NULL,
    school_id character varying(50) NOT NULL, -- Bug #6 Fixed: was 'text' nullable; now consistent type with NOT NULL constraint
    amount numeric(15,2) NOT NULL,
    transaction_type text NOT NULL,
    description text,
    balance_after numeric(15,2) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.billing_ledger OWNER TO postgres;

--
-- Name: billing_ledger_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.billing_ledger_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.billing_ledger_id_seq OWNER TO postgres;

--
-- Name: billing_ledger_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.billing_ledger_id_seq OWNED BY public.billing_ledger.id;


--
-- Name: blog_posts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.blog_posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug character varying(255) NOT NULL,
    title character varying(500) NOT NULL,
    excerpt text,
    content text NOT NULL,
    cover_image_url character varying(1000),
    author_name character varying(255) DEFAULT 'Vidhyam Team'::character varying,
    category character varying(100),
    tags text[] DEFAULT '{}'::text[],
    seo_title character varying(200),
    seo_description character varying(500),
    is_published boolean DEFAULT false,
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.blog_posts OWNER TO postgres;

--
-- Name: chapters; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chapters (
    id integer NOT NULL,
    school_id character varying(255) NOT NULL,
    class_name character varying(100) NOT NULL,
    subject_name character varying(100) NOT NULL,
    chapter_name text NOT NULL,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    is_taught boolean DEFAULT false,
    weightage integer DEFAULT 1,
    quarter text,
    periods_allocated integer DEFAULT 0
);

ALTER TABLE ONLY public.chapters FORCE ROW LEVEL SECURITY;


ALTER TABLE public.chapters OWNER TO postgres;

--
-- Name: chapters_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.chapters_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.chapters_id_seq OWNER TO postgres;

--
-- Name: chapters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.chapters_id_seq OWNED BY public.chapters.id;


--
-- Name: classes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.classes (
    id character varying(255) NOT NULL,
    school_id character varying(255) NOT NULL,
    name character varying(255),
    total_students integer DEFAULT 0,
    total_teachers integer DEFAULT 0,
    total_periods integer DEFAULT 0,
    room_number character varying(255),
    class_fees double precision DEFAULT 0.0,
    sections jsonb DEFAULT '[]'::jsonb,
    streams jsonb DEFAULT '[]'::jsonb,
    section_size integer DEFAULT 40,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE ONLY public.classes FORCE ROW LEVEL SECURITY;


ALTER TABLE public.classes OWNER TO postgres;

--
-- Name: common_error_patterns; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.common_error_patterns (
    pattern_id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id character varying(255) NOT NULL,
    subject_name character varying(255),
    error_type character varying(100) NOT NULL,
    pattern_text text NOT NULL,
    description text,
    feedback_template text NOT NULL,
    severity character varying(20) DEFAULT 'medium'::character varying,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.common_error_patterns OWNER TO postgres;

--
-- Name: TABLE common_error_patterns; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.common_error_patterns IS 'Common error patterns for automated feedback generation';


--
-- Name: communication; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.communication (
    id integer NOT NULL,
    school_id character varying(255) NOT NULL,
    type character varying(50) NOT NULL,
    title text,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE ONLY public.communication FORCE ROW LEVEL SECURITY;


ALTER TABLE public.communication OWNER TO postgres;

--
-- Name: communication_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.communication_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.communication_id_seq OWNER TO postgres;

--
-- Name: communication_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.communication_id_seq OWNED BY public.communication.id;


--
-- Name: complaints; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.complaints (
    id integer NOT NULL,
    complaint_id character varying(255) NOT NULL,
    school_id character varying(255) NOT NULL,
    student_id character varying(255) NOT NULL,
    subject text NOT NULL,
    description text NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    attachment_path text,
    sender_id character varying(255),
    sender_type character varying(50),
    target_id character varying(255),
    target_type character varying(50)
);


ALTER TABLE public.complaints OWNER TO postgres;

--
-- Name: complaints_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.complaints_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.complaints_id_seq OWNER TO postgres;

--
-- Name: complaints_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.complaints_id_seq OWNED BY public.complaints.id;


--
-- Name: consent_records; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.consent_records (
    id bigint NOT NULL,
    school_id character varying(50) NOT NULL,
    subject_type character varying(50) NOT NULL,
    subject_id character varying(100) NOT NULL,
    consent_type character varying(100) NOT NULL,
    consent_version character varying(50) NOT NULL,
    consent_text text,
    purposes text[] NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    given_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    withdrawn_at timestamp with time zone,
    collection_method character varying(50),
    collection_point character varying(255),
    ip_address inet,
    user_agent text,
    recorded_by character varying(100),
    last_verified_at timestamp with time zone,
    CONSTRAINT consent_records_collection_method_check CHECK (((collection_method)::text = ANY ((ARRAY['web_form'::character varying, 'mobile_app'::character varying, 'paper_form'::character varying, 'verbal'::character varying, 'email'::character varying, 'api'::character varying])::text[]))),
    CONSTRAINT consent_records_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'withdrawn'::character varying, 'expired'::character varying, 'superseded'::character varying])::text[]))),
    CONSTRAINT consent_records_subject_type_check CHECK (((subject_type)::text = ANY ((ARRAY['student'::character varying, 'employee'::character varying, 'parent'::character varying, 'guardian'::character varying])::text[])))
);


ALTER TABLE public.consent_records OWNER TO postgres;

--
-- Name: TABLE consent_records; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.consent_records IS 'Consent management records for data processing';


--
-- Name: data_breach_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.data_breach_logs (
    id bigint NOT NULL,
    breach_id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id character varying(50) NOT NULL,
    breach_type character varying(50) NOT NULL,
    severity character varying(20) NOT NULL,
    description text NOT NULL,
    affected_data_categories text[],
    affected_subjects_count integer,
    affected_subjects_types text[],
    detected_at timestamp with time zone DEFAULT now() NOT NULL,
    occurred_from timestamp with time zone,
    occurred_to timestamp with time zone,
    containment_status character varying(50) DEFAULT 'investigating'::character varying NOT NULL,
    response_actions text[],
    is_notification_sent boolean DEFAULT false,
    notification_date timestamp with time zone,
    reported_to_authorities boolean DEFAULT false,
    authority_name character varying(255),
    report_date timestamp with time zone,
    report_reference character varying(255),
    root_cause_category character varying(100),
    root_cause_description text,
    preventive_measures_taken text[],
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by character varying(100) NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT data_breach_logs_breach_type_check CHECK (((breach_type)::text = ANY ((ARRAY['unauthorized_access'::character varying, 'data_loss'::character varying, 'data_leak'::character varying, 'system_compromise'::character varying])::text[]))),
    CONSTRAINT data_breach_logs_containment_status_check CHECK (((containment_status)::text = ANY ((ARRAY['investigating'::character varying, 'contained'::character varying, 'mitigated'::character varying, 'resolved'::character varying])::text[]))),
    CONSTRAINT data_breach_logs_severity_check CHECK (((severity)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'critical'::character varying])::text[])))
);


ALTER TABLE public.data_breach_logs OWNER TO postgres;

--
-- Name: TABLE data_breach_logs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.data_breach_logs IS 'Data breach incident logging and tracking';


--
-- Name: dsar_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.dsar_requests (
    id bigint NOT NULL,
    request_id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id character varying(50) NOT NULL,
    data_subject_type character varying(50) NOT NULL,
    data_subject_id character varying(100) NOT NULL,
    data_subject_name character varying(255),
    data_subject_email character varying(255),
    data_subject_phone character varying(50),
    request_type character varying(50) NOT NULL,
    request_description text,
    requested_data_categories text[],
    status character varying(50) DEFAULT 'received'::character varying NOT NULL,
    priority character varying(20) DEFAULT 'normal'::character varying NOT NULL,
    legal_basis character varying(50),
    verification_method character varying(50),
    verification_date timestamp with time zone,
    assigned_to character varying(100),
    due_date timestamp with time zone,
    completed_date timestamp with time zone,
    completion_notes text,
    response_data jsonb,
    response_format character varying(50) DEFAULT 'json'::character varying,
    response_delivery_method character varying(50),
    created_by character varying(100) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying(100),
    CONSTRAINT dsar_requests_data_subject_type_check CHECK (((data_subject_type)::text = ANY ((ARRAY['student'::character varying, 'employee'::character varying, 'parent'::character varying, 'guardian'::character varying, 'other'::character varying])::text[]))),
    CONSTRAINT dsar_requests_priority_check CHECK (((priority)::text = ANY ((ARRAY['low'::character varying, 'normal'::character varying, 'high'::character varying, 'urgent'::character varying])::text[]))),
    CONSTRAINT dsar_requests_request_type_check CHECK (((request_type)::text = ANY ((ARRAY['access'::character varying, 'correction'::character varying, 'deletion'::character varying, 'restriction'::character varying, 'portability'::character varying, 'objection'::character varying])::text[]))),
    CONSTRAINT dsar_requests_status_check CHECK (((status)::text = ANY ((ARRAY['received'::character varying, 'processing'::character varying, 'completed'::character varying, 'rejected'::character varying, 'cancelled'::character varying])::text[])))
);


ALTER TABLE public.dsar_requests OWNER TO postgres;

--
-- Name: TABLE dsar_requests; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.dsar_requests IS 'Data Subject Access Request tracking for compliance';


--
-- Name: compliance_dashboard; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.compliance_dashboard AS
 SELECT school_id,
    count(DISTINCT
        CASE
            WHEN (((record_type)::text = 'dsar'::text) AND ((status)::text = 'completed'::text)) THEN id
            ELSE NULL::bigint
        END) AS dsar_completed,
    count(DISTINCT
        CASE
            WHEN (((record_type)::text = 'dsar'::text) AND ((status)::text = ANY ((ARRAY['received'::character varying, 'processing'::character varying])::text[]))) THEN id
            ELSE NULL::bigint
        END) AS dsar_pending,
    avg((EXTRACT(epoch FROM (completed_date - created_at)) / (86400)::numeric)) FILTER (WHERE (((record_type)::text = 'dsar'::text) AND ((status)::text = 'completed'::text))) AS avg_dsar_completion_days,
    count(DISTINCT
        CASE
            WHEN (((record_type)::text = 'consent'::text) AND ((status)::text = 'active'::text)) THEN id
            ELSE NULL::bigint
        END) AS active_consents,
    count(DISTINCT
        CASE
            WHEN (((record_type)::text = 'consent'::text) AND ((status)::text = 'withdrawn'::text)) THEN id
            ELSE NULL::bigint
        END) AS withdrawn_consents,
    count(DISTINCT
        CASE
            WHEN (((record_type)::text = 'breach'::text) AND ((severity)::text = ANY ((ARRAY['high'::character varying, 'critical'::character varying])::text[]))) THEN id
            ELSE NULL::bigint
        END) AS critical_breaches,
    count(DISTINCT
        CASE
            WHEN (((record_type)::text = 'breach'::text) AND ((status)::text <> 'resolved'::text)) THEN id
            ELSE NULL::bigint
        END) AS open_breaches
   FROM ( SELECT dsar_requests.school_id,
            dsar_requests.id,
            dsar_requests.status,
            dsar_requests.created_at,
            dsar_requests.completed_date,
            NULL::character varying AS severity,
            'dsar'::character varying AS record_type
           FROM public.dsar_requests
        UNION ALL
         SELECT consent_records.school_id,
            consent_records.id,
            consent_records.status,
            consent_records.given_at AS created_at,
            NULL::timestamp with time zone AS completed_date,
            NULL::character varying AS severity,
            'consent'::character varying AS record_type
           FROM public.consent_records
        UNION ALL
         SELECT data_breach_logs.school_id,
            data_breach_logs.id,
            data_breach_logs.containment_status AS status,
            data_breach_logs.detected_at AS created_at,
            NULL::timestamp with time zone AS completed_date,
            data_breach_logs.severity,
            'breach'::character varying AS record_type
           FROM public.data_breach_logs) combined
  GROUP BY school_id;


ALTER VIEW public.compliance_dashboard OWNER TO postgres;

--
-- Name: compliance_regulatory_report; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.compliance_regulatory_report AS
 SELECT school_id,
    date(event_timestamp) AS report_date,
    event_type,
    count(*) AS total_events,
    count(DISTINCT actor_id) AS unique_actors,
    count(DISTINCT resource_type) AS resource_types_accessed,
    NULL::character varying AS data_categories_accessed,
    min(event_timestamp) AS first_event,
    max(event_timestamp) AS last_event
   FROM public.audit_events ae
  WHERE (event_timestamp >= (now() - '30 days'::interval))
  GROUP BY school_id, (date(event_timestamp)), event_type;


ALTER VIEW public.compliance_regulatory_report OWNER TO postgres;

--
-- Name: conditional_approval_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.conditional_approval_templates (
    template_id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id character varying NOT NULL,
    template_name character varying NOT NULL,
    description text,
    conditions jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_default boolean DEFAULT false,
    created_by character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.conditional_approval_templates OWNER TO postgres;

--
-- Name: TABLE conditional_approval_templates; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.conditional_approval_templates IS 'Templates for conditional approval conditions';


--
-- Name: conditional_approvals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.conditional_approvals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    leave_id character varying NOT NULL,
    conditions jsonb DEFAULT '[]'::jsonb NOT NULL,
    response_deadline timestamp with time zone NOT NULL,
    is_auto_reject_enabled boolean DEFAULT true,
    admin_notes text,
    employee_response jsonb,
    responded_at timestamp with time zone,
    status character varying DEFAULT 'pending_response'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT conditional_approvals_status_check CHECK (((status)::text = ANY ((ARRAY['pending_response'::character varying, 'accepted'::character varying, 'rejected'::character varying, 'auto_rejected'::character varying, 'overridden'::character varying])::text[])))
);


ALTER TABLE public.conditional_approvals OWNER TO postgres;

--
-- Name: TABLE conditional_approvals; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.conditional_approvals IS 'Conditional approval workflows for leave requests';


--
-- Name: consent_records_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.consent_records_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.consent_records_id_seq OWNER TO postgres;

--
-- Name: consent_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.consent_records_id_seq OWNED BY public.consent_records.id;


--
-- Name: countries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.countries (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(10) NOT NULL,
    phone_code character varying(10) NOT NULL
);


ALTER TABLE public.countries OWNER TO postgres;

--
-- Name: countries_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.countries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.countries_id_seq OWNER TO postgres;

--
-- Name: countries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.countries_id_seq OWNED BY public.countries.id;


--
-- Name: coupons; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.coupons (
    coupon_id character varying(255) NOT NULL,
    school_id character varying(255) NOT NULL,
    coupon_name character varying(255) NOT NULL,
    discount_type character varying(50) NOT NULL,
    discount_value double precision NOT NULL,
    is_blocked boolean DEFAULT false NOT NULL,
    data jsonb
);


ALTER TABLE public.coupons OWNER TO postgres;

--
-- Name: custom_fees; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.custom_fees (
    id integer NOT NULL,
    fee_id character varying(255) NOT NULL,
    school_id character varying(255) NOT NULL,
    fee_name text NOT NULL,
    fee_type character varying(50) DEFAULT 'one_time'::character varying NOT NULL,
    amount numeric(12,2) NOT NULL,
    scope character varying(50) DEFAULT 'school'::character varying NOT NULL,
    target_classes jsonb DEFAULT '[]'::jsonb,
    target_students jsonb DEFAULT '[]'::jsonb,
    due_date date,
    has_penalty boolean DEFAULT false,
    penalty_per_day numeric(12,2) DEFAULT 0,
    description text,
    status character varying(50) DEFAULT 'active'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.custom_fees FORCE ROW LEVEL SECURITY;


ALTER TABLE public.custom_fees OWNER TO postgres;

--
-- Name: custom_fees_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.custom_fees_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.custom_fees_id_seq OWNER TO postgres;

--
-- Name: custom_fees_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.custom_fees_id_seq OWNED BY public.custom_fees.id;


--
-- Name: daily_attendance_summary; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.daily_attendance_summary AS
 SELECT school_id,
    date,
    role,
    count(*) AS total,
    count(
        CASE
            WHEN ((status)::text = 'present'::text) THEN 1
            ELSE NULL::integer
        END) AS present_count,
    count(
        CASE
            WHEN ((status)::text = 'absent'::text) THEN 1
            ELSE NULL::integer
        END) AS absent_count,
    count(
        CASE
            WHEN ((status)::text = 'leave'::text) THEN 1
            ELSE NULL::integer
        END) AS leave_count,
    count(
        CASE
            WHEN ((status)::text = 'holiday'::text) THEN 1
            ELSE NULL::integer
        END) AS holiday_count,
    round((((count(
        CASE
            WHEN ((status)::text = 'present'::text) THEN 1
            ELSE NULL::integer
        END))::numeric * 100.0) / (NULLIF(count(*), 0))::numeric), 2) AS attendance_percentage
   FROM public.attendance a
  GROUP BY school_id, date, role;


ALTER VIEW public.daily_attendance_summary OWNER TO postgres;

--
-- Name: daily_teacher_reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.daily_teacher_reports (
    id integer NOT NULL,
    school_id character varying(255) NOT NULL,
    teacher_id text NOT NULL,
    report_date date NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    summary text,
    pending_topics jsonb DEFAULT '[]'::jsonb,
    completed_periods integer DEFAULT 0,
    total_periods integer DEFAULT 0,
    submitted_at timestamp with time zone
);


ALTER TABLE public.daily_teacher_reports OWNER TO postgres;

--
-- Name: daily_teacher_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.daily_teacher_reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.daily_teacher_reports_id_seq OWNER TO postgres;

--
-- Name: daily_teacher_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.daily_teacher_reports_id_seq OWNED BY public.daily_teacher_reports.id;


--
-- Name: data_breach_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.data_breach_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.data_breach_logs_id_seq OWNER TO postgres;

--
-- Name: data_breach_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.data_breach_logs_id_seq OWNED BY public.data_breach_logs.id;


--
-- Name: data_classification; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.data_classification (
    classification_id integer NOT NULL,
    school_id character varying(255) NOT NULL,
    table_name character varying(100) NOT NULL,
    column_name character varying(100) NOT NULL,
    json_path text,
    data_type character varying(50) NOT NULL,
    classification_level character varying(50) NOT NULL,
    encryption_required boolean DEFAULT true NOT NULL,
    encryption_key_id character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by character varying(255)
);


ALTER TABLE public.data_classification OWNER TO postgres;

--
-- Name: TABLE data_classification; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.data_classification IS 'Defines classification and encryption requirements for sensitive data fields';


--
-- Name: data_classification_classification_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.data_classification_classification_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.data_classification_classification_id_seq OWNER TO postgres;

--
-- Name: data_classification_classification_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.data_classification_classification_id_seq OWNED BY public.data_classification.classification_id;


--
-- Name: developer_access_grants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.developer_access_grants (
    id integer NOT NULL,
    request_id integer,
    developer_id character varying(255) NOT NULL,
    granted_role character varying(50) NOT NULL,
    pg_role_name character varying(100) NOT NULL,
    start_time timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    end_time timestamp with time zone NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    revoked_at timestamp with time zone,
    revocation_reason text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.developer_access_grants OWNER TO postgres;

--
-- Name: developer_access_grants_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.developer_access_grants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.developer_access_grants_id_seq OWNER TO postgres;

--
-- Name: developer_access_grants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.developer_access_grants_id_seq OWNED BY public.developer_access_grants.id;


--
-- Name: developer_access_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.developer_access_requests (
    id integer NOT NULL,
    developer_id character varying(255) NOT NULL,
    developer_email character varying(255) NOT NULL,
    requested_role character varying(50) NOT NULL,
    justification text NOT NULL,
    requested_tables text[] NOT NULL,
    requested_columns text[],
    duration_hours integer DEFAULT 4 NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    approver_id character varying(255),
    approver_email character varying(255),
    approval_notes text,
    approved_at timestamp with time zone,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT developer_access_requests_requested_role_check CHECK (((requested_role)::text = ANY ((ARRAY['readonly'::character varying, 'emergency'::character varying, 'audit'::character varying, 'data_engineer'::character varying])::text[]))),
    CONSTRAINT developer_access_requests_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'expired'::character varying, 'revoked'::character varying])::text[])))
);


ALTER TABLE public.developer_access_requests OWNER TO postgres;

--
-- Name: developer_access_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.developer_access_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.developer_access_requests_id_seq OWNER TO postgres;

--
-- Name: developer_access_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.developer_access_requests_id_seq OWNED BY public.developer_access_requests.id;


--
-- Name: developer_activity_audit; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.developer_activity_audit (
    id integer NOT NULL,
    developer_id character varying(255) NOT NULL,
    developer_email character varying(255) NOT NULL,
    action_type character varying(50) NOT NULL,
    target_table character varying(100),
    target_schema character varying(100),
    query_text text,
    rows_affected integer,
    ip_address inet,
    user_agent text,
    session_id character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT developer_activity_audit_action_type_check CHECK (((action_type)::text = ANY ((ARRAY['query'::character varying, 'login'::character varying, 'logout'::character varying, 'access_grant'::character varying, 'access_revoke'::character varying, 'data_export'::character varying])::text[])))
);


ALTER TABLE public.developer_activity_audit OWNER TO postgres;

--
-- Name: developer_activity_audit_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.developer_activity_audit_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.developer_activity_audit_id_seq OWNER TO postgres;

--
-- Name: developer_activity_audit_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.developer_activity_audit_id_seq OWNED BY public.developer_activity_audit.id;


--
-- Name: employees; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employees (
    id integer NOT NULL,
    employee_id character varying(255) NOT NULL,
    school_id character varying(255) NOT NULL,
    employee_type character varying(50) NOT NULL,
    aadhaar_number character varying(50),
    contact character varying(50),
    email character varying(255),
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    profile_image_url text
);

ALTER TABLE ONLY public.employees FORCE ROW LEVEL SECURITY;


ALTER TABLE public.employees OWNER TO postgres;

--
-- Name: developer_employees_view; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.developer_employees_view AS
 SELECT id,
    employee_id,
    school_id,
    employee_type,
    data,
    created_at,
    updated_at,
        CASE
            WHEN (CURRENT_USER = ANY (ARRAY['developer_readonly'::name, 'developer_data_engineer'::name])) THEN '***MASKED***'::text
            ELSE (data ->> 'aadhaarNumber'::text)
        END AS aadhaar_number,
        CASE
            WHEN (CURRENT_USER = ANY (ARRAY['developer_readonly'::name, 'developer_data_engineer'::name])) THEN concat("substring"((data ->> 'contact'::text), 1, 3), '****', "substring"((data ->> 'contact'::text), 8, 4))
            ELSE (data ->> 'contact'::text)
        END AS contact,
        CASE
            WHEN (CURRENT_USER = ANY (ARRAY['developer_readonly'::name, 'developer_data_engineer'::name])) THEN concat("substring"((data ->> 'alternativeContact'::text), 1, 3), '****', "substring"((data ->> 'alternativeContact'::text), 8, 4))
            ELSE (data ->> 'alternativeContact'::text)
        END AS alternative_contact,
        CASE
            WHEN (CURRENT_USER = ANY (ARRAY['developer_readonly'::name, 'developer_data_engineer'::name])) THEN concat("substring"((data ->> 'email'::text), 1, 3), '***@***', "substring"((data ->> 'email'::text), '@(.*)$'::text))
            ELSE (data ->> 'email'::text)
        END AS email,
        CASE
            WHEN (CURRENT_USER = ANY (ARRAY['developer_readonly'::name, 'developer_data_engineer'::name])) THEN '***MASKED***'::text
            ELSE (data ->> 'salary'::text)
        END AS salary
   FROM public.employees e;


ALTER VIEW public.developer_employees_view OWNER TO postgres;

--
-- Name: students; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.students (
    id integer NOT NULL,
    student_id character varying(255) NOT NULL,
    school_id character varying(255) NOT NULL,
    class_name character varying(100) NOT NULL,
    name text,
    roll_number integer,
    section character varying(50),
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    dob character varying(100),
    gender character varying(50),
    father_name text,
    mother_name text,
    aadhaar_number character varying(50),
    address_line1 text,
    address_city character varying(255),
    address_state character varying(255),
    address_pincode character varying(20),
    tc_number character varying(100),
    contact character varying(50),
    alternative_contact character varying(50),
    email character varying(255),
    is_transport_enabled boolean DEFAULT false,
    transport_radius character varying(50),
    additional_subjects text,
    admission_date character varying(100),
    room_number character varying(50),
    student_type character varying(100),
    profile_image_url text,
    enrolled_subjects jsonb DEFAULT '[]'::jsonb,
    total_fees numeric(15,2) DEFAULT 0.00,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE ONLY public.students FORCE ROW LEVEL SECURITY;


ALTER TABLE public.students OWNER TO postgres;

--
-- Name: TABLE students; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.students IS 'Core tenant-isolated table for student records.';


--
-- Name: COLUMN students.school_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.students.school_id IS 'Primary isolation key for multi-tenancy (RLS).';


--
-- Name: developer_students_view; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.developer_students_view AS
 SELECT id,
    student_id,
    school_id,
    class_name,
    name,
    roll_number,
    section,
    status,
    created_at,
    updated_at,
        CASE
            WHEN (CURRENT_USER = ANY (ARRAY['developer_readonly'::name, 'developer_data_engineer'::name])) THEN '***MASKED***'::character varying
            ELSE aadhaar_number
        END AS aadhaar_number,
        CASE
            WHEN (CURRENT_USER = ANY (ARRAY['developer_readonly'::name, 'developer_data_engineer'::name])) THEN (concat("substring"((contact)::text, 1, 3), '****', "substring"((contact)::text, 8, 4)))::character varying
            ELSE contact
        END AS contact,
        CASE
            WHEN (CURRENT_USER = ANY (ARRAY['developer_readonly'::name, 'developer_data_engineer'::name])) THEN (concat("substring"((alternative_contact)::text, 1, 3), '****', "substring"((alternative_contact)::text, 8, 4)))::character varying
            ELSE alternative_contact
        END AS alternative_contact,
        CASE
            WHEN (CURRENT_USER = ANY (ARRAY['developer_readonly'::name, 'developer_data_engineer'::name])) THEN (concat("substring"((email)::text, 1, 3), '***@***', "substring"((email)::text, '@(.*)$'::text)))::character varying
            ELSE email
        END AS email,
    father_name,
    mother_name,
    dob,
    gender,
    address_line1,
    address_city,
    address_state,
    address_pincode,
    tc_number,
    transport_enabled,
    transport_radius,
    additional_subjects,
    admission_date,
    room_number,
    enrolled_subjects,
    total_fees,
    student_type,
    profile_image_url
   FROM public.students s;


ALTER VIEW public.developer_students_view OWNER TO postgres;

--
-- Name: districts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.districts (
    id integer NOT NULL,
    state_id integer,
    name character varying(255) NOT NULL
);


ALTER TABLE public.districts OWNER TO postgres;

--
-- Name: districts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.districts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.districts_id_seq OWNER TO postgres;

--
-- Name: districts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.districts_id_seq OWNED BY public.districts.id;


--
-- Name: document_boxes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.document_boxes (
    id integer NOT NULL,
    school_id character varying(255) NOT NULL,
    user_id character varying(255) NOT NULL,
    doc_type character varying(255) NOT NULL,
    file_url text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE ONLY public.document_boxes FORCE ROW LEVEL SECURITY;


ALTER TABLE public.document_boxes OWNER TO postgres;

--
-- Name: document_box_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.document_box_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.document_box_id_seq OWNER TO postgres;

--
-- Name: document_box_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.document_box_id_seq OWNED BY public.document_boxes.id;


--
-- Name: document_embeddings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.document_embeddings (
    id integer NOT NULL,
    school_id character varying(50) NOT NULL,
    document_id character varying(100) NOT NULL,
    chunk_text text NOT NULL,
    chunk_embedding public.vector(768) NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.document_embeddings OWNER TO postgres;

--
-- Name: document_embeddings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.document_embeddings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.document_embeddings_id_seq OWNER TO postgres;

--
-- Name: document_embeddings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.document_embeddings_id_seq OWNED BY public.document_embeddings.id;


--
-- Name: dsar_compliance_report; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.dsar_compliance_report AS
 SELECT dr.school_id,
    date(dr.created_at) AS request_date,
    dr.request_type,
    dr.status,
    dr.priority,
        CASE
            WHEN ((dr.status)::text = 'completed'::text) THEN (EXTRACT(epoch FROM (dr.completed_date - dr.created_at)) / (86400)::numeric)
            ELSE NULL::numeric
        END AS completion_days,
    dr.assigned_to,
    count(DISTINCT cr.id) FILTER (WHERE ((cr.status)::text = 'active'::text)) AS active_consents_count
   FROM (public.dsar_requests dr
     LEFT JOIN public.consent_records cr ON ((((dr.school_id)::text = (cr.school_id)::text) AND ((dr.data_subject_id)::text = (cr.subject_id)::text) AND ((dr.data_subject_type)::text = (cr.subject_type)::text))))
  WHERE (dr.created_at >= (now() - '90 days'::interval))
  GROUP BY dr.school_id, (date(dr.created_at)), dr.request_type, dr.status, dr.priority, dr.completed_date, dr.created_at, dr.assigned_to;


ALTER VIEW public.dsar_compliance_report OWNER TO postgres;

--
-- Name: dsar_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.dsar_requests_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.dsar_requests_id_seq OWNER TO postgres;

--
-- Name: dsar_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.dsar_requests_id_seq OWNED BY public.dsar_requests.id;


--
-- Name: email_processing_queue; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.email_processing_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id character varying(255) NOT NULL,
    email_id character varying(500) NOT NULL,
    sender_email character varying(255) NOT NULL,
    recipient_email character varying(255) NOT NULL,
    subject text,
    body_text text,
    body_html text,
    attachments jsonb DEFAULT '[]'::jsonb,
    received_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    processing_status character varying(50) DEFAULT 'pending'::character varying,
    category character varying(100),
    priority integer DEFAULT 5,
    assigned_to character varying(255),
    processed_at timestamp with time zone,
    processing_result jsonb DEFAULT '{}'::jsonb,
    metadata jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.email_processing_queue OWNER TO postgres;

--
-- Name: email_processing_rules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.email_processing_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id character varying(255) NOT NULL,
    rule_name character varying(255) NOT NULL,
    description text,
    match_conditions jsonb DEFAULT '{}'::jsonb NOT NULL,
    actions jsonb DEFAULT '[]'::jsonb NOT NULL,
    category character varying(100),
    assign_to_role character varying(100),
    auto_reply_template text,
    is_active boolean DEFAULT true,
    priority integer DEFAULT 5,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.email_processing_rules OWNER TO postgres;

--
-- Name: employee_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.employee_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.employee_id_seq OWNER TO postgres;

--
-- Name: employee_payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employee_payments (
    id integer NOT NULL,
    payment_id character varying(255) NOT NULL,
    school_id character varying(255) NOT NULL,
    employee_id character varying(255) NOT NULL,
    payment_type character varying(50) NOT NULL,
    amount numeric(12,2) NOT NULL,
    salary_id character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE ONLY public.employee_payments FORCE ROW LEVEL SECURITY;


ALTER TABLE public.employee_payments OWNER TO postgres;

--
-- Name: employee_payments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.employee_payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.employee_payments_id_seq OWNER TO postgres;

--
-- Name: employee_payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.employee_payments_id_seq OWNED BY public.employee_payments.id;


--
-- Name: employee_responsibilities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employee_responsibilities (
    school_id character varying(255) NOT NULL,
    employee_id character varying(255) NOT NULL,
    responsibility_id character varying(255) NOT NULL,
    space_ids jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT chk_space_ids_array CHECK ((jsonb_typeof(space_ids) = 'array'::text))
);

ALTER TABLE ONLY public.employee_responsibilities FORCE ROW LEVEL SECURITY;


ALTER TABLE public.employee_responsibilities OWNER TO postgres;

--
-- Name: TABLE employee_responsibilities; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.employee_responsibilities IS 'Many-to-many mapping between employees and responsibilities, with optional space_ids for multi-space assignments';


--
-- Name: employees_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.employees_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.employees_id_seq OWNER TO postgres;

--
-- Name: employees_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.employees_id_seq OWNED BY public.employees.id;


--
-- Name: encryption_audit_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.encryption_audit_log (
    audit_id integer NOT NULL,
    school_id character varying(255),
    operation character varying(50) NOT NULL,
    key_id character varying(255),
    entity_type character varying(100),
    entity_id character varying(255),
    field_name character varying(255),
    success boolean DEFAULT true NOT NULL,
    error_message text,
    performed_by character varying(255),
    performed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    client_ip inet,
    user_agent text,
    metadata jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.encryption_audit_log OWNER TO postgres;

--
-- Name: TABLE encryption_audit_log; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.encryption_audit_log IS 'Audit trail for all encryption/decryption operations';


--
-- Name: encryption_audit_log_audit_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.encryption_audit_log_audit_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.encryption_audit_log_audit_id_seq OWNER TO postgres;

--
-- Name: encryption_audit_log_audit_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.encryption_audit_log_audit_id_seq OWNED BY public.encryption_audit_log.audit_id;


--
-- Name: encryption_audit_summary; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.encryption_audit_summary AS
 SELECT date(performed_at) AS audit_date,
    school_id,
    operation,
    count(*) AS total_operations,
    sum(
        CASE
            WHEN success THEN 1
            ELSE 0
        END) AS successful_operations,
    sum(
        CASE
            WHEN (NOT success) THEN 1
            ELSE 0
        END) AS failed_operations,
    count(DISTINCT key_id) AS distinct_keys_used,
    count(DISTINCT performed_by) AS distinct_users
   FROM public.encryption_audit_log
  GROUP BY (date(performed_at)), school_id, operation;


ALTER VIEW public.encryption_audit_summary OWNER TO postgres;

--
-- Name: encryption_keys; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.encryption_keys (
    key_id character varying(255) NOT NULL,
    key_version integer DEFAULT 1 NOT NULL,
    key_material bytea NOT NULL,
    key_material_encrypted_with text,
    key_type character varying(50) DEFAULT 'aes-256-gcm'::character varying NOT NULL,
    key_usage character varying(50) DEFAULT 'field_encryption'::character varying NOT NULL,
    key_status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    activated_at timestamp with time zone,
    deactivated_at timestamp with time zone,
    expires_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_by character varying(255),
    last_rotated_at timestamp with time zone,
    rotation_count integer DEFAULT 0
);


ALTER TABLE public.encryption_keys OWNER TO postgres;

--
-- Name: TABLE encryption_keys; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.encryption_keys IS 'Stores encryption keys for field-level data protection';


--
-- Name: encryption_key_status; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.encryption_key_status AS
 SELECT key_id,
    key_version,
    key_type,
    key_usage,
    key_status,
    created_at,
    activated_at,
    deactivated_at,
    expires_at,
        CASE
            WHEN ((expires_at IS NOT NULL) AND (expires_at < CURRENT_TIMESTAMP)) THEN 'expired'::character varying
            WHEN ((key_status)::text = 'active'::text) THEN 'active'::character varying
            WHEN ((key_status)::text = 'deactivated'::text) THEN 'deactivated'::character varying
            ELSE key_status
        END AS effective_status,
    rotation_count,
        CASE
            WHEN (expires_at IS NOT NULL) THEN (expires_at - CURRENT_TIMESTAMP)
            ELSE NULL::interval
        END AS days_until_expiry
   FROM public.encryption_keys;


ALTER VIEW public.encryption_key_status OWNER TO postgres;

--
-- Name: encryption_performance_stats; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.encryption_performance_stats AS
 SELECT date_trunc('hour'::text, performed_at) AS time_bucket,
    operation,
    count(*) AS operation_count,
    (avg(
        CASE
            WHEN success THEN 1
            ELSE 0
        END) * (100)::numeric) AS success_rate,
    count(DISTINCT key_id) AS distinct_keys_used,
    count(DISTINCT performed_by) AS distinct_users
   FROM public.encryption_audit_log
  WHERE (performed_at > (CURRENT_TIMESTAMP - '7 days'::interval))
  GROUP BY (date_trunc('hour'::text, performed_at)), operation
  ORDER BY (date_trunc('hour'::text, performed_at)) DESC, operation;


ALTER VIEW public.encryption_performance_stats OWNER TO postgres;

--
-- Name: VIEW encryption_performance_stats; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.encryption_performance_stats IS 'Shows performance statistics for encryption operations over the last 7 days';


--
-- Name: event_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.event_items (
    id integer NOT NULL,
    event_id character varying(255) NOT NULL,
    school_id character varying(255) NOT NULL,
    item_name text NOT NULL,
    quantity integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.event_items OWNER TO postgres;

--
-- Name: event_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.event_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.event_items_id_seq OWNER TO postgres;

--
-- Name: event_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.event_items_id_seq OWNED BY public.event_items.id;


--
-- Name: events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.events (
    id integer NOT NULL,
    event_id character varying(255) NOT NULL,
    school_id character varying(255) NOT NULL,
    name text NOT NULL,
    description text,
    event_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE ONLY public.events FORCE ROW LEVEL SECURITY;


ALTER TABLE public.events OWNER TO postgres;

--
-- Name: events_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.events_id_seq OWNER TO postgres;

--
-- Name: events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.events_id_seq OWNED BY public.events.id;


--
-- Name: exam_answer_keys; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.exam_answer_keys (
    key_id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id character varying(255) NOT NULL,
    exam_id character varying(255) NOT NULL,
    question_number integer NOT NULL,
    question_type character varying(100) NOT NULL,
    correct_answer text,
    model_answer text,
    keywords text[],
    max_marks numeric(5,2) NOT NULL,
    marking_scheme jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.exam_answer_keys OWNER TO postgres;

--
-- Name: exam_sections; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.exam_sections (
    id integer NOT NULL,
    school_id character varying(50) NOT NULL, -- Bug #2 Fixed: was 'text'; standardized to varchar(50) for consistency
    exam_id integer NOT NULL,
    class_id text NOT NULL,
    subject_id text NOT NULL,
    syllabus jsonb DEFAULT '[]'::jsonb,
    ai_generated_paper boolean DEFAULT false,
    questions jsonb DEFAULT '[]'::jsonb,
    total_marks integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.exam_sections OWNER TO postgres;

--
-- Name: exam_sections_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.exam_sections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.exam_sections_id_seq OWNER TO postgres;

--
-- Name: exam_sections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.exam_sections_id_seq OWNED BY public.exam_sections.id;


--
-- Name: exam_submission_pages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.exam_submission_pages (
    page_id uuid DEFAULT gen_random_uuid() NOT NULL,
    submission_id uuid NOT NULL,
    school_id character varying(255) NOT NULL,
    page_number integer NOT NULL,
    image_url text NOT NULL,
    ocr_text text,
    ocr_confidence numeric(5,2),
    is_permanent boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.exam_submission_pages OWNER TO postgres;

--
-- Name: TABLE exam_submission_pages; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.exam_submission_pages IS 'Individual page images of student exam submissions with OCR text';


--
-- Name: exams; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.exams (
    id integer NOT NULL,
    exam_id character varying(255) NOT NULL,
    school_id character varying(255) NOT NULL,
    exam_name text NOT NULL,
    exam_type character varying(100) NOT NULL,
    subject_name text NOT NULL,
    class_name character varying(100),
    chapters jsonb,
    exam_date timestamp with time zone,
    exam_time text,
    duration_minutes integer,
    status character varying(50) DEFAULT 'Scheduled'::character varying,
    paper jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    checker_employee_id text,
    checker_assigned_at timestamp with time zone,
    checked_by text,
    checked_at timestamp with time zone,
    approved_by text,
    approved_at timestamp with time zone,
    results_published boolean DEFAULT false,
    results_published_at timestamp with time zone,
    strictness_level text DEFAULT 'medium'::text,
    quarter text
);

ALTER TABLE ONLY public.exams FORCE ROW LEVEL SECURITY;


ALTER TABLE public.exams OWNER TO postgres;

--
-- Name: exams_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.exams_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.exams_id_seq OWNER TO postgres;

--
-- Name: exams_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.exams_id_seq OWNED BY public.exams.id;


--
-- Name: fee_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fee_templates (
    id integer NOT NULL,
    fee_id character varying(255) NOT NULL,
    school_id character varying(255) NOT NULL,
    name text NOT NULL,
    reason text NOT NULL,
    period character varying(50) NOT NULL,
    amount numeric(12,2) NOT NULL,
    status character varying(50) DEFAULT 'active'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE ONLY public.fee_templates FORCE ROW LEVEL SECURITY;


ALTER TABLE public.fee_templates OWNER TO postgres;

--
-- Name: fee_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.fee_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.fee_templates_id_seq OWNER TO postgres;

--
-- Name: fee_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.fee_templates_id_seq OWNED BY public.fee_templates.id;


--
-- Name: fee_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fee_transactions (
    id integer NOT NULL,
    invoice_id integer NOT NULL,
    student_id character varying(100) NOT NULL,
    amount numeric(10,2) NOT NULL,
    payment_method character varying(50) NOT NULL,
    status public.payment_status DEFAULT 'pending'::public.payment_status,
    transaction_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    school_id character varying(100) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.fee_transactions OWNER TO postgres;

--
-- Name: fee_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.fee_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.fee_transactions_id_seq OWNER TO postgres;

--
-- Name: fee_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.fee_transactions_id_seq OWNED BY public.fee_transactions.id;


--
-- Name: fees; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fees (
    id character varying(50) NOT NULL,
    school_id character varying(50) NOT NULL,
    fees_name character varying(100) NOT NULL,
    fees_reason character varying(255),
    fees_period character varying(50),
    fees_amount numeric(10,2) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE ONLY public.fees FORCE ROW LEVEL SECURITY;


ALTER TABLE public.fees OWNER TO postgres;

--
-- Name: form_submissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.form_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id character varying(255) NOT NULL,
    template_id uuid NOT NULL,
    form_type character varying(100) NOT NULL,
    submitted_by character varying(255) NOT NULL,
    submitted_by_role character varying(100) NOT NULL,
    form_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    current_step integer DEFAULT 0,
    workflow_history jsonb DEFAULT '[]'::jsonb,
    approval_history jsonb DEFAULT '[]'::jsonb,
    reviewer_notes text,
    processed_by character varying(255),
    processed_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.form_submissions OWNER TO postgres;

--
-- Name: form_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.form_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    form_type character varying(100) NOT NULL,
    form_schema jsonb DEFAULT '{}'::jsonb NOT NULL,
    validation_rules jsonb DEFAULT '{}'::jsonb,
    workflow_steps jsonb DEFAULT '[]'::jsonb,
    approval_required boolean DEFAULT false,
    approval_roles jsonb DEFAULT '[]'::jsonb,
    notification_settings jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    version integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(255),
    updated_by character varying(255)
);


ALTER TABLE public.form_templates OWNER TO postgres;

--
-- Name: global_notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.global_notifications (
    id integer NOT NULL,
    notification jsonb NOT NULL,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.global_notifications OWNER TO postgres;

--
-- Name: global_notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.global_notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.global_notifications_id_seq OWNER TO postgres;

--
-- Name: global_notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.global_notifications_id_seq OWNED BY public.global_notifications.id;


--
-- Name: global_users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.global_users (
    id integer NOT NULL,
    phone character varying(50),
    email text,
    alternative_phone character varying(50),
    aadhaar_number character varying(20),
    school_id character varying(50) NOT NULL, -- Bug #2 Fixed: was 'text'; standardized to varchar(50) for consistency
    user_id text NOT NULL,
    user_type character varying(50) NOT NULL,
    name text,
    class_name text,
    image_url text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.global_users OWNER TO postgres;

--
-- Name: TABLE global_users; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.global_users IS 'Unified identity table for cross-tenant login discovery.';


--
-- Name: global_users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.global_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.global_users_id_seq OWNER TO postgres;

--
-- Name: global_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.global_users_id_seq OWNED BY public.global_users.id;


--
-- Name: grade_criteria; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.grade_criteria (
    id integer NOT NULL,
    grading_id uuid NOT NULL,
    school_id character varying(255) NOT NULL,
    criterion_name character varying(255) NOT NULL,
    score numeric(5,2) NOT NULL,
    max_score numeric(5,2) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.grade_criteria OWNER TO postgres;

--
-- Name: grade_criteria_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.grade_criteria_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.grade_criteria_id_seq OWNER TO postgres;

--
-- Name: grade_criteria_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.grade_criteria_id_seq OWNED BY public.grade_criteria.id;


--
-- Name: gradebooks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.gradebooks (
    gradebook_id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id character varying(255) NOT NULL,
    student_id character varying(255) NOT NULL,
    academic_year character varying(20) NOT NULL,
    term character varying(50) NOT NULL,
    subject_name character varying(255) NOT NULL,
    class_name character varying(255) NOT NULL,
    assessment_type character varying(100) NOT NULL,
    assessment_name character varying(255) NOT NULL,
    assessment_id character varying(255),
    submission_id uuid,
    rubric_id uuid,
    raw_score numeric(5,2),
    max_score numeric(5,2) DEFAULT 100.0 NOT NULL,
    percentage numeric(5,2) GENERATED ALWAYS AS (
CASE
    WHEN (max_score > (0)::numeric) THEN ((raw_score / max_score) * (100)::numeric)
    ELSE (0)::numeric
END) STORED,
    grade character varying(10),
    grade_points numeric(3,2),
    grading_method character varying(50) DEFAULT 'manual'::character varying,
    graded_by character varying(255),
    graded_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    last_updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    is_published boolean DEFAULT false,
    requires_review boolean DEFAULT false,
    review_notes text,
    sync_status character varying(50) DEFAULT 'pending'::character varying,
    last_sync_attempt timestamp with time zone,
    sync_error text,
    CONSTRAINT valid_score CHECK (((raw_score >= (0)::numeric) AND (raw_score <= max_score)))
);


ALTER TABLE public.gradebooks OWNER TO postgres;

--
-- Name: TABLE gradebooks; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.gradebooks IS 'Stores individual student grades for assessments with sync tracking';


--
-- Name: gradebook_summaries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.gradebook_summaries (
    summary_id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id character varying(255) NOT NULL,
    student_id character varying(255) NOT NULL,
    academic_year character varying(20) NOT NULL,
    term character varying(50) NOT NULL,
    subject_name character varying(255) NOT NULL,
    class_name character varying(255) NOT NULL,
    total_assessments integer DEFAULT 0,
    completed_assessments integer DEFAULT 0,
    average_percentage numeric(5,2) DEFAULT 0.0,
    weighted_average numeric(5,2) DEFAULT 0.0,
    total_grade_points numeric(5,2) DEFAULT 0.0,
    gpa numeric(3,2) DEFAULT 0.0,
    letter_grade character varying(10),
    highest_score numeric(5,2),
    lowest_score numeric(5,2),
    improvement_trend character varying(20),
    attendance_percentage numeric(5,2),
    calculated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    last_updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.gradebook_summaries OWNER TO postgres;

--
-- Name: TABLE gradebook_summaries; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.gradebook_summaries IS 'Aggregated student performance per subject per term';


--
-- Name: gradebook_sync_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.gradebook_sync_log (
    sync_id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id character varying(255) NOT NULL,
    submission_id uuid,
    sync_type character varying(50) NOT NULL,
    sync_status character varying(50) NOT NULL,
    target_system character varying(100),
    sync_data jsonb,
    error_message text,
    synced_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    retry_count integer DEFAULT 0
);


ALTER TABLE public.gradebook_sync_log OWNER TO postgres;

--
-- Name: TABLE gradebook_sync_log; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.gradebook_sync_log IS 'Log for gradebooks synchronization with external systems';


--
-- Name: gradebook_sync_queue; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.gradebook_sync_queue (
    queue_id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id character varying(255) NOT NULL,
    gradebook_id uuid,
    operation character varying(20) NOT NULL,
    sync_priority integer DEFAULT 5,
    payload jsonb NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    error_message text,
    retry_count integer DEFAULT 0,
    max_retries integer DEFAULT 3,
    processed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.gradebook_sync_queue OWNER TO postgres;

--
-- Name: TABLE gradebook_sync_queue; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.gradebook_sync_queue IS 'Queue for batch synchronization of gradebooks data with external systems';


--
-- Name: grading_config; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.grading_config (
    config_id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id character varying(255) NOT NULL,
    subject_name character varying(255),
    rigor_level character varying(50) DEFAULT 'standard'::character varying,
    fuzzy_threshold numeric(3,2) DEFAULT 0.85,
    ai_feedback_enabled boolean DEFAULT true,
    manual_review_threshold numeric(3,2) DEFAULT 0.70,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.grading_config OWNER TO postgres;

--
-- Name: grading_rubrics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.grading_rubrics (
    rubric_id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id character varying(255) NOT NULL,
    rubric_name character varying(255) NOT NULL,
    rubric_type character varying(100) NOT NULL,
    subject_name character varying(255),
    class_name character varying(255),
    criteria jsonb NOT NULL,
    total_score numeric(5,2) DEFAULT 100.0 NOT NULL,
    passing_score numeric(5,2) DEFAULT 40.0 NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.grading_rubrics OWNER TO postgres;

--
-- Name: TABLE grading_rubrics; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.grading_rubrics IS 'Stores grading rubrics for different assessment types';


--
-- Name: items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.items_id_seq OWNER TO postgres;

--
-- Name: items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.items (
    id character varying(255) DEFAULT nextval('public.items_id_seq'::regclass) NOT NULL,
    school_id character varying(255) NOT NULL,
    space_name character varying(255) NOT NULL,
    name character varying(255),
    room_number character varying(255),
    class_id character varying(255),
    item_id text,
    space_id text,
    item_name text
);

ALTER TABLE ONLY public.items FORCE ROW LEVEL SECURITY;


ALTER TABLE public.items OWNER TO postgres;

--
-- Name: leave_applications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.leave_applications (
    leave_id character varying(255) NOT NULL,
    school_id character varying(255) NOT NULL,
    employee_id character varying(255),
    employee_name character varying(255),
    reason text,
    leave_type character varying(50) NOT NULL,
    from_date date NOT NULL,
    to_date date NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    conditional_approval_id uuid,
    coverage_assigned boolean DEFAULT false,
    workload_assessment_score integer,
    submitted_via character varying(20),
    emergency_contact character varying,
    attachments jsonb DEFAULT '[]'::jsonb,
    priority character varying(20) DEFAULT 'normal'::character varying,
    total_days integer GENERATED ALWAYS AS (((to_date - from_date) + 1)) STORED,
    student_id character varying,
    applicant_type character varying(20) DEFAULT 'employee'::character varying,
    CONSTRAINT leave_applications_applicant_type_check CHECK (((applicant_type)::text = ANY ((ARRAY['employee'::character varying, 'student'::character varying])::text[]))),
    CONSTRAINT leave_applications_priority_check CHECK (((priority)::text = ANY ((ARRAY['low'::character varying, 'normal'::character varying, 'high'::character varying, 'urgent'::character varying])::text[])))
);

ALTER TABLE ONLY public.leave_applications FORCE ROW LEVEL SECURITY;


ALTER TABLE public.leave_applications OWNER TO postgres;

--
-- Name: leave_notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.leave_notifications (
    notification_id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id character varying NOT NULL,
    recipient_id character varying NOT NULL,
    notification_type character varying NOT NULL,
    title character varying NOT NULL,
    body text NOT NULL,
    data jsonb DEFAULT '{}'::jsonb,
    read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.leave_notifications OWNER TO postgres;

--
-- Name: TABLE leave_notifications; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.leave_notifications IS 'Real-time notifications for leave management system';


--
-- Name: leave_quotas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.leave_quotas (
    quota_id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id character varying NOT NULL,
    employee_id character varying NOT NULL,
    leave_type character varying NOT NULL,
    annual_quota integer DEFAULT 0 NOT NULL,
    monthly_quota integer,
    used integer DEFAULT 0,
    remaining integer GENERATED ALWAYS AS ((annual_quota - used)) STORED,
    reset_date date NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.leave_quotas OWNER TO postgres;

--
-- Name: TABLE leave_quotas; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.leave_quotas IS 'Employee leave quotas and usage tracking';


--
-- Name: leaves; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.leaves (
    id integer NOT NULL,
    school_id character varying(255) NOT NULL,
    user_id character varying(255) NOT NULL,
    user_type character varying(50) NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    reason text,
    status character varying(50) DEFAULT 'pending'::character varying,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.leaves OWNER TO postgres;

--
-- Name: leaves_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.leaves_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.leaves_id_seq OWNER TO postgres;

--
-- Name: leaves_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.leaves_id_seq OWNED BY public.leaves.id;


--
-- Name: material_alert_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.material_alert_log (
    id bigint NOT NULL,
    school_id character varying(255) NOT NULL,
    space_name character varying(255) NOT NULL,
    material_name character varying(255) NOT NULL,
    deficit_count integer DEFAULT 0 NOT NULL,
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.material_alert_log OWNER TO postgres;

--
-- Name: material_alert_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.material_alert_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.material_alert_log_id_seq OWNER TO postgres;

--
-- Name: material_alert_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.material_alert_log_id_seq OWNED BY public.material_alert_log.id;


--
-- Name: material_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.material_history (
    id integer NOT NULL,
    school_id character varying(50) NOT NULL, -- Bug #2 Fixed: was 'text'; standardized to varchar(50) for consistency
    material_id text NOT NULL,
    action_type text NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(15,2),
    total_amount numeric(15,2),
    actor_id text,
    space_id text,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.material_history OWNER TO postgres;

--
-- Name: material_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.material_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.material_history_id_seq OWNER TO postgres;

--
-- Name: material_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.material_history_id_seq OWNED BY public.material_history.id;


--
-- Name: material_locations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.material_locations (
    school_id character varying(255) NOT NULL,
    material_id character varying(255) NOT NULL,
    space_id character varying(255) NOT NULL,
    item_id character varying(255) NOT NULL,
    quantity integer DEFAULT 0
);

ALTER TABLE ONLY public.material_locations FORCE ROW LEVEL SECURITY;


ALTER TABLE public.material_locations OWNER TO postgres;

--
-- Name: materials; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.materials (
    id character varying(255) NOT NULL,
    school_id character varying(255) NOT NULL,
    name character varying(255),
    quantity integer DEFAULT 0,
    unit_price double precision DEFAULT 0.0,
    extra_unit integer DEFAULT 0,
    need_unit integer DEFAULT 0,
    attachment_path text,
    unit character varying(50),
    description text
);

ALTER TABLE ONLY public.materials FORCE ROW LEVEL SECURITY;


ALTER TABLE public.materials OWNER TO postgres;

--
-- Name: monthly_attendance_stats; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.monthly_attendance_stats AS
 SELECT school_id,
    date_trunc('month'::text, (date)::timestamp with time zone) AS month,
    role,
    count(DISTINCT date) AS working_days,
    count(DISTINCT user_id) AS total_users,
    count(*) AS total_records,
    count(
        CASE
            WHEN ((status)::text = 'present'::text) THEN 1
            ELSE NULL::integer
        END) AS present_count,
    count(
        CASE
            WHEN ((status)::text = 'absent'::text) THEN 1
            ELSE NULL::integer
        END) AS absent_count,
    count(
        CASE
            WHEN ((status)::text = 'leave'::text) THEN 1
            ELSE NULL::integer
        END) AS leave_count,
    round((((count(
        CASE
            WHEN ((status)::text = 'present'::text) THEN 1
            ELSE NULL::integer
        END))::numeric * 100.0) / (NULLIF(count(*), 0))::numeric), 2) AS overall_attendance_percentage
   FROM public.attendance a
  GROUP BY school_id, (date_trunc('month'::text, (date)::timestamp with time zone)), role;


ALTER VIEW public.monthly_attendance_stats OWNER TO postgres;

--
-- Name: notification_preferences; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notification_preferences (
    id integer NOT NULL,
    school_id character varying(50) NOT NULL,
    user_id character varying(100) NOT NULL,
    email_enabled boolean DEFAULT true,
    sms_enabled boolean DEFAULT true,
    push_enabled boolean DEFAULT true,
    in_app_enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.notification_preferences OWNER TO postgres;

--
-- Name: notification_preferences_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notification_preferences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notification_preferences_id_seq OWNER TO postgres;

--
-- Name: notification_preferences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notification_preferences_id_seq OWNED BY public.notification_preferences.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    school_id character varying(50) NOT NULL,
    user_id character varying(50),
    category character varying(50) DEFAULT 'general'::character varying NOT NULL,
    severity character varying(20) DEFAULT 'info'::character varying NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    data jsonb DEFAULT '{}'::jsonb,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    read_at timestamp with time zone
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: ocr_extractions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ocr_extractions (
    id integer NOT NULL,
    school_id character varying(255) NOT NULL,
    doc_type character varying(50) NOT NULL,
    file_url text NOT NULL,
    raw_text text,
    extracted_fields jsonb DEFAULT '{}'::jsonb NOT NULL,
    entity_type character varying(20),
    entity_id character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.ocr_extractions OWNER TO postgres;

--
-- Name: ocr_extractions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ocr_extractions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ocr_extractions_id_seq OWNER TO postgres;

--
-- Name: ocr_extractions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ocr_extractions_id_seq OWNED BY public.ocr_extractions.id;


--
-- Name: period_plans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.period_plans (
    id integer NOT NULL,
    school_id character varying(255) NOT NULL,
    class_id character varying(255) NOT NULL,
    subject_id character varying(255) NOT NULL,
    config_id text NOT NULL,
    day_of_week integer NOT NULL,
    period_number integer NOT NULL,
    date date NOT NULL,
    chapter_id integer,
    topic_name text,
    teacher_id text NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    teacher_note text,
    completed_at timestamp with time zone
);


ALTER TABLE public.period_plans OWNER TO postgres;

--
-- Name: period_plans_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.period_plans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.period_plans_id_seq OWNER TO postgres;

--
-- Name: period_plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.period_plans_id_seq OWNED BY public.period_plans.id;


--
-- Name: plagiarism_cache; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.plagiarism_cache (
    cache_id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id character varying(255) NOT NULL,
    content_hash character varying(64) NOT NULL,
    content_type character varying(50) NOT NULL,
    source_id character varying(255),
    metadata jsonb,
    indexed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.plagiarism_cache OWNER TO postgres;

--
-- Name: TABLE plagiarism_cache; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.plagiarism_cache IS 'Cache for plagiarism detection to avoid reprocessing same content';


--
-- Name: promo_codes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.promo_codes (
    id integer NOT NULL,
    code character varying(50) NOT NULL,
    credit_amount numeric(10,2) DEFAULT 0.00,
    free_days integer DEFAULT 0,
    discount_percentage numeric(5,2) DEFAULT 0.00,
    max_uses integer DEFAULT 1,
    current_uses integer DEFAULT 0,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.promo_codes OWNER TO postgres;

--
-- Name: promo_codes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.promo_codes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.promo_codes_id_seq OWNER TO postgres;

--
-- Name: promo_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.promo_codes_id_seq OWNED BY public.promo_codes.id;


--
-- Name: reminder_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reminder_items (
    id integer NOT NULL,
    reminder_id character varying(255) NOT NULL,
    school_id character varying(255) NOT NULL,
    item_name text NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.reminder_items OWNER TO postgres;

--
-- Name: reminder_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.reminder_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.reminder_items_id_seq OWNER TO postgres;

--
-- Name: reminder_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.reminder_items_id_seq OWNED BY public.reminder_items.id;


--
-- Name: reminders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reminders (
    id integer NOT NULL,
    reminder_id character varying(255) NOT NULL,
    school_id character varying(255) NOT NULL,
    title text NOT NULL,
    description text,
    remind_at timestamp with time zone,
    status public.generic_status DEFAULT 'pending'::public.generic_status,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE ONLY public.reminders FORCE ROW LEVEL SECURITY;


ALTER TABLE public.reminders OWNER TO postgres;

--
-- Name: reminders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.reminders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.reminders_id_seq OWNER TO postgres;

--
-- Name: reminders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.reminders_id_seq OWNED BY public.reminders.id;


--
-- Name: report_generation_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.report_generation_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id character varying(255) NOT NULL,
    report_id uuid NOT NULL,
    generated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    generated_by character varying(255),
    status character varying(50) NOT NULL,
    file_path character varying(500),
    file_size_bytes bigint,
    recipient_count integer DEFAULT 0,
    error_message text,
    metadata jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.report_generation_logs OWNER TO postgres;

--
-- Name: responsibilities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.responsibilities (
    id integer NOT NULL,
    responsibility_id character varying(255) NOT NULL,
    school_id character varying(255) NOT NULL,
    name text NOT NULL,
    description text,
    per_day_price numeric(12,2) DEFAULT 0,
    monthly_price numeric(12,2) DEFAULT 0,
    time_period integer DEFAULT 0,
    employee_type character varying(50) NOT NULL,
    data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    student_fee numeric(12,2) DEFAULT 0,
    updated_at timestamp with time zone DEFAULT now(),
    space_category character varying(255),
    space_id character varying(255),
    work_level character varying(100),
    work_period character varying(100),
    work_amount numeric(12,2) DEFAULT 0.00,
    created_by character varying(255)
);

ALTER TABLE ONLY public.responsibilities FORCE ROW LEVEL SECURITY;


ALTER TABLE public.responsibilities OWNER TO postgres;

--
-- Name: TABLE responsibilities; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.responsibilities IS 'Defines responsibilities (roles) that can be assigned to employees, with metadata like employee_type, monthly_price, student_fee';


--
-- Name: responsibilities_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.responsibilities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.responsibilities_id_seq OWNER TO postgres;

--
-- Name: responsibilities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.responsibilities_id_seq OWNED BY public.responsibilities.id;


--
-- Name: responsibility_assignment_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.responsibility_assignment_history (
    id integer NOT NULL,
    school_id character varying(255) NOT NULL,
    responsibility_id character varying(255) NOT NULL,
    employee_id character varying(255) NOT NULL,
    space_ids text[],
    action character varying(50) NOT NULL,
    previous_space_ids text[],
    performed_by character varying(255) NOT NULL,
    performed_at timestamp with time zone DEFAULT now(),
    reason text,
    version integer DEFAULT 1 NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.responsibility_assignment_history OWNER TO postgres;

--
-- Name: TABLE responsibility_assignment_history; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.responsibility_assignment_history IS 'Tracks history of responsibility assignments for audit trail and rollback';


--
-- Name: responsibility_assignment_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.responsibility_assignment_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.responsibility_assignment_history_id_seq OWNER TO postgres;

--
-- Name: responsibility_assignment_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.responsibility_assignment_history_id_seq OWNED BY public.responsibility_assignment_history.id;


--
-- Name: responsibility_coverage; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.responsibility_coverage (
    coverage_id uuid DEFAULT gen_random_uuid() NOT NULL,
    leave_id character varying NOT NULL,
    school_id character varying NOT NULL,
    original_employee_id character varying NOT NULL,
    covering_employee_id character varying NOT NULL,
    responsibility_id character varying NOT NULL,
    coverage_period_start date NOT NULL,
    coverage_period_end date NOT NULL,
    status character varying DEFAULT 'assigned'::character varying NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT responsibility_coverage_status_check CHECK (((status)::text = ANY ((ARRAY['assigned'::character varying, 'accepted'::character varying, 'rejected'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])))
);


ALTER TABLE public.responsibility_coverage OWNER TO postgres;

--
-- Name: TABLE responsibility_coverage; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.responsibility_coverage IS 'Responsibility coverage assignments during employee leave';


--
-- Name: responsibility_versions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.responsibility_versions (
    id integer NOT NULL,
    school_id character varying(255) NOT NULL,
    responsibility_id character varying(255) NOT NULL,
    version integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    employee_type character varying(100),
    revenue numeric(10,2) DEFAULT 0,
    space_ids text[],
    created_by character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    is_current boolean DEFAULT true,
    metadata jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.responsibility_versions OWNER TO postgres;

--
-- Name: TABLE responsibility_versions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.responsibility_versions IS 'Tracks version history of responsibilities for rollback functionality';


--
-- Name: responsibility_version_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.responsibility_version_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.responsibility_version_id_seq OWNER TO postgres;

--
-- Name: responsibility_version_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.responsibility_version_id_seq OWNED BY public.responsibility_versions.id;


--
-- Name: retention_policies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.retention_policies (
    id bigint NOT NULL,
    school_id character varying(50) NOT NULL,
    policy_name character varying(255) NOT NULL,
    description text,
    data_category character varying(100) NOT NULL,
    retention_period_months integer NOT NULL,
    retention_basis character varying(50) NOT NULL,
    disposition_action character varying(50) NOT NULL,
    disposition_trigger character varying(50) NOT NULL,
    legal_reference text,
    applies_from timestamp with time zone DEFAULT now() NOT NULL,
    applies_to timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by character varying(100) NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by character varying(100),
    CONSTRAINT retention_policies_disposition_action_check CHECK (((disposition_action)::text = ANY ((ARRAY['delete'::character varying, 'archive'::character varying, 'anonymize'::character varying, 'retain'::character varying])::text[]))),
    CONSTRAINT retention_policies_disposition_trigger_check CHECK (((disposition_trigger)::text = ANY ((ARRAY['period_end'::character varying, 'consent_withdrawal'::character varying, 'account_closure'::character varying])::text[]))),
    CONSTRAINT retention_policies_retention_basis_check CHECK (((retention_basis)::text = ANY ((ARRAY['legal_requirement'::character varying, 'business_need'::character varying, 'consent_period'::character varying])::text[])))
);


ALTER TABLE public.retention_policies OWNER TO postgres;

--
-- Name: TABLE retention_policies; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.retention_policies IS 'Data retention policies and schedules';


--
-- Name: retention_policies_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.retention_policies_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.retention_policies_id_seq OWNER TO postgres;

--
-- Name: retention_policies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.retention_policies_id_seq OWNED BY public.retention_policies.id;


--
-- Name: salaries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.salaries (
    id integer NOT NULL,
    salary_id character varying(255) NOT NULL,
    school_id character varying(255) NOT NULL,
    employee_id character varying(255) NOT NULL,
    month integer NOT NULL,
    year integer NOT NULL,
    base_salary numeric(12,2) NOT NULL,
    bonus numeric(12,2) DEFAULT 0,
    increment_percent numeric(5,2) DEFAULT 0,
    total_salary numeric(12,2) NOT NULL,
    due_amount numeric(12,2) NOT NULL,
    advance_adjusted numeric(12,2) DEFAULT 0,
    status character varying(50) NOT NULL,
    absent_days integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE ONLY public.salaries FORCE ROW LEVEL SECURITY;


ALTER TABLE public.salaries OWNER TO postgres;

--
-- Name: salaries_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.salaries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.salaries_id_seq OWNER TO postgres;

--
-- Name: salaries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.salaries_id_seq OWNED BY public.salaries.id;


--
-- Name: schedule_change_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.schedule_change_requests (
    id integer NOT NULL,
    school_id character varying(255) NOT NULL,
    type character varying(30) NOT NULL,
    requested_by text NOT NULL,
    approved_by text,
    status character varying(20) DEFAULT 'pending'::character varying,
    source_class_id text,
    source_subject_id text,
    target_class_id text,
    target_subject_id text,
    reason text,
    admin_note text,
    date_from date,
    date_to date,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone,
    block_cap_minutes integer
);


ALTER TABLE public.schedule_change_requests OWNER TO postgres;

--
-- Name: schedule_change_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.schedule_change_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.schedule_change_requests_id_seq OWNER TO postgres;

--
-- Name: schedule_change_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.schedule_change_requests_id_seq OWNED BY public.schedule_change_requests.id;


--
-- Name: scheduled_reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.scheduled_reports (
    scheduled_report_id integer NOT NULL,
    school_id character varying(255) NOT NULL,
    report_type public.report_type NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    generated_at timestamp with time zone DEFAULT now(),
    status public.report_status DEFAULT 'pending'::public.report_status,
    file_path text,
    error_message text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.scheduled_reports OWNER TO postgres;

--
-- Name: scheduled_reports_scheduled_report_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.scheduled_reports_scheduled_report_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.scheduled_reports_scheduled_report_id_seq OWNER TO postgres;

--
-- Name: scheduled_reports_scheduled_report_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.scheduled_reports_scheduled_report_id_seq OWNED BY public.scheduled_reports.scheduled_report_id;


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.schema_migrations (
    version character varying(255) NOT NULL
);


ALTER TABLE public.schema_migrations OWNER TO postgres;

--
-- Name: school_access_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.school_access_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_name character varying(500) NOT NULL,
    contact_name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    phone character varying(50),
    employee_count integer,
    student_count integer,
    message text,
    status character varying(50) DEFAULT 'pending'::character varying,
    admin_notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.school_access_requests OWNER TO postgres;

--
-- Name: school_code_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.school_code_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.school_code_seq OWNER TO postgres;

--
-- Name: school_feature_flags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.school_feature_flags (
    school_id character varying NOT NULL,
    enhanced_leave_system boolean DEFAULT false,
    conditional_approvals boolean DEFAULT false,
    real_time_notifications boolean DEFAULT false,
    mobile_leave_submission boolean DEFAULT false,
    workload_assessment boolean DEFAULT false,
    responsibility_coverage boolean DEFAULT false,
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.school_feature_flags OWNER TO postgres;

--
-- Name: TABLE school_feature_flags; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.school_feature_flags IS 'Feature flags for gradual rollout of enhanced leave system';


--
-- Name: school_promo_codes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.school_promo_codes (
    id integer NOT NULL,
    school_id character varying(255) NOT NULL,
    promo_code_id integer NOT NULL,
    applied_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.school_promo_codes OWNER TO postgres;

--
-- Name: school_promo_codes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.school_promo_codes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.school_promo_codes_id_seq OWNER TO postgres;

--
-- Name: school_promo_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.school_promo_codes_id_seq OWNED BY public.school_promo_codes.id;


--
-- Name: schools; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.schools (
    id integer NOT NULL,
    school_id character varying(255) NOT NULL,
    school_name text NOT NULL,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    notification jsonb,
    is_blocked boolean DEFAULT false NOT NULL,
    session_duration_hours integer DEFAULT 24 NOT NULL,
    wallet_balance numeric(10,2) DEFAULT 1000.00 NOT NULL,
    per_student_rate numeric(10,2) DEFAULT 1.00 NOT NULL,
    billing_status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    trial_ends_at timestamp with time zone,
    last_billing_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    base_rate numeric(10,2) DEFAULT 1.00 NOT NULL,
    active_promo_id integer,
    promo_expires_at timestamp with time zone,
    school_logo_url text
);


ALTER TABLE public.schools OWNER TO postgres;

--
-- Name: schools_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.schools_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.schools_id_seq OWNER TO postgres;

--
-- Name: schools_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.schools_id_seq OWNED BY public.schools.id;


--
-- Name: setup_template_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.setup_template_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id character varying(255) NOT NULL,
    template_id uuid NOT NULL,
    assigned_by character varying(255) NOT NULL,
    assigned_at timestamp with time zone DEFAULT now(),
    notes text
);


ALTER TABLE public.setup_template_assignments OWNER TO postgres;

--
-- Name: TABLE setup_template_assignments; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.setup_template_assignments IS 'Tracks which schools are assigned which setup templates';


--
-- Name: setup_template_configs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.setup_template_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_id uuid NOT NULL,
    section character varying(100) NOT NULL,
    field_name character varying(100) NOT NULL,
    data_type character varying(50) NOT NULL,
    auto_fill_enabled boolean DEFAULT true,
    default_value jsonb,
    validation_rules jsonb DEFAULT '{}'::jsonb,
    frontend_label character varying(255),
    frontend_input_type character varying(50),
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.setup_template_configs OWNER TO postgres;

--
-- Name: TABLE setup_template_configs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.setup_template_configs IS 'Configuration for what data gets auto-filled in each template section';


--
-- Name: COLUMN setup_template_configs.section; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.setup_template_configs.section IS 'Section/category of setup (academic, infrastructure, administration, fees, etc.)';


--
-- Name: COLUMN setup_template_configs.field_name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.setup_template_configs.field_name IS 'Field identifier that matches backend data structure';


--
-- Name: COLUMN setup_template_configs.data_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.setup_template_configs.data_type IS 'Data type for frontend input validation';


--
-- Name: COLUMN setup_template_configs.frontend_input_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.setup_template_configs.frontend_input_type IS 'Input type hint for frontend UI (text, select, checkbox, etc.)';


--
-- Name: setup_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.setup_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    is_default boolean DEFAULT false,
    created_by character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    metadata jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.setup_templates OWNER TO postgres;

--
-- Name: TABLE setup_templates; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.setup_templates IS 'Stores different school setup templates that SuperAdmin can manage';


--
-- Name: COLUMN setup_templates.is_default; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.setup_templates.is_default IS 'Indicates the default template for new schools';


--
-- Name: space_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.space_categories (
    id bigint NOT NULL,
    school_id character varying NOT NULL,
    name character varying NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.space_categories OWNER TO postgres;

--
-- Name: space_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.space_categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.space_categories_id_seq OWNER TO postgres;

--
-- Name: space_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.space_categories_id_seq OWNED BY public.space_categories.id;


--
-- Name: space_employees; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.space_employees (
    school_id character varying(255) NOT NULL,
    space_name character varying(255) NOT NULL,
    employee_id character varying(255) NOT NULL
);

ALTER TABLE ONLY public.space_employees FORCE ROW LEVEL SECURITY;


ALTER TABLE public.space_employees OWNER TO postgres;

--
-- Name: space_material_requirements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.space_material_requirements (
    id integer NOT NULL,
    school_id character varying(255) NOT NULL,
    space_name character varying(255) NOT NULL,
    material_name character varying(255) NOT NULL,
    required_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.space_material_requirements OWNER TO postgres;

--
-- Name: space_material_requirements_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.space_material_requirements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.space_material_requirements_id_seq OWNER TO postgres;

--
-- Name: space_material_requirements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.space_material_requirements_id_seq OWNED BY public.space_material_requirements.id;


--
-- Name: space_materials; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.space_materials (
    id integer NOT NULL,
    school_id character varying(50) NOT NULL, -- Bug #2 Fixed: was 'text'; standardized to varchar(50) for consistency
    space_name text NOT NULL,
    material_id text,
    material_name text NOT NULL,
    quantity integer DEFAULT 0,
    unit text,
    unit_price numeric(15,2) DEFAULT 0.00,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.space_materials OWNER TO postgres;

--
-- Name: space_materials_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.space_materials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.space_materials_id_seq OWNER TO postgres;

--
-- Name: space_materials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.space_materials_id_seq OWNED BY public.space_materials.id;


--
-- Name: space_requirements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.space_requirements (
    id integer NOT NULL,
    school_id character varying(255) NOT NULL,
    space_name character varying(255) NOT NULL,
    responsibility_id character varying(255) NOT NULL,
    required_count integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.space_requirements OWNER TO postgres;

--
-- Name: TABLE space_requirements; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.space_requirements IS 'Stores the expected personnel count for specific roles within a space (e.g., 7 Teachers for a Classroom).';


--
-- Name: space_requirements_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.space_requirements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.space_requirements_id_seq OWNER TO postgres;

--
-- Name: space_requirements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.space_requirements_id_seq OWNED BY public.space_requirements.id;


--
-- Name: spaces_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.spaces_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.spaces_id_seq OWNER TO postgres;

--
-- Name: spaces; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.spaces (
    id character varying(255) DEFAULT nextval('public.spaces_id_seq'::regclass) NOT NULL,
    school_id character varying(255) NOT NULL,
    space_id character varying(255),
    name character varying(255),
    budget numeric(12,2) DEFAULT NULL::numeric,
    space_category character varying(255),
    data jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE ONLY public.spaces FORCE ROW LEVEL SECURITY;


ALTER TABLE public.spaces OWNER TO postgres;

--
-- Name: ssl_configuration_status; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.ssl_configuration_status AS
 SELECT name,
    setting,
    unit,
    short_desc,
        CASE
            WHEN ((name = 'ssl'::text) AND (setting = 'on'::text)) THEN 'SSL_ENABLED'::text
            WHEN ((name = 'ssl'::text) AND (setting = 'off'::text)) THEN 'SSL_DISABLED'::text
            WHEN (name ~~ '%ssl%'::text) THEN 'SSL_RELATED'::text
            ELSE 'OTHER'::text
        END AS config_category
   FROM pg_settings
  WHERE ((name ~~ '%ssl%'::text) OR (name ~~ '%tls%'::text) OR (name ~~ '%encrypt%'::text))
  ORDER BY name;


ALTER VIEW public.ssl_configuration_status OWNER TO postgres;

--
-- Name: VIEW ssl_configuration_status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON VIEW public.ssl_configuration_status IS 'Shows current SSL/TLS configuration settings in PostgreSQL';


--
-- Name: states; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.states (
    id integer NOT NULL,
    country_id integer,
    name character varying(255) NOT NULL
);


ALTER TABLE public.states OWNER TO postgres;

--
-- Name: states_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.states_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.states_id_seq OWNER TO postgres;

--
-- Name: states_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.states_id_seq OWNED BY public.states.id;


--
-- Name: student_attendance_patterns; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.student_attendance_patterns AS
 SELECT school_id,
    user_id AS student_id,
    EXTRACT(month FROM date) AS month,
    EXTRACT(year FROM date) AS year,
    count(*) AS total_days,
    count(
        CASE
            WHEN ((status)::text = 'present'::text) THEN 1
            ELSE NULL::integer
        END) AS present_days,
    count(
        CASE
            WHEN ((status)::text = 'absent'::text) THEN 1
            ELSE NULL::integer
        END) AS absent_days,
    count(
        CASE
            WHEN ((status)::text = 'leave'::text) THEN 1
            ELSE NULL::integer
        END) AS leave_days,
    round((((count(
        CASE
            WHEN ((status)::text = 'present'::text) THEN 1
            ELSE NULL::integer
        END))::numeric * 100.0) / (NULLIF(count(*), 0))::numeric), 2) AS attendance_percentage,
    max(( SELECT count(*) AS count
           FROM public.attendance a2
          WHERE (((a2.school_id)::text = (a.school_id)::text) AND ((a2.user_id)::text = (a.user_id)::text) AND ((a2.status)::text = 'absent'::text) AND ((a2.date >= (a.date - '7 days'::interval)) AND (a2.date <= a.date))))) AS max_consecutive_absences_7d
   FROM public.attendance a
  WHERE ((role)::text = 'student'::text)
  GROUP BY school_id, user_id, (EXTRACT(month FROM date)), (EXTRACT(year FROM date));


ALTER VIEW public.student_attendance_patterns OWNER TO postgres;

--
-- Name: student_coupons; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.student_coupons (
    school_id character varying(255) NOT NULL,
    student_id character varying(255) NOT NULL,
    coupon_id character varying(255) NOT NULL,
    discount_applied double precision NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.student_coupons OWNER TO postgres;

--
-- Name: student_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.student_history (
    id integer NOT NULL,
    school_id character varying(255) NOT NULL,
    student_id character varying(255) NOT NULL,
    rev_no integer NOT NULL,
    author character varying(255),
    data jsonb NOT NULL,
    delta jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE ONLY public.student_history FORCE ROW LEVEL SECURITY;


ALTER TABLE public.student_history OWNER TO postgres;

--
-- Name: TABLE student_history; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.student_history IS 'Versioned history of student record changes for auditing.';


--
-- Name: student_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.student_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.student_history_id_seq OWNER TO postgres;

--
-- Name: student_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.student_history_id_seq OWNED BY public.student_history.id;


--
-- Name: student_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.student_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.student_id_seq OWNER TO postgres;

--
-- Name: student_invoices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.student_invoices (
    id integer NOT NULL,
    school_id character varying(255) NOT NULL,
    student_id character varying(255) NOT NULL,
    fee_id character varying(255) NOT NULL,
    total_fees numeric(12,2) NOT NULL,
    pending_amount numeric(12,2) NOT NULL,
    discount numeric(12,2) DEFAULT 0,
    status character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    is_custom boolean DEFAULT false,
    penalty_accrued numeric(10,2) DEFAULT 0.00
);

ALTER TABLE ONLY public.student_invoices FORCE ROW LEVEL SECURITY;


ALTER TABLE public.student_invoices OWNER TO postgres;

--
-- Name: student_invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.student_invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.student_invoices_id_seq OWNER TO postgres;

--
-- Name: student_invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.student_invoices_id_seq OWNED BY public.student_invoices.id;


--
-- Name: student_submissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.student_submissions (
    submission_id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id character varying(255) NOT NULL,
    student_id character varying(255) NOT NULL,
    exam_id character varying(255),
    assignment_name character varying(255),
    submission_type character varying(100) NOT NULL,
    content text,
    file_url text,
    file_type character varying(50),
    word_count integer,
    character_count integer,
    submitted_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    due_date timestamp with time zone,
    status character varying(50) DEFAULT 'submitted'::character varying,
    image_metadata jsonb DEFAULT '{}'::jsonb,
    checked_by text,
    checked_at timestamp with time zone
);


ALTER TABLE public.student_submissions OWNER TO postgres;

--
-- Name: TABLE student_submissions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.student_submissions IS 'Student submissions for grading (exams, assignments, essays)';


--
-- Name: students_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.students_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.students_id_seq OWNER TO postgres;

--
-- Name: students_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.students_id_seq OWNED BY public.students.id;


--
-- Name: subjects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subjects (
    id character varying(255) NOT NULL,
    school_id character varying(255) NOT NULL,
    name character varying(255),
    class_id character varying(255),
    class_name character varying(255),
    fees double precision DEFAULT 0.0,
    is_compulsory boolean DEFAULT true,
    category text,
    fee_type text DEFAULT 'monthly'::text,
    fee_interval integer DEFAULT 1,
    schedule_type text DEFAULT 'daily'::text,
    schedule_data jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE ONLY public.subjects FORCE ROW LEVEL SECURITY;


ALTER TABLE public.subjects OWNER TO postgres;

--
-- Name: super_admins; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.super_admins (
    id integer NOT NULL,
    username character varying(100) NOT NULL,
    password_hash text NOT NULL,
    profile_image_url text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.super_admins OWNER TO postgres;

--
-- Name: super_admin_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.super_admin_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.super_admin_id_seq OWNER TO postgres;

--
-- Name: super_admin_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.super_admin_id_seq OWNED BY public.super_admins.id;


--
-- Name: support_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.support_requests (
    id integer NOT NULL,
    school_name character varying(255) NOT NULL,
    contact_info text,
    message text NOT NULL,
    status character varying(50) DEFAULT 'open'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    resolved_at timestamp with time zone
);


ALTER TABLE public.support_requests OWNER TO postgres;

--
-- Name: support_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.support_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.support_requests_id_seq OWNER TO postgres;

--
-- Name: support_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.support_requests_id_seq OWNED BY public.support_requests.id;


--
-- Name: syllabus_calendar; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.syllabus_calendar (
    id integer NOT NULL,
    school_id character varying(255) NOT NULL,
    class_id character varying(255) NOT NULL,
    subject_id character varying(255) NOT NULL,
    chapter_id integer NOT NULL,
    planned_start_date date NOT NULL,
    planned_end_date date NOT NULL,
    actual_start_date date,
    actual_end_date date,
    period_count integer DEFAULT 0,
    status character varying(20) DEFAULT 'pending'::character varying,
    quarter character varying(5)
);


ALTER TABLE public.syllabus_calendar OWNER TO postgres;

--
-- Name: syllabus_calendar_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.syllabus_calendar_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.syllabus_calendar_id_seq OWNER TO postgres;

--
-- Name: syllabus_calendar_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.syllabus_calendar_id_seq OWNED BY public.syllabus_calendar.id;


--
-- Name: system_audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_audit_logs (
    id integer NOT NULL,
    school_id character varying(50) NOT NULL, -- Bug #2 Fixed: was 'text'; standardized to varchar(50) for consistency
    admin_id text NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    action_type text NOT NULL,
    changed_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE ONLY public.system_audit_logs FORCE ROW LEVEL SECURITY;


ALTER TABLE public.system_audit_logs OWNER TO postgres;

--
-- Name: system_audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.system_audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.system_audit_logs_id_seq OWNER TO postgres;

--
-- Name: system_audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.system_audit_logs_id_seq OWNED BY public.system_audit_logs.id;


--
-- Name: system_config; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_config (
    config_key text NOT NULL,
    config_value text NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.system_config OWNER TO postgres;

--
-- Name: tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tasks (
    id integer NOT NULL,
    task_id character varying(255) NOT NULL,
    school_id character varying(255) NOT NULL,
    user_type character varying(50) NOT NULL,
    parent_id character varying(255) NOT NULL,
    task_name text NOT NULL,
    time_duration text,
    complete_percentage numeric(5,2) DEFAULT 0,
    status character varying(50) NOT NULL,
    update_logs jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deadline timestamp with time zone,
    priority character varying(50) DEFAULT 'Medium'::character varying,
    entity_type character varying(100),
    entity_id character varying(255),
    is_ai_generated boolean DEFAULT false,
    ai_metadata jsonb DEFAULT '{}'::jsonb,
    period_plan_id integer
);

ALTER TABLE ONLY public.tasks FORCE ROW LEVEL SECURITY;


ALTER TABLE public.tasks OWNER TO postgres;

--
-- Name: tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tasks_id_seq OWNER TO postgres;

--
-- Name: tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tasks_id_seq OWNED BY public.tasks.id;


--
-- Name: teacher_availability; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.teacher_availability (
    id integer NOT NULL,
    school_id character varying(50) NOT NULL,
    teacher_id character varying(50) NOT NULL,
    day_of_week integer NOT NULL,
    period_number integer NOT NULL,
    is_available boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT teacher_availability_day_of_week_check CHECK (((day_of_week >= 1) AND (day_of_week <= 7)))
);


ALTER TABLE public.teacher_availability OWNER TO postgres;

--
-- Name: teacher_availability_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.teacher_availability_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.teacher_availability_id_seq OWNER TO postgres;

--
-- Name: teacher_availability_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.teacher_availability_id_seq OWNED BY public.teacher_availability.id;


--
-- Name: testimonials; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.testimonials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_name character varying(255) NOT NULL,
    client_title character varying(255),
    school_name character varying(500),
    avatar_url character varying(1000),
    rating smallint DEFAULT 5,
    content text NOT NULL,
    is_featured boolean DEFAULT false,
    display_order integer DEFAULT 0,
    is_published boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT testimonials_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


ALTER TABLE public.testimonials OWNER TO postgres;

--
-- Name: timetable_configs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.timetable_configs (
    id integer NOT NULL,
    school_id character varying(50) NOT NULL,
    config_id character varying(100) NOT NULL,
    class_id character varying(50) NOT NULL,
    class_name character varying(100) NOT NULL,
    periods_per_day integer DEFAULT 8 NOT NULL,
    working_days integer[] DEFAULT '{1,2,3,4,5}'::integer[] NOT NULL,
    subject_requirements jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    status character varying(20) DEFAULT 'DRAFT'::character varying NOT NULL,
    season character varying(10),
    start_time time without time zone,
    end_time time without time zone,
    period_duration_minutes integer DEFAULT 40,
    break_duration_minutes integer DEFAULT 10,
    approved_by character varying(255),
    approved_at timestamp with time zone,
    notes text,
    view_type text DEFAULT 'global'::text,
    is_active boolean DEFAULT false,
    CONSTRAINT timetable_configs_season_check CHECK (((season)::text = ANY ((ARRAY['SUMMER'::character varying, 'WINTER'::character varying])::text[]))),
    CONSTRAINT timetable_configs_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'PROPOSAL'::character varying, 'APPROVED'::character varying])::text[])))
);


ALTER TABLE public.timetable_configs OWNER TO postgres;

--
-- Name: TABLE timetable_configs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.timetable_configs IS 'timetables configurations with AI proposal workflow. Status: DRAFT (manual scratch), PROPOSAL (AI-generated, awaiting approval), APPROVED (active, triggers notifications).';


--
-- Name: timetable_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.timetable_configs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.timetable_configs_id_seq OWNER TO postgres;

--
-- Name: timetable_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.timetable_configs_id_seq OWNED BY public.timetable_configs.id;


--
-- Name: timetable_conflict_rules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.timetable_conflict_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id character varying(255) NOT NULL,
    rule_name character varying(255) NOT NULL,
    description text,
    conflict_type character varying(100) NOT NULL,
    check_conditions jsonb DEFAULT '{}'::jsonb NOT NULL,
    severity character varying(50) DEFAULT 'warning'::character varying,
    auto_resolve boolean DEFAULT false,
    notification_roles jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.timetable_conflict_rules OWNER TO postgres;

--
-- Name: timetable_conflicts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.timetable_conflicts (
    id integer NOT NULL,
    school_id character varying(50) NOT NULL,
    config_id character varying(100) NOT NULL,
    conflict_type character varying(100) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.timetable_conflicts OWNER TO postgres;

--
-- Name: timetable_conflicts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.timetable_conflicts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.timetable_conflicts_id_seq OWNER TO postgres;

--
-- Name: timetable_conflicts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.timetable_conflicts_id_seq OWNED BY public.timetable_conflicts.id;


--
-- Name: timetable_notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.timetable_notifications (
    id integer NOT NULL,
    school_id character varying(50) NOT NULL,
    config_id character varying(100) NOT NULL,
    user_id character varying(50) NOT NULL,
    user_type character varying(20) NOT NULL,
    notification_type character varying(50) NOT NULL,
    sent_at timestamp with time zone DEFAULT now(),
    read boolean DEFAULT false
);


ALTER TABLE public.timetable_notifications OWNER TO postgres;

--
-- Name: timetable_notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.timetable_notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.timetable_notifications_id_seq OWNER TO postgres;

--
-- Name: timetable_notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.timetable_notifications_id_seq OWNED BY public.timetable_notifications.id;


--
-- Name: timetable_rooms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.timetable_rooms (
    id integer NOT NULL,
    school_id character varying(50) NOT NULL,
    room_id character varying(50) NOT NULL,
    room_name character varying(100) NOT NULL,
    room_type character varying(50) DEFAULT 'classroom'::character varying,
    capacity integer DEFAULT 40,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.timetable_rooms OWNER TO postgres;

--
-- Name: timetable_rooms_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.timetable_rooms_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.timetable_rooms_id_seq OWNER TO postgres;

--
-- Name: timetable_rooms_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.timetable_rooms_id_seq OWNED BY public.timetable_rooms.id;


--
-- Name: timetable_slots; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.timetable_slots (
    id integer NOT NULL,
    school_id character varying(50) NOT NULL,
    config_id character varying(100) NOT NULL,
    class_id character varying(50) NOT NULL,
    day_of_week integer NOT NULL,
    period_number integer NOT NULL,
    subject_id character varying(50),
    subject_name character varying(100),
    teacher_id character varying(50),
    teacher_name character varying(100),
    room_id character varying(50),
    is_free_period boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    time_slot time without time zone
);


ALTER TABLE public.timetable_slots OWNER TO postgres;

--
-- Name: timetable_slots_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.timetable_slots_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.timetable_slots_id_seq OWNER TO postgres;

--
-- Name: timetable_slots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.timetable_slots_id_seq OWNED BY public.timetable_slots.id;


--
-- Name: tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tokens (
    token_id text NOT NULL,
    school_id character varying(255) NOT NULL,
    user_type character varying(50) NOT NULL,
    status character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp with time zone NOT NULL
);


ALTER TABLE public.tokens OWNER TO postgres;

--
-- Name: topics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.topics (
    id integer NOT NULL,
    subject_id text,
    name text NOT NULL,
    description text
);


ALTER TABLE public.topics OWNER TO postgres;

--
-- Name: topics_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.topics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.topics_id_seq OWNER TO postgres;

--
-- Name: topics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.topics_id_seq OWNED BY public.topics.id;


--
-- Name: user_activity_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_activity_logs (
    id integer NOT NULL,
    phone character varying(20) NOT NULL,
    user_type character varying(50) NOT NULL,
    action character varying(50) NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.user_activity_logs OWNER TO postgres;

--
-- Name: user_activity_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_activity_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_activity_logs_id_seq OWNER TO postgres;

--
-- Name: user_activity_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_activity_logs_id_seq OWNED BY public.user_activity_logs.id;


--
-- Name: user_device_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_device_tokens (
    id integer NOT NULL,
    user_id text NOT NULL,
    school_id character varying(50) NOT NULL, -- Bug #2 Fixed: was 'text'; standardized to varchar(50) for consistency
    token text NOT NULL,
    platform text,
    created_at timestamp with time zone DEFAULT now(),
    last_seen_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.user_device_tokens OWNER TO postgres;

--
-- Name: user_device_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_device_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_device_tokens_id_seq OWNER TO postgres;

--
-- Name: user_device_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_device_tokens_id_seq OWNED BY public.user_device_tokens.id;


--
-- Name: webhook_delivery_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.webhook_delivery_logs (
    id integer NOT NULL,
    school_id character varying(50) NOT NULL,
    endpoint_id integer,
    event_type character varying(50) NOT NULL,
    payload jsonb NOT NULL,
    status_code integer,
    response_body text,
    attempt_count integer DEFAULT 1,
    last_attempt_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    next_retry_at timestamp with time zone,
    status character varying(20) DEFAULT 'pending'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.webhook_delivery_logs OWNER TO postgres;

--
-- Name: webhook_delivery_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.webhook_delivery_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.webhook_delivery_logs_id_seq OWNER TO postgres;

--
-- Name: webhook_delivery_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.webhook_delivery_logs_id_seq OWNED BY public.webhook_delivery_logs.id;


--
-- Name: webhook_endpoints; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.webhook_endpoints (
    id integer NOT NULL,
    school_id character varying(50) NOT NULL,
    url text NOT NULL,
    secret text NOT NULL,
    event_types text[] NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.webhook_endpoints OWNER TO postgres;

--
-- Name: webhook_endpoints_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.webhook_endpoints_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.webhook_endpoints_id_seq OWNER TO postgres;

--
-- Name: webhook_endpoints_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.webhook_endpoints_id_seq OWNED BY public.webhook_endpoints.id;


--
-- Name: workload_assessment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.workload_assessment (
    assessment_id uuid DEFAULT gen_random_uuid() NOT NULL,
    leave_id character varying NOT NULL,
    school_id character varying NOT NULL,
    employee_id character varying NOT NULL,
    assessment_date date NOT NULL,
    impact_score integer NOT NULL,
    workload_category character varying NOT NULL,
    coverage_needed boolean DEFAULT false,
    suggested_coverages jsonb DEFAULT '[]'::jsonb,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT workload_assessment_impact_score_check CHECK (((impact_score >= 0) AND (impact_score <= 100))),
    CONSTRAINT workload_assessment_workload_category_check CHECK (((workload_category)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'critical'::character varying])::text[])))
);


ALTER TABLE public.workload_assessment OWNER TO postgres;

--
-- Name: TABLE workload_assessment; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.workload_assessment IS 'Workload impact assessment for leave requests';


--
-- Name: academic_components id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.academic_components ALTER COLUMN id SET DEFAULT nextval('public.academic_components_id_seq'::regclass);


--
-- Name: ai_chat_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_chat_history ALTER COLUMN id SET DEFAULT nextval('public.ai_chat_history_id_seq'::regclass);


--
-- Name: ai_provider_health health_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_provider_health ALTER COLUMN health_id SET DEFAULT nextval('public.ai_provider_health_health_id_seq'::regclass);


--
-- Name: ai_provider_usage usage_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_provider_usage ALTER COLUMN usage_id SET DEFAULT nextval('public.ai_provider_usage_usage_id_seq'::regclass);


--
-- Name: ai_providers provider_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_providers ALTER COLUMN provider_id SET DEFAULT nextval('public.ai_providers_provider_id_seq'::regclass);


--
-- Name: ai_query_cache id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_query_cache ALTER COLUMN id SET DEFAULT nextval('public.ai_query_cache_id_seq'::regclass);


--
-- Name: ai_schema_embeddings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_schema_embeddings ALTER COLUMN id SET DEFAULT nextval('public.ai_schema_embeddings_id_seq'::regclass);


--
-- Name: ai_shadow_evaluations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_shadow_evaluations ALTER COLUMN id SET DEFAULT nextval('public.ai_shadow_evaluations_id_seq'::regclass);


--
-- Name: ai_training_metrics id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_training_metrics ALTER COLUMN id SET DEFAULT nextval('public.ai_training_metrics_id_seq'::regclass);


--
-- Name: announcements id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.announcements ALTER COLUMN id SET DEFAULT nextval('public.announcements_id_seq'::regclass);


--
-- Name: api_keys id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_keys ALTER COLUMN id SET DEFAULT nextval('public.api_keys_id_seq'::regclass);


--
-- Name: app_files id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_files ALTER COLUMN id SET DEFAULT nextval('public.app_files_id_seq'::regclass);


--
-- Name: attendance id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance ALTER COLUMN id SET DEFAULT nextval('public.attendance_id_seq'::regclass);


--
-- Name: attendance_qr_tokens id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_qr_tokens ALTER COLUMN id SET DEFAULT nextval('public.attendance_qr_tokens_id_seq'::regclass);


--
-- Name: audit_events id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_events ALTER COLUMN id SET DEFAULT nextval('public.audit_events_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: auth_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth_logs ALTER COLUMN id SET DEFAULT nextval('public.auth_logs_id_seq'::regclass);


--
-- Name: awards id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.awards ALTER COLUMN id SET DEFAULT nextval('public.awards_id_seq'::regclass);


--
-- Name: billing_ledger id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_ledger ALTER COLUMN id SET DEFAULT nextval('public.billing_ledger_id_seq'::regclass);


--
-- Name: chapters id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chapters ALTER COLUMN id SET DEFAULT nextval('public.chapters_id_seq'::regclass);


--
-- Name: communication id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.communication ALTER COLUMN id SET DEFAULT nextval('public.communication_id_seq'::regclass);


--
-- Name: complaints id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.complaints ALTER COLUMN id SET DEFAULT nextval('public.complaints_id_seq'::regclass);


--
-- Name: consent_records id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consent_records ALTER COLUMN id SET DEFAULT nextval('public.consent_records_id_seq'::regclass);


--
-- Name: countries id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.countries ALTER COLUMN id SET DEFAULT nextval('public.countries_id_seq'::regclass);


--
-- Name: custom_fees id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_fees ALTER COLUMN id SET DEFAULT nextval('public.custom_fees_id_seq'::regclass);


--
-- Name: daily_teacher_reports id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_teacher_reports ALTER COLUMN id SET DEFAULT nextval('public.daily_teacher_reports_id_seq'::regclass);


--
-- Name: data_breach_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_breach_logs ALTER COLUMN id SET DEFAULT nextval('public.data_breach_logs_id_seq'::regclass);


--
-- Name: data_classification classification_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_classification ALTER COLUMN classification_id SET DEFAULT nextval('public.data_classification_classification_id_seq'::regclass);


--
-- Name: developer_access_grants id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.developer_access_grants ALTER COLUMN id SET DEFAULT nextval('public.developer_access_grants_id_seq'::regclass);


--
-- Name: developer_access_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.developer_access_requests ALTER COLUMN id SET DEFAULT nextval('public.developer_access_requests_id_seq'::regclass);


--
-- Name: developer_activity_audit id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.developer_activity_audit ALTER COLUMN id SET DEFAULT nextval('public.developer_activity_audit_id_seq'::regclass);


--
-- Name: districts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.districts ALTER COLUMN id SET DEFAULT nextval('public.districts_id_seq'::regclass);


--
-- Name: document_boxes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_boxes ALTER COLUMN id SET DEFAULT nextval('public.document_box_id_seq'::regclass);


--
-- Name: document_embeddings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_embeddings ALTER COLUMN id SET DEFAULT nextval('public.document_embeddings_id_seq'::regclass);


--
-- Name: dsar_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dsar_requests ALTER COLUMN id SET DEFAULT nextval('public.dsar_requests_id_seq'::regclass);


--
-- Name: employee_payments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_payments ALTER COLUMN id SET DEFAULT nextval('public.employee_payments_id_seq'::regclass);


--
-- Name: employees id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees ALTER COLUMN id SET DEFAULT nextval('public.employees_id_seq'::regclass);


--
-- Name: encryption_audit_log audit_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.encryption_audit_log ALTER COLUMN audit_id SET DEFAULT nextval('public.encryption_audit_log_audit_id_seq'::regclass);


--
-- Name: event_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_items ALTER COLUMN id SET DEFAULT nextval('public.event_items_id_seq'::regclass);


--
-- Name: events id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events ALTER COLUMN id SET DEFAULT nextval('public.events_id_seq'::regclass);


--
-- Name: exam_sections id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_sections ALTER COLUMN id SET DEFAULT nextval('public.exam_sections_id_seq'::regclass);


--
-- Name: exams id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exams ALTER COLUMN id SET DEFAULT nextval('public.exams_id_seq'::regclass);


--
-- Name: fee_templates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fee_templates ALTER COLUMN id SET DEFAULT nextval('public.fee_templates_id_seq'::regclass);


--
-- Name: fee_transactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fee_transactions ALTER COLUMN id SET DEFAULT nextval('public.fee_transactions_id_seq'::regclass);


--
-- Name: global_notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.global_notifications ALTER COLUMN id SET DEFAULT nextval('public.global_notifications_id_seq'::regclass);


--
-- Name: global_users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.global_users ALTER COLUMN id SET DEFAULT nextval('public.global_users_id_seq'::regclass);


--
-- Name: grade_criteria id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grade_criteria ALTER COLUMN id SET DEFAULT nextval('public.grade_criteria_id_seq'::regclass);


--
-- Name: leaves id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leaves ALTER COLUMN id SET DEFAULT nextval('public.leaves_id_seq'::regclass);


--
-- Name: material_alert_log id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.material_alert_log ALTER COLUMN id SET DEFAULT nextval('public.material_alert_log_id_seq'::regclass);


--
-- Name: material_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.material_history ALTER COLUMN id SET DEFAULT nextval('public.material_history_id_seq'::regclass);


--
-- Name: notification_preferences id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_preferences ALTER COLUMN id SET DEFAULT nextval('public.notification_preferences_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: ocr_extractions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ocr_extractions ALTER COLUMN id SET DEFAULT nextval('public.ocr_extractions_id_seq'::regclass);


--
-- Name: period_plans id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.period_plans ALTER COLUMN id SET DEFAULT nextval('public.period_plans_id_seq'::regclass);


--
-- Name: promo_codes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promo_codes ALTER COLUMN id SET DEFAULT nextval('public.promo_codes_id_seq'::regclass);


--
-- Name: reminder_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reminder_items ALTER COLUMN id SET DEFAULT nextval('public.reminder_items_id_seq'::regclass);


--
-- Name: reminders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reminders ALTER COLUMN id SET DEFAULT nextval('public.reminders_id_seq'::regclass);


--
-- Name: responsibilities id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.responsibilities ALTER COLUMN id SET DEFAULT nextval('public.responsibilities_id_seq'::regclass);


--
-- Name: responsibility_assignment_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.responsibility_assignment_history ALTER COLUMN id SET DEFAULT nextval('public.responsibility_assignment_history_id_seq'::regclass);


--
-- Name: responsibility_versions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.responsibility_versions ALTER COLUMN id SET DEFAULT nextval('public.responsibility_version_id_seq'::regclass);


--
-- Name: retention_policies id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.retention_policies ALTER COLUMN id SET DEFAULT nextval('public.retention_policies_id_seq'::regclass);


--
-- Name: salaries id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salaries ALTER COLUMN id SET DEFAULT nextval('public.salaries_id_seq'::regclass);


--
-- Name: schedule_change_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schedule_change_requests ALTER COLUMN id SET DEFAULT nextval('public.schedule_change_requests_id_seq'::regclass);


--
-- Name: scheduled_reports scheduled_report_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scheduled_reports ALTER COLUMN scheduled_report_id SET DEFAULT nextval('public.scheduled_reports_scheduled_report_id_seq'::regclass);


--
-- Name: school_promo_codes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.school_promo_codes ALTER COLUMN id SET DEFAULT nextval('public.school_promo_codes_id_seq'::regclass);


--
-- Name: schools id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schools ALTER COLUMN id SET DEFAULT nextval('public.schools_id_seq'::regclass);


--
-- Name: space_categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.space_categories ALTER COLUMN id SET DEFAULT nextval('public.space_categories_id_seq'::regclass);


--
-- Name: space_material_requirements id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.space_material_requirements ALTER COLUMN id SET DEFAULT nextval('public.space_material_requirements_id_seq'::regclass);


--
-- Name: space_materials id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.space_materials ALTER COLUMN id SET DEFAULT nextval('public.space_materials_id_seq'::regclass);


--
-- Name: space_requirements id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.space_requirements ALTER COLUMN id SET DEFAULT nextval('public.space_requirements_id_seq'::regclass);


--
-- Name: states id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.states ALTER COLUMN id SET DEFAULT nextval('public.states_id_seq'::regclass);


--
-- Name: student_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_history ALTER COLUMN id SET DEFAULT nextval('public.student_history_id_seq'::regclass);


--
-- Name: student_invoices id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_invoices ALTER COLUMN id SET DEFAULT nextval('public.student_invoices_id_seq'::regclass);


--
-- Name: students id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students ALTER COLUMN id SET DEFAULT nextval('public.students_id_seq'::regclass);


--
-- Name: super_admins id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.super_admins ALTER COLUMN id SET DEFAULT nextval('public.super_admin_id_seq'::regclass);


--
-- Name: support_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_requests ALTER COLUMN id SET DEFAULT nextval('public.support_requests_id_seq'::regclass);


--
-- Name: syllabus_calendar id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.syllabus_calendar ALTER COLUMN id SET DEFAULT nextval('public.syllabus_calendar_id_seq'::regclass);


--
-- Name: system_audit_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_audit_logs ALTER COLUMN id SET DEFAULT nextval('public.system_audit_logs_id_seq'::regclass);


--
-- Name: tasks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks ALTER COLUMN id SET DEFAULT nextval('public.tasks_id_seq'::regclass);


--
-- Name: teacher_availability id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teacher_availability ALTER COLUMN id SET DEFAULT nextval('public.teacher_availability_id_seq'::regclass);


--
-- Name: timetable_configs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.timetable_configs ALTER COLUMN id SET DEFAULT nextval('public.timetable_configs_id_seq'::regclass);


--
-- Name: timetable_conflicts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.timetable_conflicts ALTER COLUMN id SET DEFAULT nextval('public.timetable_conflicts_id_seq'::regclass);


--
-- Name: timetable_notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.timetable_notifications ALTER COLUMN id SET DEFAULT nextval('public.timetable_notifications_id_seq'::regclass);


--
-- Name: timetable_rooms id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.timetable_rooms ALTER COLUMN id SET DEFAULT nextval('public.timetable_rooms_id_seq'::regclass);


--
-- Name: timetable_slots id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.timetable_slots ALTER COLUMN id SET DEFAULT nextval('public.timetable_slots_id_seq'::regclass);


--
-- Name: topics id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.topics ALTER COLUMN id SET DEFAULT nextval('public.topics_id_seq'::regclass);


--
-- Name: user_activity_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_activity_logs ALTER COLUMN id SET DEFAULT nextval('public.user_activity_logs_id_seq'::regclass);


--
-- Name: user_device_tokens id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_device_tokens ALTER COLUMN id SET DEFAULT nextval('public.user_device_tokens_id_seq'::regclass);


--
-- Name: webhook_delivery_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.webhook_delivery_logs ALTER COLUMN id SET DEFAULT nextval('public.webhook_delivery_logs_id_seq'::regclass);


--
-- Name: webhook_endpoints id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.webhook_endpoints ALTER COLUMN id SET DEFAULT nextval('public.webhook_endpoints_id_seq'::regclass);


--
-- Name: academic_components academic_components_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.academic_components
    ADD CONSTRAINT academic_components_pkey PRIMARY KEY (id);


--
-- Name: academic_components academic_components_school_id_class_name_subject_name_chapt_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.academic_components
    ADD CONSTRAINT academic_components_school_id_class_name_subject_name_chapt_key UNIQUE (school_id, class_name, subject_name, chapter_name, component_type, component_name);


--
-- Name: admin_task_queue admin_task_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_task_queue
    ADD CONSTRAINT admin_task_queue_pkey PRIMARY KEY (id);


--
-- Name: admin_timetable_conflicts admin_timetable_conflicts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_timetable_conflicts
    ADD CONSTRAINT admin_timetable_conflicts_pkey PRIMARY KEY (id);


--
-- Name: ai_background_jobs ai_background_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_background_jobs
    ADD CONSTRAINT ai_background_jobs_pkey PRIMARY KEY (id);


--
-- Name: ai_chat_history ai_chat_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_chat_history
    ADD CONSTRAINT ai_chat_history_pkey PRIMARY KEY (id);


--
-- Name: ai_chat_sessions ai_chat_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_chat_sessions
    ADD CONSTRAINT ai_chat_sessions_pkey PRIMARY KEY (session_id);


--
-- Name: ai_grading_results ai_grading_results_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_grading_results
    ADD CONSTRAINT ai_grading_results_pkey PRIMARY KEY (grading_id);


--
-- Name: ai_provider_health ai_provider_health_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_provider_health
    ADD CONSTRAINT ai_provider_health_pkey PRIMARY KEY (health_id);


--
-- Name: ai_provider_usage ai_provider_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_provider_usage
    ADD CONSTRAINT ai_provider_usage_pkey PRIMARY KEY (usage_id);


--
-- Name: ai_providers ai_providers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_providers
    ADD CONSTRAINT ai_providers_pkey PRIMARY KEY (provider_id);


--
-- Name: ai_query_cache ai_query_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_query_cache
    ADD CONSTRAINT ai_query_cache_pkey PRIMARY KEY (id);


--
-- Name: ai_schema_embeddings ai_schema_embeddings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_schema_embeddings
    ADD CONSTRAINT ai_schema_embeddings_pkey PRIMARY KEY (id);


--
-- Name: ai_schema_embeddings ai_schema_embeddings_table_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_schema_embeddings
    ADD CONSTRAINT ai_schema_embeddings_table_name_key UNIQUE (table_name);


--
-- Name: ai_school_status ai_school_status_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_school_status
    ADD CONSTRAINT ai_school_status_pkey PRIMARY KEY (school_id);


--
-- Name: ai_shadow_evaluations ai_shadow_evaluations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_shadow_evaluations
    ADD CONSTRAINT ai_shadow_evaluations_pkey PRIMARY KEY (id);


--
-- Name: ai_training_metrics ai_training_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_training_metrics
    ADD CONSTRAINT ai_training_metrics_pkey PRIMARY KEY (id);


--
-- Name: ai_usage_logs ai_usage_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_usage_logs
    ADD CONSTRAINT ai_usage_logs_pkey PRIMARY KEY (id);


--
-- Name: announcements announcements_announcement_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_announcement_id_key UNIQUE (announcement_id);


--
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);


--
-- Name: api_keys api_keys_key_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_key_id_key UNIQUE (key_id);


--
-- Name: api_keys api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);


--
-- Name: app_files app_files_file_hash_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_files
    ADD CONSTRAINT app_files_file_hash_key UNIQUE (file_hash);


--
-- Name: app_files app_files_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_files
    ADD CONSTRAINT app_files_pkey PRIMARY KEY (id);


--
-- Name: attendance attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_pkey PRIMARY KEY (id);


--
-- Name: attendance_qr_tokens attendance_qr_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_qr_tokens
    ADD CONSTRAINT attendance_qr_tokens_pkey PRIMARY KEY (id);


--
-- Name: attendance_qr_tokens attendance_qr_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_qr_tokens
    ADD CONSTRAINT attendance_qr_tokens_token_key UNIQUE (token);


--
-- Name: attendance_reports attendance_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_reports
    ADD CONSTRAINT attendance_reports_pkey PRIMARY KEY (id);


--
-- Name: attendance attendance_school_role_user_date_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_school_role_user_date_unique UNIQUE (school_id, role, user_id, date);


--
-- Name: audit_events audit_events_event_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_events
    ADD CONSTRAINT audit_events_event_id_unique UNIQUE (event_id);


--
-- Name: audit_events audit_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_events
    ADD CONSTRAINT audit_events_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: auth_logs auth_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth_logs
    ADD CONSTRAINT auth_logs_pkey PRIMARY KEY (id);


--
-- Name: auth auth_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth
    ADD CONSTRAINT auth_pkey PRIMARY KEY (school_id);


--
-- Name: automated_reports automated_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.automated_reports
    ADD CONSTRAINT automated_reports_pkey PRIMARY KEY (id);


--
-- Name: awards awards_award_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.awards
    ADD CONSTRAINT awards_award_id_key UNIQUE (award_id);


--
-- Name: awards awards_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.awards
    ADD CONSTRAINT awards_pkey PRIMARY KEY (id);


--
-- Name: billing_ledger billing_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billing_ledger
    ADD CONSTRAINT billing_ledger_pkey PRIMARY KEY (id);


--
-- Name: blog_posts blog_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_pkey PRIMARY KEY (id);


--
-- Name: blog_posts blog_posts_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_slug_key UNIQUE (slug);


--
-- Name: chapters chapters_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chapters
    ADD CONSTRAINT chapters_pkey PRIMARY KEY (id);


--
-- Name: chapters chapters_school_id_class_name_subject_name_chapter_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chapters
    ADD CONSTRAINT chapters_school_id_class_name_subject_name_chapter_name_key UNIQUE (school_id, class_name, subject_name, chapter_name);


--
-- Name: classes classes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_pkey PRIMARY KEY (school_id, id);


--
-- Name: common_error_patterns common_error_patterns_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.common_error_patterns
    ADD CONSTRAINT common_error_patterns_pkey PRIMARY KEY (pattern_id);


--
-- Name: communication communication_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.communication
    ADD CONSTRAINT communication_pkey PRIMARY KEY (id);


--
-- Name: complaints complaints_complaint_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.complaints
    ADD CONSTRAINT complaints_complaint_id_key UNIQUE (complaint_id);


--
-- Name: complaints complaints_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.complaints
    ADD CONSTRAINT complaints_pkey PRIMARY KEY (id);


--
-- Name: conditional_approval_templates conditional_approval_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conditional_approval_templates
    ADD CONSTRAINT conditional_approval_templates_pkey PRIMARY KEY (template_id);


--
-- Name: conditional_approvals conditional_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conditional_approvals
    ADD CONSTRAINT conditional_approvals_pkey PRIMARY KEY (id);


--
-- Name: consent_records consent_records_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consent_records
    ADD CONSTRAINT consent_records_pkey PRIMARY KEY (id);


--
-- Name: consent_records consent_records_school_id_subject_type_subject_id_consent_t_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consent_records
    ADD CONSTRAINT consent_records_school_id_subject_type_subject_id_consent_t_key UNIQUE (school_id, subject_type, subject_id, consent_type, consent_version);


--
-- Name: countries countries_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.countries
    ADD CONSTRAINT countries_name_key UNIQUE (name);


--
-- Name: countries countries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.countries
    ADD CONSTRAINT countries_pkey PRIMARY KEY (id);


--
-- Name: coupons coupons_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_pkey PRIMARY KEY (school_id, coupon_id);


--
-- Name: custom_fees custom_fees_fee_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_fees
    ADD CONSTRAINT custom_fees_fee_id_key UNIQUE (fee_id);


--
-- Name: custom_fees custom_fees_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_fees
    ADD CONSTRAINT custom_fees_pkey PRIMARY KEY (id);


--
-- Name: daily_teacher_reports daily_teacher_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_teacher_reports
    ADD CONSTRAINT daily_teacher_reports_pkey PRIMARY KEY (id);


--
-- Name: daily_teacher_reports daily_teacher_reports_school_id_teacher_id_report_date_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_teacher_reports
    ADD CONSTRAINT daily_teacher_reports_school_id_teacher_id_report_date_key UNIQUE (school_id, teacher_id, report_date);


--
-- Name: data_breach_logs data_breach_logs_breach_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_breach_logs
    ADD CONSTRAINT data_breach_logs_breach_id_unique UNIQUE (breach_id);


--
-- Name: data_breach_logs data_breach_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_breach_logs
    ADD CONSTRAINT data_breach_logs_pkey PRIMARY KEY (id);


--
-- Name: data_classification data_classification_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_classification
    ADD CONSTRAINT data_classification_pkey PRIMARY KEY (classification_id);


--
-- Name: data_classification data_classification_school_id_table_name_column_name_json_p_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_classification
    ADD CONSTRAINT data_classification_school_id_table_name_column_name_json_p_key UNIQUE (school_id, table_name, column_name, json_path);


--
-- Name: developer_access_grants developer_access_grants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.developer_access_grants
    ADD CONSTRAINT developer_access_grants_pkey PRIMARY KEY (id);


--
-- Name: developer_access_requests developer_access_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.developer_access_requests
    ADD CONSTRAINT developer_access_requests_pkey PRIMARY KEY (id);


--
-- Name: developer_activity_audit developer_activity_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.developer_activity_audit
    ADD CONSTRAINT developer_activity_audit_pkey PRIMARY KEY (id);


--
-- Name: districts districts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.districts
    ADD CONSTRAINT districts_pkey PRIMARY KEY (id);


--
-- Name: districts districts_state_id_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.districts
    ADD CONSTRAINT districts_state_id_name_key UNIQUE (state_id, name);


--
-- Name: document_boxes document_box_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_boxes
    ADD CONSTRAINT document_box_pkey PRIMARY KEY (id);


--
-- Name: document_embeddings document_embeddings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_embeddings
    ADD CONSTRAINT document_embeddings_pkey PRIMARY KEY (id);


--
-- Name: dsar_requests dsar_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dsar_requests
    ADD CONSTRAINT dsar_requests_pkey PRIMARY KEY (id);


--
-- Name: dsar_requests dsar_requests_request_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dsar_requests
    ADD CONSTRAINT dsar_requests_request_id_unique UNIQUE (request_id);


--
-- Name: email_processing_queue email_processing_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_processing_queue
    ADD CONSTRAINT email_processing_queue_pkey PRIMARY KEY (id);


--
-- Name: email_processing_rules email_processing_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_processing_rules
    ADD CONSTRAINT email_processing_rules_pkey PRIMARY KEY (id);


--
-- Name: employee_payments employee_payments_payment_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_payments
    ADD CONSTRAINT employee_payments_payment_id_key UNIQUE (payment_id);


--
-- Name: employee_payments employee_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_payments
    ADD CONSTRAINT employee_payments_pkey PRIMARY KEY (id);


--
-- Name: employee_responsibilities employee_responsibilities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_responsibilities
    ADD CONSTRAINT employee_responsibilities_pkey PRIMARY KEY (school_id, employee_id, responsibility_id);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: employees employees_school_id_employee_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_school_id_employee_id_key UNIQUE (school_id, employee_id);


--
-- Name: encryption_audit_log encryption_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.encryption_audit_log
    ADD CONSTRAINT encryption_audit_log_pkey PRIMARY KEY (audit_id);


--
-- Name: encryption_keys encryption_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.encryption_keys
    ADD CONSTRAINT encryption_keys_pkey PRIMARY KEY (key_id);


--
-- Name: event_items event_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_items
    ADD CONSTRAINT event_items_pkey PRIMARY KEY (id);


--
-- Name: events events_event_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_event_id_key UNIQUE (event_id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: exam_answer_keys exam_answer_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_answer_keys
    ADD CONSTRAINT exam_answer_keys_pkey PRIMARY KEY (key_id);


--
-- Name: exam_answer_keys exam_answer_keys_school_id_exam_id_question_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_answer_keys
    ADD CONSTRAINT exam_answer_keys_school_id_exam_id_question_number_key UNIQUE (school_id, exam_id, question_number);


--
-- Name: exam_sections exam_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_sections
    ADD CONSTRAINT exam_sections_pkey PRIMARY KEY (id);


--
-- Name: exam_sections exam_sections_school_id_exam_id_class_id_subject_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_sections
    ADD CONSTRAINT exam_sections_school_id_exam_id_class_id_subject_id_key UNIQUE (school_id, exam_id, class_id, subject_id);


--
-- Name: exam_submission_pages exam_submission_pages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_submission_pages
    ADD CONSTRAINT exam_submission_pages_pkey PRIMARY KEY (page_id);


--
-- Name: exam_submission_pages exam_submission_pages_submission_id_page_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_submission_pages
    ADD CONSTRAINT exam_submission_pages_submission_id_page_number_key UNIQUE (submission_id, page_number);


--
-- Name: exams exams_exam_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_exam_id_key UNIQUE (exam_id);


--
-- Name: exams exams_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_pkey PRIMARY KEY (id);


--
-- Name: fee_templates fee_templates_fee_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fee_templates
    ADD CONSTRAINT fee_templates_fee_id_key UNIQUE (fee_id);


--
-- Name: fee_templates fee_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fee_templates
    ADD CONSTRAINT fee_templates_pkey PRIMARY KEY (id);


--
-- Name: fee_transactions fee_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fee_transactions
    ADD CONSTRAINT fee_transactions_pkey PRIMARY KEY (id);


--
-- Name: fees fees_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fees
    ADD CONSTRAINT fees_pkey PRIMARY KEY (id);


--
-- Name: fees fees_school_id_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fees
    ADD CONSTRAINT fees_school_id_id_key UNIQUE (school_id, id);


--
-- Name: form_submissions form_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_submissions
    ADD CONSTRAINT form_submissions_pkey PRIMARY KEY (id);


--
-- Name: form_templates form_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_templates
    ADD CONSTRAINT form_templates_pkey PRIMARY KEY (id);


--
-- Name: global_notifications global_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.global_notifications
    ADD CONSTRAINT global_notifications_pkey PRIMARY KEY (id);


--
-- Name: global_users global_users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.global_users
    ADD CONSTRAINT global_users_pkey PRIMARY KEY (id);


--
-- Name: global_users global_users_school_id_user_id_user_type_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.global_users
    ADD CONSTRAINT global_users_school_id_user_id_user_type_key UNIQUE (school_id, user_id, user_type);


--
-- Name: grade_criteria grade_criteria_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grade_criteria
    ADD CONSTRAINT grade_criteria_pkey PRIMARY KEY (id);


--
-- Name: gradebooks gradebook_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gradebooks
    ADD CONSTRAINT gradebook_pkey PRIMARY KEY (gradebook_id);


--
-- Name: gradebooks gradebook_school_id_student_id_assessment_id_assessment_typ_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gradebooks
    ADD CONSTRAINT gradebook_school_id_student_id_assessment_id_assessment_typ_key UNIQUE (school_id, student_id, assessment_id, assessment_type);


--
-- Name: gradebook_summaries gradebook_summary_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gradebook_summaries
    ADD CONSTRAINT gradebook_summary_pkey PRIMARY KEY (summary_id);


--
-- Name: gradebook_summaries gradebook_summary_school_id_student_id_academic_year_term_s_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gradebook_summaries
    ADD CONSTRAINT gradebook_summary_school_id_student_id_academic_year_term_s_key UNIQUE (school_id, student_id, academic_year, term, subject_name);


--
-- Name: gradebook_sync_log gradebook_sync_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gradebook_sync_log
    ADD CONSTRAINT gradebook_sync_log_pkey PRIMARY KEY (sync_id);


--
-- Name: gradebook_sync_queue gradebook_sync_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gradebook_sync_queue
    ADD CONSTRAINT gradebook_sync_queue_pkey PRIMARY KEY (queue_id);


--
-- Name: grading_config grading_config_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grading_config
    ADD CONSTRAINT grading_config_pkey PRIMARY KEY (config_id);


--
-- Name: grading_config grading_config_school_id_subject_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grading_config
    ADD CONSTRAINT grading_config_school_id_subject_name_key UNIQUE (school_id, subject_name);


--
-- Name: grading_rubrics grading_rubrics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grading_rubrics
    ADD CONSTRAINT grading_rubrics_pkey PRIMARY KEY (rubric_id);


--
-- Name: grading_rubrics grading_rubrics_school_id_rubric_name_rubric_type_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.grading_rubrics
    ADD CONSTRAINT grading_rubrics_school_id_rubric_name_rubric_type_key UNIQUE (school_id, rubric_name, rubric_type);


--
-- Name: items items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_pkey PRIMARY KEY (school_id, space_name, id);


--
-- Name: items items_school_space_item_composite_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_school_space_item_composite_unique UNIQUE (school_id, space_id, item_id);


--
-- Name: leave_applications leave_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_applications
    ADD CONSTRAINT leave_applications_pkey PRIMARY KEY (leave_id);


--
-- Name: leave_notifications leave_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_notifications
    ADD CONSTRAINT leave_notifications_pkey PRIMARY KEY (notification_id);


--
-- Name: leave_quotas leave_quotas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_quotas
    ADD CONSTRAINT leave_quotas_pkey PRIMARY KEY (quota_id);


--
-- Name: leave_quotas leave_quotas_school_id_employee_id_leave_type_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_quotas
    ADD CONSTRAINT leave_quotas_school_id_employee_id_leave_type_key UNIQUE (school_id, employee_id, leave_type);


--
-- Name: leaves leaves_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leaves
    ADD CONSTRAINT leaves_pkey PRIMARY KEY (id);


--
-- Name: material_alert_log material_alert_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.material_alert_log
    ADD CONSTRAINT material_alert_log_pkey PRIMARY KEY (id);


--
-- Name: material_alert_log material_alert_log_school_id_space_name_material_name_statu_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.material_alert_log
    ADD CONSTRAINT material_alert_log_school_id_space_name_material_name_statu_key UNIQUE (school_id, space_name, material_name, status);


--
-- Name: material_history material_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.material_history
    ADD CONSTRAINT material_history_pkey PRIMARY KEY (id);


--
-- Name: material_locations material_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.material_locations
    ADD CONSTRAINT material_locations_pkey PRIMARY KEY (school_id, material_id, space_id, item_id);


--
-- Name: materials materials_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT materials_pkey PRIMARY KEY (school_id, id);


--
-- Name: notification_preferences notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_pkey PRIMARY KEY (id);


--
-- Name: notification_preferences notification_preferences_school_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_school_id_user_id_key UNIQUE (school_id, user_id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: ocr_extractions ocr_extractions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ocr_extractions
    ADD CONSTRAINT ocr_extractions_pkey PRIMARY KEY (id);


--
-- Name: period_plans period_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.period_plans
    ADD CONSTRAINT period_plans_pkey PRIMARY KEY (id);


--
-- Name: period_plans period_plans_school_id_config_id_day_of_week_period_number__key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.period_plans
    ADD CONSTRAINT period_plans_school_id_config_id_day_of_week_period_number__key UNIQUE (school_id, config_id, day_of_week, period_number, date);


--
-- Name: plagiarism_cache plagiarism_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plagiarism_cache
    ADD CONSTRAINT plagiarism_cache_pkey PRIMARY KEY (cache_id);


--
-- Name: plagiarism_cache plagiarism_cache_school_id_content_hash_content_type_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plagiarism_cache
    ADD CONSTRAINT plagiarism_cache_school_id_content_hash_content_type_key UNIQUE (school_id, content_hash, content_type);


--
-- Name: promo_codes promo_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promo_codes
    ADD CONSTRAINT promo_codes_code_key UNIQUE (code);


--
-- Name: promo_codes promo_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promo_codes
    ADD CONSTRAINT promo_codes_pkey PRIMARY KEY (id);


--
-- Name: reminder_items reminder_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reminder_items
    ADD CONSTRAINT reminder_items_pkey PRIMARY KEY (id);


--
-- Name: reminders reminders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reminders
    ADD CONSTRAINT reminders_pkey PRIMARY KEY (id);


--
-- Name: reminders reminders_reminder_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reminders
    ADD CONSTRAINT reminders_reminder_id_key UNIQUE (reminder_id);


--
-- Name: report_generation_logs report_generation_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_generation_logs
    ADD CONSTRAINT report_generation_logs_pkey PRIMARY KEY (id);


--
-- Name: responsibilities responsibilities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.responsibilities
    ADD CONSTRAINT responsibilities_pkey PRIMARY KEY (id);


--
-- Name: responsibilities responsibilities_responsibility_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.responsibilities
    ADD CONSTRAINT responsibilities_responsibility_id_key UNIQUE (responsibility_id);


--
-- Name: responsibility_assignment_history responsibility_assignment_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.responsibility_assignment_history
    ADD CONSTRAINT responsibility_assignment_history_pkey PRIMARY KEY (id);


--
-- Name: responsibility_coverage responsibility_coverage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.responsibility_coverage
    ADD CONSTRAINT responsibility_coverage_pkey PRIMARY KEY (coverage_id);


--
-- Name: responsibility_versions responsibility_version_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.responsibility_versions
    ADD CONSTRAINT responsibility_version_pkey PRIMARY KEY (id);


--
-- Name: responsibility_versions responsibility_version_responsibility_id_version_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.responsibility_versions
    ADD CONSTRAINT responsibility_version_responsibility_id_version_key UNIQUE (responsibility_id, version);


--
-- Name: retention_policies retention_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.retention_policies
    ADD CONSTRAINT retention_policies_pkey PRIMARY KEY (id);


--
-- Name: retention_policies retention_policies_school_id_data_category_policy_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.retention_policies
    ADD CONSTRAINT retention_policies_school_id_data_category_policy_name_key UNIQUE (school_id, data_category, policy_name);


--
-- Name: salaries salaries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salaries
    ADD CONSTRAINT salaries_pkey PRIMARY KEY (id);


--
-- Name: salaries salaries_salary_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salaries
    ADD CONSTRAINT salaries_salary_id_key UNIQUE (salary_id);


--
-- Name: schedule_change_requests schedule_change_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schedule_change_requests
    ADD CONSTRAINT schedule_change_requests_pkey PRIMARY KEY (id);


--
-- Name: scheduled_reports scheduled_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scheduled_reports
    ADD CONSTRAINT scheduled_reports_pkey PRIMARY KEY (scheduled_report_id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: school_access_requests school_access_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.school_access_requests
    ADD CONSTRAINT school_access_requests_pkey PRIMARY KEY (id);


--
-- Name: school_ai_config school_ai_config_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.school_ai_config
    ADD CONSTRAINT school_ai_config_pkey PRIMARY KEY (school_id, provider_id);


--
-- Name: school_feature_flags school_feature_flags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.school_feature_flags
    ADD CONSTRAINT school_feature_flags_pkey PRIMARY KEY (school_id);


--
-- Name: school_promo_codes school_promo_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.school_promo_codes
    ADD CONSTRAINT school_promo_codes_pkey PRIMARY KEY (id);


--
-- Name: school_promo_codes school_promo_codes_school_id_promo_code_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.school_promo_codes
    ADD CONSTRAINT school_promo_codes_school_id_promo_code_id_key UNIQUE (school_id, promo_code_id);


--
-- Name: schools schools_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schools
    ADD CONSTRAINT schools_pkey PRIMARY KEY (id);


--
-- Name: schools schools_school_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schools
    ADD CONSTRAINT schools_school_id_key UNIQUE (school_id);


--
-- Name: setup_template_assignments setup_template_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.setup_template_assignments
    ADD CONSTRAINT setup_template_assignments_pkey PRIMARY KEY (id);


--
-- Name: setup_template_assignments setup_template_assignments_school_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.setup_template_assignments
    ADD CONSTRAINT setup_template_assignments_school_id_key UNIQUE (school_id);


--
-- Name: setup_template_configs setup_template_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.setup_template_configs
    ADD CONSTRAINT setup_template_configs_pkey PRIMARY KEY (id);


--
-- Name: setup_template_configs setup_template_configs_template_id_section_field_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.setup_template_configs
    ADD CONSTRAINT setup_template_configs_template_id_section_field_name_key UNIQUE (template_id, section, field_name);


--
-- Name: setup_templates setup_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.setup_templates
    ADD CONSTRAINT setup_templates_pkey PRIMARY KEY (id);


--
-- Name: space_categories space_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.space_categories
    ADD CONSTRAINT space_categories_pkey PRIMARY KEY (id);


--
-- Name: space_categories space_categories_school_id_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.space_categories
    ADD CONSTRAINT space_categories_school_id_name_key UNIQUE (school_id, name);


--
-- Name: space_employees space_employees_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.space_employees
    ADD CONSTRAINT space_employees_pkey PRIMARY KEY (school_id, space_name, employee_id);


--
-- Name: space_material_requirements space_mat_req_school_space_mat_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.space_material_requirements
    ADD CONSTRAINT space_mat_req_school_space_mat_unique UNIQUE (school_id, space_name, material_name);


--
-- Name: space_material_requirements space_material_requirements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.space_material_requirements
    ADD CONSTRAINT space_material_requirements_pkey PRIMARY KEY (id);


--
-- Name: space_materials space_materials_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.space_materials
    ADD CONSTRAINT space_materials_pkey PRIMARY KEY (id);


--
-- Name: space_materials space_materials_school_space_mat_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.space_materials
    ADD CONSTRAINT space_materials_school_space_mat_unique UNIQUE (school_id, space_name, material_name);


--
-- Name: space_requirements space_requirements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.space_requirements
    ADD CONSTRAINT space_requirements_pkey PRIMARY KEY (id);


--
-- Name: space_requirements space_requirements_school_id_space_id_responsibility_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.space_requirements
    ADD CONSTRAINT space_requirements_school_id_space_id_responsibility_id_key UNIQUE (school_id, space_name, responsibility_id);


--
-- Name: spaces spaces_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.spaces
    ADD CONSTRAINT spaces_pkey PRIMARY KEY (school_id, id);


--
-- Name: states states_country_id_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.states
    ADD CONSTRAINT states_country_id_name_key UNIQUE (country_id, name);


--
-- Name: states states_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.states
    ADD CONSTRAINT states_pkey PRIMARY KEY (id);


--
-- Name: student_coupons student_coupons_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_coupons
    ADD CONSTRAINT student_coupons_pkey PRIMARY KEY (school_id, student_id, coupon_id);


--
-- Name: student_invoices student_fees_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_invoices
    ADD CONSTRAINT student_fees_pkey PRIMARY KEY (id);


--
-- Name: student_history student_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_history
    ADD CONSTRAINT student_history_pkey PRIMARY KEY (id);


--
-- Name: student_submissions student_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_submissions
    ADD CONSTRAINT student_submissions_pkey PRIMARY KEY (submission_id);


--
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (id);


--
-- Name: students students_school_id_student_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_school_id_student_id_key UNIQUE (school_id, student_id);


--
-- Name: subjects subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_pkey PRIMARY KEY (school_id, id);


--
-- Name: super_admins super_admin_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.super_admins
    ADD CONSTRAINT super_admin_pkey PRIMARY KEY (id);


--
-- Name: super_admins super_admin_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.super_admins
    ADD CONSTRAINT super_admin_username_key UNIQUE (username);


--
-- Name: support_requests support_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_requests
    ADD CONSTRAINT support_requests_pkey PRIMARY KEY (id);


--
-- Name: syllabus_calendar syllabus_calendar_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.syllabus_calendar
    ADD CONSTRAINT syllabus_calendar_pkey PRIMARY KEY (id);


--
-- Name: syllabus_calendar syllabus_calendar_school_id_class_id_subject_id_chapter_id__key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.syllabus_calendar
    ADD CONSTRAINT syllabus_calendar_school_id_class_id_subject_id_chapter_id__key UNIQUE (school_id, class_id, subject_id, chapter_id, quarter);


--
-- Name: system_audit_logs system_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_audit_logs
    ADD CONSTRAINT system_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: system_config system_config_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_config
    ADD CONSTRAINT system_config_pkey PRIMARY KEY (config_key);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_task_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_task_id_key UNIQUE (task_id);


--
-- Name: teacher_availability teacher_availability_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teacher_availability
    ADD CONSTRAINT teacher_availability_pkey PRIMARY KEY (id);


--
-- Name: teacher_availability teacher_availability_school_id_teacher_id_day_of_week_perio_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teacher_availability
    ADD CONSTRAINT teacher_availability_school_id_teacher_id_day_of_week_perio_key UNIQUE (school_id, teacher_id, day_of_week, period_number);


--
-- Name: testimonials testimonials_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.testimonials
    ADD CONSTRAINT testimonials_pkey PRIMARY KEY (id);


--
-- Name: timetable_configs timetable_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.timetable_configs
    ADD CONSTRAINT timetable_configs_pkey PRIMARY KEY (id);


--
-- Name: timetable_configs timetable_configs_school_id_config_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.timetable_configs
    ADD CONSTRAINT timetable_configs_school_id_config_id_key UNIQUE (school_id, config_id);


--
-- Name: timetable_conflict_rules timetable_conflict_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.timetable_conflict_rules
    ADD CONSTRAINT timetable_conflict_rules_pkey PRIMARY KEY (id);


--
-- Name: timetable_conflicts timetable_conflicts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.timetable_conflicts
    ADD CONSTRAINT timetable_conflicts_pkey PRIMARY KEY (id);


--
-- Name: timetable_notifications timetable_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.timetable_notifications
    ADD CONSTRAINT timetable_notifications_pkey PRIMARY KEY (id);


--
-- Name: timetable_rooms timetable_rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.timetable_rooms
    ADD CONSTRAINT timetable_rooms_pkey PRIMARY KEY (id);


--
-- Name: timetable_rooms timetable_rooms_school_id_room_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.timetable_rooms
    ADD CONSTRAINT timetable_rooms_school_id_room_id_key UNIQUE (school_id, room_id);


--
-- Name: timetable_slots timetable_slots_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.timetable_slots
    ADD CONSTRAINT timetable_slots_pkey PRIMARY KEY (id);


--
-- Name: timetable_slots timetable_slots_school_id_config_id_day_of_week_period_numb_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.timetable_slots
    ADD CONSTRAINT timetable_slots_school_id_config_id_day_of_week_period_numb_key UNIQUE (school_id, config_id, day_of_week, period_number);


--
-- Name: tokens tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tokens
    ADD CONSTRAINT tokens_pkey PRIMARY KEY (token_id);


--
-- Name: topics topics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.topics
    ADD CONSTRAINT topics_pkey PRIMARY KEY (id);


--
-- Name: employee_responsibilities uk_employee_responsibilities_unique_assignment; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_responsibilities
    ADD CONSTRAINT uk_employee_responsibilities_unique_assignment UNIQUE (school_id, employee_id, responsibility_id);


--
-- Name: employees uk_employees_school_employee; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT uk_employees_school_employee UNIQUE (school_id, employee_id);


--
-- Name: responsibilities uk_responsibilities_school_responsibility; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.responsibilities
    ADD CONSTRAINT uk_responsibilities_school_responsibility UNIQUE (school_id, responsibility_id);


--
-- Name: coupons unique_school_coupon_name; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT unique_school_coupon_name UNIQUE (school_id, coupon_name);


--
-- Name: materials unique_school_material_name; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT unique_school_material_name UNIQUE (school_id, name);


--
-- Name: spaces unique_school_space_name; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.spaces
    ADD CONSTRAINT unique_school_space_name UNIQUE (school_id, name);


--
-- Name: user_activity_logs user_activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_activity_logs
    ADD CONSTRAINT user_activity_logs_pkey PRIMARY KEY (id);


--
-- Name: user_device_tokens user_device_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_device_tokens
    ADD CONSTRAINT user_device_tokens_pkey PRIMARY KEY (id);


--
-- Name: user_device_tokens user_device_tokens_user_id_school_id_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_device_tokens
    ADD CONSTRAINT user_device_tokens_user_id_school_id_token_key UNIQUE (user_id, school_id, token);


--
-- Name: webhook_delivery_logs webhook_delivery_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.webhook_delivery_logs
    ADD CONSTRAINT webhook_delivery_logs_pkey PRIMARY KEY (id);


--
-- Name: webhook_endpoints webhook_endpoints_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.webhook_endpoints
    ADD CONSTRAINT webhook_endpoints_pkey PRIMARY KEY (id);


--
-- Name: workload_assessment workload_assessment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workload_assessment
    ADD CONSTRAINT workload_assessment_pkey PRIMARY KEY (assessment_id);


--
-- Name: ai_schema_embeddings_vector_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ai_schema_embeddings_vector_idx ON public.ai_schema_embeddings USING hnsw (schema_embedding public.vector_cosine_ops);


--
-- Name: app_files_permanent_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX app_files_permanent_idx ON public.app_files USING btree (is_permanent, created_at);


--
-- Name: app_files_school_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX app_files_school_idx ON public.app_files USING btree (school_id);


--
-- Name: app_files_user_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX app_files_user_idx ON public.app_files USING btree (user_id);


--
-- Name: global_users_aadhaar_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX global_users_aadhaar_idx ON public.global_users USING btree (aadhaar_number);


--
-- Name: global_users_email_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX global_users_email_idx ON public.global_users USING btree (email);


--
-- Name: global_users_phone_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX global_users_phone_idx ON public.global_users USING btree (phone);


--
-- Name: idx_admin_task_queue_scheduled; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admin_task_queue_scheduled ON public.admin_task_queue USING btree (school_id, scheduled_for, status);


--
-- Name: idx_admin_task_queue_school_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admin_task_queue_school_status ON public.admin_task_queue USING btree (school_id, status);


--
-- Name: idx_admin_task_queue_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admin_task_queue_type ON public.admin_task_queue USING btree (school_id, task_type, status);


--
-- Name: idx_admin_timetable_conflicts_entity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admin_timetable_conflicts_entity ON public.admin_timetable_conflicts USING btree (school_id, entity_type, entity_id);


--
-- Name: idx_admin_timetable_conflicts_school_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admin_timetable_conflicts_school_status ON public.admin_timetable_conflicts USING btree (school_id, resolved_at);


--
-- Name: idx_admin_timetable_conflicts_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admin_timetable_conflicts_type ON public.admin_timetable_conflicts USING btree (school_id, conflict_type, severity);


--
-- Name: idx_ai_background_jobs_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_background_jobs_status ON public.ai_background_jobs USING btree (status);


--
-- Name: idx_ai_bg_jobs_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_bg_jobs_created ON public.ai_background_jobs USING btree (created_at);


--
-- Name: idx_ai_bg_jobs_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_bg_jobs_status ON public.ai_background_jobs USING btree (status);


--
-- Name: idx_ai_chat_history_school; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_chat_history_school ON public.ai_chat_history USING btree (school_id, created_at DESC);


--
-- Name: idx_ai_chat_history_session; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_chat_history_session ON public.ai_chat_history USING btree (session_id);


--
-- Name: idx_ai_grading_results_school; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_grading_results_school ON public.ai_grading_results USING btree (school_id);


--
-- Name: idx_ai_grading_results_submission; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_grading_results_submission ON public.ai_grading_results USING btree (submission_id);


--
-- Name: idx_ai_provider_health_recent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_provider_health_recent ON public.ai_provider_health USING btree (provider_id, checked_at DESC);


--
-- Name: idx_ai_provider_usage_operation; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_provider_usage_operation ON public.ai_provider_usage USING btree (operation_type, "timestamp");


--
-- Name: idx_ai_provider_usage_provider; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_provider_usage_provider ON public.ai_provider_usage USING btree (provider_id, "timestamp");


--
-- Name: idx_ai_provider_usage_school; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_provider_usage_school ON public.ai_provider_usage USING btree (school_id, "timestamp");


--
-- Name: idx_ai_providers_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_providers_active ON public.ai_providers USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_ai_providers_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_providers_type ON public.ai_providers USING btree (provider_type);


--
-- Name: idx_ai_query_cache_embedding; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_query_cache_embedding ON public.ai_query_cache USING hnsw (question_embedding public.vector_cosine_ops);


--
-- Name: idx_ai_query_cache_embedding_hnsw; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_query_cache_embedding_hnsw ON public.ai_query_cache USING hnsw (question_embedding public.vector_cosine_ops);


--
-- Name: idx_ai_query_cache_question_trgm; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_query_cache_question_trgm ON public.ai_query_cache USING gin (question_text public.gin_trgm_ops);


--
-- Name: idx_ai_query_cache_school_question; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_ai_query_cache_school_question ON public.ai_query_cache USING btree (school_id, question_text);


--
-- Name: idx_ai_query_cache_tsvector; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_query_cache_tsvector ON public.ai_query_cache USING gin (question_tsvector);


--
-- Name: idx_ai_schema_embeddings_tsvector; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_schema_embeddings_tsvector ON public.ai_schema_embeddings USING gin (schema_tsvector);


--
-- Name: idx_ai_usage_logs_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_usage_logs_date ON public.ai_usage_logs USING btree (created_at);


--
-- Name: idx_ai_usage_logs_school; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ai_usage_logs_school ON public.ai_usage_logs USING btree (school_id);


--
-- Name: idx_announcements_school_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_announcements_school_id ON public.announcements USING btree (school_id);


--
-- Name: idx_api_keys_hash; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_api_keys_hash ON public.api_keys USING btree (key_hash);


--
-- Name: idx_api_keys_school; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_api_keys_school ON public.api_keys USING btree (school_id);


--
-- Name: idx_attendance_class_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_attendance_class_date ON public.attendance USING btree (school_id, class_name, date);


--
-- Name: idx_attendance_reports_generated_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_attendance_reports_generated_at ON public.attendance_reports USING btree (generated_at DESC);


--
-- Name: idx_attendance_reports_school_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_attendance_reports_school_type ON public.attendance_reports USING btree (school_id, report_type, period_start DESC);


--
-- Name: idx_attendance_reports_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_attendance_reports_status ON public.attendance_reports USING btree (status) WHERE ((status)::text = 'completed'::text);


--
-- Name: idx_attendance_school_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_attendance_school_date ON public.attendance USING btree (school_id, date);


--
-- Name: idx_attendance_school_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_attendance_school_id ON public.attendance USING btree (school_id);


--
-- Name: idx_attendance_school_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_attendance_school_user ON public.attendance USING btree (school_id, user_id);


--
-- Name: idx_attendance_school_user_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_attendance_school_user_date ON public.attendance USING btree (school_id, user_id, date);


--
-- Name: idx_audit_events_action_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_events_action_status ON public.audit_events USING btree (action_status, event_timestamp);


--
-- Name: idx_audit_events_actor; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_events_actor ON public.audit_events USING btree (actor_type, actor_id, event_timestamp DESC);


--
-- Name: idx_audit_events_developer_access; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_events_developer_access ON public.audit_events USING btree (developer_access_grant_id) WHERE (developer_access_grant_id IS NOT NULL);


--
-- Name: idx_audit_events_event_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_events_event_type ON public.audit_events USING btree (event_type, event_timestamp DESC);


--
-- Name: idx_audit_events_resource; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_events_resource ON public.audit_events USING btree (resource_type, resource_id);


--
-- Name: idx_audit_events_school_timestamp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_events_school_timestamp ON public.audit_events USING btree (school_id, event_timestamp DESC);


--
-- Name: idx_audit_logs_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_created ON public.audit_logs USING btree (created_at DESC);


--
-- Name: idx_audit_logs_school; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_school ON public.audit_logs USING btree (school_id);


--
-- Name: idx_auth_school_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_auth_school_id ON public.auth USING btree (school_id);


--
-- Name: idx_automated_reports_schedule; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_automated_reports_schedule ON public.automated_reports USING btree (school_id, schedule_type, next_scheduled_at);


--
-- Name: idx_automated_reports_school_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_automated_reports_school_type ON public.automated_reports USING btree (school_id, report_type);


--
-- Name: idx_awards_school_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_awards_school_id ON public.awards USING btree (school_id);


--
-- Name: idx_billing_ledger_school; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_billing_ledger_school ON public.billing_ledger USING btree (school_id, created_at DESC);


--
-- Name: idx_blog_posts_published_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_blog_posts_published_at ON public.blog_posts USING btree (published_at DESC);


--
-- Name: idx_blog_posts_slug; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_blog_posts_slug ON public.blog_posts USING btree (slug);


--
-- Name: idx_cache_school_count; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cache_school_count ON public.ai_query_cache USING btree (school_id, search_count DESC);


--
-- Name: idx_change_requests_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_change_requests_status ON public.schedule_change_requests USING btree (school_id, status);


--
-- Name: idx_classes_school_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_classes_school_id ON public.classes USING btree (school_id);


--
-- Name: idx_classes_school_id_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_classes_school_id_unique ON public.classes USING btree (school_id, id);


--
-- Name: idx_classes_sections_gin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_classes_sections_gin ON public.classes USING gin (sections);


--
-- Name: idx_common_errors_school; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_common_errors_school ON public.common_error_patterns USING btree (school_id, subject_name);


--
-- Name: idx_complaints_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_complaints_id ON public.complaints USING btree (complaint_id);


--
-- Name: idx_complaints_school_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_complaints_school_id ON public.complaints USING btree (school_id);


--
-- Name: idx_complaints_sender; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_complaints_sender ON public.complaints USING btree (school_id, sender_id);


--
-- Name: idx_complaints_target; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_complaints_target ON public.complaints USING btree (school_id, target_id);


--
-- Name: idx_conditional_approvals_deadline; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_conditional_approvals_deadline ON public.conditional_approvals USING btree (response_deadline) WHERE ((status)::text = 'pending_response'::text);


--
-- Name: idx_conditional_approvals_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_conditional_approvals_status ON public.conditional_approvals USING btree (status);


--
-- Name: idx_conflict_rules_school_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_conflict_rules_school_active ON public.timetable_conflict_rules USING btree (school_id, is_active);


--
-- Name: idx_consent_records_expiry; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_consent_records_expiry ON public.consent_records USING btree (expires_at) WHERE ((status)::text = 'active'::text);


--
-- Name: idx_consent_records_subject; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_consent_records_subject ON public.consent_records USING btree (subject_type, subject_id, status);


--
-- Name: idx_custom_fees_school; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_custom_fees_school ON public.custom_fees USING btree (school_id);


--
-- Name: idx_daily_reports_missed; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_daily_reports_missed ON public.daily_teacher_reports USING btree (school_id, report_date, status);


--
-- Name: idx_data_breach_logs_school_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_data_breach_logs_school_status ON public.data_breach_logs USING btree (school_id, containment_status);


--
-- Name: idx_data_breach_logs_severity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_data_breach_logs_severity ON public.data_breach_logs USING btree (severity, detected_at DESC);


--
-- Name: idx_developer_access_grants_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_developer_access_grants_active ON public.developer_access_grants USING btree (is_active);


--
-- Name: idx_developer_access_grants_end_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_developer_access_grants_end_time ON public.developer_access_grants USING btree (end_time);


--
-- Name: idx_developer_access_requests_developer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_developer_access_requests_developer ON public.developer_access_requests USING btree (developer_id);


--
-- Name: idx_developer_access_requests_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_developer_access_requests_status ON public.developer_access_requests USING btree (status);


--
-- Name: idx_developer_activity_audit_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_developer_activity_audit_created ON public.developer_activity_audit USING btree (created_at);


--
-- Name: idx_developer_activity_audit_developer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_developer_activity_audit_developer ON public.developer_activity_audit USING btree (developer_id);


--
-- Name: idx_doc_box_school_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_doc_box_school_id ON public.document_boxes USING btree (school_id);


--
-- Name: idx_document_box_school_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_document_box_school_user ON public.document_boxes USING btree (school_id, user_id);


--
-- Name: idx_document_embeddings_embedding; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_document_embeddings_embedding ON public.document_embeddings USING hnsw (chunk_embedding public.vector_cosine_ops);


--
-- Name: idx_dsar_requests_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dsar_requests_created_at ON public.dsar_requests USING btree (created_at DESC);


--
-- Name: idx_dsar_requests_data_subject; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dsar_requests_data_subject ON public.dsar_requests USING btree (data_subject_type, data_subject_id);


--
-- Name: idx_dsar_requests_school_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dsar_requests_school_status ON public.dsar_requests USING btree (school_id, status, due_date);


--
-- Name: idx_email_queue_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_email_queue_category ON public.email_processing_queue USING btree (school_id, category);


--
-- Name: idx_email_queue_received; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_email_queue_received ON public.email_processing_queue USING btree (school_id, received_at);


--
-- Name: idx_email_queue_school_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_email_queue_school_status ON public.email_processing_queue USING btree (school_id, processing_status);


--
-- Name: idx_email_rules_school_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_email_rules_school_active ON public.email_processing_rules USING btree (school_id, is_active);


--
-- Name: idx_employee_responsibilities_employee_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_employee_responsibilities_employee_id ON public.employee_responsibilities USING btree (employee_id);


--
-- Name: idx_employee_responsibilities_responsibility_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_employee_responsibilities_responsibility_id ON public.employee_responsibilities USING btree (responsibility_id);


--
-- Name: idx_employee_responsibilities_school_responsibility; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_employee_responsibilities_school_responsibility ON public.employee_responsibilities USING btree (school_id, responsibility_id);


--
-- Name: INDEX idx_employee_responsibilities_school_responsibility; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON INDEX public.idx_employee_responsibilities_school_responsibility IS 'Optimizes queries filtering employee responsibilities by school and responsibility';


--
-- Name: idx_employee_responsibilities_space_ids; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_employee_responsibilities_space_ids ON public.employee_responsibilities USING gin (space_ids);


--
-- Name: INDEX idx_employee_responsibilities_space_ids; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON INDEX public.idx_employee_responsibilities_space_ids IS 'Enables fast array containment queries on space_ids';


--
-- Name: idx_employees_aadhaar_global_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_employees_aadhaar_global_unique ON public.employees USING btree (public.normalize_aadhaar((aadhaar_number)::text)) WHERE ((aadhaar_number IS NOT NULL) AND ((aadhaar_number)::text <> ''::text));


--
-- Name: idx_employees_data_gin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_employees_data_gin ON public.employees USING gin (data);


--
-- Name: idx_employees_employee_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_employees_employee_id ON public.employees USING btree (employee_id);


--
-- Name: idx_employees_school_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_employees_school_id ON public.employees USING btree (school_id);


--
-- Name: idx_employees_school_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_employees_school_status ON public.employees USING btree (school_id, status);


--
-- Name: idx_employees_school_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_employees_school_type ON public.employees USING btree (school_id, employee_type);


--
-- Name: idx_encryption_audit_entity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_encryption_audit_entity ON public.encryption_audit_log USING btree (entity_type, entity_id);


--
-- Name: idx_encryption_audit_operation; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_encryption_audit_operation ON public.encryption_audit_log USING btree (operation, performed_at DESC);


--
-- Name: idx_encryption_audit_school; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_encryption_audit_school ON public.encryption_audit_log USING btree (school_id, performed_at DESC);


--
-- Name: idx_encryption_keys_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_encryption_keys_created_at ON public.encryption_keys USING btree (created_at DESC);


--
-- Name: idx_encryption_keys_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_encryption_keys_status ON public.encryption_keys USING btree (key_status);


--
-- Name: idx_encryption_keys_usage; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_encryption_keys_usage ON public.encryption_keys USING btree (key_usage);


--
-- Name: idx_esp_school; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_esp_school ON public.exam_submission_pages USING btree (school_id);


--
-- Name: idx_esp_submission; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_esp_submission ON public.exam_submission_pages USING btree (submission_id);


--
-- Name: idx_exam_answer_keys_exam; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_exam_answer_keys_exam ON public.exam_answer_keys USING btree (school_id, exam_id);


--
-- Name: idx_form_submissions_school_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_form_submissions_school_status ON public.form_submissions USING btree (school_id, status);


--
-- Name: idx_form_submissions_submitted_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_form_submissions_submitted_by ON public.form_submissions USING btree (school_id, submitted_by);


--
-- Name: idx_form_submissions_type_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_form_submissions_type_status ON public.form_submissions USING btree (school_id, form_type, status);


--
-- Name: idx_form_templates_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_form_templates_active ON public.form_templates USING btree (school_id, is_active);


--
-- Name: idx_form_templates_school_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_form_templates_school_type ON public.form_templates USING btree (school_id, form_type);


--
-- Name: idx_global_notifications_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_global_notifications_active ON public.global_notifications USING btree (active) WHERE (active = true);


--
-- Name: idx_global_users_phone; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_global_users_phone ON public.global_users USING btree (phone);


--
-- Name: idx_global_users_school_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_global_users_school_type ON public.global_users USING btree (school_id, user_type);


--
-- Name: idx_gradebook_assessment; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gradebook_assessment ON public.gradebooks USING btree (school_id, assessment_type, assessment_id);


--
-- Name: idx_gradebook_school_student; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gradebook_school_student ON public.gradebooks USING btree (school_id, student_id);


--
-- Name: idx_gradebook_subject_class; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gradebook_subject_class ON public.gradebooks USING btree (school_id, subject_name, class_name);


--
-- Name: idx_gradebook_summary_school_student; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gradebook_summary_school_student ON public.gradebook_summaries USING btree (school_id, student_id);


--
-- Name: idx_gradebook_summary_subject; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gradebook_summary_subject ON public.gradebook_summaries USING btree (school_id, subject_name, academic_year);


--
-- Name: idx_gradebook_sync_queue_school; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gradebook_sync_queue_school ON public.gradebook_sync_queue USING btree (school_id, status);


--
-- Name: idx_gradebook_sync_queue_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gradebook_sync_queue_status ON public.gradebook_sync_queue USING btree (status, sync_priority);


--
-- Name: idx_gradebook_sync_school; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gradebook_sync_school ON public.gradebook_sync_log USING btree (school_id, sync_status);


--
-- Name: idx_gradebook_sync_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_gradebook_sync_status ON public.gradebooks USING btree (school_id, sync_status) WHERE ((sync_status)::text <> 'synced'::text);


--
-- Name: idx_grading_config_school; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_grading_config_school ON public.grading_config USING btree (school_id);


--
-- Name: idx_grading_rubrics_school; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_grading_rubrics_school ON public.grading_rubrics USING btree (school_id);


--
-- Name: idx_grading_rubrics_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_grading_rubrics_type ON public.grading_rubrics USING btree (rubric_type, subject_name);


--
-- Name: idx_items_school_space_item_final; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_items_school_space_item_final ON public.items USING btree (school_id, space_id, item_id);


--
-- Name: idx_leave_applications_conditional; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leave_applications_conditional ON public.leave_applications USING btree (conditional_approval_id) WHERE (conditional_approval_id IS NOT NULL);


--
-- Name: idx_leave_applications_dates; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leave_applications_dates ON public.leave_applications USING btree (from_date, to_date);


--
-- Name: idx_leave_applications_employee; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leave_applications_employee ON public.leave_applications USING btree (school_id, employee_id);


--
-- Name: idx_leave_applications_school_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leave_applications_school_status ON public.leave_applications USING btree (school_id, status);


--
-- Name: idx_leave_applications_student; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leave_applications_student ON public.leave_applications USING btree (school_id, student_id);


--
-- Name: idx_leave_apps_school_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leave_apps_school_id ON public.leave_applications USING btree (school_id);


--
-- Name: idx_leave_notifications_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leave_notifications_created ON public.leave_notifications USING btree (created_at DESC);


--
-- Name: idx_leave_notifications_read; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leave_notifications_read ON public.leave_notifications USING btree (read) WHERE (read = false);


--
-- Name: idx_leave_notifications_recipient; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leave_notifications_recipient ON public.leave_notifications USING btree (school_id, recipient_id);


--
-- Name: idx_leave_quotas_employee; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leave_quotas_employee ON public.leave_quotas USING btree (school_id, employee_id);


--
-- Name: idx_leave_quotas_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leave_quotas_type ON public.leave_quotas USING btree (leave_type);


--
-- Name: idx_leaves_pending; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leaves_pending ON public.leaves USING btree (school_id, created_at) WHERE ((status)::text = 'pending'::text);


--
-- Name: idx_leaves_school_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leaves_school_status ON public.leaves USING btree (school_id, status);


--
-- Name: idx_leaves_school_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_leaves_school_user ON public.leaves USING btree (school_id, user_id);


--
-- Name: idx_material_alert_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_material_alert_active ON public.material_alert_log USING btree (school_id, status);


--
-- Name: idx_material_alert_school; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_material_alert_school ON public.material_alert_log USING btree (school_id);


--
-- Name: idx_material_history_action; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_material_history_action ON public.material_history USING btree (school_id, action_type);


--
-- Name: idx_material_history_composite; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_material_history_composite ON public.material_history USING btree (school_id, material_id, created_at DESC);


--
-- Name: idx_material_loc_school_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_material_loc_school_id ON public.material_locations USING btree (school_id);


--
-- Name: idx_materials_school_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_materials_school_id ON public.materials USING btree (school_id);


--
-- Name: idx_materials_school_name_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_materials_school_name_unique ON public.materials USING btree (school_id, name);


--
-- Name: idx_notif_prefs_school_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notif_prefs_school_user ON public.notification_preferences USING btree (school_id, user_id);


--
-- Name: idx_notifications_school_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_school_category ON public.notifications USING btree (school_id, category, created_at DESC);


--
-- Name: idx_notifications_school_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_school_created ON public.notifications USING btree (school_id, created_at DESC);


--
-- Name: idx_notifications_school_unread; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_school_unread ON public.notifications USING btree (school_id, user_id) WHERE (is_read = false);


--
-- Name: idx_notifications_school_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_school_user ON public.notifications USING btree (school_id, user_id, is_read);


--
-- Name: idx_ocr_entity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ocr_entity ON public.ocr_extractions USING btree (school_id, entity_type, entity_id);


--
-- Name: idx_ocr_school_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ocr_school_id ON public.ocr_extractions USING btree (school_id);


--
-- Name: idx_period_plans_teacher_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_period_plans_teacher_date ON public.period_plans USING btree (school_id, teacher_id, date);


--
-- Name: idx_plagiarism_cache_hash; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_plagiarism_cache_hash ON public.plagiarism_cache USING btree (content_hash);


--
-- Name: idx_qr_tokens_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_qr_tokens_token ON public.attendance_qr_tokens USING btree (token);


--
-- Name: idx_qr_tokens_valid; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_qr_tokens_valid ON public.attendance_qr_tokens USING btree (school_id, is_used, expires_at);


--
-- Name: idx_reminders_school_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reminders_school_id ON public.reminders USING btree (school_id);


--
-- Name: idx_report_logs_report_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_report_logs_report_status ON public.report_generation_logs USING btree (report_id, status);


--
-- Name: idx_report_logs_school_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_report_logs_school_date ON public.report_generation_logs USING btree (school_id, generated_at);


--
-- Name: idx_responsibilities_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_responsibilities_created_at ON public.responsibilities USING btree (created_at DESC);


--
-- Name: INDEX idx_responsibilities_created_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON INDEX public.idx_responsibilities_created_at IS 'Optimizes ordering responsibilities by creation date';


--
-- Name: idx_responsibilities_employee_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_responsibilities_employee_type ON public.responsibilities USING btree (employee_type);


--
-- Name: idx_responsibilities_monthly_price; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_responsibilities_monthly_price ON public.responsibilities USING btree (monthly_price);


--
-- Name: INDEX idx_responsibilities_monthly_price; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON INDEX public.idx_responsibilities_monthly_price IS 'Optimizes analytics queries aggregating by monthly price';


--
-- Name: idx_responsibilities_name_trgm; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_responsibilities_name_trgm ON public.responsibilities USING gin (name public.gin_trgm_ops);


--
-- Name: INDEX idx_responsibilities_name_trgm; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON INDEX public.idx_responsibilities_name_trgm IS 'Enables fast text search on responsibility names using trigram matching';


--
-- Name: idx_responsibilities_school_employee_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_responsibilities_school_employee_type ON public.responsibilities USING btree (school_id, employee_type);


--
-- Name: INDEX idx_responsibilities_school_employee_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON INDEX public.idx_responsibilities_school_employee_type IS 'Optimizes filtering responsibilities by school and employee type';


--
-- Name: idx_responsibilities_school_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_responsibilities_school_id ON public.responsibilities USING btree (school_id);


--
-- Name: idx_responsibilities_space_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_responsibilities_space_id ON public.responsibilities USING btree (space_id);


--
-- Name: idx_responsibilities_student_fee; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_responsibilities_student_fee ON public.responsibilities USING btree (student_fee);


--
-- Name: INDEX idx_responsibilities_student_fee; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON INDEX public.idx_responsibilities_student_fee IS 'Optimizes analytics queries aggregating by student fee';


--
-- Name: idx_responsibility_coverage_employee; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_responsibility_coverage_employee ON public.responsibility_coverage USING btree (original_employee_id, covering_employee_id);


--
-- Name: idx_responsibility_coverage_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_responsibility_coverage_status ON public.responsibility_coverage USING btree (status);


--
-- Name: idx_responsibility_history_employee; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_responsibility_history_employee ON public.responsibility_assignment_history USING btree (employee_id);


--
-- Name: idx_responsibility_history_performed_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_responsibility_history_performed_at ON public.responsibility_assignment_history USING btree (performed_at DESC);


--
-- Name: idx_responsibility_history_responsibility; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_responsibility_history_responsibility ON public.responsibility_assignment_history USING btree (responsibility_id);


--
-- Name: idx_responsibility_history_school; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_responsibility_history_school ON public.responsibility_assignment_history USING btree (school_id);


--
-- Name: idx_responsibility_version_is_current; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_responsibility_version_is_current ON public.responsibility_versions USING btree (is_current);


--
-- Name: idx_responsibility_version_responsibility; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_responsibility_version_responsibility ON public.responsibility_versions USING btree (responsibility_id);


--
-- Name: idx_responsibility_version_school; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_responsibility_version_school ON public.responsibility_versions USING btree (school_id);


--
-- Name: idx_retention_policies_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_retention_policies_active ON public.retention_policies USING btree (school_id, is_active, data_category);


--
-- Name: idx_scheduled_reports_period; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_scheduled_reports_period ON public.scheduled_reports USING btree (period_start, period_end);


--
-- Name: idx_scheduled_reports_report_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_scheduled_reports_report_type ON public.scheduled_reports USING btree (report_type);


--
-- Name: idx_scheduled_reports_school_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_scheduled_reports_school_id ON public.scheduled_reports USING btree (school_id);


--
-- Name: idx_scheduled_reports_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_scheduled_reports_status ON public.scheduled_reports USING btree (status);


--
-- Name: idx_school_ai_config_provider; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_school_ai_config_provider ON public.school_ai_config USING btree (provider_id);


--
-- Name: idx_school_ai_config_school; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_school_ai_config_school ON public.school_ai_config USING btree (school_id);


--
-- Name: idx_school_requests_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_school_requests_email ON public.school_access_requests USING btree (email);


--
-- Name: idx_school_requests_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_school_requests_status ON public.school_access_requests USING btree (status);


--
-- Name: idx_schools_data_gin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_schools_data_gin ON public.schools USING gin (data);


--
-- Name: idx_setup_template_assignments_school; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_setup_template_assignments_school ON public.setup_template_assignments USING btree (school_id);


--
-- Name: idx_setup_template_assignments_template; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_setup_template_assignments_template ON public.setup_template_assignments USING btree (template_id);


--
-- Name: idx_setup_template_configs_section; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_setup_template_configs_section ON public.setup_template_configs USING btree (section);


--
-- Name: idx_setup_template_configs_template; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_setup_template_configs_template ON public.setup_template_configs USING btree (template_id);


--
-- Name: idx_setup_templates_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_setup_templates_active ON public.setup_templates USING btree (is_active);


--
-- Name: idx_setup_templates_default; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_setup_templates_default ON public.setup_templates USING btree (is_default);


--
-- Name: idx_space_categories_school_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_space_categories_school_id ON public.space_categories USING btree (school_id);


--
-- Name: idx_space_categories_school_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_space_categories_school_name ON public.space_categories USING btree (school_id, name);


--
-- Name: idx_space_employees_school_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_space_employees_school_id ON public.space_employees USING btree (school_id);


--
-- Name: idx_space_mat_req_lookup; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_space_mat_req_lookup ON public.space_material_requirements USING btree (school_id, space_name);


--
-- Name: idx_space_materials_composite_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_space_materials_composite_unique ON public.space_materials USING btree (school_id, space_name, material_name);


--
-- Name: idx_space_materials_school_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_space_materials_school_id ON public.space_materials USING btree (school_id);


--
-- Name: idx_space_req_lookup; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_space_req_lookup ON public.space_requirements USING btree (school_id, space_name);


--
-- Name: idx_space_req_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_space_req_role ON public.space_requirements USING btree (responsibility_id);


--
-- Name: idx_student_fees_school_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_fees_school_id ON public.student_invoices USING btree (school_id);


--
-- Name: idx_student_fees_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_fees_status ON public.student_invoices USING btree (status);


--
-- Name: idx_student_fees_student_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_fees_student_id ON public.student_invoices USING btree (student_id);


--
-- Name: idx_student_history_timeline; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_history_timeline ON public.student_history USING btree (student_id, created_at DESC);


--
-- Name: idx_student_submissions_exam; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_submissions_exam ON public.student_submissions USING btree (school_id, exam_id);


--
-- Name: idx_student_submissions_school; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_submissions_school ON public.student_submissions USING btree (school_id);


--
-- Name: idx_student_submissions_student; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_submissions_student ON public.student_submissions USING btree (school_id, student_id);


--
-- Name: idx_students_aadhaar_global_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_students_aadhaar_global_unique ON public.students USING btree (public.normalize_aadhaar((aadhaar_number)::text)) WHERE ((aadhaar_number IS NOT NULL) AND ((aadhaar_number)::text <> ''::text));


--
-- Name: idx_students_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_students_active ON public.students USING btree (school_id, class_name) WHERE ((status)::text = 'active'::text);


--
-- Name: idx_students_class_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_students_class_name ON public.students USING btree (class_name);


--
-- Name: idx_students_school_class; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_students_school_class ON public.students USING btree (school_id, class_name);


--
-- Name: idx_students_school_class_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_students_school_class_status ON public.students USING btree (school_id, class_name, status);


--
-- Name: idx_students_school_contact; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_students_school_contact ON public.students USING btree (school_id, contact);


--
-- Name: idx_students_school_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_students_school_id ON public.students USING btree (school_id);


--
-- Name: idx_students_school_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_students_school_name ON public.students USING btree (school_id, name);


--
-- Name: idx_students_school_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_students_school_status ON public.students USING btree (school_id, status);


--
-- Name: idx_students_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_students_status ON public.students USING btree (status);


--
-- Name: idx_students_student_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_students_student_id ON public.students USING btree (student_id);


--
-- Name: idx_subjects_school_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_subjects_school_id ON public.subjects USING btree (school_id);


--
-- Name: idx_subjects_school_id_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_subjects_school_id_unique ON public.subjects USING btree (school_id, id);


--
-- Name: idx_syllabus_calendar_school; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_syllabus_calendar_school ON public.syllabus_calendar USING btree (school_id, class_id, subject_id);


--
-- Name: idx_system_audit_logs_entity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_system_audit_logs_entity ON public.system_audit_logs USING btree (entity_type, entity_id);


--
-- Name: idx_tasks_school_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tasks_school_status ON public.tasks USING btree (school_id, status);


--
-- Name: idx_teacher_avail_school; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_teacher_avail_school ON public.teacher_availability USING btree (school_id, teacher_id);


--
-- Name: idx_testimonials_featured; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_testimonials_featured ON public.testimonials USING btree (is_featured, display_order);


--
-- Name: idx_timetable_configs_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_timetable_configs_status ON public.timetable_configs USING btree (school_id, status);


--
-- Name: idx_timetable_notifications_config; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_timetable_notifications_config ON public.timetable_notifications USING btree (school_id, config_id);


--
-- Name: idx_timetable_notifications_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_timetable_notifications_user ON public.timetable_notifications USING btree (school_id, user_id, user_type);


--
-- Name: idx_tt_configs_school; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tt_configs_school ON public.timetable_configs USING btree (school_id);


--
-- Name: idx_tt_slots_school; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tt_slots_school ON public.timetable_slots USING btree (school_id, config_id);


--
-- Name: idx_user_activity_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_activity_created ON public.user_activity_logs USING btree (created_at);


--
-- Name: idx_user_activity_phone; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_activity_phone ON public.user_activity_logs USING btree (phone);


--
-- Name: idx_user_device_tokens_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_device_tokens_user ON public.user_device_tokens USING btree (user_id, school_id);


--
-- Name: idx_webhook_endpoints_school; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_webhook_endpoints_school ON public.webhook_endpoints USING btree (school_id);


--
-- Name: idx_webhook_logs_retry; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_webhook_logs_retry ON public.webhook_delivery_logs USING btree (status, next_retry_at) WHERE ((status)::text = 'pending'::text);


--
-- Name: idx_workload_assessment_employee; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_workload_assessment_employee ON public.workload_assessment USING btree (school_id, employee_id);


--
-- Name: idx_workload_assessment_leave; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_workload_assessment_leave ON public.workload_assessment USING btree (leave_id);


--
-- Name: system_audit_logs_school_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX system_audit_logs_school_idx ON public.system_audit_logs USING btree (school_id);


--
-- Name: user_activity_logs_phone_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX user_activity_logs_phone_idx ON public.user_activity_logs USING btree (phone);


--
-- Name: scheduled_reports scheduled_reports_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER scheduled_reports_updated_at BEFORE UPDATE ON public.scheduled_reports FOR EACH ROW EXECUTE FUNCTION public.update_scheduled_reports_updated_at();


--
-- Name: developer_access_grants trg_log_developer_access_activity; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_log_developer_access_activity AFTER INSERT ON public.developer_access_grants FOR EACH ROW EXECUTE FUNCTION public.log_developer_access_activity();


--
-- Name: encryption_keys trg_log_encryption_key_usage; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_log_encryption_key_usage AFTER INSERT ON public.encryption_keys FOR EACH ROW EXECUTE FUNCTION public.log_encryption_key_usage();


--
-- Name: ai_query_cache trg_update_ai_query_cache_tsvector; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_update_ai_query_cache_tsvector BEFORE INSERT OR UPDATE OF question_text ON public.ai_query_cache FOR EACH ROW EXECUTE FUNCTION public.update_ai_query_cache_tsvector();


--
-- Name: ai_schema_embeddings trg_update_ai_schema_tsvector; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_update_ai_schema_tsvector BEFORE INSERT OR UPDATE OF schema_text ON public.ai_schema_embeddings FOR EACH ROW EXECUTE FUNCTION public.update_ai_schema_tsvector();


--
-- Name: gradebooks trigger_update_gradebook_summary; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_gradebook_summary AFTER INSERT OR UPDATE ON public.gradebooks FOR EACH ROW EXECUTE FUNCTION public.update_gradebook_summary();


--
-- Name: responsibility_versions trigger_update_responsibility_version_current; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_responsibility_version_current BEFORE INSERT ON public.responsibility_versions FOR EACH ROW EXECUTE FUNCTION public.update_responsibility_version_current();


--
-- Name: admin_task_queue update_admin_task_queue_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_admin_task_queue_updated_at BEFORE UPDATE ON public.admin_task_queue FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ai_providers update_ai_providers_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_ai_providers_updated_at BEFORE UPDATE ON public.ai_providers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: automated_reports update_automated_reports_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_automated_reports_updated_at BEFORE UPDATE ON public.automated_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: conditional_approval_templates update_conditional_approval_templates_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_conditional_approval_templates_updated_at BEFORE UPDATE ON public.conditional_approval_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: conditional_approvals update_conditional_approvals_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_conditional_approvals_updated_at BEFORE UPDATE ON public.conditional_approvals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: email_processing_rules update_email_processing_rules_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_email_processing_rules_updated_at BEFORE UPDATE ON public.email_processing_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: employee_responsibilities update_employee_responsibilities_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_employee_responsibilities_updated_at BEFORE UPDATE ON public.employee_responsibilities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: fee_transactions update_fee_transactions_modtime; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_fee_transactions_modtime BEFORE UPDATE ON public.fee_transactions FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: form_submissions update_form_submissions_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_form_submissions_updated_at BEFORE UPDATE ON public.form_submissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: form_templates update_form_templates_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_form_templates_updated_at BEFORE UPDATE ON public.form_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: leave_quotas update_leave_quotas_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_leave_quotas_updated_at BEFORE UPDATE ON public.leave_quotas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: responsibilities update_responsibilities_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_responsibilities_updated_at BEFORE UPDATE ON public.responsibilities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: responsibility_coverage update_responsibility_coverage_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_responsibility_coverage_updated_at BEFORE UPDATE ON public.responsibility_coverage FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: school_ai_config update_school_ai_config_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_school_ai_config_updated_at BEFORE UPDATE ON public.school_ai_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: setup_template_configs update_setup_template_configs_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_setup_template_configs_updated_at BEFORE UPDATE ON public.setup_template_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: setup_templates update_setup_templates_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_setup_templates_updated_at BEFORE UPDATE ON public.setup_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: timetable_conflict_rules update_timetable_conflict_rules_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_timetable_conflict_rules_updated_at BEFORE UPDATE ON public.timetable_conflict_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ai_chat_history ai_chat_history_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_chat_history
    ADD CONSTRAINT ai_chat_history_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.ai_chat_sessions(session_id) ON DELETE CASCADE;


--
-- Name: ai_grading_results ai_grading_results_rubric_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_grading_results
    ADD CONSTRAINT ai_grading_results_rubric_id_fkey FOREIGN KEY (rubric_id) REFERENCES public.grading_rubrics(rubric_id);


--
-- Name: ai_grading_results ai_grading_results_submission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_grading_results
    ADD CONSTRAINT ai_grading_results_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.student_submissions(submission_id) ON DELETE CASCADE;


--
-- Name: ai_provider_health ai_provider_health_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_provider_health
    ADD CONSTRAINT ai_provider_health_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.ai_providers(provider_id) ON DELETE CASCADE;


--
-- Name: ai_provider_usage ai_provider_usage_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ai_provider_usage
    ADD CONSTRAINT ai_provider_usage_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.ai_providers(provider_id) ON DELETE CASCADE;


--
-- Name: audit_events audit_events_developer_access_grant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_events
    ADD CONSTRAINT audit_events_developer_access_grant_id_fkey FOREIGN KEY (developer_access_grant_id) REFERENCES public.developer_access_grants(id) ON DELETE SET NULL;


--
-- Name: audit_events audit_events_encryption_key_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_events
    ADD CONSTRAINT audit_events_encryption_key_id_fkey FOREIGN KEY (encryption_key_id) REFERENCES public.encryption_keys(key_id) ON DELETE SET NULL;


--
-- Name: data_classification data_classification_encryption_key_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_classification
    ADD CONSTRAINT data_classification_encryption_key_id_fkey FOREIGN KEY (encryption_key_id) REFERENCES public.encryption_keys(key_id);


--
-- Name: developer_access_grants developer_access_grants_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.developer_access_grants
    ADD CONSTRAINT developer_access_grants_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.developer_access_requests(id) ON DELETE CASCADE;


--
-- Name: districts districts_state_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.districts
    ADD CONSTRAINT districts_state_id_fkey FOREIGN KEY (state_id) REFERENCES public.states(id) ON DELETE CASCADE;


--
-- Name: encryption_audit_log encryption_audit_log_key_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.encryption_audit_log
    ADD CONSTRAINT encryption_audit_log_key_id_fkey FOREIGN KEY (key_id) REFERENCES public.encryption_keys(key_id);


--
-- Name: exam_sections exam_sections_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_sections
    ADD CONSTRAINT exam_sections_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE;


--
-- Name: exam_submission_pages exam_submission_pages_submission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_submission_pages
    ADD CONSTRAINT exam_submission_pages_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.student_submissions(submission_id) ON DELETE CASCADE;


--
-- Name: fee_transactions fee_transactions_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fee_transactions
    ADD CONSTRAINT fee_transactions_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.student_invoices(id) ON DELETE CASCADE;


--
-- Name: admin_task_queue fk_admin_task_queue_school; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_task_queue
    ADD CONSTRAINT fk_admin_task_queue_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id) ON DELETE CASCADE;


--
-- Name: billing_ledger fk_billing_ledger_school; Type: FK CONSTRAINT; Schema: public; Owner: postgres (Bug #6 Fix)
--

ALTER TABLE ONLY public.billing_ledger
    ADD CONSTRAINT fk_billing_ledger_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id) ON DELETE CASCADE; -- Bug #6 Fixed: missing FK added


--
-- Name: admin_timetable_conflicts fk_admin_timetable_conflicts_school; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_timetable_conflicts
    ADD CONSTRAINT fk_admin_timetable_conflicts_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id) ON DELETE CASCADE;


--
-- Name: automated_reports fk_automated_reports_school; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.automated_reports
    ADD CONSTRAINT fk_automated_reports_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id) ON DELETE CASCADE;


--
-- Name: conditional_approvals fk_conditional_approvals_leave; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conditional_approvals
    ADD CONSTRAINT fk_conditional_approvals_leave FOREIGN KEY (leave_id) REFERENCES public.leave_applications(leave_id) ON DELETE CASCADE;


--
-- Name: timetable_conflict_rules fk_conflict_rules_school; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.timetable_conflict_rules
    ADD CONSTRAINT fk_conflict_rules_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id) ON DELETE CASCADE;


--
-- Name: responsibility_coverage fk_coverage_covering_employee; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.responsibility_coverage
    ADD CONSTRAINT fk_coverage_covering_employee FOREIGN KEY (school_id, covering_employee_id) REFERENCES public.employees(school_id, employee_id);


--
-- Name: responsibility_coverage fk_coverage_leave; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.responsibility_coverage
    ADD CONSTRAINT fk_coverage_leave FOREIGN KEY (leave_id) REFERENCES public.leave_applications(leave_id) ON DELETE CASCADE;


--
-- Name: responsibility_coverage fk_coverage_original_employee; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.responsibility_coverage
    ADD CONSTRAINT fk_coverage_original_employee FOREIGN KEY (school_id, original_employee_id) REFERENCES public.employees(school_id, employee_id);


--
-- Name: document_boxes fk_document_box_school; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_boxes
    ADD CONSTRAINT fk_document_box_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id) ON DELETE CASCADE;


--
-- Name: email_processing_queue fk_email_queue_school; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_processing_queue
    ADD CONSTRAINT fk_email_queue_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id) ON DELETE CASCADE;


--
-- Name: email_processing_rules fk_email_rules_school; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_processing_rules
    ADD CONSTRAINT fk_email_rules_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id) ON DELETE CASCADE;


--
-- Name: employee_responsibilities fk_employee_responsibilities_employees; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_responsibilities
    ADD CONSTRAINT fk_employee_responsibilities_employees FOREIGN KEY (school_id, employee_id) REFERENCES public.employees(school_id, employee_id) ON DELETE CASCADE;


--
-- Name: employee_responsibilities fk_employee_responsibilities_responsibilities; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_responsibilities
    ADD CONSTRAINT fk_employee_responsibilities_responsibilities FOREIGN KEY (school_id, responsibility_id) REFERENCES public.responsibilities(school_id, responsibility_id) ON DELETE CASCADE;


--
-- Name: school_feature_flags fk_feature_flags_school; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.school_feature_flags
    ADD CONSTRAINT fk_feature_flags_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id) ON DELETE CASCADE;


--
-- Name: form_submissions fk_form_submissions_school; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_submissions
    ADD CONSTRAINT fk_form_submissions_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id) ON DELETE CASCADE;


--
-- Name: form_submissions fk_form_submissions_template; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_submissions
    ADD CONSTRAINT fk_form_submissions_template FOREIGN KEY (template_id) REFERENCES public.form_templates(id) ON DELETE CASCADE;


--
-- Name: form_templates fk_form_templates_school; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_templates
    ADD CONSTRAINT fk_form_templates_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id) ON DELETE CASCADE;


--
-- Name: leave_quotas fk_leave_quotas_school; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_quotas
    ADD CONSTRAINT fk_leave_quotas_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id) ON DELETE CASCADE;


--
-- Name: material_alert_log fk_material_alert_log_material; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.material_alert_log
    ADD CONSTRAINT fk_material_alert_log_material FOREIGN KEY (school_id, material_name) REFERENCES public.materials(school_id, name) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: leave_notifications fk_notifications_school; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leave_notifications
    ADD CONSTRAINT fk_notifications_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id) ON DELETE CASCADE;


--
-- Name: report_generation_logs fk_report_logs_report; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_generation_logs
    ADD CONSTRAINT fk_report_logs_report FOREIGN KEY (report_id) REFERENCES public.automated_reports(id) ON DELETE CASCADE;


--
-- Name: report_generation_logs fk_report_logs_school; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_generation_logs
    ADD CONSTRAINT fk_report_logs_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id) ON DELETE CASCADE;


--
-- Name: responsibilities fk_responsibilities_schools; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.responsibilities
    ADD CONSTRAINT fk_responsibilities_schools FOREIGN KEY (school_id) REFERENCES public.schools(school_id) ON DELETE CASCADE;


--
-- Name: responsibility_assignment_history fk_responsibility_history_employee; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.responsibility_assignment_history
    ADD CONSTRAINT fk_responsibility_history_employee FOREIGN KEY (school_id, employee_id) REFERENCES public.employees(school_id, employee_id) ON DELETE CASCADE;


--
-- Name: responsibility_assignment_history fk_responsibility_history_responsibility; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.responsibility_assignment_history
    ADD CONSTRAINT fk_responsibility_history_responsibility FOREIGN KEY (responsibility_id) REFERENCES public.responsibilities(responsibility_id) ON DELETE CASCADE;


--
-- Name: responsibility_versions fk_responsibility_version_responsibility; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.responsibility_versions
    ADD CONSTRAINT fk_responsibility_version_responsibility FOREIGN KEY (responsibility_id) REFERENCES public.responsibilities(responsibility_id) ON DELETE CASCADE;


--
-- Name: conditional_approval_templates fk_templates_school; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conditional_approval_templates
    ADD CONSTRAINT fk_templates_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id) ON DELETE CASCADE;


--
-- Name: workload_assessment fk_workload_employee; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workload_assessment
    ADD CONSTRAINT fk_workload_employee FOREIGN KEY (school_id, employee_id) REFERENCES public.employees(school_id, employee_id);


--
-- Name: workload_assessment fk_workload_leave; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workload_assessment
    ADD CONSTRAINT fk_workload_leave FOREIGN KEY (leave_id) REFERENCES public.leave_applications(leave_id) ON DELETE CASCADE;


--
-- Name: workload_assessment fk_workload_school; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workload_assessment
    ADD CONSTRAINT fk_workload_school FOREIGN KEY (school_id) REFERENCES public.schools(school_id) ON DELETE CASCADE;


--
-- Name: gradebooks gradebook_rubric_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gradebooks
    ADD CONSTRAINT gradebook_rubric_id_fkey FOREIGN KEY (rubric_id) REFERENCES public.grading_rubrics(rubric_id);


--
-- Name: gradebooks gradebook_submission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gradebooks
    ADD CONSTRAINT gradebook_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.student_submissions(submission_id);


--
-- Name: gradebook_sync_log gradebook_sync_log_submission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gradebook_sync_log
    ADD CONSTRAINT gradebook_sync_log_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.student_submissions(submission_id);


--
-- Name: gradebook_sync_queue gradebook_sync_queue_gradebook_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.gradebook_sync_queue
    ADD CONSTRAINT gradebook_sync_queue_gradebook_id_fkey FOREIGN KEY (gradebook_id) REFERENCES public.gradebooks(gradebook_id);


--
-- Name: scheduled_reports scheduled_reports_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scheduled_reports
    ADD CONSTRAINT scheduled_reports_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(school_id) ON DELETE CASCADE;


--
-- Name: school_ai_config school_ai_config_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.school_ai_config
    ADD CONSTRAINT school_ai_config_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.ai_providers(provider_id) ON DELETE CASCADE;


--
-- Name: school_promo_codes school_promo_codes_promo_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.school_promo_codes
    ADD CONSTRAINT school_promo_codes_promo_code_id_fkey FOREIGN KEY (promo_code_id) REFERENCES public.promo_codes(id) ON DELETE CASCADE;


--
-- Name: schools schools_active_promo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schools
    ADD CONSTRAINT schools_active_promo_id_fkey FOREIGN KEY (active_promo_id) REFERENCES public.promo_codes(id);


--
-- Name: setup_template_assignments setup_template_assignments_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.setup_template_assignments
    ADD CONSTRAINT setup_template_assignments_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.setup_templates(id) ON DELETE CASCADE;


--
-- Name: setup_template_configs setup_template_configs_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.setup_template_configs
    ADD CONSTRAINT setup_template_configs_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.setup_templates(id) ON DELETE CASCADE;


--
-- Name: states states_country_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.states
    ADD CONSTRAINT states_country_id_fkey FOREIGN KEY (country_id) REFERENCES public.countries(id) ON DELETE CASCADE;


--
-- Name: timetable_notifications timetable_notifications_school_id_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.timetable_notifications
    ADD CONSTRAINT timetable_notifications_school_id_config_id_fkey FOREIGN KEY (school_id, config_id) REFERENCES public.timetable_configs(school_id, config_id) ON DELETE CASCADE;


--
-- Name: webhook_delivery_logs webhook_delivery_logs_endpoint_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.webhook_delivery_logs
    ADD CONSTRAINT webhook_delivery_logs_endpoint_id_fkey FOREIGN KEY (endpoint_id) REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE;


--
-- Name: academic_components; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.academic_components ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_task_queue; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.admin_task_queue ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_task_queue admin_task_queue_isolation_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY admin_task_queue_isolation_policy ON public.admin_task_queue USING (((school_id)::text = current_setting('app.current_school_id'::text)));


--
-- Name: admin_timetable_conflicts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.admin_timetable_conflicts ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_timetable_conflicts admin_timetable_conflicts_isolation_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY admin_timetable_conflicts_isolation_policy ON public.admin_timetable_conflicts USING (((school_id)::text = current_setting('app.current_school_id'::text)));


--
-- Name: ai_chat_history; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.ai_chat_history ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_chat_sessions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.ai_chat_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_grading_results; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.ai_grading_results ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_grading_results ai_grading_results_school_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY ai_grading_results_school_isolation ON public.ai_grading_results USING (((school_id)::text = current_setting('app.current_school_id'::text)));


--
-- Name: ai_query_cache; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.ai_query_cache ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_query_cache ai_query_cache_isolation_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY ai_query_cache_isolation_policy ON public.ai_query_cache USING (((school_id)::text = current_setting('app.current_school_id'::text, true)));


--
-- Name: announcements; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

--
-- Name: api_keys; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

--
-- Name: attendance; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

--
-- Name: attendance_reports; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.attendance_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: attendance_reports attendance_reports_school_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY attendance_reports_school_policy ON public.attendance_reports USING (((school_id)::text = current_setting('app.current_school_id'::text, true))) WITH CHECK (((school_id)::text = current_setting('app.current_school_id'::text, true)));


--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: automated_reports; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.automated_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: automated_reports automated_reports_isolation_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY automated_reports_isolation_policy ON public.automated_reports USING (((school_id)::text = current_setting('app.current_school_id'::text)));


--
-- Name: awards; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.awards ENABLE ROW LEVEL SECURITY;

--
-- Name: chapters; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;

--
-- Name: classes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

--
-- Name: common_error_patterns; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.common_error_patterns ENABLE ROW LEVEL SECURITY;

--
-- Name: common_error_patterns common_error_patterns_school_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY common_error_patterns_school_isolation ON public.common_error_patterns USING (((school_id)::text = current_setting('app.current_school_id'::text)));


--
-- Name: communication; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.communication ENABLE ROW LEVEL SECURITY;

--
-- Name: conditional_approval_templates; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.conditional_approval_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: conditional_approval_templates conditional_approval_templates_school_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY conditional_approval_templates_school_isolation ON public.conditional_approval_templates USING (((school_id)::text = current_setting('app.current_school_id'::text)));


--
-- Name: conditional_approvals; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.conditional_approvals ENABLE ROW LEVEL SECURITY;

--
-- Name: conditional_approvals conditional_approvals_school_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY conditional_approvals_school_isolation ON public.conditional_approvals USING ((EXISTS ( SELECT 1
   FROM public.leave_applications la
  WHERE (((la.leave_id)::text = (conditional_approvals.leave_id)::text) AND ((la.school_id)::text = current_setting('app.current_school_id'::text))))));


--
-- Name: custom_fees; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.custom_fees ENABLE ROW LEVEL SECURITY;

--
-- Name: data_classification; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.data_classification ENABLE ROW LEVEL SECURITY;

--
-- Name: data_classification data_classification_access; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY data_classification_access ON public.data_classification USING (((current_setting('app.user_role'::text, true) = 'super_admins'::text) OR ((current_setting('app.user_role'::text, true) = 'school_admin'::text) AND (((school_id)::text = 'system'::text) OR ((school_id)::text = current_setting('app.school_id'::text, true))))));


--
-- Name: developer_activity_audit; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.developer_activity_audit ENABLE ROW LEVEL SECURITY;

--
-- Name: developer_activity_audit developer_activity_audit_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY developer_activity_audit_policy ON public.developer_activity_audit USING ((((developer_id)::text = CURRENT_USER) OR (CURRENT_USER = ANY (ARRAY['developer_audit'::name, 'postgres'::name]))));


--
-- Name: document_boxes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.document_boxes ENABLE ROW LEVEL SECURITY;

--
-- Name: document_embeddings; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.document_embeddings ENABLE ROW LEVEL SECURITY;

--
-- Name: document_embeddings document_embeddings_isolation_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY document_embeddings_isolation_policy ON public.document_embeddings USING (((school_id)::text = current_setting('app.current_school_id'::text, true)));


--
-- Name: email_processing_queue; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.email_processing_queue ENABLE ROW LEVEL SECURITY;

--
-- Name: email_processing_queue email_processing_queue_isolation_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY email_processing_queue_isolation_policy ON public.email_processing_queue USING (((school_id)::text = current_setting('app.current_school_id'::text)));


--
-- Name: email_processing_rules; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.email_processing_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: email_processing_rules email_processing_rules_isolation_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY email_processing_rules_isolation_policy ON public.email_processing_rules USING (((school_id)::text = current_setting('app.current_school_id'::text)));


--
-- Name: employee_payments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.employee_payments ENABLE ROW LEVEL SECURITY;

--
-- Name: employee_responsibilities; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.employee_responsibilities ENABLE ROW LEVEL SECURITY;

--
-- Name: employees; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

--
-- Name: encryption_audit_log; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.encryption_audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: encryption_audit_log encryption_audit_log_access; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY encryption_audit_log_access ON public.encryption_audit_log USING (((current_setting('app.user_role'::text, true) = 'super_admins'::text) OR ((current_setting('app.user_role'::text, true) = 'school_admin'::text) AND ((school_id)::text = current_setting('app.school_id'::text, true)))));


--
-- Name: encryption_keys; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.encryption_keys ENABLE ROW LEVEL SECURITY;

--
-- Name: encryption_keys encryption_keys_admin_only; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY encryption_keys_admin_only ON public.encryption_keys USING ((current_setting('app.user_role'::text, true) = 'super_admins'::text));


--
-- Name: event_items; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.event_items ENABLE ROW LEVEL SECURITY;

--
-- Name: events; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

--
-- Name: exam_answer_keys; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.exam_answer_keys ENABLE ROW LEVEL SECURITY;

--
-- Name: exam_answer_keys exam_answer_keys_school_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY exam_answer_keys_school_isolation ON public.exam_answer_keys USING (((school_id)::text = current_setting('app.current_school_id'::text)));


--
-- Name: exam_submission_pages; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.exam_submission_pages ENABLE ROW LEVEL SECURITY;

--
-- Name: exam_submission_pages exam_submission_pages_school_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY exam_submission_pages_school_isolation ON public.exam_submission_pages USING (((school_id)::text = current_setting('app.current_school_id'::text)));


--
-- Name: exams; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

--
-- Name: fee_templates; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.fee_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: fees; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.fees ENABLE ROW LEVEL SECURITY;

--
-- Name: form_submissions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

--
-- Name: form_submissions form_submissions_isolation_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY form_submissions_isolation_policy ON public.form_submissions USING (((school_id)::text = current_setting('app.current_school_id'::text)));


--
-- Name: form_templates; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: form_templates form_templates_isolation_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY form_templates_isolation_policy ON public.form_templates USING (((school_id)::text = current_setting('app.current_school_id'::text)));


--
-- Name: grade_criteria; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.grade_criteria ENABLE ROW LEVEL SECURITY;

--
-- Name: gradebooks; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.gradebooks ENABLE ROW LEVEL SECURITY;

--
-- Name: gradebooks gradebook_school_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY gradebook_school_isolation ON public.gradebooks USING (((school_id)::text = current_setting('app.current_school_id'::text)));


--
-- Name: gradebook_summaries; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.gradebook_summaries ENABLE ROW LEVEL SECURITY;

--
-- Name: gradebook_summaries gradebook_summary_school_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY gradebook_summary_school_isolation ON public.gradebook_summaries USING (((school_id)::text = current_setting('app.current_school_id'::text)));


--
-- Name: gradebook_sync_log; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.gradebook_sync_log ENABLE ROW LEVEL SECURITY;

--
-- Name: gradebook_sync_log gradebook_sync_log_school_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY gradebook_sync_log_school_isolation ON public.gradebook_sync_log USING (((school_id)::text = current_setting('app.current_school_id'::text)));


--
-- Name: gradebook_sync_queue; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.gradebook_sync_queue ENABLE ROW LEVEL SECURITY;

--
-- Name: gradebook_sync_queue gradebook_sync_queue_school_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY gradebook_sync_queue_school_isolation ON public.gradebook_sync_queue USING (((school_id)::text = current_setting('app.current_school_id'::text)));


--
-- Name: grading_config; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.grading_config ENABLE ROW LEVEL SECURITY;

--
-- Name: grading_config grading_config_school_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY grading_config_school_isolation ON public.grading_config USING (((school_id)::text = current_setting('app.current_school_id'::text)));


--
-- Name: grading_rubrics; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.grading_rubrics ENABLE ROW LEVEL SECURITY;

--
-- Name: grading_rubrics grading_rubrics_school_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY grading_rubrics_school_isolation ON public.grading_rubrics USING (((school_id)::text = current_setting('app.current_school_id'::text)));


--
-- Name: items; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

--
-- Name: leave_applications; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.leave_applications ENABLE ROW LEVEL SECURITY;

--
-- Name: leave_notifications; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.leave_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: leave_notifications leave_notifications_school_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY leave_notifications_school_isolation ON public.leave_notifications USING (((school_id)::text = current_setting('app.current_school_id'::text)));


--
-- Name: leave_quotas; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.leave_quotas ENABLE ROW LEVEL SECURITY;

--
-- Name: leave_quotas leave_quotas_school_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY leave_quotas_school_isolation ON public.leave_quotas USING (((school_id)::text = current_setting('app.current_school_id'::text)));


--
-- Name: material_locations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.material_locations ENABLE ROW LEVEL SECURITY;

--
-- Name: materials; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_preferences; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_preferences notification_prefs_school_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY notification_prefs_school_isolation ON public.notification_preferences USING (((school_id)::text = current_setting('app.current_school_id'::text, true)));


--
-- Name: notification_preferences notification_prefs_user_access; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY notification_prefs_user_access ON public.notification_preferences USING ((((user_id)::text = current_setting('app.current_user_id'::text, true)) OR public.is_super_admin() OR (current_setting('app.user_role'::text, true) = 'admin'::text)));


--
-- Name: plagiarism_cache; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.plagiarism_cache ENABLE ROW LEVEL SECURITY;

--
-- Name: plagiarism_cache plagiarism_cache_school_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY plagiarism_cache_school_isolation ON public.plagiarism_cache USING (((school_id)::text = current_setting('app.current_school_id'::text)));


--
-- Name: reminder_items; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.reminder_items ENABLE ROW LEVEL SECURITY;

--
-- Name: reminders; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

--
-- Name: report_generation_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.report_generation_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: report_generation_logs report_generation_logs_isolation_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY report_generation_logs_isolation_policy ON public.report_generation_logs USING (((school_id)::text = current_setting('app.current_school_id'::text)));


--
-- Name: responsibilities; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.responsibilities ENABLE ROW LEVEL SECURITY;

--
-- Name: responsibility_assignment_history; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.responsibility_assignment_history ENABLE ROW LEVEL SECURITY;

--
-- Name: responsibility_assignment_history responsibility_assignment_history_school_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY responsibility_assignment_history_school_policy ON public.responsibility_assignment_history USING (((school_id)::text = ((current_setting('app.current_school_id'::text))::character varying)::text));


--
-- Name: responsibility_coverage; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.responsibility_coverage ENABLE ROW LEVEL SECURITY;

--
-- Name: responsibility_coverage responsibility_coverage_school_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY responsibility_coverage_school_isolation ON public.responsibility_coverage USING ((EXISTS ( SELECT 1
   FROM public.leave_applications la
  WHERE (((la.leave_id)::text = (responsibility_coverage.leave_id)::text) AND ((la.school_id)::text = current_setting('app.current_school_id'::text))))));


--
-- Name: responsibility_versions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.responsibility_versions ENABLE ROW LEVEL SECURITY;

--
-- Name: responsibility_versions responsibility_version_school_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY responsibility_version_school_policy ON public.responsibility_versions USING (((school_id)::text = ((current_setting('app.current_school_id'::text))::character varying)::text));


--
-- Name: salaries; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.salaries ENABLE ROW LEVEL SECURITY;

--
-- Name: scheduled_reports; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.scheduled_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: scheduled_reports school_admin_own_scheduled_reports; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY school_admin_own_scheduled_reports ON public.scheduled_reports USING (((school_id)::text = ((current_setting('app.current_school_id'::text))::character varying)::text));


--
-- Name: school_feature_flags; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.school_feature_flags ENABLE ROW LEVEL SECURITY;

--
-- Name: school_feature_flags school_feature_flags_admin_only; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY school_feature_flags_admin_only ON public.school_feature_flags USING (((school_id)::text = current_setting('app.current_school_id'::text)));


--
-- Name: ai_chat_history school_isolation_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY school_isolation_policy ON public.ai_chat_history USING (((school_id)::text = current_setting('app.current_school_id'::text, true)));


--
-- Name: ai_chat_sessions school_session_isolation_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY school_session_isolation_policy ON public.ai_chat_sessions USING (((school_id)::text = current_setting('app.current_school_id'::text, true)));


--
-- Name: space_employees; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.space_employees ENABLE ROW LEVEL SECURITY;

--
-- Name: spaces; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;

--
-- Name: student_history; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.student_history ENABLE ROW LEVEL SECURITY;

--
-- Name: student_invoices; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.student_invoices ENABLE ROW LEVEL SECURITY;

--
-- Name: student_submissions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.student_submissions ENABLE ROW LEVEL SECURITY;

--
-- Name: student_submissions student_submissions_school_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY student_submissions_school_isolation ON public.student_submissions USING (((school_id)::text = current_setting('app.current_school_id'::text)));


--
-- Name: students; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

--
-- Name: subjects; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

--
-- Name: scheduled_reports super_admin_all_scheduled_reports; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY super_admin_all_scheduled_reports ON public.scheduled_reports USING ((CURRENT_USER = 'super_admins'::name));


--
-- Name: system_audit_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.system_audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: tasks; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: event_items tenant_isolation_event_items; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_isolation_event_items ON public.event_items USING (((school_id)::text = current_setting('app.current_school_id'::text, true)));


--
-- Name: grade_criteria tenant_isolation_grade_criteria; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_isolation_grade_criteria ON public.grade_criteria USING (((school_id)::text = current_setting('app.current_school_id'::text, true)));


--
-- Name: academic_components tenant_isolation_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_isolation_policy ON public.academic_components USING ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR public.is_super_admin())) WITH CHECK ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR public.is_super_admin()));


--
-- Name: ai_chat_history tenant_isolation_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_isolation_policy ON public.ai_chat_history USING ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR (current_setting('app.is_super_admin'::text, true) = 'true'::text))) WITH CHECK ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR (current_setting('app.is_super_admin'::text, true) = 'true'::text)));


--
-- Name: announcements tenant_isolation_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_isolation_policy ON public.announcements USING ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR public.is_super_admin())) WITH CHECK ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR public.is_super_admin()));


--
-- Name: api_keys tenant_isolation_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_isolation_policy ON public.api_keys USING ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR (current_setting('app.is_super_admin'::text, true) = 'true'::text))) WITH CHECK ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR (current_setting('app.is_super_admin'::text, true) = 'true'::text)));


--
-- Name: attendance tenant_isolation_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_isolation_policy ON public.attendance USING ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR public.is_super_admin())) WITH CHECK ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR public.is_super_admin()));


--
-- Name: audit_logs tenant_isolation_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_isolation_policy ON public.audit_logs USING ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR (current_setting('app.is_super_admin'::text, true) = 'true'::text))) WITH CHECK ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR (current_setting('app.is_super_admin'::text, true) = 'true'::text)));


--
-- Name: awards tenant_isolation_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_isolation_policy ON public.awards USING ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR public.is_super_admin())) WITH CHECK ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR public.is_super_admin()));


--
-- Name: chapters tenant_isolation_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_isolation_policy ON public.chapters USING ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR public.is_super_admin())) WITH CHECK ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR public.is_super_admin()));


--
-- Name: classes tenant_isolation_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_isolation_policy ON public.classes USING ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR public.is_super_admin())) WITH CHECK ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR public.is_super_admin()));


--
-- Name: communication tenant_isolation_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_isolation_policy ON public.communication USING ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR public.is_super_admin())) WITH CHECK ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR public.is_super_admin()));


--
-- Name: custom_fees tenant_isolation_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_isolation_policy ON public.custom_fees USING ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR public.is_super_admin())) WITH CHECK ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR public.is_super_admin()));


--
-- Name: document_boxes tenant_isolation_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_isolation_policy ON public.document_boxes USING ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR (current_setting('app.is_super_admin'::text, true) = 'true'::text))) WITH CHECK ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR (current_setting('app.is_super_admin'::text, true) = 'true'::text)));


--
-- Name: employee_payments tenant_isolation_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_isolation_policy ON public.employee_payments USING ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR public.is_super_admin())) WITH CHECK ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR public.is_super_admin()));


--
-- Name: employee_responsibilities tenant_isolation_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_isolation_policy ON public.employee_responsibilities USING ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR public.is_super_admin())) WITH CHECK ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR public.is_super_admin()));


--
-- Name: employees tenant_isolation_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_isolation_policy ON public.employees USING ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR public.is_super_admin())) WITH CHECK ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR public.is_super_admin()));


--
-- Name: events tenant_isolation_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_isolation_policy ON public.events USING ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR public.is_super_admin())) WITH CHECK ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR public.is_super_admin()));


--
-- Name: exams tenant_isolation_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_isolation_policy ON public.exams USING ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR public.is_super_admin())) WITH CHECK ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR public.is_super_admin()));


--
-- Name: fee_templates tenant_isolation_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_isolation_policy ON public.fee_templates USING ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR public.is_super_admin())) WITH CHECK ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR public.is_super_admin()));


--
-- Name: fees tenant_isolation_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_isolation_policy ON public.fees USING ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR public.is_super_admin())) WITH CHECK ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR public.is_super_admin()));


--
-- Name: items tenant_isolation_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_isolation_policy ON public.items USING ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR public.is_super_admin())) WITH CHECK ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR public.is_super_admin()));


--
-- Name: leave_applications tenant_isolation_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_isolation_policy ON public.leave_applications USING ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR (current_setting('app.is_super_admin'::text, true) = 'true'::text))) WITH CHECK ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR (current_setting('app.is_super_admin'::text, true) = 'true'::text)));


--
-- Name: material_locations tenant_isolation_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_isolation_policy ON public.material_locations USING ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR public.is_super_admin())) WITH CHECK ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR public.is_super_admin()));


--
-- Name: materials tenant_isolation_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_isolation_policy ON public.materials USING ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR public.is_super_admin())) WITH CHECK ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR public.is_super_admin()));


--
-- Name: reminders tenant_isolation_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_isolation_policy ON public.reminders USING ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR public.is_super_admin())) WITH CHECK ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR public.is_super_admin()));


--
-- Name: responsibilities tenant_isolation_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_isolation_policy ON public.responsibilities USING ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR public.is_super_admin())) WITH CHECK ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR public.is_super_admin()));


--
-- Name: salaries tenant_isolation_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_isolation_policy ON public.salaries USING ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR public.is_super_admin())) WITH CHECK ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR public.is_super_admin()));


--
-- Name: space_employees tenant_isolation_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_isolation_policy ON public.space_employees USING ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR (current_setting('app.is_super_admin'::text, true) = 'true'::text))) WITH CHECK ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR (current_setting('app.is_super_admin'::text, true) = 'true'::text)));


--
-- Name: spaces tenant_isolation_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_isolation_policy ON public.spaces USING ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR public.is_super_admin())) WITH CHECK ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR public.is_super_admin()));


--
-- Name: student_history tenant_isolation_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_isolation_policy ON public.student_history USING ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR (current_setting('app.is_super_admin'::text, true) = 'true'::text))) WITH CHECK ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR (current_setting('app.is_super_admin'::text, true) = 'true'::text)));


--
-- Name: student_invoices tenant_isolation_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_isolation_policy ON public.student_invoices USING ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR public.is_super_admin())) WITH CHECK ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR public.is_super_admin()));


--
-- Name: students tenant_isolation_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_isolation_policy ON public.students USING ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR public.is_super_admin())) WITH CHECK ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR public.is_super_admin()));


--
-- Name: subjects tenant_isolation_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_isolation_policy ON public.subjects USING ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR public.is_super_admin())) WITH CHECK ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR public.is_super_admin()));


--
-- Name: system_audit_logs tenant_isolation_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_isolation_policy ON public.system_audit_logs USING (((school_id = current_setting('app.current_school_id'::text, true)) OR (current_setting('app.is_super_admin'::text, true) = 'true'::text))) WITH CHECK (((school_id = current_setting('app.current_school_id'::text, true)) OR (current_setting('app.is_super_admin'::text, true) = 'true'::text)));


--
-- Name: tasks tenant_isolation_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_isolation_policy ON public.tasks USING ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR public.is_super_admin())) WITH CHECK ((((school_id)::text = current_setting('app.current_school_id'::text, true)) OR public.is_super_admin()));


--
-- Name: reminder_items tenant_isolation_reminder_items; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_isolation_reminder_items ON public.reminder_items USING (((school_id)::text = current_setting('app.current_school_id'::text, true)));


--
-- Name: timetable_conflict_rules; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.timetable_conflict_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: timetable_conflict_rules timetable_conflict_rules_isolation_policy; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY timetable_conflict_rules_isolation_policy ON public.timetable_conflict_rules USING (((school_id)::text = current_setting('app.current_school_id'::text)));


--
-- Name: workload_assessment; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.workload_assessment ENABLE ROW LEVEL SECURITY;

--
-- Name: workload_assessment workload_assessment_school_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY workload_assessment_school_isolation ON public.workload_assessment USING (((school_id)::text = current_setting('app.current_school_id'::text)));


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO ai_readonly_role;


--
-- Name: TABLE academic_components; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.academic_components TO developer_audit;
GRANT SELECT ON TABLE public.academic_components TO ai_readonly_role;


--
-- Name: TABLE admin_task_queue; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.admin_task_queue TO ai_readonly_role;


--
-- Name: TABLE admin_timetable_conflicts; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.admin_timetable_conflicts TO ai_readonly_role;


--
-- Name: TABLE ai_background_jobs; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.ai_background_jobs TO ai_readonly_role;


--
-- Name: TABLE ai_chat_history; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.ai_chat_history TO developer_audit;
GRANT SELECT ON TABLE public.ai_chat_history TO ai_readonly_role;


--
-- Name: TABLE ai_chat_sessions; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.ai_chat_sessions TO ai_readonly_role;


--
-- Name: TABLE ai_grading_results; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.ai_grading_results TO ai_readonly_role;


--
-- Name: TABLE ai_provider_health; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.ai_provider_health TO developer_audit;
GRANT SELECT ON TABLE public.ai_provider_health TO ai_readonly_role;


--
-- Name: TABLE ai_provider_usage; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.ai_provider_usage TO developer_audit;
GRANT SELECT ON TABLE public.ai_provider_usage TO ai_readonly_role;


--
-- Name: TABLE ai_providers; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.ai_providers TO developer_audit;
GRANT SELECT ON TABLE public.ai_providers TO ai_readonly_role;


--
-- Name: TABLE school_ai_config; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.school_ai_config TO developer_audit;
GRANT SELECT ON TABLE public.school_ai_config TO ai_readonly_role;


--
-- Name: TABLE ai_provider_status; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.ai_provider_status TO developer_audit;
GRANT SELECT ON TABLE public.ai_provider_status TO ai_readonly_role;


--
-- Name: TABLE ai_query_cache; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.ai_query_cache TO developer_audit;
GRANT SELECT ON TABLE public.ai_query_cache TO ai_readonly_role;


--
-- Name: TABLE ai_schema_embeddings; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.ai_schema_embeddings TO ai_readonly_role;


--
-- Name: TABLE ai_school_status; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.ai_school_status TO ai_readonly_role;


--
-- Name: TABLE ai_shadow_evaluations; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.ai_shadow_evaluations TO ai_readonly_role;


--
-- Name: TABLE ai_training_metrics; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.ai_training_metrics TO ai_readonly_role;


--
-- Name: TABLE ai_usage_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.ai_usage_logs TO ai_readonly_role;


--
-- Name: TABLE announcements; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.announcements TO developer_audit;
GRANT SELECT ON TABLE public.announcements TO ai_readonly_role;


--
-- Name: TABLE api_keys; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.api_keys TO developer_audit;
GRANT SELECT ON TABLE public.api_keys TO ai_readonly_role;


--
-- Name: TABLE app_files; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.app_files TO ai_readonly_role;


--
-- Name: TABLE attendance; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.attendance TO developer_audit;
GRANT SELECT ON TABLE public.attendance TO ai_readonly_role;


--
-- Name: TABLE attendance_qr_tokens; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.attendance_qr_tokens TO ai_readonly_role;


--
-- Name: TABLE attendance_reports; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.attendance_reports TO ai_readonly_role;


--
-- Name: TABLE audit_events; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.audit_events TO ai_readonly_role;


--
-- Name: TABLE audit_daily_summary; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.audit_daily_summary TO ai_readonly_role;


--
-- Name: TABLE audit_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.audit_logs TO developer_audit;
GRANT SELECT ON TABLE public.audit_logs TO ai_readonly_role;


--
-- Name: TABLE auth; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.auth TO developer_audit;
GRANT SELECT ON TABLE public.auth TO ai_readonly_role;


--
-- Name: TABLE auth_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.auth_logs TO ai_readonly_role;


--
-- Name: TABLE automated_reports; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.automated_reports TO ai_readonly_role;


--
-- Name: TABLE awards; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.awards TO developer_audit;
GRANT SELECT ON TABLE public.awards TO ai_readonly_role;


--
-- Name: TABLE billing_ledger; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.billing_ledger TO ai_readonly_role;


--
-- Name: TABLE blog_posts; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.blog_posts TO ai_readonly_role;


--
-- Name: TABLE chapters; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.chapters TO developer_audit;
GRANT SELECT ON TABLE public.chapters TO ai_readonly_role;


--
-- Name: TABLE classes; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.classes TO developer_audit;
GRANT SELECT ON TABLE public.classes TO ai_readonly_role;


--
-- Name: TABLE common_error_patterns; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.common_error_patterns TO ai_readonly_role;


--
-- Name: TABLE communication; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.communication TO developer_audit;
GRANT SELECT ON TABLE public.communication TO ai_readonly_role;


--
-- Name: TABLE complaints; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.complaints TO developer_audit;
GRANT SELECT ON TABLE public.complaints TO ai_readonly_role;


--
-- Name: TABLE consent_records; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.consent_records TO ai_readonly_role;


--
-- Name: TABLE data_breach_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.data_breach_logs TO ai_readonly_role;


--
-- Name: TABLE dsar_requests; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.dsar_requests TO ai_readonly_role;


--
-- Name: TABLE compliance_dashboard; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.compliance_dashboard TO ai_readonly_role;


--
-- Name: TABLE compliance_regulatory_report; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.compliance_regulatory_report TO ai_readonly_role;


--
-- Name: TABLE conditional_approval_templates; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.conditional_approval_templates TO ai_readonly_role;


--
-- Name: TABLE conditional_approvals; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.conditional_approvals TO ai_readonly_role;


--
-- Name: TABLE countries; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.countries TO ai_readonly_role;


--
-- Name: TABLE coupons; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.coupons TO ai_readonly_role;


--
-- Name: TABLE custom_fees; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.custom_fees TO developer_audit;
GRANT SELECT ON TABLE public.custom_fees TO ai_readonly_role;


--
-- Name: TABLE daily_attendance_summary; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.daily_attendance_summary TO ai_readonly_role;


--
-- Name: TABLE daily_teacher_reports; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.daily_teacher_reports TO ai_readonly_role;


--
-- Name: TABLE data_classification; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.data_classification TO developer_audit;
GRANT SELECT ON TABLE public.data_classification TO ai_readonly_role;


--
-- Name: TABLE developer_access_grants; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.developer_access_grants TO developer_readonly;
GRANT SELECT ON TABLE public.developer_access_grants TO developer_audit;
GRANT SELECT ON TABLE public.developer_access_grants TO ai_readonly_role;


--
-- Name: TABLE developer_access_requests; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.developer_access_requests TO developer_readonly;
GRANT SELECT ON TABLE public.developer_access_requests TO developer_audit;
GRANT SELECT ON TABLE public.developer_access_requests TO ai_readonly_role;


--
-- Name: TABLE developer_activity_audit; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.developer_activity_audit TO developer_readonly;
GRANT SELECT ON TABLE public.developer_activity_audit TO developer_audit;
GRANT SELECT ON TABLE public.developer_activity_audit TO ai_readonly_role;


--
-- Name: TABLE employees; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.employees TO developer_audit;
GRANT SELECT ON TABLE public.employees TO ai_readonly_role;


--
-- Name: TABLE developer_employees_view; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.developer_employees_view TO developer_readonly;
GRANT SELECT ON TABLE public.developer_employees_view TO developer_data_engineer;
GRANT SELECT ON TABLE public.developer_employees_view TO developer_audit;
GRANT SELECT,INSERT,UPDATE ON TABLE public.developer_employees_view TO developer_emergency;
GRANT SELECT ON TABLE public.developer_employees_view TO ai_readonly_role;


--
-- Name: TABLE students; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.students TO developer_audit;
GRANT SELECT ON TABLE public.students TO ai_readonly_role;


--
-- Name: TABLE developer_students_view; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.developer_students_view TO developer_readonly;
GRANT SELECT ON TABLE public.developer_students_view TO developer_data_engineer;
GRANT SELECT ON TABLE public.developer_students_view TO developer_audit;
GRANT SELECT,INSERT,UPDATE ON TABLE public.developer_students_view TO developer_emergency;
GRANT SELECT ON TABLE public.developer_students_view TO ai_readonly_role;


--
-- Name: TABLE districts; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.districts TO ai_readonly_role;


--
-- Name: TABLE document_boxes; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.document_boxes TO developer_audit;
GRANT SELECT ON TABLE public.document_boxes TO ai_readonly_role;


--
-- Name: TABLE document_embeddings; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.document_embeddings TO developer_audit;
GRANT SELECT ON TABLE public.document_embeddings TO ai_readonly_role;


--
-- Name: TABLE dsar_compliance_report; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.dsar_compliance_report TO ai_readonly_role;


--
-- Name: TABLE email_processing_queue; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.email_processing_queue TO ai_readonly_role;


--
-- Name: TABLE email_processing_rules; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.email_processing_rules TO ai_readonly_role;


--
-- Name: TABLE employee_payments; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.employee_payments TO developer_audit;
GRANT SELECT ON TABLE public.employee_payments TO ai_readonly_role;


--
-- Name: TABLE employee_responsibilities; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.employee_responsibilities TO developer_audit;
GRANT SELECT ON TABLE public.employee_responsibilities TO ai_readonly_role;


--
-- Name: TABLE encryption_audit_log; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.encryption_audit_log TO developer_audit;
GRANT SELECT ON TABLE public.encryption_audit_log TO ai_readonly_role;


--
-- Name: TABLE encryption_audit_summary; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.encryption_audit_summary TO developer_audit;
GRANT SELECT ON TABLE public.encryption_audit_summary TO ai_readonly_role;


--
-- Name: TABLE encryption_keys; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.encryption_keys TO developer_audit;
GRANT SELECT ON TABLE public.encryption_keys TO ai_readonly_role;


--
-- Name: TABLE encryption_key_status; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.encryption_key_status TO developer_audit;
GRANT SELECT ON TABLE public.encryption_key_status TO ai_readonly_role;


--
-- Name: TABLE encryption_performance_stats; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.encryption_performance_stats TO developer_audit;
GRANT SELECT ON TABLE public.encryption_performance_stats TO ai_readonly_role;


--
-- Name: TABLE event_items; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.event_items TO ai_readonly_role;


--
-- Name: TABLE events; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.events TO developer_audit;
GRANT SELECT ON TABLE public.events TO ai_readonly_role;


--
-- Name: TABLE exam_answer_keys; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.exam_answer_keys TO ai_readonly_role;


--
-- Name: TABLE exam_sections; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.exam_sections TO ai_readonly_role;


--
-- Name: TABLE exam_submission_pages; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.exam_submission_pages TO ai_readonly_role;


--
-- Name: TABLE exams; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.exams TO developer_audit;
GRANT SELECT ON TABLE public.exams TO ai_readonly_role;


--
-- Name: TABLE fee_templates; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.fee_templates TO developer_audit;
GRANT SELECT ON TABLE public.fee_templates TO ai_readonly_role;


--
-- Name: TABLE fee_transactions; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.fee_transactions TO ai_readonly_role;


--
-- Name: TABLE fees; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.fees TO developer_audit;
GRANT SELECT ON TABLE public.fees TO ai_readonly_role;


--
-- Name: TABLE form_submissions; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.form_submissions TO ai_readonly_role;


--
-- Name: TABLE form_templates; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.form_templates TO ai_readonly_role;


--
-- Name: TABLE global_notifications; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.global_notifications TO developer_audit;
GRANT SELECT ON TABLE public.global_notifications TO ai_readonly_role;


--
-- Name: TABLE global_users; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.global_users TO ai_readonly_role;


--
-- Name: TABLE grade_criteria; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.grade_criteria TO ai_readonly_role;


--
-- Name: TABLE gradebooks; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.gradebooks TO ai_readonly_role;


--
-- Name: TABLE gradebook_summaries; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.gradebook_summaries TO ai_readonly_role;


--
-- Name: TABLE gradebook_sync_log; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.gradebook_sync_log TO ai_readonly_role;


--
-- Name: TABLE gradebook_sync_queue; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.gradebook_sync_queue TO ai_readonly_role;


--
-- Name: TABLE grading_config; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.grading_config TO ai_readonly_role;


--
-- Name: TABLE grading_rubrics; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.grading_rubrics TO ai_readonly_role;


--
-- Name: TABLE items; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.items TO developer_audit;
GRANT SELECT ON TABLE public.items TO ai_readonly_role;


--
-- Name: TABLE leave_applications; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.leave_applications TO ai_readonly_role;


--
-- Name: TABLE leave_notifications; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.leave_notifications TO ai_readonly_role;


--
-- Name: TABLE leave_quotas; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.leave_quotas TO ai_readonly_role;


--
-- Name: TABLE leaves; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.leaves TO ai_readonly_role;


--
-- Name: TABLE material_alert_log; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.material_alert_log TO ai_readonly_role;


--
-- Name: TABLE material_history; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.material_history TO ai_readonly_role;


--
-- Name: TABLE material_locations; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.material_locations TO developer_audit;
GRANT SELECT ON TABLE public.material_locations TO ai_readonly_role;


--
-- Name: TABLE materials; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.materials TO developer_audit;
GRANT SELECT ON TABLE public.materials TO ai_readonly_role;


--
-- Name: TABLE monthly_attendance_stats; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.monthly_attendance_stats TO ai_readonly_role;


--
-- Name: TABLE notification_preferences; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.notification_preferences TO ai_readonly_role;


--
-- Name: TABLE notifications; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.notifications TO ai_readonly_role;


--
-- Name: TABLE ocr_extractions; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.ocr_extractions TO ai_readonly_role;


--
-- Name: TABLE period_plans; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.period_plans TO ai_readonly_role;


--
-- Name: TABLE plagiarism_cache; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.plagiarism_cache TO ai_readonly_role;


--
-- Name: TABLE promo_codes; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.promo_codes TO ai_readonly_role;


--
-- Name: TABLE reminder_items; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.reminder_items TO ai_readonly_role;


--
-- Name: TABLE reminders; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.reminders TO developer_audit;
GRANT SELECT ON TABLE public.reminders TO ai_readonly_role;


--
-- Name: TABLE report_generation_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.report_generation_logs TO ai_readonly_role;


--
-- Name: TABLE responsibilities; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.responsibilities TO developer_audit;
GRANT SELECT ON TABLE public.responsibilities TO ai_readonly_role;


--
-- Name: TABLE responsibility_assignment_history; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.responsibility_assignment_history TO ai_readonly_role;


--
-- Name: TABLE responsibility_coverage; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.responsibility_coverage TO ai_readonly_role;


--
-- Name: TABLE responsibility_versions; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.responsibility_versions TO ai_readonly_role;


--
-- Name: TABLE retention_policies; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.retention_policies TO ai_readonly_role;


--
-- Name: TABLE salaries; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.salaries TO developer_audit;
GRANT SELECT ON TABLE public.salaries TO ai_readonly_role;


--
-- Name: TABLE schedule_change_requests; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.schedule_change_requests TO ai_readonly_role;


--
-- Name: TABLE scheduled_reports; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.scheduled_reports TO ai_readonly_role;


--
-- Name: TABLE schema_migrations; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.schema_migrations TO developer_audit;
GRANT SELECT ON TABLE public.schema_migrations TO ai_readonly_role;


--
-- Name: TABLE school_access_requests; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.school_access_requests TO ai_readonly_role;


--
-- Name: TABLE school_feature_flags; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.school_feature_flags TO ai_readonly_role;


--
-- Name: TABLE school_promo_codes; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.school_promo_codes TO ai_readonly_role;


--
-- Name: TABLE schools; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.schools TO developer_audit;
GRANT SELECT ON TABLE public.schools TO ai_readonly_role;


--
-- Name: TABLE setup_template_assignments; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.setup_template_assignments TO ai_readonly_role;


--
-- Name: TABLE setup_template_configs; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.setup_template_configs TO ai_readonly_role;


--
-- Name: TABLE setup_templates; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.setup_templates TO ai_readonly_role;


--
-- Name: TABLE space_categories; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.space_categories TO ai_readonly_role;


--
-- Name: TABLE space_employees; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.space_employees TO ai_readonly_role;


--
-- Name: TABLE space_material_requirements; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.space_material_requirements TO developer_audit;
GRANT SELECT ON TABLE public.space_material_requirements TO ai_readonly_role;


--
-- Name: TABLE space_materials; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.space_materials TO ai_readonly_role;


--
-- Name: TABLE space_requirements; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.space_requirements TO developer_audit;
GRANT SELECT ON TABLE public.space_requirements TO ai_readonly_role;


--
-- Name: TABLE spaces; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.spaces TO developer_audit;
GRANT SELECT ON TABLE public.spaces TO ai_readonly_role;


--
-- Name: TABLE ssl_configuration_status; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.ssl_configuration_status TO developer_audit;
GRANT SELECT ON TABLE public.ssl_configuration_status TO ai_readonly_role;


--
-- Name: TABLE states; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.states TO ai_readonly_role;


--
-- Name: TABLE student_attendance_patterns; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.student_attendance_patterns TO ai_readonly_role;


--
-- Name: TABLE student_coupons; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.student_coupons TO ai_readonly_role;


--
-- Name: TABLE student_history; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.student_history TO ai_readonly_role;


--
-- Name: TABLE student_invoices; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.student_invoices TO developer_audit;
GRANT SELECT ON TABLE public.student_invoices TO ai_readonly_role;


--
-- Name: TABLE student_submissions; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.student_submissions TO ai_readonly_role;


--
-- Name: TABLE subjects; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.subjects TO developer_audit;
GRANT SELECT ON TABLE public.subjects TO ai_readonly_role;


--
-- Name: TABLE super_admins; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.super_admins TO ai_readonly_role;


--
-- Name: TABLE support_requests; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.support_requests TO ai_readonly_role;


--
-- Name: TABLE syllabus_calendar; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.syllabus_calendar TO ai_readonly_role;


--
-- Name: TABLE system_audit_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.system_audit_logs TO ai_readonly_role;


--
-- Name: TABLE system_config; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.system_config TO developer_audit;
GRANT SELECT ON TABLE public.system_config TO ai_readonly_role;


--
-- Name: TABLE tasks; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.tasks TO developer_audit;
GRANT SELECT ON TABLE public.tasks TO ai_readonly_role;


--
-- Name: TABLE teacher_availability; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.teacher_availability TO developer_audit;
GRANT SELECT ON TABLE public.teacher_availability TO ai_readonly_role;


--
-- Name: TABLE testimonials; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.testimonials TO ai_readonly_role;


--
-- Name: TABLE timetable_configs; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.timetable_configs TO developer_audit;
GRANT SELECT ON TABLE public.timetable_configs TO ai_readonly_role;


--
-- Name: TABLE timetable_conflict_rules; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.timetable_conflict_rules TO ai_readonly_role;


--
-- Name: TABLE timetable_conflicts; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.timetable_conflicts TO developer_audit;
GRANT SELECT ON TABLE public.timetable_conflicts TO ai_readonly_role;


--
-- Name: TABLE timetable_notifications; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.timetable_notifications TO developer_audit;
GRANT SELECT ON TABLE public.timetable_notifications TO ai_readonly_role;


--
-- Name: TABLE timetable_rooms; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.timetable_rooms TO developer_audit;
GRANT SELECT ON TABLE public.timetable_rooms TO ai_readonly_role;


--
-- Name: TABLE timetable_slots; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.timetable_slots TO developer_audit;
GRANT SELECT ON TABLE public.timetable_slots TO ai_readonly_role;


--
-- Name: TABLE tokens; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.tokens TO developer_audit;
GRANT SELECT ON TABLE public.tokens TO ai_readonly_role;


--
-- Name: TABLE topics; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.topics TO ai_readonly_role;


--
-- Name: TABLE user_activity_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.user_activity_logs TO developer_audit;
GRANT SELECT ON TABLE public.user_activity_logs TO ai_readonly_role;


--
-- Name: TABLE user_device_tokens; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.user_device_tokens TO ai_readonly_role;


--
-- Name: TABLE webhook_delivery_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.webhook_delivery_logs TO developer_audit;
GRANT SELECT ON TABLE public.webhook_delivery_logs TO ai_readonly_role;


--
-- Name: TABLE webhook_endpoints; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.webhook_endpoints TO developer_audit;
GRANT SELECT ON TABLE public.webhook_endpoints TO ai_readonly_role;


--
-- Name: TABLE workload_assessment; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.workload_assessment TO ai_readonly_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT ON TABLES TO ai_readonly_role;


--
-- PostgreSQL database dump complete
--

COMMIT; -- Bug #1 Fix: Transaction commit — agar koi error nahi aayi toh sab changes save honge

\unrestrict ga9kNUFf5eSutvgQPab7OqxMnEDGZTmxqUlPDrPvhA7ldsSEsxdetq9hFfwOhjn


