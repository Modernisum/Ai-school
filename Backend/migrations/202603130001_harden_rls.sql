-- Phase 14.1: Hardening Row-Level Security (RLS) for New Tables
-- Ensures even the most recent AI and Audit tables are locked down.

DO $$
DECLARE
    tbl text;
    tables_to_secure text[] := ARRAY[
        'ai_chat_history', 'document_box', 'audit_logs', 'timetable', 'webhooks', 'api_keys'
    ];
BEGIN
    FOR i IN 1 .. array_upper(tables_to_secure, 1)
    LOOP
        tbl := tables_to_secure[i];
        -- Check if table exists
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
            
            -- Enable RLS
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
            
            -- Drop existing policy if any
            EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON %I;', tbl);
            
            -- Create the Isolation Policy
            EXECUTE format(
                'CREATE POLICY tenant_isolation_policy ON %I 
                 FOR ALL
                 USING (
                    school_id = current_setting(''app.current_school_id'', true) 
                    OR (current_setting(''app.is_super_admin'', true) = ''true'')
                 )
                 WITH CHECK (
                    school_id = current_setting(''app.current_school_id'', true)
                    OR (current_setting(''app.is_super_admin'', true) = ''true'')
                 );', 
                 tbl
            );
            
            -- Force RLS
            EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', tbl);

        END IF;
    END LOOP;
END;
$$;
