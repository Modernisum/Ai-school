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