-- Migration: Simplify Spaces (Remove space_id and space_number)

-- 1. Remove space_id and space_number from spaces table
ALTER TABLE spaces DROP COLUMN IF EXISTS space_id;
ALTER TABLE spaces DROP COLUMN IF EXISTS space_number;

-- 2. Ensure name is unique per school
ALTER TABLE spaces ADD CONSTRAINT unique_school_space_name UNIQUE (school_id, name);

-- 3. Update dependent tables to use name instead of space_id
-- NOTE: We assume space_id was previously set to same as name or similar. 
-- In a "clean fresh" environment, we can just rename columns.

-- Items
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'items' AND column_name = 'space_id') THEN
        ALTER TABLE items RENAME COLUMN space_id TO space_name;
    END IF;
END $$;

-- Space Materials
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'space_materials' AND column_name = 'space_id') THEN
        ALTER TABLE space_materials RENAME COLUMN space_id TO space_name;
    END IF;
END $$;

-- Space Employees
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'space_employees' AND column_name = 'space_id') THEN
        ALTER TABLE space_employees RENAME COLUMN space_id TO space_name;
    END IF;
END $$;

-- Space Requirements
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'space_requirements' AND column_name = 'space_id') THEN
        ALTER TABLE space_requirements RENAME COLUMN space_id TO space_name;
    END IF;
END $$;

-- Space Material Requirements
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'space_material_requirements' AND column_name = 'space_id') THEN
        ALTER TABLE space_material_requirements RENAME COLUMN space_id TO space_name;
    END IF;
END $$;
