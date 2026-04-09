-- Enhanced Employee Leave Management System
-- Adds conditional approvals, leave quotas, notifications, coverage, and workload assessment

-- 1. Add columns to existing leave_applications table
ALTER TABLE leave_applications
ADD COLUMN IF NOT EXISTS conditional_approval_id UUID,
ADD COLUMN IF NOT EXISTS coverage_assigned BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS workload_assessment_score INTEGER,
ADD COLUMN IF NOT EXISTS submitted_via VARCHAR(20),
ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR,
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::JSONB,
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
ADD COLUMN IF NOT EXISTS total_days INTEGER GENERATED ALWAYS AS (EXTRACT(DAY FROM (to_date - from_date)) + 1) STORED;

-- 2. Create leave_quotas table
CREATE TABLE IF NOT EXISTS leave_quotas (
    quota_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id VARCHAR NOT NULL,
    employee_id VARCHAR NOT NULL,
    leave_type VARCHAR NOT NULL,
    annual_quota INTEGER NOT NULL DEFAULT 0,
    monthly_quota INTEGER,
    used INTEGER DEFAULT 0,
    remaining INTEGER GENERATED ALWAYS AS (annual_quota - used) STORED,
    reset_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_leave_quotas_school FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE,
    UNIQUE(school_id, employee_id, leave_type)
);

-- 3. Create conditional_approvals table
CREATE TABLE IF NOT EXISTS conditional_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leave_id UUID NOT NULL,
    conditions JSONB NOT NULL DEFAULT '[]'::JSONB,
    response_deadline TIMESTAMPTZ NOT NULL,
    auto_reject BOOLEAN DEFAULT TRUE,
    admin_notes TEXT,
    employee_response JSONB,
    responded_at TIMESTAMPTZ,
    status VARCHAR NOT NULL DEFAULT 'pending_response' CHECK (status IN ('pending_response', 'accepted', 'rejected', 'auto_rejected', 'overridden')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_conditional_approvals_leave FOREIGN KEY (leave_id) REFERENCES leave_applications(leave_id) ON DELETE CASCADE
);

-- 4. Create responsibility_coverage table
CREATE TABLE IF NOT EXISTS responsibility_coverage (
    coverage_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leave_id UUID NOT NULL,
    original_employee_id VARCHAR NOT NULL,
    covering_employee_id VARCHAR NOT NULL,
    responsibility_id VARCHAR NOT NULL,
    coverage_period_start DATE NOT NULL,
    coverage_period_end DATE NOT NULL,
    status VARCHAR NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'accepted', 'rejected', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_coverage_leave FOREIGN KEY (leave_id) REFERENCES leave_applications(leave_id) ON DELETE CASCADE,
    CONSTRAINT fk_coverage_original_employee FOREIGN KEY (school_id, original_employee_id) REFERENCES employees(school_id, employee_id),
    CONSTRAINT fk_coverage_covering_employee FOREIGN KEY (school_id, covering_employee_id) REFERENCES employees(school_id, employee_id)
);

-- 5. Create leave_notifications table
CREATE TABLE IF NOT EXISTS leave_notifications (
    notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id VARCHAR NOT NULL,
    recipient_id VARCHAR NOT NULL,
    notification_type VARCHAR NOT NULL,
    title VARCHAR NOT NULL,
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}'::JSONB,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_notifications_school FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE
);

-- 6. Create conditional_approval_templates table
CREATE TABLE IF NOT EXISTS conditional_approval_templates (
    template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id VARCHAR NOT NULL,
    template_name VARCHAR NOT NULL,
    description TEXT,
    conditions JSONB NOT NULL DEFAULT '[]'::JSONB,
    is_default BOOLEAN DEFAULT FALSE,
    created_by VARCHAR NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_templates_school FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE
);

-- 7. Create workload_assessment table
CREATE TABLE IF NOT EXISTS workload_assessment (
    assessment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leave_id UUID NOT NULL,
    school_id VARCHAR NOT NULL,
    employee_id VARCHAR NOT NULL,
    assessment_date DATE NOT NULL,
    impact_score INTEGER NOT NULL CHECK (impact_score >= 0 AND impact_score <= 100),
    workload_category VARCHAR NOT NULL CHECK (workload_category IN ('low', 'medium', 'high', 'critical')),
    coverage_needed BOOLEAN DEFAULT FALSE,
    suggested_coverages JSONB DEFAULT '[]'::JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_workload_leave FOREIGN KEY (leave_id) REFERENCES leave_applications(leave_id) ON DELETE CASCADE,
    CONSTRAINT fk_workload_school FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE,
    CONSTRAINT fk_workload_employee FOREIGN KEY (school_id, employee_id) REFERENCES employees(school_id, employee_id)
);

-- 8. Create school_feature_flags table for gradual rollout
CREATE TABLE IF NOT EXISTS school_feature_flags (
    school_id VARCHAR PRIMARY KEY,
    enhanced_leave_system BOOLEAN DEFAULT FALSE,
    conditional_approvals BOOLEAN DEFAULT FALSE,
    real_time_notifications BOOLEAN DEFAULT FALSE,
    mobile_leave_submission BOOLEAN DEFAULT FALSE,
    workload_assessment BOOLEAN DEFAULT FALSE,
    responsibility_coverage BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT fk_feature_flags_school FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE
);

-- 9. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_leave_applications_school_status ON leave_applications(school_id, status);
CREATE INDEX IF NOT EXISTS idx_leave_applications_employee ON leave_applications(school_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_applications_dates ON leave_applications(from_date, to_date);
CREATE INDEX IF NOT EXISTS idx_leave_applications_conditional ON leave_applications(conditional_approval_id) WHERE conditional_approval_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leave_quotas_employee ON leave_quotas(school_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_quotas_type ON leave_quotas(leave_type);

CREATE INDEX IF NOT EXISTS idx_conditional_approvals_status ON conditional_approvals(status);
CREATE INDEX IF NOT EXISTS idx_conditional_approvals_deadline ON conditional_approvals(response_deadline) WHERE status = 'pending_response';

CREATE INDEX IF NOT EXISTS idx_responsibility_coverage_employee ON responsibility_coverage(original_employee_id, covering_employee_id);
CREATE INDEX IF NOT EXISTS idx_responsibility_coverage_status ON responsibility_coverage(status);

CREATE INDEX IF NOT EXISTS idx_leave_notifications_recipient ON leave_notifications(school_id, recipient_id);
CREATE INDEX IF NOT EXISTS idx_leave_notifications_read ON leave_notifications(read) WHERE read = FALSE;
CREATE INDEX IF NOT EXISTS idx_leave_notifications_created ON leave_notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workload_assessment_leave ON workload_assessment(leave_id);
CREATE INDEX IF NOT EXISTS idx_workload_assessment_employee ON workload_assessment(school_id, employee_id);

-- 10. Add RLS policies for multi-tenancy
ALTER TABLE leave_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE conditional_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE responsibility_coverage ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE conditional_approval_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workload_assessment ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_feature_flags ENABLE ROW LEVEL SECURITY;

-- RLS policies for leave_quotas
CREATE POLICY leave_quotas_school_isolation ON leave_quotas
    USING (school_id = current_setting('app.current_school_id'));

-- RLS policies for conditional_approvals (via leave_applications join)
CREATE POLICY conditional_approvals_school_isolation ON conditional_approvals
    USING (EXISTS (
        SELECT 1 FROM leave_applications la 
        WHERE la.leave_id = conditional_approvals.leave_id 
        AND la.school_id = current_setting('app.current_school_id')
    ));

-- RLS policies for responsibility_coverage
CREATE POLICY responsibility_coverage_school_isolation ON responsibility_coverage
    USING (EXISTS (
        SELECT 1 FROM leave_applications la 
        WHERE la.leave_id = responsibility_coverage.leave_id 
        AND la.school_id = current_setting('app.current_school_id')
    ));

-- RLS policies for leave_notifications
CREATE POLICY leave_notifications_school_isolation ON leave_notifications
    USING (school_id = current_setting('app.current_school_id'));

-- RLS policies for conditional_approval_templates
CREATE POLICY conditional_approval_templates_school_isolation ON conditional_approval_templates
    USING (school_id = current_setting('app.current_school_id'));

-- RLS policies for workload_assessment
CREATE POLICY workload_assessment_school_isolation ON workload_assessment
    USING (school_id = current_setting('app.current_school_id'));

-- RLS policies for school_feature_flags (admin only)
CREATE POLICY school_feature_flags_admin_only ON school_feature_flags
    USING (school_id = current_setting('app.current_school_id'));

-- 11. Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_leave_quotas_updated_at BEFORE UPDATE ON leave_quotas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conditional_approvals_updated_at BEFORE UPDATE ON conditional_approvals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_responsibility_coverage_updated_at BEFORE UPDATE ON responsibility_coverage
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conditional_approval_templates_updated_at BEFORE UPDATE ON conditional_approval_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 12. Create function to calculate leave balance
CREATE OR REPLACE FUNCTION calculate_leave_balance(
    p_school_id VARCHAR,
    p_employee_id VARCHAR,
    p_leave_type VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    leave_type VARCHAR,
    annual_quota INTEGER,
    used INTEGER,
    remaining INTEGER,
    monthly_quota INTEGER,
    reset_date DATE
) AS $$
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
$$ LANGUAGE plpgsql;

-- 13. Create function to check conditional approval expiration
CREATE OR REPLACE FUNCTION check_conditional_approval_expiration()
RETURNS VOID AS $$
BEGIN
    UPDATE conditional_approvals ca
    SET status = 'auto_rejected',
        updated_at = NOW()
    WHERE ca.status = 'pending_response'
        AND ca.response_deadline < NOW()
        AND ca.auto_reject = TRUE;
END;
$$ LANGUAGE plpgsql;

-- 14. Add comment documentation
COMMENT ON TABLE leave_quotas IS 'Employee leave quotas and usage tracking';
COMMENT ON TABLE conditional_approvals IS 'Conditional approval workflows for leave requests';
COMMENT ON TABLE responsibility_coverage IS 'Responsibility coverage assignments during employee leave';
COMMENT ON TABLE leave_notifications IS 'Real-time notifications for leave management system';
COMMENT ON TABLE conditional_approval_templates IS 'Templates for conditional approval conditions';
COMMENT ON TABLE workload_assessment IS 'Workload impact assessment for leave requests';
COMMENT ON TABLE school_feature_flags IS 'Feature flags for gradual rollout of enhanced leave system';

-- 15. Insert default feature flags for existing schools
INSERT INTO school_feature_flags (school_id)
SELECT school_id FROM schools
ON CONFLICT (school_id) DO NOTHING;