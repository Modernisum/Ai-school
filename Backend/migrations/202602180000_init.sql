-- Initial Migration: Schema for school management

-- Schools / Auth
CREATE TABLE IF NOT EXISTS auth (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR(255) UNIQUE NOT NULL,
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
