-- Phase 1.1: Multi-Tenancy Row-Level Security (RLS)
-- Enables RLS on all tenant tables and enforces isolation using `app.current_school_id`

-- 1. Create a function to check if the current user is Super Admin
-- We bypass RLS if 'app.is_super_admin' is set to 'true'.
CREATE OR REPLACE FUNCTION is_super_admin() RETURNS BOOLEAN AS $$
BEGIN
    RETURN current_setting('app.is_super_admin', true) = 'true';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create a generic policy for tenant isolation
-- We will apply this to all tenant tables. 
-- Data is visible if the row's `school_id` matches the session's `app.current_school_id` OR if `is_super_admin()` is true.

-- (PostgreSQL 10+ syntax for dynamic DO blocks)
DO $$
DECLARE
    tbl text;
    tables_to_secure text[] := ARRAY[
        'students', 'employees', 'classes', 'subjects', 'chapters', 'academic_components', 
        'exams', 'spaces', 'items', 'materials', 'material_locations', 'fees', 'fee_templates', 
        'student_fees', 'custom_fees', 'custom_fee_records', 'salaries', 'employee_payments', 
        'attendance', 'tasks', 'announcements', 'complains', 'events', 'reminders', 'communication', 
        'awards', 'responsibilities', 'responsibility_spaces', 'employee_responsibilities', 
        'employee_experience', 'employee_education', 'employee_salaries', 'class_periods', 
        'class_streams', 'space_categories', 'space_employees', 'space_materials', 'audit_logs', 
        'auth_logs', 'referral_coupons', 'coupon_usage_log', 'document_box', 'leave_applications', 
        'school_holidays'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables_to_secure
    LOOP
        -- Check if table exists before securing
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
            
            -- Enable RLS
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
            
            -- Drop existing policy if any (for idempotency)
            EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON %I;', tbl);
            
            -- Create the new Isolation Policy
            EXECUTE format(
                'CREATE POLICY tenant_isolation_policy ON %I 
                 FOR ALL
                 USING (
                    school_id = current_setting(''app.current_school_id'', true) 
                    OR is_super_admin()
                 )
                 WITH CHECK (
                    school_id = current_setting(''app.current_school_id'', true)
                    OR is_super_admin()
                 );', 
                 tbl
            );
            
            -- Ensure RLS is enforced even for the table owner (optional but recommended for complete safety)
            EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', tbl);

        END IF;
    END LOOP;
END;
$$;
