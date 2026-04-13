-- Administrative Automation Tables
-- For form processing, report generation, email parsing, and timetable conflict detection

-- Form Processing Templates
CREATE TABLE form_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    form_type VARCHAR(100) NOT NULL, -- 'student_admission', 'leave_request', 'fee_payment', 'complaint', 'custom'
    form_schema JSONB NOT NULL DEFAULT '{}',
    validation_rules JSONB DEFAULT '{}',
    workflow_steps JSONB DEFAULT '[]',
    approval_required BOOLEAN DEFAULT false,
    approval_roles JSONB DEFAULT '[]',
    notification_settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    
    -- RLS policies
    CONSTRAINT fk_form_templates_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
);

CREATE INDEX idx_form_templates_school_type ON form_templates(school_id, form_type);
CREATE INDEX idx_form_templates_active ON form_templates(school_id, is_active);

-- Form Submissions
CREATE TABLE form_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id VARCHAR(255) NOT NULL,
    template_id UUID NOT NULL,
    form_type VARCHAR(100) NOT NULL,
    submitted_by VARCHAR(255) NOT NULL, -- user_id
    submitted_by_role VARCHAR(100) NOT NULL, -- 'student', 'teacher', 'parent', 'admin'
    form_data JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'submitted', 'under_review', 'approved', 'rejected', 'completed'
    current_step INTEGER DEFAULT 0,
    workflow_history JSONB DEFAULT '[]',
    approval_history JSONB DEFAULT '[]',
    reviewer_notes TEXT,
    processed_by VARCHAR(255),
    processed_at TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_form_submissions_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
    CONSTRAINT fk_form_submissions_template FOREIGN KEY (template_id) REFERENCES form_templates(id) ON DELETE CASCADE
);

CREATE INDEX idx_form_submissions_school_status ON form_submissions(school_id, status);
CREATE INDEX idx_form_submissions_submitted_by ON form_submissions(school_id, submitted_by);
CREATE INDEX idx_form_submissions_type_status ON form_submissions(school_id, form_type, status);

-- Automated Reports
CREATE TABLE automated_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id VARCHAR(255) NOT NULL,
    report_type VARCHAR(100) NOT NULL, -- 'attendance_summary', 'fee_collection', 'academic_performance', 'staff_productivity', 'custom'
    report_name VARCHAR(255) NOT NULL,
    description TEXT,
    schedule_type VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'on_demand'
    schedule_config JSONB DEFAULT '{}',
    recipient_emails JSONB DEFAULT '[]',
    recipient_roles JSONB DEFAULT '[]',
    report_config JSONB NOT NULL DEFAULT '{}',
    template_path VARCHAR(500),
    last_generated_at TIMESTAMP,
    next_scheduled_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    
    CONSTRAINT fk_automated_reports_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
);

CREATE INDEX idx_automated_reports_school_type ON automated_reports(school_id, report_type);
CREATE INDEX idx_automated_reports_schedule ON automated_reports(school_id, schedule_type, next_scheduled_at);

-- Report Generation Logs
CREATE TABLE report_generation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id VARCHAR(255) NOT NULL,
    report_id UUID NOT NULL,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    generated_by VARCHAR(255),
    status VARCHAR(50) NOT NULL, -- 'success', 'failed', 'partial'
    file_path VARCHAR(500),
    file_size_bytes BIGINT,
    recipient_count INTEGER DEFAULT 0,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    
    CONSTRAINT fk_report_logs_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
    CONSTRAINT fk_report_logs_report FOREIGN KEY (report_id) REFERENCES automated_reports(id) ON DELETE CASCADE
);

CREATE INDEX idx_report_logs_school_date ON report_generation_logs(school_id, generated_at);
CREATE INDEX idx_report_logs_report_status ON report_generation_logs(report_id, status);

-- Email Processing Queue
CREATE TABLE email_processing_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id VARCHAR(255) NOT NULL,
    email_id VARCHAR(500) NOT NULL,
    sender_email VARCHAR(255) NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    subject TEXT,
    body_text TEXT,
    body_html TEXT,
    attachments JSONB DEFAULT '[]',
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processing_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'processed', 'failed', 'skipped'
    category VARCHAR(100), -- 'admission_inquiry', 'fee_payment', 'leave_request', 'complaint', 'general', 'spam'
    priority INTEGER DEFAULT 5, -- 1=highest, 10=lowest
    assigned_to VARCHAR(255),
    processed_at TIMESTAMP,
    processing_result JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    
    CONSTRAINT fk_email_queue_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
);

CREATE INDEX idx_email_queue_school_status ON email_processing_queue(school_id, processing_status);
CREATE INDEX idx_email_queue_category ON email_processing_queue(school_id, category);
CREATE INDEX idx_email_queue_received ON email_processing_queue(school_id, received_at);

-- Email Processing Rules
CREATE TABLE email_processing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id VARCHAR(255) NOT NULL,
    rule_name VARCHAR(255) NOT NULL,
    description TEXT,
    match_conditions JSONB NOT NULL DEFAULT '{}', -- {sender_pattern: '', subject_keywords: [], body_keywords: []}
    actions JSONB NOT NULL DEFAULT '[]', -- ['categorize', 'assign_to', 'create_ticket', 'send_auto_reply']
    category VARCHAR(100),
    assign_to_role VARCHAR(100),
    auto_reply_template TEXT,
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_email_rules_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
);

CREATE INDEX idx_email_rules_school_active ON email_processing_rules(school_id, is_active);

-- Timetable Conflict Detection
CREATE TABLE timetable_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id VARCHAR(255) NOT NULL,
    conflict_type VARCHAR(100) NOT NULL, -- 'teacher_double_booking', 'room_overlap', 'student_clash', 'resource_unavailable'
    entity_type VARCHAR(100) NOT NULL, -- 'teacher', 'room', 'student', 'class'
    entity_id VARCHAR(255) NOT NULL,
    conflicting_with_type VARCHAR(100) NOT NULL,
    conflicting_with_id VARCHAR(255) NOT NULL,
    timetable_slot_id UUID,
    day_of_week INTEGER,
    start_time TIME,
    end_time TIME,
    severity VARCHAR(50) DEFAULT 'warning', -- 'info', 'warning', 'error', 'critical'
    description TEXT,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    resolved_by VARCHAR(255),
    resolution_notes TEXT,
    metadata JSONB DEFAULT '{}',
    
    CONSTRAINT fk_timetable_conflicts_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
);

CREATE INDEX idx_timetable_conflicts_school_status ON timetable_conflicts(school_id, resolved_at);
CREATE INDEX idx_timetable_conflicts_type ON timetable_conflicts(school_id, conflict_type, severity);
CREATE INDEX idx_timetable_conflicts_entity ON timetable_conflicts(school_id, entity_type, entity_id);

-- Timetable Conflict Rules
CREATE TABLE timetable_conflict_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id VARCHAR(255) NOT NULL,
    rule_name VARCHAR(255) NOT NULL,
    description TEXT,
    conflict_type VARCHAR(100) NOT NULL,
    check_conditions JSONB NOT NULL DEFAULT '{}',
    severity VARCHAR(50) DEFAULT 'warning',
    auto_resolve BOOLEAN DEFAULT false,
    notification_roles JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_conflict_rules_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
);

CREATE INDEX idx_conflict_rules_school_active ON timetable_conflict_rules(school_id, is_active);

-- Administrative Task Queue
CREATE TABLE admin_task_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id VARCHAR(255) NOT NULL,
    task_type VARCHAR(100) NOT NULL, -- 'form_processing', 'report_generation', 'email_processing', 'conflict_detection', 'data_sync'
    task_name VARCHAR(255) NOT NULL,
    description TEXT,
    payload JSONB DEFAULT '{}',
    priority INTEGER DEFAULT 5,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'retrying'
    scheduled_for TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    result JSONB DEFAULT '{}',
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_admin_task_queue_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
);

CREATE INDEX idx_admin_task_queue_school_status ON admin_task_queue(school_id, status);
CREATE INDEX idx_admin_task_queue_scheduled ON admin_task_queue(school_id, scheduled_for, status);
CREATE INDEX idx_admin_task_queue_type ON admin_task_queue(school_id, task_type, status);

-- Enable Row Level Security
ALTER TABLE form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE automated_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_generation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_processing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_processing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_conflict_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_task_queue ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY form_templates_isolation_policy ON form_templates
    USING (school_id = current_setting('app.current_school_id'));

CREATE POLICY form_submissions_isolation_policy ON form_submissions
    USING (school_id = current_setting('app.current_school_id'));

CREATE POLICY automated_reports_isolation_policy ON automated_reports
    USING (school_id = current_setting('app.current_school_id'));

CREATE POLICY report_generation_logs_isolation_policy ON report_generation_logs
    USING (school_id = current_setting('app.current_school_id'));

CREATE POLICY email_processing_queue_isolation_policy ON email_processing_queue
    USING (school_id = current_setting('app.current_school_id'));

CREATE POLICY email_processing_rules_isolation_policy ON email_processing_rules
    USING (school_id = current_setting('app.current_school_id'));

CREATE POLICY timetable_conflicts_isolation_policy ON timetable_conflicts
    USING (school_id = current_setting('app.current_school_id'));

CREATE POLICY timetable_conflict_rules_isolation_policy ON timetable_conflict_rules
    USING (school_id = current_setting('app.current_school_id'));

CREATE POLICY admin_task_queue_isolation_policy ON admin_task_queue
    USING (school_id = current_setting('app.current_school_id'));

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_form_templates_updated_at BEFORE UPDATE ON form_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_form_submissions_updated_at BEFORE UPDATE ON form_submissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_automated_reports_updated_at BEFORE UPDATE ON automated_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_processing_rules_updated_at BEFORE UPDATE ON email_processing_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_timetable_conflict_rules_updated_at BEFORE UPDATE ON timetable_conflict_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_task_queue_updated_at BEFORE UPDATE ON admin_task_queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default form templates for common administrative tasks
INSERT INTO form_templates (school_id, name, description, form_type, form_schema, validation_rules, workflow_steps, approval_required, approval_roles, is_active)
VALUES 
    ('system', 'Student Admission Form', 'Standard student admission form', 'student_admission', 
     '{"fields": [{"name": "student_name", "type": "text", "label": "Student Name", "required": true}, {"name": "date_of_birth", "type": "date", "label": "Date of Birth", "required": true}, {"name": "gender", "type": "select", "label": "Gender", "options": ["Male", "Female", "Other"], "required": true}, {"name": "parent_name", "type": "text", "label": "Parent/Guardian Name", "required": true}, {"name": "contact_number", "type": "tel", "label": "Contact Number", "required": true}, {"name": "address", "type": "textarea", "label": "Address", "required": true}, {"name": "previous_school", "type": "text", "label": "Previous School", "required": false}, {"name": "documents", "type": "file", "label": "Supporting Documents", "multiple": true, "required": false}]}', 
     '{"student_name": {"min_length": 3, "max_length": 100}, "contact_number": {"pattern": "^[0-9]{10}$"}}',
     '[{"name": "Submission", "role": "parent"}, {"name": "Review", "role": "admin"}, {"name": "Approval", "role": "principal"}]',
     true, '["admin", "principal"]', true),
    
    ('system', 'Leave Request Form', 'Employee/student leave request form', 'leave_request',
     '{"fields": [{"name": "leave_type", "type": "select", "label": "Leave Type", "options": ["Sick Leave", "Casual Leave", "Earned Leave", "Maternity Leave", "Paternity Leave", "Study Leave", "Other"], "required": true}, {"name": "start_date", "type": "date", "label": "Start Date", "required": true}, {"name": "end_date", "type": "date", "label": "End Date", "required": true}, {"name": "reason", "type": "textarea", "label": "Reason for Leave", "required": true}, {"name": "supporting_docs", "type": "file", "label": "Supporting Documents", "multiple": true, "required": false}]}',
     '{"start_date": {"before": "end_date"}, "end_date": {"after": "start_date"}}',
     '[{"name": "Application", "role": "employee"}, {"name": "HOD Approval", "role": "hod"}, {"name": "HR Approval", "role": "hr"}]',
     true, '["hod", "hr"]', true),
    
    ('system', 'Fee Payment Form', 'Student fee payment form', 'fee_payment',
     '{"fields": [{"name": "student_id", "type": "text", "label": "Student ID", "required": true}, {"name": "payment_method", "type": "select", "label": "Payment Method", "options": ["Cash", "Cheque", "Bank Transfer", "Credit Card", "Debit Card", "UPI"], "required": true}, {"name": "amount", "type": "number", "label": "Amount", "required": true}, {"name": "transaction_id", "type": "text", "label": "Transaction ID", "required": false}, {"name": "payment_date", "type": "date", "label": "Payment Date", "required": true}, {"name": "receipt_upload", "type": "file", "label": "Payment Receipt", "required": false}]}',
     '{"amount": {"min": 1}, "payment_date": {"not_future": true}}',
     '[{"name": "Payment", "role": "parent"}, {"name": "Verification", "role": "