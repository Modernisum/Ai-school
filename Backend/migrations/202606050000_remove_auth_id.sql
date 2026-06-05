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
