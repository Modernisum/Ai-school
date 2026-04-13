-- Migration: Create setup templates and configuration tables for SuperAdmin-controlled auto-fill
-- Created: 2026-04-12
-- Purpose: Allow SuperAdmin to manage what data gets auto-filled during school setup

-- Create setup_templates table for storing different school setup templates
CREATE TABLE IF NOT EXISTS setup_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create setup_template_configs table for storing configuration of what gets auto-filled
CREATE TABLE IF NOT EXISTS setup_template_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES setup_templates(id) ON DELETE CASCADE,
    section VARCHAR(100) NOT NULL, -- e.g., 'academic', 'infrastructure', 'administration'
    field_name VARCHAR(100) NOT NULL, -- e.g., 'class_structure', 'default_spaces', 'notification_templates'
    data_type VARCHAR(50) NOT NULL, -- e.g., 'array', 'object', 'string', 'boolean'
    auto_fill_enabled BOOLEAN DEFAULT true,
    default_value JSONB, -- Default data to auto-fill
    validation_rules JSONB DEFAULT '{}'::jsonb,
    frontend_label VARCHAR(255), -- Label to display in frontend
    frontend_input_type VARCHAR(50), -- Input type for frontend (text, select, checkbox, etc.)
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(template_id, section, field_name)
);

-- Create setup_template_assignments table to track which schools use which templates
CREATE TABLE IF NOT EXISTS setup_template_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id VARCHAR(255) NOT NULL,
    template_id UUID NOT NULL REFERENCES setup_templates(id) ON DELETE CASCADE,
    assigned_by VARCHAR(255) NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    UNIQUE(school_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_setup_templates_active ON setup_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_setup_templates_default ON setup_templates(is_default);
CREATE INDEX IF NOT EXISTS idx_setup_template_configs_template ON setup_template_configs(template_id);
CREATE INDEX IF NOT EXISTS idx_setup_template_configs_section ON setup_template_configs(section);
CREATE INDEX IF NOT EXISTS idx_setup_template_assignments_school ON setup_template_assignments(school_id);
CREATE INDEX IF NOT EXISTS idx_setup_template_assignments_template ON setup_template_assignments(template_id);

-- Insert default templates
INSERT INTO setup_templates (id, name, description, is_active, is_default, created_by, metadata) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Standard Indian School', 'Default template for Indian schools with standard class structure and infrastructure', true, true, 'system', '{"region": "india", "school_type": "standard"}'),
    ('22222222-2222-2222-2222-222222222222', 'International School', 'Template for international schools with different academic structure', true, false, 'system', '{"region": "international", "school_type": "international"}'),
    ('33333333-3333-3333-3333-333333333333', 'Minimal Setup', 'Template with minimal auto-fill for manual configuration', true, false, 'system', '{"region": "any", "school_type": "minimal"}');

-- Insert configuration for Standard Indian School template
INSERT INTO setup_template_configs (template_id, section, field_name, data_type, auto_fill_enabled, default_value, frontend_label, frontend_input_type, display_order) VALUES
    -- Academic section
    ('11111111-1111-1111-1111-111111111111', 'academic', 'class_structure', 'array', true, 
     '[{"name": "Nursery", "level": 0}, {"name": "LKG", "level": 1}, {"name": "UKG", "level": 2}, {"name": "1", "level": 3}, {"name": "2", "level": 4}, {"name": "3", "level": 5}, {"name": "4", "level": 6}, {"name": "5", "level": 7}, {"name": "6", "level": 8}, {"name": "7", "level": 9}, {"name": "8", "level": 10}, {"name": "9", "level": 11}, {"name": "10", "level": 12}, {"name": "11", "level": 13}, {"name": "12", "level": 14}]'::jsonb,
     'Class Structure', 'class-structure-editor', 1),
    
    ('11111111-1111-1111-1111-111111111111', 'academic', 'subjects', 'array', true,
     '["English", "Hindi", "Mathematics", "Science", "Social Studies", "Computer Science", "Physical Education", "Art", "Music"]'::jsonb,
     'Default Subjects', 'multi-select', 2),
    
    -- Infrastructure section
    ('11111111-1111-1111-1111-111111111111', 'infrastructure', 'default_spaces', 'array', true,
     '[{"type": "classroom", "name": "Classroom", "description": "Standard classroom"}, {"type": "library", "name": "Library", "description": "School library"}, {"type": "lab", "name": "Science Lab", "description": "Science laboratory"}, {"type": "computer_lab", "name": "Computer Lab", "description": "Computer laboratory"}, {"type": "staff_room", "name": "Staff Room", "description": "Teachers staff room"}, {"type": "principal_office", "name": "Principal Office", "description": "Principal office"}, {"type": "playground", "name": "Playground", "description": "School playground"}, {"type": "auditorium", "name": "Auditorium", "description": "School auditorium"}]'::jsonb,
     'Default Spaces', 'space-editor', 3),
    
    ('11111111-1111-1111-1111-111111111111', 'infrastructure', 'default_materials', 'array', true,
     '[{"category": "furniture", "items": ["Desk", "Chair", "Blackboard", "Bookshelf"]}, {"category": "lab_equipment", "items": ["Microscope", "Test Tubes", "Bunsen Burner"]}, {"category": "sports", "items": ["Football", "Basketball", "Cricket Bat"]}]'::jsonb,
     'Default Materials', 'material-editor', 4),
    
    -- Administration section
    ('11111111-1111-1111-1111-111111111111', 'administration', 'notification_templates', 'array', true,
     '[{"type": "welcome", "subject": "Welcome to {school_name}", "body": "Dear {user_name}, welcome to our school management system."}, {"type": "fee_reminder", "subject": "Fee Payment Reminder", "body": "Dear parent, please pay the pending fee for {student_name}."}]'::jsonb,
     'Notification Templates', 'template-editor', 5),
    
    ('11111111-1111-1111-1111-111111111111', 'administration', 'default_roles', 'array', true,
     '["principal", "teacher", "admin_staff", "accountant", "librarian"]'::jsonb,
     'Default Roles', 'multi-select', 6),
    
    -- Fees section
    ('11111111-1111-1111-1111-111111111111', 'fees', 'fee_structure', 'object', true,
     '{"admission_fee": 5000, "tuition_fee": 2000, "transport_fee": 1000, "late_fee_percentage": 5}'::jsonb,
     'Fee Structure', 'fee-editor', 7);

-- Insert configuration for International School template
INSERT INTO setup_template_configs (template_id, section, field_name, data_type, auto_fill_enabled, default_value, frontend_label, frontend_input_type, display_order) VALUES
    ('22222222-2222-2222-2222-222222222222', 'academic', 'class_structure', 'array', true,
     '[{"name": "Pre-K", "level": 0}, {"name": "Kindergarten", "level": 1}, {"name": "Grade 1", "level": 2}, {"name": "Grade 2", "level": 3}, {"name": "Grade 3", "level": 4}, {"name": "Grade 4", "level": 5}, {"name": "Grade 5", "level": 6}, {"name": "Grade 6", "level": 7}, {"name": "Grade 7", "level": 8}, {"name": "Grade 8", "level": 9}, {"name": "Grade 9", "level": 10}, {"name": "Grade 10", "level": 11}, {"name": "Grade 11", "level": 12}, {"name": "Grade 12", "level": 13}]'::jsonb,
     'Class Structure', 'class-structure-editor', 1),
    
    ('22222222-2222-2222-2222-222222222222', 'academic', 'subjects', 'array', true,
     '["English", "Mathematics", "Science", "Social Studies", "Foreign Language", "Arts", "Physical Education", "Computer Science"]'::jsonb,
     'Default Subjects', 'multi-select', 2);

-- Insert configuration for Minimal Setup template
INSERT INTO setup_template_configs (template_id, section, field_name, data_type, auto_fill_enabled, default_value, frontend_label, frontend_input_type, display_order) VALUES
    ('33333333-3333-3333-3333-333333333333', 'academic', 'class_structure', 'array', false, NULL, 'Class Structure', 'class-structure-editor', 1),
    ('33333333-3333-3333-3333-333333333333', 'infrastructure', 'default_spaces', 'array', false, NULL, 'Default Spaces', 'space-editor', 2);

-- Add comments for documentation
COMMENT ON TABLE setup_templates IS 'Stores different school setup templates that SuperAdmin can manage';
COMMENT ON TABLE setup_template_configs IS 'Configuration for what data gets auto-filled in each template section';
COMMENT ON TABLE setup_template_assignments IS 'Tracks which schools are assigned which setup templates';

COMMENT ON COLUMN setup_templates.is_default IS 'Indicates the default template for new schools';
COMMENT ON COLUMN setup_template_configs.section IS 'Section/category of setup (academic, infrastructure, administration, fees, etc.)';
COMMENT ON COLUMN setup_template_configs.field_name IS 'Field identifier that matches backend data structure';
COMMENT ON COLUMN setup_template_configs.data_type IS 'Data type for frontend input validation';
COMMENT ON COLUMN setup_template_configs.frontend_input_type IS 'Input type hint for frontend UI (text, select, checkbox, etc.)';

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_setup_templates_updated_at 
    BEFORE UPDATE ON setup_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_setup_template_configs_updated_at 
    BEFORE UPDATE ON setup_template_configs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();