-- Migration: Simplify Spaces (Remove space_id and space_number)

-- 1. Remove space_id and space_number from spaces table
DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE spaces DROP COLUMN IF EXISTS space_id;
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
