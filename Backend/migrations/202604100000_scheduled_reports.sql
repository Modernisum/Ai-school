-- Create scheduled_reports table for storing report generation logs
CREATE TYPE report_type AS ENUM ('utilization', 'workload', 'space_distribution', 'revenue');
CREATE TYPE report_status AS ENUM ('pending', 'completed', 'failed');

CREATE TABLE scheduled_reports (
    scheduled_report_id SERIAL PRIMARY KEY,
    school_id VARCHAR(255) NOT NULL REFERENCES schools(school_id) ON DELETE CASCADE,
    report_type report_type NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status report_status DEFAULT 'pending',
    file_path TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for faster queries
CREATE INDEX idx_scheduled_reports_school_id ON scheduled_reports(school_id);
CREATE INDEX idx_scheduled_reports_report_type ON scheduled_reports(report_type);
CREATE INDEX idx_scheduled_reports_status ON scheduled_reports(status);
CREATE INDEX idx_scheduled_reports_period ON scheduled_reports(period_start, period_end);

-- Add RLS policies
ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;

-- Policy for super admin: can see all scheduled reports
CREATE POLICY super_admin_all_scheduled_reports ON scheduled_reports
    FOR ALL USING (current_user = 'super_admin');

-- Policy for school admins: can see only their school's scheduled reports
CREATE POLICY school_admin_own_scheduled_reports ON scheduled_reports
    FOR ALL USING (school_id = current_setting('app.current_school_id')::VARCHAR);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_scheduled_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER scheduled_reports_updated_at
    BEFORE UPDATE ON scheduled_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_scheduled_reports_updated_at();

-- Insert initial scheduled report for demonstration
INSERT INTO scheduled_reports (school_id, report_type, period_start, period_end, status, generated_at)
SELECT 
    school_id,
    'utilization',
    CURRENT_DATE - INTERVAL '30 days',
    CURRENT_DATE,
    'completed',
    NOW()
FROM schools 
WHERE status = 'active'
LIMIT 1;