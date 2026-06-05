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
