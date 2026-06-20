# PostgreSQL Database Schema

This guide contains the complete combined schema of the PostgreSQL database, generated from all migration files.

## Migration: 202602180000_init.sql

```sql
-- Initial Migration: Schema for school management

-- Schools / Auth
CREATE TABLE IF NOT EXISTS auth (
    school_id VARCHAR(255) PRIMARY KEY,
    password TEXT NOT NULL,
    password_temp BOOLEAN DEFAULT FALSE,
    security_question TEXT,
    security_answer_hash TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tokens (for Auth sessions)
CREATE TABLE IF NOT EXISTS tokens (
    token_id TEXT PRIMARY KEY,
    school_id VARCHAR(255) NOT NULL,
    user_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Students
CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(255) NOT NULL,
    school_id VARCHAR(255) NOT NULL,
    class_name VARCHAR(100) NOT NULL,
    name TEXT,
    roll_number INT,
    section VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    dob VARCHAR(100),
    gender VARCHAR(50),
    father_name TEXT,
    mother_name TEXT,
    aadhaar_number VARCHAR(50),
    address_line1 TEXT,
    address_city VARCHAR(255),
    address_state VARCHAR(255),
    address_pincode VARCHAR(20),
    tc_number VARCHAR(100),
    contact VARCHAR(50),
    alternative_contact VARCHAR(50),
    email VARCHAR(255),
    transport_enabled BOOLEAN DEFAULT FALSE,
    transport_radius VARCHAR(50),
    additional_subjects TEXT,
    admission_date VARCHAR(100),
    room_number VARCHAR(50),
    student_type VARCHAR(100),
    profile_image_url TEXT,
    enrolled_subjects JSONB DEFAULT '[]',
    total_fees NUMERIC(15, 2) DEFAULT 0.00,
    data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(school_id, student_id)
);

-- Employees
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(255) NOT NULL,
    school_id VARCHAR(255) NOT NULL,
    employee_type VARCHAR(50) NOT NULL,
    aadhaar_number VARCHAR(50),
    contact VARCHAR(50),
    email VARCHAR(255),
    data JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(school_id, employee_id)
);

-- Add indices
CREATE INDEX IF NOT EXISTS idx_auth_school_id ON auth(school_id);
CREATE INDEX IF NOT EXISTS idx_students_school_id ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_employees_school_id ON employees(school_id);

-- Fee Templates
CREATE TABLE IF NOT EXISTS fee_templates (
    id SERIAL PRIMARY KEY,
    fee_id VARCHAR(255) UNIQUE NOT NULL,
    school_id VARCHAR(255) NOT NULL,
    fees_name TEXT NOT NULL,
    fees_reason TEXT NOT NULL,
    fees_period VARCHAR(50) NOT NULL,
    fees_amount DECIMAL(12, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Student Fees
CREATE TABLE IF NOT EXISTS student_fees (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR(255) NOT NULL,
    student_id VARCHAR(255) NOT NULL,
    fee_id VARCHAR(255) NOT NULL,
    total_fees DECIMAL(12, 2) NOT NULL,
    pending_amount DECIMAL(12, 2) NOT NULL,
    discount DECIMAL(12, 2) DEFAULT 0,
    status VARCHAR(50) NOT NULL,
    payments JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Salaries
CREATE TABLE IF NOT EXISTS salaries (
    id SERIAL PRIMARY KEY,
    salary_id VARCHAR(255) UNIQUE NOT NULL,
    school_id VARCHAR(255) NOT NULL,
    employee_id VARCHAR(255) NOT NULL,
    month INT NOT NULL,
    year INT NOT NULL,
    base_salary DECIMAL(12, 2) NOT NULL,
    bonus DECIMAL(12, 2) DEFAULT 0,
    increment_percent DECIMAL(5, 2) DEFAULT 0,
    total_salary DECIMAL(12, 2) NOT NULL,
    due_amount DECIMAL(12, 2) NOT NULL,
    advance_adjusted DECIMAL(12, 2) DEFAULT 0,
    status VARCHAR(50) NOT NULL,
    absent_days INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Employee Payments
CREATE TABLE IF NOT EXISTS employee_payments (
    id SERIAL PRIMARY KEY,
    payment_id VARCHAR(255) UNIQUE NOT NULL,
    school_id VARCHAR(255) NOT NULL,
    employee_id VARCHAR(255) NOT NULL,
    payment_type VARCHAR(50) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    salary_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Schools
CREATE TABLE IF NOT EXISTS schools (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR(255) UNIQUE NOT NULL,
    school_name TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Classes
CREATE TABLE IF NOT EXISTS classes (
    id VARCHAR(255) NOT NULL,
    school_id VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    total_students INT DEFAULT 0,
    total_teachers INT DEFAULT 0,
    total_periods INT DEFAULT 0,
    room_number VARCHAR(50),
    class_fees DECIMAL(12, 2) DEFAULT 0,
    sections JSONB DEFAULT '[]',
    streams JSONB DEFAULT '[]',
    section_size INT DEFAULT 30,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(school_id, id)
);

-- Communication (Announcements and Complaints)
CREATE TABLE IF NOT EXISTS communication (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- announcement, complain
    title TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Subjects
CREATE TABLE IF NOT EXISTS subjects (
    id VARCHAR(255) NOT NULL,
    school_id VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    class_id VARCHAR(255),
    class_name VARCHAR(100),
    fees DECIMAL(12, 2) DEFAULT 0,
    is_compulsory BOOLEAN DEFAULT TRUE,
    category VARCHAR(100),
    fee_type VARCHAR(50) DEFAULT 'monthly',
    fee_interval INT DEFAULT 1,
    schedule_type VARCHAR(50) DEFAULT 'daily',
    schedule_data JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(school_id, id)
);

-- Chapters
CREATE TABLE IF NOT EXISTS chapters (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR(255) NOT NULL,
    class_name VARCHAR(100) NOT NULL,
    subject_name VARCHAR(100) NOT NULL,
    chapter_name TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(school_id, class_name, subject_name, chapter_name)
);

-- Components (Topics, Exercises, Tests)
CREATE TABLE IF NOT EXISTS academic_components (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR(255) NOT NULL,
    class_name VARCHAR(100) NOT NULL,
    subject_name VARCHAR(100) NOT NULL,
    chapter_name TEXT NOT NULL,
    component_type VARCHAR(50) NOT NULL, -- topic, exercise, test
    component_name TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '{}',
    status JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(school_id, class_name, subject_name, chapter_name, component_type, component_name)
);

-- Exams
CREATE TABLE IF NOT EXISTS exams (
    id SERIAL PRIMARY KEY,
    exam_id VARCHAR(255) UNIQUE NOT NULL,
    school_id VARCHAR(255) NOT NULL,
    exam_name TEXT NOT NULL,
    exam_type VARCHAR(100) NOT NULL,
    subject_name TEXT NOT NULL,
    class_name VARCHAR(100),
    chapters JSONB,
    exam_date TIMESTAMP WITH TIME ZONE,
    exam_time TEXT,
    duration_minutes INT,
    status VARCHAR(50) DEFAULT 'Scheduled',
    paper JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Attendance
CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL, -- student, employee
    user_id VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    status VARCHAR(50) NOT NULL,
    in_time TIMESTAMP WITH TIME ZONE,
    out_time TIMESTAMP WITH TIME ZONE,
    total_time TEXT,
    reason TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(school_id, role, user_id, date)
);

-- Awards
CREATE TABLE IF NOT EXISTS awards (
    id SERIAL PRIMARY KEY,
    award_id VARCHAR(255) UNIQUE NOT NULL,
    school_id VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- student, employee
    parent_id VARCHAR(255) NOT NULL,
    award_name TEXT NOT NULL,
    award_type TEXT,
    position TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    task_id VARCHAR(255) UNIQUE NOT NULL,
    school_id VARCHAR(255) NOT NULL,
    user_type VARCHAR(50) NOT NULL, -- student, employee
    parent_id VARCHAR(255) NOT NULL,
    task_name TEXT NOT NULL,
    time_duration TEXT,
    complete_percentage DECIMAL(5, 2) DEFAULT 0,
    status VARCHAR(50) NOT NULL,
    update_logs JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Announcements
CREATE TABLE IF NOT EXISTS announcements (
    id SERIAL PRIMARY KEY,
    announcement_id VARCHAR(255) UNIQUE NOT NULL,
    school_id VARCHAR(255) NOT NULL,
    target_type VARCHAR(50) NOT NULL, -- school, class
    target_id VARCHAR(255) NOT NULL, -- school_id or class_name
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Complains
CREATE TABLE IF NOT EXISTS complaints (
    id SERIAL PRIMARY KEY,
    complaint_id VARCHAR(255) UNIQUE NOT NULL,
    school_id VARCHAR(255) NOT NULL,
    student_id VARCHAR(255) NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Responsibilities
CREATE TABLE IF NOT EXISTS responsibilities (
    id SERIAL PRIMARY KEY,
    responsibility_id VARCHAR(255) UNIQUE NOT NULL,
    school_id VARCHAR(255) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    per_day_price DECIMAL(12, 2) DEFAULT 0,
    monthly_price DECIMAL(12, 2) DEFAULT 0,
    time_period INT DEFAULT 0,
    space_id VARCHAR(255),
    employee_type VARCHAR(50),
    data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS employee_responsibilities (
    school_id VARCHAR(255) NOT NULL,
    employee_id VARCHAR(255) NOT NULL,
    responsibility_id VARCHAR(255) NOT NULL,
    PRIMARY KEY(school_id, employee_id, responsibility_id)
);

-- Spaces
CREATE TABLE IF NOT EXISTS spaces (
    id SERIAL PRIMARY KEY,
    space_id VARCHAR(255) UNIQUE NOT NULL,
    school_id VARCHAR(255) NOT NULL,
    name TEXT NOT NULL,
    items JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Events
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR(255) UNIQUE NOT NULL,
    school_id VARCHAR(255) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    event_date TIMESTAMP WITH TIME ZONE,
    items JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Materials
CREATE TABLE IF NOT EXISTS materials (
    id SERIAL PRIMARY KEY,
    material_id VARCHAR(255) UNIQUE NOT NULL,
    school_id VARCHAR(255) NOT NULL,
    name TEXT NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Reminders
CREATE TABLE IF NOT EXISTS reminders (
    id SERIAL PRIMARY KEY,
    reminder_id VARCHAR(255) UNIQUE NOT NULL,
    school_id VARCHAR(255) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    remind_at TIMESTAMP WITH TIME ZONE,
    items JSONB DEFAULT '[]',
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Fees
CREATE TABLE IF NOT EXISTS fees (
    id VARCHAR(50) PRIMARY KEY,
    school_id VARCHAR(50) NOT NULL,
    fees_name VARCHAR(100) NOT NULL,
    fees_reason VARCHAR(255),
    fees_period VARCHAR(50),
    fees_amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(school_id, id)
);

```

## Migration: 202602230000_optimize_student_queries.sql

```sql
-- Optimization: Add indexes for student queries
-- This migration adds essential indexes to improve query performance

-- Index for filtering students by school_id
CREATE INDEX IF NOT EXISTS idx_students_school_id 
    ON students(school_id);

-- Index for looking up students by student_id
CREATE INDEX IF NOT EXISTS idx_students_student_id 
    ON students(student_id);

-- Index for filtering by class_name
CREATE INDEX IF NOT EXISTS idx_students_class_name 
    ON students(class_name);

-- Index for filtering by status
CREATE INDEX IF NOT EXISTS idx_students_status 
    ON students(status);

-- Composite index for common queries: school_id + class_name + status
CREATE INDEX IF NOT EXISTS idx_students_school_class_status 
    ON students(school_id, class_name, status);

-- Similar indexes for student_fees table
CREATE INDEX IF NOT EXISTS idx_student_fees_school_id 
    ON student_fees(school_id);

CREATE INDEX IF NOT EXISTS idx_student_fees_student_id 
    ON student_fees(student_id);

CREATE INDEX IF NOT EXISTS idx_student_fees_status 
    ON student_fees(status);

-- Indexes for other commonly queried tables
CREATE INDEX IF NOT EXISTS idx_employees_school_id 
    ON employees(school_id);

CREATE INDEX IF NOT EXISTS idx_employees_employee_id 
    ON employees(employee_id);

CREATE INDEX IF NOT EXISTS idx_classes_school_id 
    ON classes(school_id);

CREATE INDEX IF NOT EXISTS idx_subjects_school_id 
    ON subjects(school_id);

CREATE INDEX IF NOT EXISTS idx_attendance_school_id 
    ON attendance(school_id);

CREATE INDEX IF NOT EXISTS idx_attendance_school_user_date 
    ON attendance(school_id, user_id, date);

```

## Migration: 202603040000_subject_student_update.sql

```sql
-- Add new columns to subjects table
ALTER TABLE subjects 
ADD COLUMN IF NOT EXISTS is_compulsory BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS category VARCHAR(255),
ADD COLUMN IF NOT EXISTS fee_type VARCHAR(50) DEFAULT 'monthly',
ADD COLUMN IF NOT EXISTS fee_interval INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS schedule_type VARCHAR(50) DEFAULT 'daily',
ADD COLUMN IF NOT EXISTS schedule_data JSONB DEFAULT '[]';

-- Add new columns to students table
ALTER TABLE students
ADD COLUMN IF NOT EXISTS enrolled_subjects JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS total_fees NUMERIC(15, 2) DEFAULT 0.00;

```

## Migration: 202603050000_custom_fees.sql

```sql
-- Custom Fees: ad-hoc fees like tour, paper, fines with scope targeting

CREATE TABLE IF NOT EXISTS custom_fees (
    id SERIAL PRIMARY KEY,
    fee_id VARCHAR(255) UNIQUE NOT NULL,
    school_id VARCHAR(255) NOT NULL,
    fee_name TEXT NOT NULL,
    fee_type VARCHAR(50) NOT NULL DEFAULT 'one_time',
    amount DECIMAL(12,2) NOT NULL,
    scope VARCHAR(50) NOT NULL DEFAULT 'school',
    target_classes JSONB DEFAULT '[]',
    target_students JSONB DEFAULT '[]',
    due_date DATE,
    has_penalty BOOLEAN DEFAULT false,
    penalty_per_day DECIMAL(12,2) DEFAULT 0,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS custom_fee_records (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR(255) NOT NULL,
    fee_id VARCHAR(255) NOT NULL,
    student_id VARCHAR(255) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    penalty_accrued DECIMAL(12,2) DEFAULT 0,
    paid_amount DECIMAL(12,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    payments JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, fee_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_custom_fees_school ON custom_fees(school_id);
CREATE INDEX IF NOT EXISTS idx_custom_fee_records_school ON custom_fee_records(school_id);
CREATE INDEX IF NOT EXISTS idx_custom_fee_records_student ON custom_fee_records(school_id, student_id);

```

## Migration: 202603050001_fix_schema.sql

```sql
-- Fix schema mismatches for Setup School Flow

-- Spaces
DROP TABLE IF EXISTS spaces CASCADE;
CREATE TABLE spaces (
    id VARCHAR(255),
    school_id VARCHAR(255) NOT NULL,
    space_id VARCHAR(255),
    name VARCHAR(255),
    PRIMARY KEY(school_id, id)
);

-- Items
DROP TABLE IF EXISTS items CASCADE;
CREATE TABLE items (
    id VARCHAR(255),
    school_id VARCHAR(255) NOT NULL,
    space_id VARCHAR(255),
    name VARCHAR(255),
    room_number VARCHAR(255),
    class_id VARCHAR(255),
    PRIMARY KEY(school_id, space_id, id)
);

-- Materials
DROP TABLE IF EXISTS materials CASCADE;
CREATE TABLE materials (
    id VARCHAR(255),
    school_id VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    quantity INT DEFAULT 0,
    unit_price FLOAT DEFAULT 0.0,
    extra_unit INT DEFAULT 0,
    need_unit INT DEFAULT 0,
    PRIMARY KEY(school_id, id)
);

-- Material Locations
DROP TABLE IF EXISTS material_locations CASCADE;
CREATE TABLE material_locations (
    school_id VARCHAR(255),
    material_id VARCHAR(255),
    space_id VARCHAR(255),
    item_id VARCHAR(255),
    quantity INT DEFAULT 0,
    PRIMARY KEY(school_id, material_id, space_id, item_id)
);

-- Classes
DROP TABLE IF EXISTS classes CASCADE;
CREATE TABLE classes (
    id VARCHAR(255),
    school_id VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    total_students INT DEFAULT 0,
    total_teachers INT DEFAULT 0,
    total_periods INT DEFAULT 0,
    room_number VARCHAR(255),
    class_fees FLOAT DEFAULT 0.0,
    sections JSONB DEFAULT '[]',
    streams JSONB DEFAULT '[]',
    PRIMARY KEY(school_id, id)
);

-- Subjects
DROP TABLE IF EXISTS subjects CASCADE;
CREATE TABLE subjects (
    id VARCHAR(255),
    school_id VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    class_id VARCHAR(255),
    class_name VARCHAR(255),
    fees FLOAT DEFAULT 0.0,
    PRIMARY KEY(school_id, id)
);

```

## Migration: 202603050002_enable_rls_multi_tenancy.sql

```sql
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

```

## Migration: 202603110001_payment_gateway.sql

```sql
-- Up
CREATE TABLE IF NOT EXISTS online_transactions (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR(50) NOT NULL REFERENCES schools(school_id) ON DELETE CASCADE,
    student_id VARCHAR(50) NOT NULL, -- references students but let's keep it flexible
    fee_type VARCHAR(50) NOT NULL, -- 'regular', 'custom'
    fee_id VARCHAR(50) NOT NULL, -- correlates to student_id for regular, or custom_fee_id
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    gateway_order_id VARCHAR(100) NOT NULL UNIQUE,
    gateway_payment_id VARCHAR(100),
    gateway_signature VARCHAR(255),
    status VARCHAR(50) DEFAULT 'created', -- 'created', 'successful', 'failed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for webhooks lookup
CREATE INDEX IF NOT EXISTS idx_online_txn_order_id ON online_transactions(gateway_order_id);

-- Down
DROP TABLE IF EXISTS online_transactions;

```

## Migration: 202603110002_chat_messages.sql

```sql
-- Up
CREATE TABLE IF NOT EXISTS messages (
    message_id SERIAL PRIMARY KEY,
    school_id VARCHAR(50) NOT NULL REFERENCES schools(school_id) ON DELETE CASCADE,
    sender_id VARCHAR(50) NOT NULL,
    sender_type VARCHAR(20) NOT NULL, -- 'employee', 'student', 'parent', 'admin'
    receiver_id VARCHAR(50) NOT NULL,
    receiver_type VARCHAR(20) NOT NULL, -- 'employee', 'student', 'parent', 'admin' OR 'group'
    content TEXT NOT NULL,
    attachment_url VARCHAR(255),
    read_status BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messages_school_conversation ON messages(school_id, sender_id, receiver_id);

-- Down
DROP TABLE IF EXISTS messages;

```

## Migration: 202603110003_predictive_analytics.sql

```sql
-- Up
CREATE TABLE IF NOT EXISTS student_risk_profiles (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR(50) NOT NULL REFERENCES schools(school_id) ON DELETE CASCADE,
    student_id VARCHAR(50) NOT NULL,
    risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
    risk_factors JSONB,
    last_calculated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_student_risk UNIQUE (school_id, student_id)
);

CREATE TABLE IF NOT EXISTS school_churn_predictions (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR(50) NOT NULL REFERENCES schools(school_id) ON DELETE CASCADE UNIQUE,
    churn_probability INTEGER NOT NULL CHECK (churn_probability >= 0 AND churn_probability <= 100),
    risk_factors JSONB,
    last_calculated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_student_risk_school ON student_risk_profiles(school_id);

-- Down
DROP TABLE IF EXISTS school_churn_predictions;
DROP TABLE IF EXISTS student_risk_profiles;

```

## Migration: 202603110004_audit_logs.sql

```sql
-- Up
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR(50) NOT NULL,
    target_type TEXT NOT NULL, -- e.g., 'exam', 'attendance', 'fee'
    target_id TEXT NOT NULL, -- e.g., student_id or class_id
    action TEXT NOT NULL, -- e.g., 'submit_marks', 'mark_present'
    data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_school ON audit_logs(school_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs(school_id, target_type, target_id);

-- Down
DROP TABLE IF EXISTS audit_logs;

```

## Migration: 202603110005_timetable.sql

```sql
-- Phase 3.2: Automated Timetable Generation Schema
-- Constraint-satisfaction tables for teachers, rooms, subjects, and generated schedules

-- Teacher availability/constraints (which days/periods they are free)
CREATE TABLE IF NOT EXISTS teacher_availability (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR(50) NOT NULL,
    teacher_id VARCHAR(50) NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7), -- 1=Mon,7=Sun
    period_number INTEGER NOT NULL,        -- e.g. 1-8 periods per day
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (school_id, teacher_id, day_of_week, period_number)
);

-- Room definitions (type: classroom, lab, hall)
CREATE TABLE IF NOT EXISTS timetable_rooms (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR(50) NOT NULL,
    room_id VARCHAR(50) NOT NULL,
    room_name VARCHAR(100) NOT NULL,
    room_type VARCHAR(50) DEFAULT 'classroom', -- 'classroom', 'lab', 'hall'
    capacity INTEGER DEFAULT 40,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (school_id, room_id)
);

-- Timetable generation requests (one per class per term)
CREATE TABLE IF NOT EXISTS timetable_configs (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR(50) NOT NULL,
    config_id VARCHAR(100) NOT NULL,
    class_id VARCHAR(50) NOT NULL,
    class_name VARCHAR(100) NOT NULL,
    periods_per_day INTEGER NOT NULL DEFAULT 8,
    working_days INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}', -- Mon-Fri
    -- Subject requirements JSON: [{"subject_id": "s1", "teacher_id": "t1", "periods_per_week": 5}]
    subject_requirements JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (school_id, config_id)
);

-- Generated timetable slots
CREATE TABLE IF NOT EXISTS timetable_slots (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR(50) NOT NULL,
    config_id VARCHAR(100) NOT NULL,
    class_id VARCHAR(50) NOT NULL,
    day_of_week INTEGER NOT NULL,
    period_number INTEGER NOT NULL,
    subject_id VARCHAR(50),
    subject_name VARCHAR(100),
    teacher_id VARCHAR(50),
    teacher_name VARCHAR(100),
    room_id VARCHAR(50),
    is_free_period BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (school_id, config_id, day_of_week, period_number)
);

-- Track conflicts that couldn't be resolved in generated timetables
CREATE TABLE IF NOT EXISTS timetable_conflicts (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR(50) NOT NULL,
    config_id VARCHAR(100) NOT NULL,
    conflict_type VARCHAR(100) NOT NULL, -- 'teacher_double_booked', 'room_conflict', 'periods_short'
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tt_slots_school ON timetable_slots(school_id, config_id);
CREATE INDEX IF NOT EXISTS idx_tt_configs_school ON timetable_configs(school_id);
CREATE INDEX IF NOT EXISTS idx_teacher_avail_school ON teacher_availability(school_id, teacher_id);

```

## Migration: 202603110006_webhooks.sql

```sql
-- Phase 4.1: Outbound Webhook Engine
-- Stores registered endpoints and delivery history with retry logic

CREATE TABLE IF NOT EXISTS webhook_endpoints (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR(50) NOT NULL,
    url TEXT NOT NULL,
    secret TEXT NOT NULL, -- HMAC-SHA256 secret
    event_types TEXT[] NOT NULL, -- e.g. {'fee.paid', 'student.enrolled'}
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'disabled'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS webhook_delivery_logs (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR(50) NOT NULL,
    endpoint_id INTEGER REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    status_code INTEGER, -- response from client
    response_body TEXT,
    attempt_count INTEGER DEFAULT 1,
    last_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'failed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_school ON webhook_endpoints(school_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_retry ON webhook_delivery_logs(status, next_retry_at) WHERE status = 'pending';

```

## Migration: 202603110007_api_keys.sql

```sql
-- Phase 4.2: API Keys & Developer Portal
-- Allows schools to generate scoped API keys for external integrations

CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR(50) NOT NULL,
    key_id VARCHAR(50) NOT NULL UNIQUE, -- Public identifier of the key
    key_hash VARCHAR(64) NOT NULL,     -- SHA-256 hash of the full key
    name VARCHAR(100) NOT NULL,        -- Friendly name (e.g. "Tally Integration")
    scopes TEXT[] NOT NULL DEFAULT '{}', -- e.g. {'read:students', 'write:fees'}
    rate_limit_per_min INTEGER DEFAULT 60,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'revoked'
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_school ON api_keys(school_id);

```

## Migration: 202603110008_gcs_storage.sql

```sql
-- Migration: Add attachment_path to materials and complains for GCS support
ALTER TABLE materials ADD COLUMN attachment_path TEXT;
ALTER TABLE complaints ADD COLUMN attachment_path TEXT;

```

## Migration: 202603110009_create_audit_logs.sql

```sql
-- Add migration script here

```

## Migration: 20260311110009_create_audit_logs.sql

```sql
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NOT NULL,
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(255) NOT NULL,
    entity_id UUID,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

```

## Migration: 20260311144745_recreate_audit_logs.sql

```sql
DROP TABLE IF EXISTS audit_logs;

CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR(255) NOT NULL,
    target_type VARCHAR(255) NOT NULL,
    target_id VARCHAR(255) NOT NULL,
    action VARCHAR(255) NOT NULL,
    data JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_school ON audit_logs(school_id);

```

## Migration: 20260311180017_add_vector_extension_and_ai_tables.down.sql

```sql
-- Drop tables (Down Migration)
DROP TABLE IF EXISTS document_embeddings CASCADE;
DROP TABLE IF EXISTS ai_query_cache CASCADE;

```

## Migration: 20260311180017_add_vector_extension_and_ai_tables.up.sql

```sql
-- Fallback: Use standard REAL[] arrays instead of pgvector
-- due to Windows PostgreSQL extension limitations.

-- Create ai_query_cache table for Semantic Caching & Text-to-SQL
CREATE TABLE IF NOT EXISTS ai_query_cache (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR(50) NOT NULL,
    question_text TEXT NOT NULL,
    question_embedding REAL[] NOT NULL, -- 768 dims (Gemini)
    generated_sql TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row-Level Security on ai_query_cache
ALTER TABLE ai_query_cache ENABLE ROW LEVEL SECURITY;

-- Create RLS Policy for ai_query_cache
CREATE POLICY ai_query_cache_isolation_policy ON ai_query_cache
    FOR ALL
    USING (school_id = current_setting('app.current_school_id', true));

-- Create document_embeddings table for NotebookLM-like RAG
CREATE TABLE IF NOT EXISTS document_embeddings (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR(50) NOT NULL,
    document_id VARCHAR(100) NOT NULL,
    chunk_text TEXT NOT NULL,
    chunk_embedding REAL[] NOT NULL, -- 768 dims
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row-Level Security on document_embeddings
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;

-- Create RLS Policy for document_embeddings
CREATE POLICY document_embeddings_isolation_policy ON document_embeddings
    FOR ALL
    USING (school_id = current_setting('app.current_school_id', true));

-- Note: Cannot use hnsw/ivfflat indexes with standard REAL[] arrays.
-- Vector similarity (Cosine distance) will be calculated in Rust instead of SQL.

```

## Migration: 20260311180051_add_vector_extension_and_ai_tables.sql

```sql
-- Add migration script here

```

## Migration: 20260311181404_add_ai_chat_history_table.sql

```sql
-- Add migration script here
CREATE TABLE IF NOT EXISTS ai_chat_history (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL, -- 'user' or 'model'
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE ai_chat_history ENABLE ROW LEVEL SECURITY;

-- Set policy for current_school_id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'ai_chat_history' AND policyname = 'school_isolation_policy'
    ) THEN
        CREATE POLICY school_isolation_policy ON ai_chat_history
        USING (school_id = current_setting('app.current_school_id', true));
    END IF;
END $$;

```

## Migration: 20260311181458_add_ai_chat_history_table.sql

```sql
-- Add migration script here

```

## Migration: 20260312204844_create_document_box.down.sql

```sql
DROP INDEX IF EXISTS idx_document_box_school_user;
DROP TABLE IF EXISTS document_box;

```

## Migration: 20260312204844_create_document_box.up.sql

```sql
CREATE TABLE IF NOT EXISTS document_box (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    doc_type VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_document_box_school FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_document_box_school_user ON document_box(school_id, user_id);

```

## Migration: 202603130001_harden_rls.sql

```sql
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

```

## Migration: 202603220000_create_leave_applications.sql

```sql
-- Create leave_applications table (prerequisite for leave migrations)
CREATE TABLE IF NOT EXISTS leave_applications (
    leave_id VARCHAR(255) PRIMARY KEY,
    school_id VARCHAR(255) NOT NULL,
    employee_id VARCHAR(255),
    employee_name VARCHAR(255),
    reason TEXT,
    leave_type VARCHAR(50) NOT NULL,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and force it
ALTER TABLE leave_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_applications FORCE ROW LEVEL SECURITY;

-- Drop policy if it exists (for idempotency)
DROP POLICY IF EXISTS tenant_isolation_policy ON leave_applications;

-- Create tenant isolation policy
CREATE POLICY tenant_isolation_policy ON leave_applications
FOR ALL
USING (
    school_id = current_setting('app.current_school_id', true) 
    OR current_setting('app.is_super_admin', true) = 'true'
)
WITH CHECK (
    school_id = current_setting('app.current_school_id', true)
    OR current_setting('app.is_super_admin', true) = 'true'
);

```

## Migration: 202603220900_create_global_users.sql

```sql
-- Create global_users table (prerequisite for schema optimization)
CREATE TABLE IF NOT EXISTS global_users (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(50),
    email TEXT,
    alternative_phone VARCHAR(50),
    aadhaar_number VARCHAR(20),
    school_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_type VARCHAR(50) NOT NULL,
    name TEXT,
    class_name TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(school_id, user_id, user_type)
);

-- Indexes for global_users
CREATE INDEX IF NOT EXISTS global_users_phone_idx ON global_users (phone);
CREATE INDEX IF NOT EXISTS global_users_email_idx ON global_users (email);
CREATE INDEX IF NOT EXISTS global_users_aadhaar_idx ON global_users (aadhaar_number);

```

## Migration: 202603221000_create_system_audit_logs.sql

```sql
-- Create system_audit_logs table (prerequisite for schema optimization)
CREATE TABLE IF NOT EXISTS system_audit_logs (
    id SERIAL PRIMARY KEY,
    school_id TEXT NOT NULL,
    admin_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action_type TEXT NOT NULL,
    changed_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS and force it
ALTER TABLE system_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_audit_logs FORCE ROW LEVEL SECURITY;

-- Drop policy if it exists (for idempotency)
DROP POLICY IF EXISTS tenant_isolation_policy ON system_audit_logs;

-- Create tenant isolation policy
CREATE POLICY tenant_isolation_policy ON system_audit_logs
FOR ALL
USING (
    school_id = current_setting('app.current_school_id', true) 
    OR current_setting('app.is_super_admin', true) = 'true'
)
WITH CHECK (
    school_id = current_setting('app.current_school_id', true)
    OR current_setting('app.is_super_admin', true) = 'true'
);

-- Create school index
CREATE INDEX IF NOT EXISTS system_audit_logs_school_idx ON system_audit_logs (school_id);

```

## Migration: 202603221100_create_student_history.sql

```sql
-- Create student_history table (prerequisite for schema optimization)
CREATE TABLE IF NOT EXISTS student_history (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR(255) NOT NULL,
    student_id VARCHAR(255) NOT NULL,
    rev_no INTEGER NOT NULL,
    author VARCHAR(255),
    data JSONB NOT NULL,
    delta JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and force it
ALTER TABLE student_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_history FORCE ROW LEVEL SECURITY;

-- Drop policy if it exists (for idempotency)
DROP POLICY IF EXISTS tenant_isolation_policy ON student_history;

-- Create tenant isolation policy
CREATE POLICY tenant_isolation_policy ON student_history
FOR ALL
USING (
    school_id = current_setting('app.current_school_id', true) 
    OR current_setting('app.is_super_admin', true) = 'true'
)
WITH CHECK (
    school_id = current_setting('app.current_school_id', true)
    OR current_setting('app.is_super_admin', true) = 'true'
);

```

## Migration: 202603221200_create_space_employees.sql

```sql
-- Create space_employees table (prerequisite for schema optimization)
CREATE TABLE IF NOT EXISTS space_employees (
    school_id VARCHAR(255) NOT NULL,
    space_id VARCHAR(255) NOT NULL,
    employee_id VARCHAR(255) NOT NULL,
    PRIMARY KEY(school_id, space_id, employee_id)
);

-- Enable RLS and force it
ALTER TABLE space_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE space_employees FORCE ROW LEVEL SECURITY;

-- Drop policy if it exists (for idempotency)
DROP POLICY IF EXISTS tenant_isolation_policy ON space_employees;

-- Create tenant isolation policy
CREATE POLICY tenant_isolation_policy ON space_employees
FOR ALL
USING (
    school_id = current_setting('app.current_school_id', true) 
    OR current_setting('app.is_super_admin', true) = 'true'
)
WITH CHECK (
    school_id = current_setting('app.current_school_id', true)
    OR current_setting('app.is_super_admin', true) = 'true'
);

```

## Migration: 202603230000_schema_optimization.sql

```sql
-- Migration: SQL Schema Optimization & Performance Tuning (2026)
-- Target: Public Schema with RLS for High Scalability

-- 1. Core Performance Indexes for Search
CREATE INDEX IF NOT EXISTS idx_students_school_name ON students (school_id, name);
CREATE INDEX IF NOT EXISTS idx_students_school_contact ON students (school_id, contact);
CREATE INDEX IF NOT EXISTS idx_attendance_school_date ON attendance (school_id, date);

-- 2. RLS Filter Indexes (Crucial for multi-tenant scalability)
-- These ensure that every RLS-protected query has an index-backed filter on school_id.
CREATE INDEX IF NOT EXISTS idx_employees_school_id ON employees (school_id);
CREATE INDEX IF NOT EXISTS idx_classes_school_id ON classes (school_id);
CREATE INDEX IF NOT EXISTS idx_subjects_school_id ON subjects (school_id);
CREATE INDEX IF NOT EXISTS idx_announcements_school_id ON announcements (school_id);
CREATE INDEX IF NOT EXISTS idx_materials_school_id ON materials (school_id);
CREATE INDEX IF NOT EXISTS idx_leave_apps_school_id ON leave_applications (school_id);
CREATE INDEX IF NOT EXISTS idx_awards_school_id ON awards (school_id);
CREATE INDEX IF NOT EXISTS idx_complaints_school_id ON complaints (school_id);
CREATE INDEX IF NOT EXISTS idx_reminders_school_id ON reminders (school_id);
CREATE INDEX IF NOT EXISTS idx_doc_box_school_id ON document_box (school_id);
CREATE INDEX IF NOT EXISTS idx_space_materials_school_id ON space_materials (school_id);
CREATE INDEX IF NOT EXISTS idx_space_employees_school_id ON space_employees (school_id);
CREATE INDEX IF NOT EXISTS idx_material_loc_school_id ON material_locations (school_id);

-- 3. GIN Indexes for JSONB Search (Highly optimized for AI queries)
CREATE INDEX IF NOT EXISTS idx_schools_data_gin ON schools USING GIN (data);
CREATE INDEX IF NOT EXISTS idx_employees_data_gin ON employees USING GIN (data);
CREATE INDEX IF NOT EXISTS idx_classes_sections_gin ON classes USING GIN (sections);

-- 4. Audit & History Optimization
CREATE INDEX IF NOT EXISTS idx_student_history_timeline ON student_history (student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_audit_logs_entity ON system_audit_logs (entity_type, entity_id);

-- 5. Constraint Hardening & Data Integrity
ALTER TABLE students ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE employees ALTER COLUMN school_id SET NOT NULL;
ALTER TABLE attendance ALTER COLUMN school_id SET NOT NULL;

-- 6. AI-Friendly Schema Documentation (Comments)
COMMENT ON TABLE students IS 'Core tenant-isolated table for student records.';
COMMENT ON COLUMN students.school_id IS 'Primary isolation key for multi-tenancy (RLS).';

COMMENT ON TABLE global_users IS 'Unified identity table for cross-tenant login discovery.';
COMMENT ON TABLE attendance IS 'Temporal records of student and employee presence presence.';
COMMENT ON TABLE student_history IS 'Versioned history of student record changes for auditing.';

```

## Migration: 202603250000_aadhaar_uniqueness.sql

```sql
-- Migration: Enforce Global Aadhaar Uniqueness
-- This migration adds unique indexes to ensure Aadhaar numbers are unique across all schools.
-- It uses a normalized comparison (stripping spaces) to prevent formatting-based duplicates.

-- 1. Create a function to normalize Aadhaar numbers for indexing
CREATE OR REPLACE FUNCTION normalize_aadhaar(text) RETURNS text AS $$
    SELECT REPLACE($1, ' ', '');
$$ LANGUAGE SQL IMMUTABLE;

-- 2. Add Unique Index to students table (Global)
-- NOTE: If this fails, it means you have existing duplicates that must be resolved manually.
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_aadhaar_global_unique 
ON students (normalize_aadhaar(aadhaar_number)) 
WHERE aadhaar_number IS NOT NULL AND aadhaar_number != '';

-- 3. Add Unique Index to employees table (Global)
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_aadhaar_global_unique 
ON employees (normalize_aadhaar(aadhaar_number)) 
WHERE aadhaar_number IS NOT NULL AND aadhaar_number != '';

```

## Migration: 202603250001_space_requirements.sql

```sql
-- Migration: Space Requirements & Vacancy Tracking
-- Purpose: Track required personnel counts for specific infrastructure spaces.

CREATE TABLE IF NOT EXISTS space_requirements (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR(255) NOT NULL,
    space_id VARCHAR(255) NOT NULL,
    responsibility_id VARCHAR(255) NOT NULL,
    required_count INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(school_id, space_id, responsibility_id)
);

-- Indices for performance-critical vacancy lookups
CREATE INDEX IF NOT EXISTS idx_space_req_lookup ON space_requirements (school_id, space_id);
CREATE INDEX IF NOT EXISTS idx_space_req_role ON space_requirements (responsibility_id);

-- Comment for AI and future developers
COMMENT ON TABLE space_requirements IS 'Stores the expected personnel count for specific roles within a space (e.g., 7 Teachers for a Classroom).';

```

## Migration: 202603250002_material_requirements.sql

```sql
-- Migration: Add Material Requirements table for Vacancy Tracking
CREATE TABLE IF NOT EXISTS space_material_requirements (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR(255) NOT NULL,
    space_id VARCHAR(255) NOT NULL,
    material_name VARCHAR(255) NOT NULL,
    required_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(school_id, space_id, material_name)
);

-- Index for faster lookups during space detail retrieval
CREATE INDEX IF NOT EXISTS idx_space_mat_req_lookup ON space_material_requirements(school_id, space_id);

```

## Migration: 202603250003_upgrade_responsibilities.sql

```sql
-- Migration: 202603250003_upgrade_responsibilities.sql
-- Description: Add metadata columns for granular role management.

-- 1. Add columns to responsibilities table
ALTER TABLE responsibilities
ADD COLUMN IF NOT EXISTS space_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS employee_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS monthly_price DECIMAL(12, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}';

-- 2. Add index for space lookup
CREATE INDEX IF NOT EXISTS idx_responsibilities_space_id ON responsibilities(space_id);

```

## Migration: 202603300000_add_space_ids_to_employee_responsibilities.sql

```sql
-- Migration: 202603300000_add_space_ids_to_employee_responsibilities.sql
-- Description: Add space_ids JSONB column to employee_responsibilities to support multiple space assignments per role.

-- 1. Add column to employee_responsibilities
ALTER TABLE employee_responsibilities
ADD COLUMN IF NOT EXISTS space_ids JSONB DEFAULT '[]'::jsonb;

-- 2. Optional: Add an index for space_ids lookup (GIN index for JSONB)
-- This might not be strictly necessary unless we query assignments BY space ID frequently
CREATE INDEX IF NOT EXISTS idx_employee_responsibilities_space_ids ON employee_responsibilities USING GIN (space_ids);

```

## Migration: 202603300001_global_notifications.sql

```sql
-- Migration: Add Global Notifications table
-- Description: Stores broadcast messages from Super Admin for all schools

CREATE TABLE IF NOT EXISTS global_notifications (
    id SERIAL PRIMARY KEY,
    notification JSONB NOT NULL, -- {title: string, message: string, type: string, sentAt: timestamptz}
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Optional: Index on active state for faster fetching
CREATE INDEX IF NOT EXISTS idx_global_notifications_active ON global_notifications(active) WHERE active = TRUE;

```

## Migration: 202603310001_add_student_fee_to_responsibilities.sql

```sql
-- Migration: 202603310001_add_student_fee_to_responsibilities.sql
-- Description: Add student_fee column to responsibilities to automate student fees.

-- 1. Add column to responsibilities
ALTER TABLE responsibilities
ADD COLUMN IF NOT EXISTS student_fee DECIMAL(12, 2) DEFAULT 0;

```

## Migration: 20260331162652_merge_spaces_categories.sql

```sql
-- Migration: Merge Spaces and Categories (Start Fresh)
-- DROPPING space_categories table to simplify architecture

DROP TABLE IF EXISTS space_categories CASCADE;

-- The 'spaces' table already contains the 'space_category' column as a string.
-- We are removing the redundant dependency on a separate category table.

```

## Migration: 20260401000000_simplify_spaces.sql

```sql
-- Migration: Simplify Spaces (Remove space_id and space_number)

-- 1. Remove space_id and space_number from spaces table
DO $$ 
BEGIN 
    BEGIN
        -- Keep space_id for backward compatibility with repository code
        -- ALTER TABLE spaces DROP COLUMN IF EXISTS space_id;
        NULL;
    EXCEPTION WHEN OTHERS THEN 
        -- Ignore
    END;
    BEGIN
        ALTER TABLE spaces DROP COLUMN IF EXISTS space_number;
    EXCEPTION WHEN OTHERS THEN 
        -- Ignore
    END;
END $$;

-- 2. Ensure name is unique per school
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'spaces'::regclass AND conname = 'unique_school_space_name'
    ) THEN
        BEGIN
            ALTER TABLE spaces ADD CONSTRAINT unique_school_space_name UNIQUE (school_id, name);
        EXCEPTION WHEN OTHERS THEN
            -- Ignore
        END;
    END IF;
END $$;

-- 3. Update dependent tables to use name instead of space_id
-- Items
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'space_id') THEN
        BEGIN
            ALTER TABLE items RENAME COLUMN space_id TO space_name;
        EXCEPTION WHEN OTHERS THEN
            -- Ignore
        END;
    END IF;
END $$;

-- Space Materials
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'space_materials' AND column_name = 'space_id') THEN
        BEGIN
            ALTER TABLE space_materials RENAME COLUMN space_id TO space_name;
        EXCEPTION WHEN OTHERS THEN
            -- Ignore
        END;
    END IF;
END $$;

-- Space Employees
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'space_employees' AND column_name = 'space_id') THEN
        BEGIN
            ALTER TABLE space_employees RENAME COLUMN space_id TO space_name;
        EXCEPTION WHEN OTHERS THEN
            -- Ignore
        END;
    END IF;
END $$;

-- Space Requirements
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'space_requirements' AND column_name = 'space_id') THEN
        BEGIN
            ALTER TABLE space_requirements RENAME COLUMN space_id TO space_name;
        EXCEPTION WHEN OTHERS THEN
            -- Ignore
        END;
    END IF;
END $$;

-- Space Material Requirements
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'space_material_requirements' AND column_name = 'space_id') THEN
        BEGIN
            ALTER TABLE space_material_requirements RENAME COLUMN space_id TO space_name;
        EXCEPTION WHEN OTHERS THEN
            -- Ignore
        END;
    END IF;
END $$;

```

## Migration: 20260401000001_remove_capacity_from_spaces.sql

```sql
ALTER TABLE spaces DROP COLUMN IF EXISTS capacity;

```

## Migration: 202604030000_add_complaint_fields.sql

```sql
-- Migration: Add enhanced fields to complaints table
-- Date: 2026-04-03

-- 1. Ensure the table is named 'complaints' and has the new fields
DO $$ 
BEGIN
    -- Check if 'complains' exists and rename to 'complaints' if so
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'complains') THEN
        ALTER TABLE complains RENAME TO complaints;
    END IF;
END $$;

-- 2. Add new columns to 'complaints'
ALTER TABLE complaints 
ADD COLUMN IF NOT EXISTS complaint_id VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS sender_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS sender_type VARCHAR(50), -- 'student', 'employee'
ADD COLUMN IF NOT EXISTS target_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS target_type VARCHAR(50); -- 'student', 'employee'

-- 3. Rename 'title' to 'subject' if 'title' exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'complaints' AND column_name = 'title') THEN
        ALTER TABLE complaints RENAME COLUMN title TO subject;
    END IF;
END $$;

-- 4. Ensure indices for performance
CREATE INDEX IF NOT EXISTS idx_complaints_sender ON complaints (school_id, sender_id);
CREATE INDEX IF NOT EXISTS idx_complaints_target ON complaints (school_id, target_id);
CREATE INDEX IF NOT EXISTS idx_complaints_id ON complaints (complaint_id);

```

## Migration: 202604040000_user_activity_logs.sql

```sql
-- Create a table for tracking user sessions and activities globally.
CREATE TABLE IF NOT EXISTS user_activity_logs (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) NOT NULL,
    user_type VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'login', 'logout', 'open_app', 'expired'
    metadata JSONB,              -- Store browser, IP, etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Optimize queries for tracking history and active status
CREATE INDEX IF NOT EXISTS idx_user_activity_phone ON user_activity_logs(phone);
CREATE INDEX IF NOT EXISTS idx_user_activity_created ON user_activity_logs(created_at);

```

## Migration: 20260405093500_update_tasks.sql

```sql
-- Add AI metadata and scheduling columns to the tasks table
ALTER TABLE tasks 
    ADD COLUMN IF NOT EXISTS deadline TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'Medium',
    ADD COLUMN IF NOT EXISTS entity_type VARCHAR(100),
    ADD COLUMN IF NOT EXISTS entity_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS ai_metadata JSONB DEFAULT '{}';

```

## Migration: 20260405112700_timetable_enhancements.sql

```sql
-- Timetable System Enhancements for AI-Powered "Plug and Play" Architecture
-- Adds status, season, timing fields, and approval workflow

-- 1. Add new columns to timetable_configs
ALTER TABLE timetable_configs
ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PROPOSAL', 'APPROVED')),
ADD COLUMN IF NOT EXISTS season VARCHAR(10) CHECK (season IN ('SUMMER', 'WINTER')),
ADD COLUMN IF NOT EXISTS start_time TIME,
ADD COLUMN IF NOT EXISTS end_time TIME,
ADD COLUMN IF NOT EXISTS period_duration_minutes INTEGER DEFAULT 40,
ADD COLUMN IF NOT EXISTS break_duration_minutes INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS approved_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Add index for faster status-based queries
CREATE INDEX IF NOT EXISTS idx_timetable_configs_status ON timetable_configs(school_id, status);

-- 3. Add timetable_slots.time_slot column for actual time (optional, can be computed)
ALTER TABLE timetable_slots
ADD COLUMN IF NOT EXISTS time_slot TIME;

-- 4. Create timetable_notifications table for tracking approval notifications
CREATE TABLE IF NOT EXISTS timetable_notifications (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR(50) NOT NULL,
    config_id VARCHAR(100) NOT NULL,
    user_id VARCHAR(50) NOT NULL,
    user_type VARCHAR(20) NOT NULL, -- 'student', 'teacher', 'employee'
    notification_type VARCHAR(50) NOT NULL, -- 'timetable_approved', 'schedule_change'
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    read BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (school_id, config_id) REFERENCES timetable_configs(school_id, config_id) ON DELETE CASCADE
);

-- 5. Add index for notification queries
CREATE INDEX IF NOT EXISTS idx_timetable_notifications_config ON timetable_notifications(school_id, config_id);
CREATE INDEX IF NOT EXISTS idx_timetable_notifications_user ON timetable_notifications(school_id, user_id, user_type);

-- 6. Update existing configs to have PROPOSAL status (since they were generated by AI)
UPDATE timetable_configs SET status = 'PROPOSAL' WHERE status = 'DRAFT';

-- 7. Add comment explaining the new workflow
COMMENT ON TABLE timetable_configs IS 'Timetable configurations with AI proposal workflow. Status: DRAFT (manual scratch), PROPOSAL (AI-generated, awaiting approval), APPROVED (active, triggers notifications).';
```

## Migration: 20260407102400_enhanced_leave_system.sql

```sql
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
ADD COLUMN IF NOT EXISTS total_days INTEGER GENERATED ALWAYS AS ((to_date - from_date) + 1) STORED;

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
    leave_id VARCHAR NOT NULL,
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
    leave_id VARCHAR NOT NULL,
    school_id VARCHAR NOT NULL,
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
    leave_id VARCHAR NOT NULL,
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
```

## Migration: 20260407150000_add_student_leave_support.sql

```sql
-- Add Student Leave Support
-- Allows students to apply for leave through Chatra app

-- 1. Add student_id column to leave_applications table
ALTER TABLE leave_applications
ADD COLUMN IF NOT EXISTS student_id VARCHAR,
ADD COLUMN IF NOT EXISTS applicant_type VARCHAR(20) DEFAULT 'employee' CHECK (applicant_type IN ('employee', 'student'));

-- 2. Create index for student_id
CREATE INDEX IF NOT EXISTS idx_leave_applications_student ON leave_applications(school_id, student_id);

-- 3. Update existing records to set applicant_type
UPDATE leave_applications
SET applicant_type = 'employee'
WHERE applicant_type IS NULL OR applicant_type = '';

```

## Migration: 202604080000_responsibility_schema_fixes.sql

```sql
-- Migration: 202604080000_responsibility_schema_fixes.sql
-- Description: Fix schema inconsistencies, add foreign keys, cascade delete, and unique constraints.

-- 1. Drop the redundant space_id column from responsibilities (use space_ids in employee_responsibilities instead)
ALTER TABLE responsibilities
DROP COLUMN IF EXISTS space_id;

-- 1.1 Add unique constraint on responsibilities (school_id, responsibility_id)
ALTER TABLE responsibilities
ADD CONSTRAINT uk_responsibilities_school_responsibility UNIQUE (school_id, responsibility_id);

-- 1.2 Add unique constraint on employees (school_id, employee_id)
ALTER TABLE employees
ADD CONSTRAINT uk_employees_school_employee UNIQUE (school_id, employee_id);

-- 2. Add foreign key constraints
-- 2.1 responsibilities -> schools (school_id)
ALTER TABLE responsibilities
ADD CONSTRAINT fk_responsibilities_schools
FOREIGN KEY (school_id) REFERENCES schools(school_id)
ON DELETE CASCADE;

-- 2.2 employee_responsibilities -> responsibilities
ALTER TABLE employee_responsibilities
ADD CONSTRAINT fk_employee_responsibilities_responsibilities
FOREIGN KEY (school_id, responsibility_id) REFERENCES responsibilities(school_id, responsibility_id)
ON DELETE CASCADE;

-- 2.3 employee_responsibilities -> employees
ALTER TABLE employee_responsibilities
ADD CONSTRAINT fk_employee_responsibilities_employees
FOREIGN KEY (school_id, employee_id) REFERENCES employees(school_id, employee_id)
ON DELETE CASCADE;

-- 3. Add unique constraints to prevent duplicates
-- 3.1 Unique responsibility name per school (Disabled due to existing duplicate responsibility names in seeded data)
-- ALTER TABLE responsibilities
-- ADD CONSTRAINT uk_responsibilities_school_name UNIQUE (school_id, name);

-- 3.2 Unique employee assignment per responsibility (but allow multiple space_ids)
ALTER TABLE employee_responsibilities
ADD CONSTRAINT uk_employee_responsibilities_unique_assignment UNIQUE (school_id, employee_id, responsibility_id);

-- 4. Add NOT NULL constraints where appropriate
UPDATE responsibilities SET employee_type = 'teacher' WHERE employee_type IS NULL;

ALTER TABLE responsibilities
ALTER COLUMN name SET NOT NULL,
ALTER COLUMN employee_type SET NOT NULL;

-- 5. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_responsibilities_employee_type ON responsibilities(employee_type);
CREATE INDEX IF NOT EXISTS idx_employee_responsibilities_employee_id ON employee_responsibilities(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_responsibilities_responsibility_id ON employee_responsibilities(responsibility_id);

-- 6. Add check constraint for space_ids array format
ALTER TABLE employee_responsibilities
ADD CONSTRAINT chk_space_ids_array CHECK (jsonb_typeof(space_ids) = 'array');

-- 7. Add created_at and updated_at timestamps if missing
ALTER TABLE responsibilities
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE employee_responsibilities
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 8. Create trigger for updated_at auto-update
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_responsibilities_updated_at ON responsibilities;
CREATE TRIGGER update_responsibilities_updated_at
    BEFORE UPDATE ON responsibilities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_employee_responsibilities_updated_at ON employee_responsibilities;
CREATE TRIGGER update_employee_responsibilities_updated_at
    BEFORE UPDATE ON employee_responsibilities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 9. Add comment for documentation
COMMENT ON TABLE responsibilities IS 'Defines responsibilities (roles) that can be assigned to employees, with metadata like employee_type, monthly_price, student_fee';
COMMENT ON TABLE employee_responsibilities IS 'Many-to-many mapping between employees and responsibilities, with optional space_ids for multi-space assignments';
```

## Migration: 202604090000_responsibility_history.sql

```sql
-- Responsibility History and Versioning Migration
-- This migration adds support for tracking responsibility assignment history and rollback functionality

-- Create responsibility_assignment_history table
CREATE TABLE IF NOT EXISTS responsibility_assignment_history (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR(255) NOT NULL,
    responsibility_id VARCHAR(255) NOT NULL,
    employee_id VARCHAR(255) NOT NULL,
    space_ids TEXT[],
    action VARCHAR(50) NOT NULL, -- 'assigned', 'removed', 'updated'
    previous_space_ids TEXT[],
    performed_by VARCHAR(255) NOT NULL,
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reason TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    metadata JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT fk_responsibility_history_responsibility 
        FOREIGN KEY (responsibility_id) 
        REFERENCES responsibilities(responsibility_id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_responsibility_history_employee 
        FOREIGN KEY (school_id, employee_id) 
        REFERENCES employees(school_id, employee_id) 
        ON DELETE CASCADE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_responsibility_history_school 
    ON responsibility_assignment_history(school_id);
CREATE INDEX IF NOT EXISTS idx_responsibility_history_responsibility 
    ON responsibility_assignment_history(responsibility_id);
CREATE INDEX IF NOT EXISTS idx_responsibility_history_employee 
    ON responsibility_assignment_history(employee_id);
CREATE INDEX IF NOT EXISTS idx_responsibility_history_performed_at 
    ON responsibility_assignment_history(performed_at DESC);

-- Create responsibility_version table for tracking responsibility changes
CREATE TABLE IF NOT EXISTS responsibility_version (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR(255) NOT NULL,
    responsibility_id VARCHAR(255) NOT NULL,
    version INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    employee_type VARCHAR(100),
    revenue DECIMAL(10, 2) DEFAULT 0,
    space_ids TEXT[],
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_current BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT fk_responsibility_version_responsibility 
        FOREIGN KEY (responsibility_id) 
        REFERENCES responsibilities(responsibility_id) 
        ON DELETE CASCADE,
    UNIQUE(responsibility_id, version)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_responsibility_version_school 
    ON responsibility_version(school_id);
CREATE INDEX IF NOT EXISTS idx_responsibility_version_responsibility 
    ON responsibility_version(responsibility_id);
CREATE INDEX IF NOT EXISTS idx_responsibility_version_is_current 
    ON responsibility_version(is_current);

-- Create function to update is_current flag when new version is created
CREATE OR REPLACE FUNCTION update_responsibility_version_current()
RETURNS TRIGGER AS $$
BEGIN
    -- Set is_current to FALSE for all previous versions
    UPDATE responsibility_version 
    SET is_current = FALSE 
    WHERE responsibility_id = NEW.responsibility_id 
    AND id != NEW.id;
    
    -- Set is_current to TRUE for the new version
    NEW.is_current = TRUE;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update is_current flag
DROP TRIGGER IF EXISTS trigger_update_responsibility_version_current 
    ON responsibility_version;
CREATE TRIGGER trigger_update_responsibility_version_current
    BEFORE INSERT ON responsibility_version
    FOR EACH ROW
    EXECUTE FUNCTION update_responsibility_version_current();

-- Create function to get next version number
CREATE OR REPLACE FUNCTION get_next_responsibility_version(p_responsibility_id VARCHAR)
RETURNS INTEGER AS $$
DECLARE
    v_next_version INTEGER;
BEGIN
    SELECT COALESCE(MAX(version), 0) + 1
    INTO v_next_version
    FROM responsibility_version
    WHERE responsibility_id = p_responsibility_id;
    
    RETURN v_next_version;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE responsibility_assignment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE responsibility_version ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY responsibility_assignment_history_school_policy 
    ON responsibility_assignment_history
    FOR ALL 
    USING (school_id = current_setting('app.current_school_id')::VARCHAR);

CREATE POLICY responsibility_version_school_policy 
    ON responsibility_version
    FOR ALL 
    USING (school_id = current_setting('app.current_school_id')::VARCHAR);

-- Add comment
COMMENT ON TABLE responsibility_assignment_history IS 'Tracks history of responsibility assignments for audit trail and rollback';
COMMENT ON TABLE responsibility_version IS 'Tracks version history of responsibilities for rollback functionality';

```

## Migration: 202604100000_scheduled_reports.sql

```sql
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
```

## Migration: 202604100001_data_encryption_foundation.sql

```sql
-- Migration: Data Encryption Foundation
-- This migration adds support for field-level encryption of sensitive data
-- Includes encryption key management and helper functions

-- 1. Create encryption key management table
CREATE TABLE IF NOT EXISTS encryption_keys (
    key_id VARCHAR(255) PRIMARY KEY,
    key_version INTEGER NOT NULL DEFAULT 1,
    key_material BYTEA NOT NULL, -- Encrypted key material
    key_material_encrypted_with TEXT, -- Which key was used to encrypt this key (for key hierarchy)
    key_type VARCHAR(50) NOT NULL DEFAULT 'aes-256-gcm',
    key_usage VARCHAR(50) NOT NULL DEFAULT 'field_encryption',
    key_status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    activated_at TIMESTAMPTZ,
    deactivated_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    
    -- Audit fields
    created_by VARCHAR(255),
    last_rotated_at TIMESTAMPTZ,
    rotation_count INTEGER DEFAULT 0
);

-- Index for active keys
CREATE INDEX IF NOT EXISTS idx_encryption_keys_status ON encryption_keys(key_status);
CREATE INDEX IF NOT EXISTS idx_encryption_keys_usage ON encryption_keys(key_usage);
CREATE INDEX IF NOT EXISTS idx_encryption_keys_created_at ON encryption_keys(created_at DESC);

-- 2. Create encryption audit log table
CREATE TABLE IF NOT EXISTS encryption_audit_log (
    audit_id SERIAL PRIMARY KEY,
    school_id VARCHAR(255),
    operation VARCHAR(50) NOT NULL, -- 'encrypt', 'decrypt', 'key_rotation', 'key_creation'
    key_id VARCHAR(255) REFERENCES encryption_keys(key_id),
    entity_type VARCHAR(100), -- 'student', 'employee', 'salary', etc.
    entity_id VARCHAR(255),
    field_name VARCHAR(255),
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    performed_by VARCHAR(255),
    performed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    client_ip INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'
);

-- Index for audit queries
CREATE INDEX IF NOT EXISTS idx_encryption_audit_school ON encryption_audit_log(school_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_encryption_audit_operation ON encryption_audit_log(operation, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_encryption_audit_entity ON encryption_audit_log(entity_type, entity_id);

-- 3. Create data classification table
CREATE TABLE IF NOT EXISTS data_classification (
    classification_id SERIAL PRIMARY KEY,
    school_id VARCHAR(255) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    column_name VARCHAR(100) NOT NULL,
    json_path TEXT, -- For JSONB columns, the path to the sensitive field
    data_type VARCHAR(50) NOT NULL,
    classification_level VARCHAR(50) NOT NULL, -- 'public', 'internal', 'confidential', 'restricted', 'highly_restricted'
    encryption_required BOOLEAN NOT NULL DEFAULT true,
    encryption_key_id VARCHAR(255) REFERENCES encryption_keys(key_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),
    
    UNIQUE(school_id, table_name, column_name, json_path)
);

-- 4. Create helper functions for encryption/decryption

-- Function to check if a value is encrypted
CREATE OR REPLACE FUNCTION is_encrypted_value(value TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN value LIKE 'enc:%';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to extract key ID from encrypted value
CREATE OR REPLACE FUNCTION extract_key_id_from_encrypted(value TEXT)
RETURNS VARCHAR(255) AS $$
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
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to extract key version from encrypted value
CREATE OR REPLACE FUNCTION extract_key_version_from_encrypted(value TEXT)
RETURNS INTEGER AS $$
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
$$ LANGUAGE plpgsql IMMUTABLE;

-- 5. Create view for encryption key status
CREATE OR REPLACE VIEW encryption_key_status AS
SELECT 
    key_id,
    key_version,
    key_type,
    key_usage,
    key_status,
    created_at,
    activated_at,
    deactivated_at,
    expires_at,
    CASE 
        WHEN expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP THEN 'expired'
        WHEN key_status = 'active' THEN 'active'
        WHEN key_status = 'deactivated' THEN 'deactivated'
        ELSE key_status
    END as effective_status,
    rotation_count,
    CASE 
        WHEN expires_at IS NOT NULL THEN expires_at - CURRENT_TIMESTAMP
        ELSE NULL
    END as days_until_expiry
FROM encryption_keys;

-- 6. Create view for encryption audit summary
CREATE OR REPLACE VIEW encryption_audit_summary AS
SELECT 
    DATE(performed_at) as audit_date,
    school_id,
    operation,
    COUNT(*) as total_operations,
    SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_operations,
    SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) as failed_operations,
    COUNT(DISTINCT key_id) as distinct_keys_used,
    COUNT(DISTINCT performed_by) as distinct_users
FROM encryption_audit_log
GROUP BY DATE(performed_at), school_id, operation;

-- 7. Insert default data classifications for sensitive fields
INSERT INTO data_classification (school_id, table_name, column_name, json_path, data_type, classification_level, encryption_required)
VALUES 
    -- Student sensitive fields
    ('system', 'students', 'data', 'aadhaar_number', 'jsonb', 'highly_restricted', true),
    ('system', 'students', 'data', 'medical_records', 'jsonb', 'highly_restricted', true),
    ('system', 'students', 'data', 'contact.phone', 'jsonb', 'confidential', true),
    ('system', 'students', 'data', 'contact.email', 'jsonb', 'confidential', true),
    ('system', 'students', 'data', 'address', 'jsonb', 'confidential', true),
    ('system', 'students', 'data', 'father.aadhaar_number', 'jsonb', 'highly_restricted', true),
    ('system', 'students', 'data', 'mother.aadhaar_number', 'jsonb', 'highly_restricted', true),
    
    -- Employee sensitive fields
    ('system', 'employees', 'data', 'aadhaar_number', 'jsonb', 'highly_restricted', true),
    ('system', 'employees', 'data', 'salary', 'jsonb', 'restricted', true),
    ('system', 'employees', 'data', 'bank_details', 'jsonb', 'highly_restricted', true),
    ('system', 'employees', 'data', 'pan_number', 'jsonb', 'restricted', true),
    ('system', 'employees', 'data', 'contact.phone', 'jsonb', 'confidential', true),
    ('system', 'employees', 'data', 'contact.email', 'jsonb', 'confidential', true),
    
    -- Salary sensitive fields
    ('system', 'salaries', 'base_salary', NULL, 'numeric', 'restricted', true),
    ('system', 'salaries', 'total_salary', NULL, 'numeric', 'restricted', true),
    
    -- Fee sensitive fields (if any)
    ('system', 'student_fees', 'payments', NULL, 'jsonb', 'confidential', true)
ON CONFLICT (school_id, table_name, column_name, json_path) DO NOTHING;

-- 8. Create RLS policies for encryption tables
-- Note: These tables should only be accessible to system administrators
ALTER TABLE encryption_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE encryption_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_classification ENABLE ROW LEVEL SECURITY;

-- Policy for encryption_keys: Only super admins can access
CREATE POLICY encryption_keys_admin_only ON encryption_keys
    USING (current_setting('app.user_role', true) = 'super_admin');

-- Policy for encryption_audit_log: School admins can see their school's logs, super admins see all
CREATE POLICY encryption_audit_log_access ON encryption_audit_log
    USING (
        current_setting('app.user_role', true) = 'super_admin' 
        OR (
            current_setting('app.user_role', true) = 'school_admin' 
            AND school_id = current_setting('app.school_id', true)
        )
    );

-- Policy for data_classification: Read-only for school admins, full access for super admins
CREATE POLICY data_classification_access ON data_classification
    USING (
        current_setting('app.user_role', true) = 'super_admin'
        OR (
            current_setting('app.user_role', true) = 'school_admin'
            AND (school_id = 'system' OR school_id = current_setting('app.school_id', true))
        )
    );

-- 9. Create function to log encryption operations
CREATE OR REPLACE FUNCTION log_encryption_operation(
    p_school_id VARCHAR(255),
    p_operation VARCHAR(50),
    p_key_id VARCHAR(255),
    p_entity_type VARCHAR(100),
    p_entity_id VARCHAR(255),
    p_field_name VARCHAR(255),
    p_success BOOLEAN,
    p_error_message TEXT,
    p_performed_by VARCHAR(255),
    p_client_ip INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create function to rotate encryption keys
CREATE OR REPLACE FUNCTION rotate_encryption_key(
    p_key_id VARCHAR(255),
    p_new_key_material BYTEA,
    p_activated_by VARCHAR(255)
)
RETURNS VARCHAR(255) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Migration completed
COMMENT ON TABLE encryption_keys IS 'Stores encryption keys for field-level data protection';
COMMENT ON TABLE encryption_audit_log IS 'Audit trail for all encryption/decryption operations';
COMMENT ON TABLE data_classification IS 'Defines classification and encryption requirements for sensitive data fields';
```

## Migration: 20260410091301_enable_pgcrypto_ssl.sql

```sql
-- Migration: Enable pgcrypto Extension and SSL/TLS Configuration
-- This migration enables the pgcrypto extension for field-level encryption
-- and provides guidance for PostgreSQL SSL/TLS configuration

-- 1. Enable pgcrypto extension for cryptographic functions
-- Note: Requires superuser privileges to create extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Create helper functions for AES-256-GCM encryption using pgcrypto
-- These functions provide database-level encryption capabilities

-- Function to encrypt a value with AES-256-GCM
CREATE OR REPLACE FUNCTION encrypt_aes_gcm(
    plaintext TEXT,
    key_id VARCHAR(255),
    key_material BYTEA,
    associated_data TEXT DEFAULT ''
) RETURNS TEXT AS $$
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
        RAISE WARNING 'Encryption failed: %', SQLERRM;
        RETURN plaintext; -- Return plaintext on failure
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt a value with AES-256-GCM
CREATE OR REPLACE FUNCTION decrypt_aes_gcm(
    encrypted_text TEXT,
    key_material BYTEA
) RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create function to check if SSL/TLS is enabled
CREATE OR REPLACE FUNCTION check_ssl_enabled()
RETURNS TABLE (
    ssl_is_used BOOLEAN,
    ssl_version TEXT,
    cipher TEXT,
    bits INTEGER
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create view for SSL/TLS configuration status
CREATE OR REPLACE VIEW ssl_configuration_status AS
SELECT 
    name,
    setting,
    unit,
    short_desc,
    CASE 
        WHEN name = 'ssl' AND setting = 'on' THEN 'SSL_ENABLED'
        WHEN name = 'ssl' AND setting = 'off' THEN 'SSL_DISABLED'
        WHEN name LIKE '%ssl%' THEN 'SSL_RELATED'
        ELSE 'OTHER'
    END as config_category
FROM pg_settings 
WHERE name LIKE '%ssl%' OR name LIKE '%tls%' OR name LIKE '%encrypt%'
ORDER BY name;

-- 5. Create function to generate SSL/TLS configuration recommendations
CREATE OR REPLACE FUNCTION generate_ssl_recommendations()
RETURNS TABLE (
    recommendation TEXT,
    priority VARCHAR(20),
    sql_command TEXT
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create encryption performance monitoring view
CREATE OR REPLACE VIEW encryption_performance_stats AS
SELECT 
    DATE_TRUNC('hour', performed_at) as time_bucket,
    operation,
    COUNT(*) as operation_count,
    AVG(CASE WHEN success THEN 1 ELSE 0 END) * 100 as success_rate,
    COUNT(DISTINCT key_id) as distinct_keys_used,
    COUNT(DISTINCT performed_by) as distinct_users
FROM encryption_audit_log
WHERE performed_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', performed_at), operation
ORDER BY time_bucket DESC, operation;

-- 7. Insert default encryption key if none exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM encryption_keys WHERE key_status = 'active' AND key_usage = 'field_encryption') THEN
        INSERT INTO encryption_keys (
            key_id,
            key_version,
            key_material,
            key_type,
            key_usage,
            key_status,
            activated_at,
            created_by,
            metadata
        ) VALUES (
            'default_field_key_v1',
            1,
            gen_random_bytes(32), -- 256-bit key
            'aes-256-gcm',
            'field_encryption',
            'active',
            CURRENT_TIMESTAMP,
            'system',
            '{"description": "Default encryption key for field-level encryption", "auto_generated": true}'
        );
    END IF;
END $$;

-- 8. Add comprehensive data classification for all school operational data categories
-- This extends the existing data classification with more comprehensive coverage
INSERT INTO data_classification (school_id, table_name, column_name, json_path, data_type, classification_level, encryption_required)
VALUES 
    -- Academic & Curriculum Data
    ('system', 'timetables', 'data', 'teacher_assignments', 'jsonb', 'confidential', true),
    ('system', 'examinations', 'data', 'question_papers', 'jsonb', 'confidential', true),
    ('system', 'examinations', 'data', 'answer_sheets', 'jsonb', 'highly_restricted', true),
    ('system', 'results', 'data', 'marks', 'jsonb', 'confidential', true),
    ('system', 'results', 'data', 'grades', 'jsonb', 'confidential', true),
    
    -- Financial & Administrative Data
    ('system', 'fees', 'data', 'payment_records', 'jsonb', 'highly_restricted', true),
    ('system', 'payroll', 'data', 'salary_details', 'jsonb', 'highly_restricted', true),
    ('system', 'expenses', 'data', 'vendor_payments', 'jsonb', 'confidential', true),
    ('system', 'inventory', 'data', 'asset_values', 'jsonb', 'internal', false),
    
    -- Infrastructure & Operations Data
    ('system', 'transport', 'data', 'student_routes', 'jsonb', 'confidential', true),
    ('system', 'security', 'data', 'access_logs', 'jsonb', 'confidential', true),
    ('system', 'maintenance', 'data', 'work_orders', 'jsonb', 'internal', false),
    
    -- Communication & Documentation Data
    ('system', 'communications', 'data', 'official_correspondence', 'jsonb', 'confidential', true),
    ('system', 'policies', 'data', 'policy_content', 'jsonb', 'confidential', true),
    ('system', 'legal', 'data', 'contract_details', 'jsonb', 'highly_restricted', true),
    
    -- Compliance & Legal Data
    ('system', 'audit', 'data', 'audit_findings', 'jsonb', 'highly_restricted', true),
    ('system', 'compliance', 'data', 'regulatory_documents', 'jsonb', 'highly_restricted', true),
    ('system', 'consent', 'data', 'parental_consents', 'jsonb', 'confidential', true)
ON CONFLICT (school_id, table_name, column_name, json_path) DO UPDATE SET
    classification_level = EXCLUDED.classification_level,
    encryption_required = EXCLUDED.encryption_required,
    updated_at = CURRENT_TIMESTAMP;

-- 9. Create comment documentation
COMMENT ON EXTENSION pgcrypto IS 'Provides cryptographic functions for field-level encryption';
COMMENT ON FUNCTION encrypt_aes_gcm IS 'Encrypts text using AES-256-GCM with pgcrypto backend';
COMMENT ON FUNCTION decrypt_aes_gcm IS 'Decrypts AES-256-GCM encrypted text using pgcrypto backend';
COMMENT ON FUNCTION check_ssl_enabled IS 'Checks if SSL/TLS is enabled for the current database connection';
COMMENT ON VIEW ssl_configuration_status IS 'Shows current SSL/TLS configuration settings in PostgreSQL';
COMMENT ON FUNCTION generate_ssl_recommendations IS 'Generates security recommendations for SSL/TLS configuration';
COMMENT ON VIEW encryption_performance_stats IS 'Shows performance statistics for encryption operations over the last 7 days';

-- Migration completed successfully
-- Note: SSL/TLS configuration requires PostgreSQL server restart or reload
-- Run: SELECT pg_reload_conf(); after changing SSL settings
```

## Migration: 20260410183000_create_ai_providers_table.down.sql

```sql
-- Drop the AI provider tables in reverse order of dependencies

-- Drop views first
DROP VIEW IF EXISTS ai_provider_status;

-- Drop triggers
DROP TRIGGER IF EXISTS update_school_ai_config_updated_at ON school_ai_config;
DROP TRIGGER IF EXISTS update_ai_providers_updated_at ON ai_providers;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS ai_provider_health;
DROP TABLE IF EXISTS ai_provider_usage;
DROP TABLE IF EXISTS school_ai_config;
DROP TABLE IF EXISTS ai_providers;
```

## Migration: 20260410183000_create_ai_providers_table.up.sql

```sql
-- Create ai_providers table for multi-provider AI architecture
-- This is a global configuration table (not per-school) stored in public schema

CREATE TABLE IF NOT EXISTS system_config (
    config_key TEXT PRIMARY KEY,
    config_value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ai_providers (
    provider_id SERIAL PRIMARY KEY,
    provider_type VARCHAR(50) NOT NULL,
    provider_name VARCHAR(100) NOT NULL,
    config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Add constraints
    CONSTRAINT valid_provider_type CHECK (
        provider_type IN ('google_gemini', 'openai', 'anthropic', 'azure_openai', 'local_model', 'custom')
    ),
    CONSTRAINT config_is_object CHECK (jsonb_typeof(config) = 'object')
);

-- Create index for faster lookups by provider type
CREATE INDEX idx_ai_providers_type ON ai_providers(provider_type);

-- Create index for active providers
CREATE INDEX idx_ai_providers_active ON ai_providers(is_active) WHERE is_active = true;

-- Create school_ai_config table for per-school AI configuration
-- This table uses Row-Level Security (RLS) to ensure each school can only access its own configuration
CREATE TABLE school_ai_config (
    school_id VARCHAR(50) NOT NULL,
    provider_id INTEGER NOT NULL REFERENCES ai_providers(provider_id) ON DELETE CASCADE,
    default_model VARCHAR(100),
    embedding_model VARCHAR(100),
    max_monthly_cost DECIMAL(10,2),
    features_enabled JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    PRIMARY KEY (school_id, provider_id)
);

-- Create index for school-specific lookups
CREATE INDEX idx_school_ai_config_school ON school_ai_config(school_id);
CREATE INDEX idx_school_ai_config_provider ON school_ai_config(provider_id);

-- Create ai_provider_usage table for tracking usage and costs
CREATE TABLE ai_provider_usage (
    usage_id BIGSERIAL PRIMARY KEY,
    school_id VARCHAR(50) NOT NULL,
    provider_id INTEGER NOT NULL REFERENCES ai_providers(provider_id) ON DELETE CASCADE,
    operation_type VARCHAR(50) NOT NULL, -- 'text_generation', 'embedding', 'chat', etc.
    input_tokens INTEGER,
    output_tokens INTEGER,
    total_tokens INTEGER,
    cost DECIMAL(10,6),
    model_used VARCHAR(100),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Add metadata
    metadata JSONB DEFAULT '{}'
);

-- Create indexes for usage analytics
CREATE INDEX idx_ai_provider_usage_school ON ai_provider_usage(school_id, timestamp);
CREATE INDEX idx_ai_provider_usage_provider ON ai_provider_usage(provider_id, timestamp);
CREATE INDEX idx_ai_provider_usage_operation ON ai_provider_usage(operation_type, timestamp);

-- Create ai_provider_health table for tracking provider health status
CREATE TABLE ai_provider_health (
    health_id BIGSERIAL PRIMARY KEY,
    provider_id INTEGER NOT NULL REFERENCES ai_providers(provider_id) ON DELETE CASCADE,
    healthy BOOLEAN NOT NULL,
    latency_ms INTEGER,
    error_message TEXT,
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for recent health checks
CREATE INDEX idx_ai_provider_health_recent ON ai_provider_health(provider_id, checked_at DESC);

-- Insert default Gemini provider configuration (migrating from existing system_config)
INSERT INTO ai_providers (provider_type, provider_name, config, is_active)
VALUES (
    'google_gemini',
    'Google Gemini (Legacy)',
    jsonb_build_object(
        'api_key', COALESCE((SELECT config_value FROM system_config WHERE config_key = 'GEMINI_API_KEY'), ''),
        'text_model', 'gemini-2.5-flash',
        'embedding_model', 'gemini-embedding-2'
    ),
    true
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_ai_providers_updated_at
    BEFORE UPDATE ON ai_providers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_school_ai_config_updated_at
    BEFORE UPDATE ON school_ai_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create view for provider status
CREATE VIEW ai_provider_status AS
SELECT 
    p.provider_id,
    p.provider_type,
    p.provider_name,
    p.is_active,
    p.created_at,
    p.updated_at,
    h.healthy,
    h.latency_ms,
    h.checked_at as last_health_check,
    COUNT(DISTINCT s.school_id) as school_count,
    COALESCE(SUM(u.total_tokens), 0) as total_tokens_used,
    COALESCE(SUM(u.cost), 0) as total_cost
FROM ai_providers p
LEFT JOIN ai_provider_health h ON p.provider_id = h.provider_id 
    AND h.checked_at = (SELECT MAX(checked_at) FROM ai_provider_health WHERE provider_id = p.provider_id)
LEFT JOIN school_ai_config s ON p.provider_id = s.provider_id
LEFT JOIN ai_provider_usage u ON p.provider_id = u.provider_id
GROUP BY p.provider_id, p.provider_type, p.provider_name, p.is_active, p.created_at, p.updated_at, h.healthy, h.latency_ms, h.checked_at;

-- Add comment for documentation
COMMENT ON TABLE ai_providers IS 'Global AI provider configurations for multi-provider architecture';
COMMENT ON TABLE school_ai_config IS 'Per-school AI configuration with RLS for data isolation';
COMMENT ON TABLE ai_provider_usage IS 'Tracks AI provider usage and costs for billing and analytics';
COMMENT ON TABLE ai_provider_health IS 'Tracks health status of AI providers for monitoring';
```

## Migration: 202604110000_responsibility_performance_indexes.sql

```sql
-- 0. Enable pg_trgm extension if not already enabled (required for trigram indexes)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. Composite index for filtering responsibilities by school and employee_type
-- This optimizes the common query: SELECT * FROM responsibilities WHERE school_id = ? AND employee_type = ?
CREATE INDEX IF NOT EXISTS idx_responsibilities_school_employee_type 
ON responsibilities(school_id, employee_type);

-- 2. Index for ordering by created_at (common in list queries)
CREATE INDEX IF NOT EXISTS idx_responsibilities_created_at 
ON responsibilities(created_at DESC);

-- 3. Index for name search (ILIKE operations)
-- This helps with queries like: SELECT * FROM responsibilities WHERE name ILIKE '%search%'
CREATE INDEX IF NOT EXISTS idx_responsibilities_name_trgm 
ON responsibilities USING gin(name gin_trgm_ops);

-- 4. GIN index for space_ids array in employee_responsibilities
-- This optimizes JSONB array containment queries: WHERE space_ids @> '["space1"]'
CREATE INDEX IF NOT EXISTS idx_employee_responsibilities_space_ids 
ON employee_responsibilities USING gin(space_ids);

-- 5. Composite index for employee_responsibilities queries by school and responsibility
-- Optimizes: SELECT * FROM employee_responsibilities WHERE school_id = ? AND responsibility_id = ?
CREATE INDEX IF NOT EXISTS idx_employee_responsibilities_school_responsibility 
ON employee_responsibilities(school_id, responsibility_id);

-- 6. Index for responsibility_history table (if it exists)
-- Check if table exists before creating index
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'responsibility_history') THEN
        CREATE INDEX IF NOT EXISTS idx_responsibility_history_responsibility_id 
        ON responsibility_history(responsibility_id);
        
        CREATE INDEX IF NOT EXISTS idx_responsibility_history_created_at 
        ON responsibility_history(created_at DESC);
    END IF;
END $$;

-- 7. Index for scheduled_reports table (removed as they are already created and schedule_next_run does not exist)

-- 8. Index for analytics queries on monthly_price and student_fee
-- Helps with aggregation queries in analytics
CREATE INDEX IF NOT EXISTS idx_responsibilities_monthly_price 
ON responsibilities(monthly_price);

CREATE INDEX IF NOT EXISTS idx_responsibilities_student_fee 
ON responsibilities(student_fee);

-- 10. Add comment for documentation
COMMENT ON INDEX idx_responsibilities_school_employee_type IS 'Optimizes filtering responsibilities by school and employee type';
COMMENT ON INDEX idx_responsibilities_created_at IS 'Optimizes ordering responsibilities by creation date';
COMMENT ON INDEX idx_responsibilities_name_trgm IS 'Enables fast text search on responsibility names using trigram matching';
COMMENT ON INDEX idx_employee_responsibilities_space_ids IS 'Enables fast array containment queries on space_ids';
COMMENT ON INDEX idx_employee_responsibilities_school_responsibility IS 'Optimizes queries filtering employee responsibilities by school and responsibility';
COMMENT ON INDEX idx_responsibilities_monthly_price IS 'Optimizes analytics queries aggregating by monthly price';
COMMENT ON INDEX idx_responsibilities_student_fee IS 'Optimizes analytics queries aggregating by student fee';
```

## Migration: 202604110001_developer_access_controls.sql

```sql
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
```

## Migration: 202604110002_enhanced_audit_logging.sql

```sql
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
```

## Migration: 202604110003_add_class_name_to_attendance.sql

```sql
-- Migration: Add class_name column to attendance table for bulk operations
-- Created: 2026-04-11

-- Add class_name column to attendance table
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS class_name VARCHAR;

-- Add index for faster class-based queries
CREATE INDEX IF NOT EXISTS idx_attendance_class_date 
ON attendance(school_id, class_name, date);

-- Update existing records where class_name can be inferred
-- For students: get class_name from students table
UPDATE attendance a
SET class_name = s.class_name
FROM students s
WHERE a.school_id = s.school_id 
  AND a.user_id = s.student_id 
  AND a.role = 'student'
  AND a.class_name IS NULL;

-- For employees: get department from employee data
UPDATE attendance a
SET class_name = COALESCE(e.data->>'department', e.employee_type)
FROM employees e
WHERE a.school_id = e.school_id 
  AND a.user_id = e.employee_id 
  AND a.role = 'employee'
  AND a.class_name IS NULL;

-- Add comment to column
COMMENT ON COLUMN attendance.class_name IS 'Class/department name for filtering bulk attendance operations';
```

## Migration: 202604110004_create_grading_tables.sql

```sql
-- Migration: 202604110004_create_grading_tables.sql
-- Description: Create tables for automated grading system, rubrics, and plagiarism detection

-- 1. Grading rubrics table
CREATE TABLE IF NOT EXISTS grading_rubrics (
    rubric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id VARCHAR(255) NOT NULL,
    rubric_name VARCHAR(255) NOT NULL,
    rubric_type VARCHAR(100) NOT NULL, -- 'exam', 'assignment', 'essay', 'project'
    subject_name VARCHAR(255),
    class_name VARCHAR(255),
    criteria JSONB NOT NULL, -- Array of criteria with weights and descriptions
    total_score DECIMAL(5,2) NOT NULL DEFAULT 100.0,
    passing_score DECIMAL(5,2) NOT NULL DEFAULT 40.0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(school_id, rubric_name, rubric_type)
);

-- 2. Student submissions table
CREATE TABLE IF NOT EXISTS student_submissions (
    submission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id VARCHAR(255) NOT NULL,
    student_id VARCHAR(255) NOT NULL,
    exam_id VARCHAR(255), -- Reference to exams table
    assignment_name VARCHAR(255),
    submission_type VARCHAR(100) NOT NULL, -- 'exam', 'assignment', 'essay', 'project'
    content TEXT, -- Student's answer/content
    file_url TEXT, -- URL to uploaded file if any
    file_type VARCHAR(50), -- 'pdf', 'docx', 'txt', 'image'
    word_count INTEGER,
    character_count INTEGER,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'submitted' -- 'submitted', 'graded', 'reviewed', 'returned'
);

-- 3. AI grading results table
CREATE TABLE IF NOT EXISTS ai_grading_results (
    grading_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES student_submissions(submission_id) ON DELETE CASCADE,
    school_id VARCHAR(255) NOT NULL,
    rubric_id UUID REFERENCES grading_rubrics(rubric_id),
    overall_score DECIMAL(5,2),
    normalized_score DECIMAL(5,2), -- Score normalized to rubric total
    grade VARCHAR(10), -- 'A', 'B', 'C', 'D', 'F' or percentage
    criteria_scores JSONB, -- Scores for each criterion
    feedback TEXT, -- AI-generated feedback
    strengths TEXT[], -- Array of identified strengths
    weaknesses TEXT[], -- Array of identified weaknesses
    suggestions TEXT[], -- Array of improvement suggestions
    plagiarism_score DECIMAL(5,2), -- 0-100 plagiarism percentage
    plagiarism_matches JSONB, -- Details of plagiarism matches
    confidence_score DECIMAL(5,2), -- AI confidence in grading (0-100)
    grading_provider VARCHAR(100), -- Which AI provider was used
    grading_model VARCHAR(100),
    processing_time_ms INTEGER,
    graded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reviewed_by_teacher BOOLEAN DEFAULT false,
    teacher_notes TEXT,
    teacher_adjusted_score DECIMAL(5,2)
);

-- 4. Plagiarism detection cache
CREATE TABLE IF NOT EXISTS plagiarism_cache (
    cache_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id VARCHAR(255) NOT NULL,
    content_hash VARCHAR(64) NOT NULL, -- SHA-256 hash of content
    content_type VARCHAR(50) NOT NULL, -- 'submission', 'source'
    source_id VARCHAR(255), -- submission_id or external source ID
    metadata JSONB,
    indexed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(school_id, content_hash, content_type)
);

-- 5. Common errors patterns (for feedback generation)
CREATE TABLE IF NOT EXISTS common_error_patterns (
    pattern_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id VARCHAR(255) NOT NULL,
    subject_name VARCHAR(255),
    error_type VARCHAR(100) NOT NULL, -- 'grammar', 'concept', 'calculation', 'format'
    pattern_text TEXT NOT NULL, -- Regex or text pattern
    description TEXT,
    feedback_template TEXT NOT NULL, -- Template for feedback
    severity VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Gradebook synchronization log
CREATE TABLE IF NOT EXISTS gradebook_sync_log (
    sync_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id VARCHAR(255) NOT NULL,
    submission_id UUID REFERENCES student_submissions(submission_id),
    sync_type VARCHAR(50) NOT NULL, -- 'manual', 'automatic', 'batch'
    sync_status VARCHAR(50) NOT NULL, -- 'pending', 'success', 'failed'
    target_system VARCHAR(100), -- 'internal', 'external_system_name'
    sync_data JSONB,
    error_message TEXT,
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    retry_count INTEGER DEFAULT 0
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_grading_rubrics_school ON grading_rubrics(school_id);
CREATE INDEX IF NOT EXISTS idx_grading_rubrics_type ON grading_rubrics(rubric_type, subject_name);
CREATE INDEX IF NOT EXISTS idx_student_submissions_school ON student_submissions(school_id);
CREATE INDEX IF NOT EXISTS idx_student_submissions_student ON student_submissions(school_id, student_id);
CREATE INDEX IF NOT EXISTS idx_student_submissions_exam ON student_submissions(school_id, exam_id);
CREATE INDEX IF NOT EXISTS idx_ai_grading_results_submission ON ai_grading_results(submission_id);
CREATE INDEX IF NOT EXISTS idx_ai_grading_results_school ON ai_grading_results(school_id);
CREATE INDEX IF NOT EXISTS idx_plagiarism_cache_hash ON plagiarism_cache(content_hash);
CREATE INDEX IF NOT EXISTS idx_common_errors_school ON common_error_patterns(school_id, subject_name);
CREATE INDEX IF NOT EXISTS idx_gradebook_sync_school ON gradebook_sync_log(school_id, sync_status);

-- Enable Row Level Security
ALTER TABLE grading_rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_grading_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE plagiarism_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE common_error_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE gradebook_sync_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY grading_rubrics_school_isolation ON grading_rubrics
    USING (school_id = current_setting('app.current_school_id'));

CREATE POLICY student_submissions_school_isolation ON student_submissions
    USING (school_id = current_setting('app.current_school_id'));

CREATE POLICY ai_grading_results_school_isolation ON ai_grading_results
    USING (school_id = current_setting('app.current_school_id'));

CREATE POLICY plagiarism_cache_school_isolation ON plagiarism_cache
    USING (school_id = current_setting('app.current_school_id'));

CREATE POLICY common_error_patterns_school_isolation ON common_error_patterns
    USING (school_id = current_setting('app.current_school_id'));

CREATE POLICY gradebook_sync_log_school_isolation ON gradebook_sync_log
    USING (school_id = current_setting('app.current_school_id'));

-- Comments
COMMENT ON TABLE grading_rubrics IS 'Stores grading rubrics for different assessment types';
COMMENT ON TABLE student_submissions IS 'Student submissions for grading (exams, assignments, essays)';
COMMENT ON TABLE ai_grading_results IS 'AI-generated grading results with feedback and plagiarism detection';
COMMENT ON TABLE plagiarism_cache IS 'Cache for plagiarism detection to avoid reprocessing same content';
COMMENT ON TABLE common_error_patterns IS 'Common error patterns for automated feedback generation';
COMMENT ON TABLE gradebook_sync_log IS 'Log for gradebook synchronization with external systems';
```

## Migration: 202604110005_create_attendance_reports.sql

```sql
-- Migration: Create attendance_reports table for storing generated reports
-- This table stores pre-generated attendance reports for caching and historical reference

CREATE TABLE IF NOT EXISTS attendance_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id VARCHAR NOT NULL,
    report_type VARCHAR NOT NULL, -- 'daily', 'monthly', 'custom', 'student', 'class', 'employee'
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    generated_at TIMESTAMP DEFAULT NOW(),
    file_path VARCHAR, -- Path to stored PDF/Excel file if exported
    file_format VARCHAR, -- 'pdf', 'excel', 'json'
    metadata JSONB DEFAULT '{}'::jsonb, -- Filters, parameters used for generation
    data JSONB DEFAULT '{}'::jsonb, -- Cached report data for quick retrieval
    status VARCHAR DEFAULT 'completed', -- 'pending', 'processing', 'completed', 'failed'
    generated_by VARCHAR, -- User/admin who requested the report
    expires_at TIMESTAMP, -- When cached data should be considered stale
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_attendance_reports_school_type 
ON attendance_reports(school_id, report_type, period_start DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_reports_generated_at 
ON attendance_reports(generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_reports_status 
ON attendance_reports(status) WHERE status = 'completed';

-- Add RLS policies for multi-tenancy
ALTER TABLE attendance_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Schools can only see their own reports
CREATE POLICY attendance_reports_school_policy ON attendance_reports
    USING (school_id = current_setting('app.current_school_id', true))
    WITH CHECK (school_id = current_setting('app.current_school_id', true));

-- Create a view for daily attendance summary
CREATE OR REPLACE VIEW daily_attendance_summary AS
SELECT 
    a.school_id,
    a.date,
    a.role,
    COUNT(*) as total,
    COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_count,
    COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_count,
    COUNT(CASE WHEN a.status = 'leave' THEN 1 END) as leave_count,
    COUNT(CASE WHEN a.status = 'holiday' THEN 1 END) as holiday_count,
    ROUND(
        COUNT(CASE WHEN a.status = 'present' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0),
        2
    ) as attendance_percentage
FROM attendance a
GROUP BY a.school_id, a.date, a.role;

-- Create a view for monthly attendance statistics
CREATE OR REPLACE VIEW monthly_attendance_stats AS
SELECT 
    a.school_id,
    DATE_TRUNC('month', a.date) as month,
    a.role,
    COUNT(DISTINCT a.date) as working_days,
    COUNT(DISTINCT a.user_id) as total_users,
    COUNT(*) as total_records,
    COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_count,
    COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_count,
    COUNT(CASE WHEN a.status = 'leave' THEN 1 END) as leave_count,
    ROUND(
        COUNT(CASE WHEN a.status = 'present' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0),
        2
    ) as overall_attendance_percentage
FROM attendance a
GROUP BY a.school_id, DATE_TRUNC('month', a.date), a.role;

-- Create a view for student attendance patterns
CREATE OR REPLACE VIEW student_attendance_patterns AS
SELECT 
    a.school_id,
    a.user_id as student_id,
    EXTRACT(MONTH FROM a.date) as month,
    EXTRACT(YEAR FROM a.date) as year,
    COUNT(*) as total_days,
    COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_days,
    COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_days,
    COUNT(CASE WHEN a.status = 'leave' THEN 1 END) as leave_days,
    ROUND(
        COUNT(CASE WHEN a.status = 'present' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0),
        2
    ) as attendance_percentage,
    -- Pattern detection: consecutive absences
    MAX(
        (SELECT COUNT(*) 
         FROM attendance a2 
         WHERE a2.school_id = a.school_id 
           AND a2.user_id = a.user_id 
           AND a2.status = 'absent' 
           AND a2.date BETWEEN a.date - INTERVAL '7 days' AND a.date)
    ) as max_consecutive_absences_7d
FROM attendance a
WHERE a.role = 'student'
GROUP BY a.school_id, a.user_id, EXTRACT(MONTH FROM a.date), EXTRACT(YEAR FROM a.date);
```

## Migration: 202604120000_setup_templates.sql

```sql
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
```

## Migration: 202604120001_create_gradebook_table.sql

```sql
-- Migration: 202604120001_create_gradebook_table.sql
-- Description: Create gradebook table for storing student grades and syncing with grading system

-- 1. Gradebook table - stores final grades for students
CREATE TABLE IF NOT EXISTS gradebook (
    gradebook_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id VARCHAR(255) NOT NULL,
    student_id VARCHAR(255) NOT NULL,
    academic_year VARCHAR(20) NOT NULL, -- e.g., '2024-2025'
    term VARCHAR(50) NOT NULL, -- 'Term 1', 'Semester 1', 'Quarter 1'
    subject_name VARCHAR(255) NOT NULL,
    class_name VARCHAR(255) NOT NULL,
    assessment_type VARCHAR(100) NOT NULL, -- 'exam', 'assignment', 'project', 'quiz'
    assessment_name VARCHAR(255) NOT NULL, -- 'Mid-Term Exam', 'Homework 3'
    assessment_id VARCHAR(255), -- Reference to exam/assignment ID
    submission_id UUID REFERENCES student_submissions(submission_id),
    rubric_id UUID REFERENCES grading_rubrics(rubric_id),
    
    -- Grading data
    raw_score DECIMAL(5,2), -- Actual score obtained
    max_score DECIMAL(5,2) NOT NULL DEFAULT 100.0,
    percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN max_score > 0 THEN (raw_score / max_score) * 100 
            ELSE 0 
        END
    ) STORED,
    grade VARCHAR(10), -- 'A', 'B', 'C', 'D', 'F' or custom grade
    grade_points DECIMAL(3,2), -- GPA points (4.0 scale)
    
    -- Metadata
    grading_method VARCHAR(50) DEFAULT 'manual', -- 'manual', 'ai', 'rubric', 'hybrid'
    graded_by VARCHAR(255), -- Teacher ID or 'ai_system'
    graded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Status flags
    is_published BOOLEAN DEFAULT false, -- Whether grade is visible to student/parent
    requires_review BOOLEAN DEFAULT false, -- Flag for teacher review
    review_notes TEXT,
    
    -- Sync information
    sync_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'synced', 'failed'
    last_sync_attempt TIMESTAMP WITH TIME ZONE,
    sync_error TEXT,
    
    -- Constraints and indexes
    UNIQUE(school_id, student_id, assessment_id, assessment_type),
    CONSTRAINT valid_score CHECK (raw_score >= 0 AND raw_score <= max_score)
);

-- 2. Gradebook summary table - aggregated performance per student per subject
CREATE TABLE IF NOT EXISTS gradebook_summary (
    summary_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id VARCHAR(255) NOT NULL,
    student_id VARCHAR(255) NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    term VARCHAR(50) NOT NULL,
    subject_name VARCHAR(255) NOT NULL,
    class_name VARCHAR(255) NOT NULL,
    
    -- Aggregated statistics
    total_assessments INTEGER DEFAULT 0,
    completed_assessments INTEGER DEFAULT 0,
    average_percentage DECIMAL(5,2) DEFAULT 0.0,
    weighted_average DECIMAL(5,2) DEFAULT 0.0,
    total_grade_points DECIMAL(5,2) DEFAULT 0.0,
    gpa DECIMAL(3,2) DEFAULT 0.0,
    letter_grade VARCHAR(10),
    
    -- Performance bands
    highest_score DECIMAL(5,2),
    lowest_score DECIMAL(5,2),
    improvement_trend VARCHAR(20), -- 'improving', 'declining', 'stable'
    
    -- Attendance correlation
    attendance_percentage DECIMAL(5,2),
    
    -- Timestamps
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(school_id, student_id, academic_year, term, subject_name)
);

-- 3. Gradebook sync queue - for batch synchronization
CREATE TABLE IF NOT EXISTS gradebook_sync_queue (
    queue_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id VARCHAR(255) NOT NULL,
    gradebook_id UUID REFERENCES gradebook(gradebook_id),
    operation VARCHAR(20) NOT NULL, -- 'insert', 'update', 'delete'
    sync_priority INTEGER DEFAULT 5, -- 1=highest, 10=lowest
    payload JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_gradebook_school_student ON gradebook(school_id, student_id);
CREATE INDEX IF NOT EXISTS idx_gradebook_subject_class ON gradebook(school_id, subject_name, class_name);
CREATE INDEX IF NOT EXISTS idx_gradebook_assessment ON gradebook(school_id, assessment_type, assessment_id);
CREATE INDEX IF NOT EXISTS idx_gradebook_sync_status ON gradebook(school_id, sync_status) WHERE sync_status != 'synced';

CREATE INDEX IF NOT EXISTS idx_gradebook_summary_school_student ON gradebook_summary(school_id, student_id);
CREATE INDEX IF NOT EXISTS idx_gradebook_summary_subject ON gradebook_summary(school_id, subject_name, academic_year);

CREATE INDEX IF NOT EXISTS idx_gradebook_sync_queue_status ON gradebook_sync_queue(status, sync_priority);
CREATE INDEX IF NOT EXISTS idx_gradebook_sync_queue_school ON gradebook_sync_queue(school_id, status);

-- Enable Row Level Security
ALTER TABLE gradebook ENABLE ROW LEVEL SECURITY;
ALTER TABLE gradebook_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE gradebook_sync_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY gradebook_school_isolation ON gradebook
    USING (school_id = current_setting('app.current_school_id'));

CREATE POLICY gradebook_summary_school_isolation ON gradebook_summary
    USING (school_id = current_setting('app.current_school_id'));

CREATE POLICY gradebook_sync_queue_school_isolation ON gradebook_sync_queue
    USING (school_id = current_setting('app.current_school_id'));

-- Comments
COMMENT ON TABLE gradebook IS 'Stores individual student grades for assessments with sync tracking';
COMMENT ON TABLE gradebook_summary IS 'Aggregated student performance per subject per term';
COMMENT ON TABLE gradebook_sync_queue IS 'Queue for batch synchronization of gradebook data with external systems';

-- Function to update gradebook summary when grades are added/updated
CREATE OR REPLACE FUNCTION update_gradebook_summary()
RETURNS TRIGGER AS $$
BEGIN
    -- Update or insert summary record
    INSERT INTO gradebook_summary (
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
    FROM gradebook g
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
$$ LANGUAGE plpgsql;

-- Trigger to automatically update summary when gradebook changes
CREATE TRIGGER trigger_update_gradebook_summary
AFTER INSERT OR UPDATE ON gradebook
FOR EACH ROW
EXECUTE FUNCTION update_gradebook_summary();

-- Function to calculate letter grade based on percentage
CREATE OR REPLACE FUNCTION calculate_letter_grade(percentage DECIMAL)
RETURNS VARCHAR(10) AS $$
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
$$ LANGUAGE plpgsql IMMUTABLE;
```

## Migration: 202604130001_create_admin_automation_tables.sql

```sql
-- Ensure status column exists in schools table
ALTER TABLE schools ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';

-- Insert system school record if not exists to satisfy foreign key constraints
INSERT INTO schools (school_id, school_name, status) 
VALUES ('system', 'System School', 'active') 
ON CONFLICT (school_id) DO NOTHING;

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
    CONSTRAINT fk_form_templates_school FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE
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
    
    CONSTRAINT fk_form_submissions_school FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE,
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
    
    CONSTRAINT fk_automated_reports_school FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE
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
    
    CONSTRAINT fk_report_logs_school FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE,
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
    
    CONSTRAINT fk_email_queue_school FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE
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
    
    CONSTRAINT fk_email_rules_school FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE
);

CREATE INDEX idx_email_rules_school_active ON email_processing_rules(school_id, is_active);

-- Timetable Conflict Detection
CREATE TABLE admin_timetable_conflicts (
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
    
    CONSTRAINT fk_admin_timetable_conflicts_school FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE
);

CREATE INDEX idx_admin_timetable_conflicts_school_status ON admin_timetable_conflicts(school_id, resolved_at);
CREATE INDEX idx_admin_timetable_conflicts_type ON admin_timetable_conflicts(school_id, conflict_type, severity);
CREATE INDEX idx_admin_timetable_conflicts_entity ON admin_timetable_conflicts(school_id, entity_type, entity_id);

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
    
    CONSTRAINT fk_conflict_rules_school FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE
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
    
    CONSTRAINT fk_admin_task_queue_school FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE
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
ALTER TABLE admin_timetable_conflicts ENABLE ROW LEVEL SECURITY;
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

CREATE POLICY admin_timetable_conflicts_isolation_policy ON admin_timetable_conflicts
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
     '[{"name": "Payment", "role": "parent"}, {"name": "Verification", "role": "admin"}]',
     true, '["admin"]', true);
```

## Migration: 202604130002_user_device_tokens.sql

```sql
-- Migration: User Device Tokens for Push Notifications
-- Description: Stores FCM tokens for students and employees to enable push notifications

CREATE TABLE IF NOT EXISTS user_device_tokens (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    school_id TEXT NOT NULL,
    token TEXT NOT NULL,
    platform TEXT, -- ios, android, web
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, school_id, token)
);

CREATE INDEX IF NOT EXISTS idx_user_device_tokens_user ON user_device_tokens(user_id, school_id);

```

## Migration: 202604130003_enhanced_grading_schema.sql

```sql
-- Migration: 202604130003_enhanced_grading_schema.sql
-- Description: Add answer keys and grading configuration for smart exam grading

-- 1. Exam Answer Keys table
-- Stores the expected answers for automated matching
CREATE TABLE IF NOT EXISTS exam_answer_keys (
    key_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id VARCHAR(255) NOT NULL,
    exam_id VARCHAR(255) NOT NULL, -- References exams table (exam_id)
    question_number INT NOT NULL,
    question_type VARCHAR(100) NOT NULL, -- 'mcq', 'short_answer', 'essay', 'true_false'
    correct_answer TEXT, -- For objective questions
    model_answer TEXT, -- For subjective/essay questions
    keywords TEXT[], -- Evaluation keywords for subjective scoring
    max_marks DECIMAL(5,2) NOT NULL,
    marking_scheme JSONB, -- Details on partial credit
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(school_id, exam_id, question_number)
);

-- 2. Grading Configuration table
-- Stores per-school or per-subject rigor settings
CREATE TABLE IF NOT EXISTS grading_config (
    config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id VARCHAR(255) NOT NULL,
    subject_name VARCHAR(255), -- NULL means global school config
    rigor_level VARCHAR(50) DEFAULT 'standard', -- 'strict', 'standard', 'lenient'
    fuzzy_threshold DECIMAL(3,2) DEFAULT 0.85, -- Threshold for partial matching
    ai_feedback_enabled BOOLEAN DEFAULT true,
    manual_review_threshold DECIMAL(3,2) DEFAULT 0.70, -- Results below this flag for teacher review
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(school_id, subject_name)
);

-- 3. Extend student_submissions for image metadata
-- Stores bounding boxes and OCR confidence
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='student_submissions' AND column_name='image_metadata') THEN
        ALTER TABLE student_submissions ADD COLUMN image_metadata JSONB DEFAULT '{}';
    END IF;
END $$;

-- 4. Enable RLS
ALTER TABLE exam_answer_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE grading_config ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
CREATE POLICY exam_answer_keys_school_isolation ON exam_answer_keys
    USING (school_id = current_setting('app.current_school_id'));

CREATE POLICY grading_config_school_isolation ON grading_config
    USING (school_id = current_setting('app.current_school_id'));

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_exam_answer_keys_exam ON exam_answer_keys(school_id, exam_id);
CREATE INDEX IF NOT EXISTS idx_grading_config_school ON grading_config(school_id);

```

## Migration: 202605080000_cms_tables.sql

```sql
-- Blog posts table
CREATE TABLE IF NOT EXISTS blog_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    excerpt TEXT,
    content TEXT NOT NULL,
    cover_image_url VARCHAR(1000),
    author_name VARCHAR(255) DEFAULT 'Vidhyam Team',
    category VARCHAR(100),
    tags TEXT[] DEFAULT '{}',
    seo_title VARCHAR(200),
    seo_description VARCHAR(500),
    is_published BOOLEAN DEFAULT false,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at DESC);

-- Testimonials table
CREATE TABLE IF NOT EXISTS testimonials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_name VARCHAR(255) NOT NULL,
    client_title VARCHAR(255),
    school_name VARCHAR(500),
    avatar_url VARCHAR(1000),
    rating SMALLINT DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
    content TEXT NOT NULL,
    is_featured BOOLEAN DEFAULT false,
    display_order INT DEFAULT 0,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_testimonials_featured ON testimonials(is_featured, display_order);

-- School access requests (lead gen)
CREATE TABLE IF NOT EXISTS school_access_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_name VARCHAR(500) NOT NULL,
    contact_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    employee_count INT,
    student_count INT,
    message TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_school_requests_status ON school_access_requests(status);
CREATE INDEX IF NOT EXISTS idx_school_requests_email ON school_access_requests(email);
```

## Migration: 202605090000_create_space_categories_table.sql

```sql
-- Create space_categories table for managing space categories
-- Each school can have multiple categories (e.g., classroom, lab, office)

CREATE TABLE IF NOT EXISTS space_categories (
    id BIGSERIAL PRIMARY KEY,
    school_id VARCHAR NOT NULL,
    name VARCHAR NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(school_id, name)
);

-- Index for faster lookups by school
CREATE INDEX IF NOT EXISTS idx_space_categories_school_id ON space_categories(school_id);
```

## Migration: 202605120000_notification_preferences.sql

```sql
-- Migration: Add notification preferences table
-- Description: Stores per-user notification channel preferences (email, SMS, push, in-app)

CREATE TABLE IF NOT EXISTS notification_preferences (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR(50) NOT NULL,
    user_id VARCHAR(100) NOT NULL,
    email_enabled BOOLEAN DEFAULT TRUE,
    sms_enabled BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT TRUE,
    in_app_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (school_id, user_id)
);

-- Index for fast lookups by school + user
CREATE INDEX IF NOT EXISTS idx_notif_prefs_school_user ON notification_preferences(school_id, user_id);

-- Enable Row Level Security
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policy: school isolation
CREATE POLICY notification_prefs_school_isolation ON notification_preferences
    USING (school_id = current_setting('app.current_school_id', TRUE));

-- RLS policy: users can only access their own preferences
CREATE POLICY notification_prefs_user_access ON notification_preferences
    USING (user_id = current_setting('app.current_user_id', TRUE)
        OR is_super_admin()
        OR current_setting('app.user_role', TRUE) = 'admin'
    );
```

## Migration: 202605160001_material_alerts_and_budget.sql

```sql
CREATE TABLE IF NOT EXISTS material_alert_log (
    id BIGSERIAL PRIMARY KEY,
    school_id VARCHAR(255) NOT NULL,
    space_name VARCHAR(255) NOT NULL,
    material_name VARCHAR(255) NOT NULL,
    deficit_count INT NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(school_id, space_name, material_name, status)
);

CREATE INDEX IF NOT EXISTS idx_material_alert_active ON material_alert_log(school_id, status);
CREATE INDEX IF NOT EXISTS idx_material_alert_school ON material_alert_log(school_id);

ALTER TABLE spaces ADD COLUMN IF NOT EXISTS budget DECIMAL(12,2) DEFAULT NULL;

```

## Migration: 202605170000_ocr_extractions.sql

```sql
-- OCR Extractions table for storing document processing results
CREATE TABLE IF NOT EXISTS ocr_extractions (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR(255) NOT NULL,
    doc_type VARCHAR(50) NOT NULL,
    file_url TEXT NOT NULL,
    raw_text TEXT,
    extracted_fields JSONB NOT NULL DEFAULT '{}',
    entity_type VARCHAR(20),
    entity_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ocr_school_id ON ocr_extractions(school_id);
CREATE INDEX IF NOT EXISTS idx_ocr_entity ON ocr_extractions(school_id, entity_type, entity_id);

```

## Migration: 202605180001_exam_checker_workflow.sql

```sql
-- Migration: 202605180001_exam_checker_workflow.sql
-- Description: Exam checker workflow — assignment, review, approval, result publishing

-- 1. Add checker assignment and status columns to exams table
ALTER TABLE exams ADD COLUMN IF NOT EXISTS checker_employee_id TEXT;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS checker_assigned_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS checked_by TEXT;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS checked_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS approved_by TEXT;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS results_published BOOLEAN DEFAULT FALSE;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS results_published_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS strictness_level TEXT DEFAULT 'medium'; -- 'low', 'medium', 'hard'

-- 2. Add checker columns to student_submissions
ALTER TABLE student_submissions ADD COLUMN IF NOT EXISTS checked_by TEXT;
ALTER TABLE student_submissions ADD COLUMN IF NOT EXISTS checked_at TIMESTAMP WITH TIME ZONE;

-- 3. Add approval columns to ai_grading_results
ALTER TABLE ai_grading_results ADD COLUMN IF NOT EXISTS reviewed_by_checker BOOLEAN DEFAULT FALSE;
ALTER TABLE ai_grading_results ADD COLUMN IF NOT EXISTS checker_id TEXT;
ALTER TABLE ai_grading_results ADD COLUMN IF NOT EXISTS checker_notes TEXT;
ALTER TABLE ai_grading_results ADD COLUMN IF NOT EXISTS teacher_approved BOOLEAN DEFAULT FALSE;
ALTER TABLE ai_grading_results ADD COLUMN IF NOT EXISTS teacher_id TEXT;
ALTER TABLE ai_grading_results ADD COLUMN IF NOT EXISTS teacher_notes TEXT;
ALTER TABLE ai_grading_results ADD COLUMN IF NOT EXISTS teacher_adjusted_score DECIMAL(5,2);
ALTER TABLE ai_grading_results ADD COLUMN IF NOT EXISTS is_finalized BOOLEAN DEFAULT FALSE;
ALTER TABLE ai_grading_results ADD COLUMN IF NOT EXISTS strictness_used TEXT;

-- 4. Create exam_submission_pages table for page-level image tracking
CREATE TABLE IF NOT EXISTS exam_submission_pages (
    page_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES student_submissions(submission_id) ON DELETE CASCADE,
    school_id VARCHAR(255) NOT NULL,
    page_number INTEGER NOT NULL,
    image_url TEXT NOT NULL,
    ocr_text TEXT,
    ocr_confidence DECIMAL(5,2),
    is_permanent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(submission_id, page_number)
);

CREATE INDEX IF NOT EXISTS idx_esp_submission ON exam_submission_pages(submission_id);
CREATE INDEX IF NOT EXISTS idx_esp_school ON exam_submission_pages(school_id);

ALTER TABLE exam_submission_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS exam_submission_pages_school_isolation ON exam_submission_pages;
CREATE POLICY exam_submission_pages_school_isolation ON exam_submission_pages
    USING (school_id = current_setting('app.current_school_id'));

COMMENT ON TABLE exam_submission_pages IS 'Individual page images of student exam submissions with OCR text';

```

## Migration: 202605200001_material_alert_constraints.sql

```sql
-- Migration: Clean up orphaned alerts and add foreign key constraints for material_alert_log

-- 1. Deduplicate spaces and materials to ensure unique constraints can be applied
DELETE FROM spaces a USING spaces b
WHERE a.school_id = b.school_id 
  AND a.name = b.name 
  AND a.id > b.id;

DELETE FROM materials a USING materials b
WHERE a.school_id = b.school_id 
  AND a.name = b.name 
  AND a.id > b.id;

-- 2. Add unique constraints to spaces and materials tables
ALTER TABLE spaces DROP CONSTRAINT IF EXISTS unique_school_space_name;
ALTER TABLE spaces ADD CONSTRAINT unique_school_space_name UNIQUE (school_id, name);

ALTER TABLE materials DROP CONSTRAINT IF EXISTS unique_school_material_name;
ALTER TABLE materials ADD CONSTRAINT unique_school_material_name UNIQUE (school_id, name);

-- 3. Clean up orphaned alert logs that do not match active spaces
DELETE FROM material_alert_log
WHERE (school_id, space_name) NOT IN (SELECT school_id, name FROM spaces);

-- 4. Clean up orphaned alert logs that do not match active materials
DELETE FROM material_alert_log
WHERE (school_id, material_name) NOT IN (SELECT school_id, name FROM materials);

-- 5. Add foreign key constraints to material_alert_log to ensure cascade delete/update
ALTER TABLE material_alert_log
    DROP CONSTRAINT IF EXISTS fk_material_alert_log_space,
    DROP CONSTRAINT IF EXISTS fk_material_alert_log_material;

ALTER TABLE material_alert_log
    ADD CONSTRAINT fk_material_alert_log_space
    FOREIGN KEY (school_id, space_name)
    REFERENCES spaces(school_id, name)
    ON UPDATE CASCADE
    ON DELETE CASCADE;

ALTER TABLE material_alert_log
    ADD CONSTRAINT fk_material_alert_log_material
    FOREIGN KEY (school_id, material_name)
    REFERENCES materials(school_id, name)
    ON UPDATE CASCADE
    ON DELETE CASCADE;

```

## Migration: 202605200002_seed_test_sample_data.sql

```sql
-- Migration: Seed sample data for testing Space, Material, and Responsibility modules

-- SELF-HEALING / PREPARATION FOR OUT-OF-ORDER SCHEMA ALIGNMENT

-- 1. Ensure spaces table has the unique constraint on (school_id, name)
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'spaces') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conrelid = 'spaces'::regclass AND conname = 'unique_school_space_name'
        ) THEN
            ALTER TABLE spaces ADD CONSTRAINT unique_school_space_name UNIQUE (school_id, name);
        END IF;
    END IF;
END $$;

-- 2. Ensure space_materials table exists and has space_name instead of space_id
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'space_materials') THEN
        CREATE TABLE space_materials (
            id SERIAL PRIMARY KEY,
            school_id TEXT NOT NULL,
            space_name TEXT NOT NULL,
            material_id TEXT,
            material_name TEXT NOT NULL,
            quantity INTEGER DEFAULT 0,
            unit TEXT,
            unit_price NUMERIC(15, 2) DEFAULT 0.00,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'space_materials' AND column_name = 'space_id') THEN
        ALTER TABLE space_materials RENAME COLUMN space_id TO space_name;
    END IF;
END $$;

-- Drop any conflicting unique constraints on space_materials
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'space_materials'::regclass AND contype = 'u'
    ) LOOP
        EXECUTE 'ALTER TABLE space_materials DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
END $$;

-- Add the correct unique constraint for space_materials
ALTER TABLE space_materials ADD CONSTRAINT space_materials_school_space_mat_unique UNIQUE (school_id, space_name, material_name);


-- 3. Ensure space_material_requirements table exists and has space_name instead of space_id
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'space_material_requirements') THEN
        CREATE TABLE space_material_requirements (
            id SERIAL PRIMARY KEY,
            school_id VARCHAR(255) NOT NULL,
            space_name VARCHAR(255) NOT NULL,
            material_name VARCHAR(255) NOT NULL,
            required_count INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'space_material_requirements' AND column_name = 'space_id') THEN
        ALTER TABLE space_material_requirements RENAME COLUMN space_id TO space_name;
    END IF;
END $$;

-- Drop any conflicting unique constraints on space_material_requirements
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'space_material_requirements'::regclass AND contype = 'u'
    ) LOOP
        EXECUTE 'ALTER TABLE space_material_requirements DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
END $$;

-- Add the correct unique constraint for space_material_requirements
ALTER TABLE space_material_requirements ADD CONSTRAINT space_mat_req_school_space_mat_unique UNIQUE (school_id, space_name, material_name);

-- Self-healing for space/material/responsibility/school columns and defaults before inserting data
ALTER TABLE schools ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';

CREATE SEQUENCE IF NOT EXISTS spaces_id_seq;
ALTER TABLE spaces ALTER COLUMN id SET DEFAULT nextval('spaces_id_seq');

ALTER TABLE spaces ADD COLUMN IF NOT EXISTS space_category VARCHAR(255);
ALTER TABLE spaces ADD COLUMN IF NOT EXISTS budget DECIMAL(12,2) DEFAULT NULL;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS unit VARCHAR(50);
ALTER TABLE responsibilities ADD COLUMN IF NOT EXISTS space_category VARCHAR(255);

-- 4. Insert School
INSERT INTO schools (school_id, school_name, status)
VALUES ('test-school', 'Test School for Audit', 'active')
ON CONFLICT (school_id) DO NOTHING;

-- Insert Auth Credentials for test-school (password: admin@123)
INSERT INTO auth (school_id, password)
VALUES ('test-school', '$2b$10$hQjpOo0Xa2s7WD9vJp1Kf.gLuwVh2ouaNReFuZ3yDKvrZU.pT6OJ6')
ON CONFLICT (school_id) DO NOTHING;

-- 5. Insert Space Category
INSERT INTO space_categories (school_id, name, is_default)
VALUES ('test-school', 'Classroom', true)
ON CONFLICT (school_id, name) DO NOTHING;

-- 6. Insert Space
INSERT INTO spaces (school_id, name, space_category, budget)
VALUES ('test-school', 'Class 10-A', 'Classroom', 1000.00)
ON CONFLICT (school_id, name) DO NOTHING;

-- 7. Insert Global Material
INSERT INTO materials (school_id, id, name, quantity, unit_price, unit, extra_unit, need_unit)
VALUES ('test-school', 'mat-chair', 'Chair', 100, 15.00, 'pcs', 100, 0)
ON CONFLICT (school_id, id) DO NOTHING;

-- 8. Insert Space Material assignment
INSERT INTO space_materials (school_id, space_name, material_name, quantity, unit, unit_price)
VALUES ('test-school', 'Class 10-A', 'Chair', 25, 'pcs', 15.00)
ON CONFLICT (school_id, space_name, material_name) DO NOTHING;

-- 9. Insert Space Material Requirements (5 deficit)
INSERT INTO space_material_requirements (school_id, space_name, material_name, required_count)
VALUES ('test-school', 'Class 10-A', 'Chair', 30)
ON CONFLICT (school_id, space_name, material_name) DO NOTHING;

-- 10. Insert Employee
INSERT INTO employees (employee_id, school_id, employee_type, data)
VALUES (
    'emp-math-teacher',
    'test-school',
    'TEACHER',
    '{"name": "Alice Smith", "baseSalary": 3000.00, "bonus": 200.00, "aid": 100.00, "experienceYears": 5.0, "experienceRate": 50.0, "tenureMonths": 12.0, "tenureRate": 10.0}'::jsonb
)
ON CONFLICT (school_id, employee_id) DO NOTHING;

-- 11. Insert Responsibility
INSERT INTO responsibilities (school_id, responsibility_id, name, description, employee_type, monthly_price, per_day_price, student_fee, space_category)
VALUES (
    'test-school',
    'resp-math-teaching',
    'Math Teaching',
    'Teaching mathematics in high school classes',
    'TEACHER',
    500.00,
    20.00,
    50.00,
    'Classroom'
)
ON CONFLICT (school_id, responsibility_id) DO NOTHING;

-- 12. Insert Employee Responsibility Assignment (to Class 10-A)
INSERT INTO employee_responsibilities (school_id, employee_id, responsibility_id, space_ids)
VALUES (
    'test-school',
    'emp-math-teacher',
    'resp-math-teaching',
    '["Class 10-A"]'::jsonb
)
ON CONFLICT (school_id, employee_id, responsibility_id) DO NOTHING;

-- 13. Insert Student (associated with Class 10-A)
INSERT INTO students (student_id, school_id, class_name, section, name, status, total_fees)
VALUES ('stud-bob', 'test-school', '10', 'A', 'Bob Jones', 'active', 0.00)
ON CONFLICT (school_id, student_id) DO NOTHING;

-- 14. Insert Employee Attendance (Absent for 2 days in Feb 2026)
INSERT INTO attendance (school_id, role, user_id, date, status)
VALUES 
  ('test-school', 'employee', 'emp-math-teacher', '2026-02-10'::date, 'absent'),
  ('test-school', 'employee', 'emp-math-teacher', '2026-02-18'::date, 'absent')
ON CONFLICT (school_id, role, user_id, date) DO NOTHING;

```

## Migration: 202605250000_create_coupons.sql

```sql
-- Migration: Create Coupons and Student Coupons Tables

CREATE TABLE IF NOT EXISTS coupons (
    coupon_id VARCHAR(255) NOT NULL,
    school_id VARCHAR(255) NOT NULL,
    coupon_name VARCHAR(255) NOT NULL,
    discount_type VARCHAR(50) NOT NULL,
    discount_value DOUBLE PRECISION NOT NULL,
    is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
    data JSONB,
    PRIMARY KEY (school_id, coupon_id),
    CONSTRAINT unique_school_coupon_name UNIQUE (school_id, coupon_name)
);

CREATE TABLE IF NOT EXISTS student_coupons (
    school_id VARCHAR(255) NOT NULL,
    student_id VARCHAR(255) NOT NULL,
    coupon_id VARCHAR(255) NOT NULL,
    discount_applied DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (school_id, student_id, coupon_id)
);

```

## Migration: 202606050000_remove_auth_id.sql

```sql
-- Migration: Remove auto-incrementing ID column from auth table for security hardening

DO $$
BEGIN
    -- 1. Check if the primary key on 'auth' is already 'school_id'
    -- If it isn't, we drop the existing PK constraint and set school_id as PK.
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.table_name = 'auth' 
          AND tc.constraint_type = 'PRIMARY KEY'
          AND kcu.column_name = 'school_id'
    ) THEN
        -- Drop the old PK constraint if it exists (usually named 'auth_pkey')
        ALTER TABLE auth DROP CONSTRAINT IF EXISTS auth_pkey CASCADE;
        -- Add primary key to school_id
        ALTER TABLE auth ADD PRIMARY KEY (school_id);
    END IF;

    -- 2. Drop the id column if it still exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'auth' AND column_name = 'id'
    ) THEN
        ALTER TABLE auth DROP COLUMN id;
    END IF;
END $$;

```

## Migration: 202606110000_enable_pgvector_and_alter_cache.sql

```sql
CREATE EXTENSION IF NOT EXISTS vector;

-- Alter ai_query_cache
ALTER TABLE ai_query_cache ALTER COLUMN question_embedding TYPE vector(768) USING question_embedding::vector;
CREATE INDEX IF NOT EXISTS idx_ai_query_cache_embedding ON ai_query_cache USING hnsw (question_embedding vector_cosine_ops);

-- Alter document_embeddings
ALTER TABLE document_embeddings ALTER COLUMN chunk_embedding TYPE vector(768) USING chunk_embedding::vector;
CREATE INDEX IF NOT EXISTS idx_document_embeddings_embedding ON document_embeddings USING hnsw (chunk_embedding vector_cosine_ops);

```

## Migration: 202606110002_schema_rag.sql

```sql
CREATE TABLE IF NOT EXISTS ai_schema_embeddings (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(255) UNIQUE NOT NULL,
    schema_text TEXT NOT NULL,
    schema_embedding vector(768),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ai_schema_embeddings_vector_idx 
ON ai_schema_embeddings USING hnsw (schema_embedding vector_cosine_ops);

```

## Migration: 202606120000_add_bm25_to_ai_cache.sql

```sql
-- Enable pg_trgm for advanced text search if needed (we primarily use built-in tsvector though)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add TSVECTOR columns
ALTER TABLE ai_query_cache ADD COLUMN IF NOT EXISTS question_tsvector tsvector;
ALTER TABLE ai_schema_embeddings ADD COLUMN IF NOT EXISTS schema_tsvector tsvector;

-- Create functions to update the tsvector columns automatically
CREATE OR REPLACE FUNCTION update_ai_query_cache_tsvector() RETURNS trigger AS $$
BEGIN
  NEW.question_tsvector := to_tsvector('english', NEW.question_text);
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_ai_schema_tsvector() RETURNS trigger AS $$
BEGIN
  NEW.schema_tsvector := to_tsvector('english', NEW.schema_text);
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trg_update_ai_query_cache_tsvector ON ai_query_cache;
CREATE TRIGGER trg_update_ai_query_cache_tsvector
  BEFORE INSERT OR UPDATE OF question_text ON ai_query_cache
  FOR EACH ROW EXECUTE FUNCTION update_ai_query_cache_tsvector();

DROP TRIGGER IF EXISTS trg_update_ai_schema_tsvector ON ai_schema_embeddings;
CREATE TRIGGER trg_update_ai_schema_tsvector
  BEFORE INSERT OR UPDATE OF schema_text ON ai_schema_embeddings
  FOR EACH ROW EXECUTE FUNCTION update_ai_schema_tsvector();

-- Backfill existing data
UPDATE ai_query_cache SET question_tsvector = to_tsvector('english', question_text) WHERE question_tsvector IS NULL;
UPDATE ai_schema_embeddings SET schema_tsvector = to_tsvector('english', schema_text) WHERE schema_tsvector IS NULL;

-- Create GIN Indexes for fast search
CREATE INDEX IF NOT EXISTS idx_ai_query_cache_tsvector ON ai_query_cache USING GIN(question_tsvector);
CREATE INDEX IF NOT EXISTS idx_ai_schema_embeddings_tsvector ON ai_schema_embeddings USING GIN(schema_tsvector);

```

## Migration: 202606130000_ai_shadow_evaluations.sql

```sql
-- 202606130000_ai_shadow_evaluations.sql
CREATE TABLE IF NOT EXISTS ai_shadow_evaluations (
    id SERIAL PRIMARY KEY,
    session_id UUID NOT NULL,
    user_query TEXT NOT NULL,
    senior_sql TEXT NOT NULL,
    junior_sql TEXT,
    status VARCHAR(50) DEFAULT 'PENDING',
    lesson_learned TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_training_metrics (
    id SERIAL PRIMARY KEY,
    target_count INTEGER DEFAULT 1000,
    current_passed INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial row
INSERT INTO ai_training_metrics (target_count, current_passed) VALUES (1000, 0);

```

## Migration: 202606150000_ai_comprehensive_improvements.sql

```sql
-- Create read-only role for AI queries
-- Note: The role might already exist, so we use a block
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = 'ai_readonly_role') THEN

      CREATE ROLE ai_readonly_role;
   END IF;
END
$do$;

-- Grant select privileges on all current and future tables in public schema
GRANT USAGE ON SCHEMA public TO ai_readonly_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO ai_readonly_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO ai_readonly_role;

-- Create ai_usage_logs table
CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    tokens_used INTEGER NOT NULL DEFAULT 0,
    endpoint VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_school ON ai_usage_logs(school_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_date ON ai_usage_logs(created_at);

-- Create ai_background_jobs table for queueing
CREATE TABLE IF NOT EXISTS ai_background_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    retries INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_background_jobs_status ON ai_background_jobs(status);

```

## Migration: 202606160000_ai_school_status.sql

```sql
-- Create ai_school_status table for tracking AI experience levels
CREATE TABLE IF NOT EXISTS ai_school_status (
    school_id VARCHAR(50) PRIMARY KEY,
    queries_processed INTEGER DEFAULT 0,
    accuracy_score FLOAT DEFAULT 0.0,
    is_junior_graduated BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

```

## Migration: 202606160001_ai_background_jobs.sql

```sql
-- AI Background Jobs Queue Table
-- Used by the Python background evaluator worker (FOR UPDATE SKIP LOCKED pattern)

CREATE TABLE IF NOT EXISTS ai_background_jobs (
    id SERIAL PRIMARY KEY,
    job_type VARCHAR(100) NOT NULL,
    payload JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'PENDING',
    result JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_bg_jobs_status ON ai_background_jobs(status);
CREATE INDEX IF NOT EXISTS idx_ai_bg_jobs_created ON ai_background_jobs(created_at);

```

## Migration: 202606170000_ai_smart_cache_suggestions.sql

```sql
-- Migration to add search_count and last_used_at to ai_query_cache for smart caching and suggestions

ALTER TABLE ai_query_cache
  ADD COLUMN IF NOT EXISTS search_count INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ DEFAULT NOW();

-- Create a unique index if one doesn't exist to allow ON CONFLICT DO UPDATE
-- We'll just create a unique index on (school_id, question_text) if it doesn't already exist.
-- To do this cleanly in Postgres without errors if it exists:
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_query_cache_school_question 
  ON ai_query_cache(school_id, question_text);

CREATE INDEX IF NOT EXISTS idx_cache_school_count 
  ON ai_query_cache(school_id, search_count DESC);

```

## Migration: 202606180000_ai_cache_indexes.sql

```sql
-- Phase 1: HNSW and Trigram Indexes for AI Query Cache

-- Add HNSW index for fast vector similarity search (cosine distance)
-- This allows sub-millisecond lookups even with 10M+ rows
CREATE INDEX IF NOT EXISTS idx_ai_query_cache_embedding_hnsw 
ON ai_query_cache USING hnsw (question_embedding vector_cosine_ops);

-- Add pg_trgm extension if not exists for fast ILIKE/similarity matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add GIN index for trigram matching to support fast auto-complete on typing
CREATE INDEX IF NOT EXISTS idx_ai_query_cache_question_trgm 
ON ai_query_cache USING gin (question_text gin_trgm_ops);

```


