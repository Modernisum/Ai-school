use sqlx::postgres::PgPool;
use std::error::Error;

/// Database schema initialization and management
pub struct SchemaSetup {
    pool: PgPool,
}

impl SchemaSetup {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Initialize all database tables and sequences
    pub async fn initialize_all(&self) -> Result<(), Box<dyn Error>> {
        self.initialize_sequences().await?;
        self.initialize_auth_tables().await?;
        self.initialize_billing_tables().await?;
        self.initialize_promo_tables().await?;
        self.initialize_schools_table().await?;
        self.initialize_student_employee_tables().await?;
        self.initialize_missing_tables().await?;
        self.initialize_super_admin_tables().await?;
        self.initialize_geo_tables().await?;
        self.initialize_audit_tables().await?;
        self.initialize_global_users_tables().await?;
        self.initialize_resource_tables().await?;
        self.initialize_space_requirements_tables().await?;
        self.initialize_responsibilities_tables().await?;
        self.initialize_announcements_events_tables().await?;
        self.initialize_classes_subjects_tables().await?;
        self.initialize_exams_table().await?;
        self.initialize_timetable_tables().await?;
        self.initialize_files_table().await?;
        self.initialize_profile_image_support().await?;
        self.initialize_global_notifications_tables().await?;
        self.initialize_notifications_table().await?;
        self.initialize_grading_tables().await?;
        self.initialize_exam_checker_workflow().await?;
        self.initialize_syllabus_calendar_tables().await?;
        Ok(())
    }

    async fn initialize_missing_tables(&self) -> Result<(), Box<dyn Error>> {
        println!("Ensuring missing tables from backup exist...");
        
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS fees (
                id SERIAL PRIMARY KEY,
                school_id VARCHAR(255) NOT NULL,
                student_id VARCHAR(255) NOT NULL,
                fees_name VARCHAR(255),
                fees_amount NUMERIC(12, 2) NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                due_date DATE,
                paid_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )"
        ).execute(&self.pool).await?;

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS student_history (
                id SERIAL PRIMARY KEY,
                school_id VARCHAR(255) NOT NULL,
                student_id VARCHAR(255) NOT NULL,
                rev_no INTEGER NOT NULL,
                author VARCHAR(255),
                data JSONB NOT NULL,
                delta JSONB NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )"
        ).execute(&self.pool).await?;

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS leaves (
                id SERIAL PRIMARY KEY,
                school_id VARCHAR(255) NOT NULL,
                user_id VARCHAR(255) NOT NULL,
                user_type VARCHAR(50) NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                reason TEXT,
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMPTZ DEFAULT NOW()
            )"
        ).execute(&self.pool).await?;

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS attendance (
                id SERIAL PRIMARY KEY,
                school_id VARCHAR(255) NOT NULL,
                user_id VARCHAR(255) NOT NULL,
                user_type VARCHAR(50) NOT NULL,
                date DATE NOT NULL,
                status VARCHAR(50) NOT NULL,
                marked_by VARCHAR(255),
                created_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(school_id, user_id, user_type, date)
            )"
        ).execute(&self.pool).await?;

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS coupons (
                coupon_id VARCHAR(255) NOT NULL,
                school_id VARCHAR(255) NOT NULL,
                coupon_name VARCHAR(255) NOT NULL,
                discount_type VARCHAR(50) NOT NULL,
                discount_value DOUBLE PRECISION NOT NULL,
                is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
                data JSONB,
                PRIMARY KEY (school_id, coupon_id),
                CONSTRAINT unique_school_coupon_name UNIQUE (school_id, coupon_name)
            )"
        ).execute(&self.pool).await?;

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS student_coupons (
                school_id VARCHAR(255) NOT NULL,
                student_id VARCHAR(255) NOT NULL,
                coupon_id VARCHAR(255) NOT NULL,
                discount_applied DOUBLE PRECISION NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                PRIMARY KEY (school_id, student_id, coupon_id)
            )"
        ).execute(&self.pool).await?;

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS awards (
                id SERIAL PRIMARY KEY,
                school_id VARCHAR(255) NOT NULL,
                user_id VARCHAR(255) NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                date DATE,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )"
        ).execute(&self.pool).await?;

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS complaints (
                id SERIAL PRIMARY KEY,
                school_id VARCHAR(255) NOT NULL,
                complainant_id VARCHAR(255) NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                status VARCHAR(50) DEFAULT 'open',
                created_at TIMESTAMPTZ DEFAULT NOW()
            )"
        ).execute(&self.pool).await?;

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS reminders (
                id SERIAL PRIMARY KEY,
                school_id VARCHAR(255) NOT NULL,
                user_id VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                remind_at TIMESTAMPTZ NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMPTZ DEFAULT NOW()
            )"
        ).execute(&self.pool).await?;

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS audit_logs (
                id SERIAL PRIMARY KEY,
                school_id VARCHAR(255) NOT NULL,
                admin_id VARCHAR(255),
                entity_type VARCHAR(50) NOT NULL,
                entity_id VARCHAR(255),
                action VARCHAR(100) NOT NULL,
                details TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )"
        ).execute(&self.pool).await?;

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS webhook_delivery_logs (
                id SERIAL PRIMARY KEY,
                school_id VARCHAR(255) NOT NULL,
                endpoint_id INTEGER NOT NULL,
                event_type VARCHAR(100) NOT NULL,
                status_code INTEGER,
                request_payload JSONB,
                response_body TEXT,
                error_message TEXT,
                delivered_at TIMESTAMPTZ DEFAULT NOW()
            )"
        ).execute(&self.pool).await?;

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS webhook_endpoints (
                id SERIAL PRIMARY KEY,
                school_id VARCHAR(255) NOT NULL,
                url TEXT NOT NULL,
                secret VARCHAR(255),
                events JSONB DEFAULT '[]',
                status VARCHAR(50) DEFAULT 'active',
                created_at TIMESTAMPTZ DEFAULT NOW()
            )"
        ).execute(&self.pool).await?;

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS tasks (
                id SERIAL PRIMARY KEY,
                school_id VARCHAR(255) NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                status VARCHAR(50) DEFAULT 'pending',
                priority VARCHAR(50) DEFAULT 'medium',
                assigned_to VARCHAR(255),
                due_date TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )"
        ).execute(&self.pool).await?;

        Ok(())
    }

    async fn initialize_student_employee_tables(&self) -> Result<(), Box<dyn Error>> {
        println!("Ensuring students and employees tables exist...");
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS students (
                id SERIAL PRIMARY KEY,
                student_id VARCHAR(255) NOT NULL,
                school_id VARCHAR(255) NOT NULL,
                class_name VARCHAR(100) NOT NULL,
                name TEXT,
                roll_number INT,
                section VARCHAR(50),
                status VARCHAR(50) NOT NULL DEFAULT 'active',
                data JSONB NOT NULL DEFAULT '{}',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(school_id, student_id)
            )"
        ).execute(&self.pool).await?;

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS employees (
                id SERIAL PRIMARY KEY,
                employee_id VARCHAR(255) NOT NULL,
                school_id VARCHAR(255) NOT NULL,
                employee_type VARCHAR(50) NOT NULL,
                data JSONB NOT NULL DEFAULT '{}',
                status VARCHAR(50) NOT NULL DEFAULT 'active',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(school_id, employee_id)
            )"
        ).execute(&self.pool).await?;

        Ok(())
    }

    async fn initialize_sequences(&self) -> Result<(), Box<dyn Error>> {
        println!("Ensuring required sequences exist...");
        sqlx::query("CREATE SEQUENCE IF NOT EXISTS school_code_seq START 1")
            .execute(&self.pool)
            .await?;
        sqlx::query("CREATE SEQUENCE IF NOT EXISTS employee_id_seq START 1")
            .execute(&self.pool)
            .await?;
        sqlx::query("CREATE SEQUENCE IF NOT EXISTS student_id_seq START 1")
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    async fn initialize_schools_table(&self) -> Result<(), Box<dyn Error>> {
        println!("Creating schools table...");
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS schools (
                id SERIAL PRIMARY KEY,
                school_id TEXT UNIQUE NOT NULL,
                school_name TEXT NOT NULL,
                data JSONB DEFAULT '{}',
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )",
        )
        .execute(&self.pool)
        .await?;

        println!("Migrating schools table...");
        sqlx::query(
            "ALTER TABLE schools
             ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active',
             ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
             ADD COLUMN IF NOT EXISTS session_duration_hours INTEGER NOT NULL DEFAULT 24,
             ADD COLUMN IF NOT EXISTS notification JSONB DEFAULT NULL,
             ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(10, 2) NOT NULL DEFAULT 1000.00,
             ADD COLUMN IF NOT EXISTS per_student_rate NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
             ADD COLUMN IF NOT EXISTS billing_status VARCHAR(20) NOT NULL DEFAULT 'active',
             ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT NULL,
             ADD COLUMN IF NOT EXISTS last_billing_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP",
        )
        .execute(&self.pool)
        .await?;

        println!("Adding base_rate and promo tracking to schools...");
        sqlx::query(
            "ALTER TABLE schools 
             ADD COLUMN IF NOT EXISTS base_rate NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
             ADD COLUMN IF NOT EXISTS active_promo_id INTEGER REFERENCES promo_codes(id),
             ADD COLUMN IF NOT EXISTS promo_expires_at TIMESTAMPTZ",
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    async fn initialize_auth_tables(&self) -> Result<(), Box<dyn Error>> {
        println!("Ensuring core global tables exist...");
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS auth (
                id SERIAL PRIMARY KEY,
                school_id VARCHAR(255) UNIQUE NOT NULL,
                password TEXT NOT NULL,
                password_temp BOOLEAN DEFAULT FALSE,
                security_question TEXT,
                security_answer_hash TEXT,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )",
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS tokens (
                token_id TEXT PRIMARY KEY,
                school_id TEXT NOT NULL,
                user_type VARCHAR(50) NOT NULL,
                status VARCHAR(50) NOT NULL,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMPTZ NOT NULL
            )",
        )
        .execute(&self.pool)
        .await?;

        println!("Creating auth_logs table...");
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS auth_logs (
                id SERIAL PRIMARY KEY,
                school_id TEXT NOT NULL,
                user_type TEXT,
                action TEXT,
                details TEXT,
                ip_address TEXT,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )",
        )
        .execute(&self.pool)
        .await?;

        sqlx::query("ALTER TABLE auth_logs ADD COLUMN IF NOT EXISTS details TEXT")
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    async fn initialize_billing_tables(&self) -> Result<(), Box<dyn Error>> {
        println!("Creating billing ledger table...");
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS billing_ledger (
                id SERIAL PRIMARY KEY,
                school_id TEXT,
                amount NUMERIC(15, 2) NOT NULL,
                transaction_type TEXT NOT NULL,
                description TEXT,
                balance_after NUMERIC(15, 2) NOT NULL,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )",
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    async fn initialize_promo_tables(&self) -> Result<(), Box<dyn Error>> {
        println!("Creating promo codes table...");
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS promo_codes (
                id SERIAL PRIMARY KEY,
                code VARCHAR(50) UNIQUE NOT NULL,
                credit_amount NUMERIC(10, 2) DEFAULT 0.00,
                free_days INTEGER DEFAULT 0,
                discount_percentage NUMERIC(5, 2) DEFAULT 0.00,
                max_uses INTEGER DEFAULT 1,
                current_uses INTEGER DEFAULT 0,
                expires_at TIMESTAMPTZ DEFAULT NULL,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )",
        )
        .execute(&self.pool)
        .await?;

        println!("Creating school promo tracking table...");
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS school_promo_codes (
                id SERIAL PRIMARY KEY,
                school_id VARCHAR(255) NOT NULL,
                promo_code_id INTEGER NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
                applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(school_id, promo_code_id)
            )",
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    async fn initialize_super_admin_tables(&self) -> Result<(), Box<dyn Error>> {
        println!("Ensuring super_admin table exists...");
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS super_admin (
                id SERIAL PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                profile_image_url TEXT,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )",
        )
        .execute(&self.pool)
        .await?;

        println!("Ensuring system_config table exists...");
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS system_config (
                config_key TEXT PRIMARY KEY,
                config_value TEXT NOT NULL,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )",
        )
        .execute(&self.pool)
        .await?;

        println!("Ensuring support_requests table exists...");
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS support_requests (
                id SERIAL PRIMARY KEY,
                school_name VARCHAR(255) NOT NULL,
                contact_info TEXT,
                message TEXT NOT NULL,
                status VARCHAR(50) DEFAULT 'open',
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                resolved_at TIMESTAMPTZ
            )",
        )
        .execute(&self.pool)
        .await?;

        // Seed GEMINI_API_KEY if not already present or force update the user's provided key
        let gemini_key = std::env::var("GEMINI_API_KEY")
            .unwrap_or_else(|_| "AIzaSyAcpd2loWLizjNP1TgenvHiA7WbaEguvbU".to_string());
        sqlx::query("INSERT INTO system_config (config_key, config_value) VALUES ('GEMINI_API_KEY', $1) ON CONFLICT (config_key) DO UPDATE SET config_value = $1")
            .bind(gemini_key)
            .execute(&self.pool)
            .await?;

        // Seed default super admin if table is empty
        let default_password = std::env::var("DEFAULT_SUPERADMIN_PASSWORD")
            .unwrap_or_else(|_| "admin@123".to_string());
        let initial_hash = bcrypt::hash(&default_password, 10)
            .unwrap_or_else(|_| "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lfkj7.wU3Kz9s1PFe".to_string());
        sqlx::query(
            "INSERT INTO super_admin (username, password_hash)
             VALUES ('superadmin', $1)
             ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash",
        )
        .bind(initial_hash)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    async fn initialize_geo_tables(&self) -> Result<(), Box<dyn Error>> {
        println!("Creating geo data tables...");
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS countries (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) UNIQUE NOT NULL,
                code VARCHAR(10) NOT NULL,
                phone_code VARCHAR(10) NOT NULL
            )",
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS states (
                id SERIAL PRIMARY KEY,
                country_id INTEGER REFERENCES countries(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                UNIQUE(country_id, name)
            )",
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS districts (
                id SERIAL PRIMARY KEY,
                state_id INTEGER REFERENCES states(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                UNIQUE(state_id, name)
            )",
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    async fn initialize_audit_tables(&self) -> Result<(), Box<dyn Error>> {
        println!("Creating system_audit_logs table...");
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS system_audit_logs (
                id SERIAL PRIMARY KEY,
                school_id TEXT NOT NULL,
                admin_id TEXT NOT NULL,
                entity_type TEXT NOT NULL,
                entity_id TEXT NOT NULL,
                action_type TEXT NOT NULL,
                changed_data JSONB NOT NULL,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )",
        )
        .execute(&self.pool)
        .await?;

        sqlx::query("CREATE INDEX IF NOT EXISTS system_audit_logs_school_idx ON system_audit_logs (school_id)")
             .execute(&self.pool)
             .await?;

        Ok(())
    }

    async fn initialize_global_users_tables(&self) -> Result<(), Box<dyn Error>> {
        println!("Creating global_users table for unified login...");
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS global_users (
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
            )",
        )
        .execute(&self.pool)
        .await?;

        // Add indexes for fast lookup
        sqlx::query("CREATE INDEX IF NOT EXISTS global_users_phone_idx ON global_users (phone)")
            .execute(&self.pool)
            .await?;
        sqlx::query("CREATE INDEX IF NOT EXISTS global_users_email_idx ON global_users (email)")
            .execute(&self.pool)
            .await?;
        sqlx::query(
            "CREATE INDEX IF NOT EXISTS global_users_aadhaar_idx ON global_users (aadhaar_number)",
        )
        .execute(&self.pool)
        .await?;

        println!("Creating user_activity_logs table for global activity tracking...");
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS user_activity_logs (
                id SERIAL PRIMARY KEY,
                phone VARCHAR(50) NOT NULL,
                user_type VARCHAR(50) NOT NULL,
                action VARCHAR(50) NOT NULL,
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )",
        )
        .execute(&self.pool)
        .await?;

        sqlx::query("CREATE INDEX IF NOT EXISTS user_activity_logs_phone_idx ON user_activity_logs (phone)")
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    async fn initialize_resource_tables(&self) -> Result<(), Box<dyn Error>> {
        println!("Ensuring resource management tables exist...");
        
        // 1. Spaces Table
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS spaces (
                id SERIAL PRIMARY KEY,
                school_id TEXT NOT NULL,
                name TEXT NOT NULL,
                space_category TEXT,
                data JSONB DEFAULT '{}',
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(school_id, name)
            )"
        ).execute(&self.pool).await?;

        sqlx::query(
            "DO $$ 
             DECLARE
                cons_record RECORD;
             BEGIN 
                -- FORCED RESET: Drop ALL unique constraints on spaces to avoid ambiguity
                FOR cons_record IN (
                    SELECT conname 
                    FROM pg_constraint c 
                    JOIN pg_class t ON c.conrelid = t.oid 
                    JOIN pg_namespace n ON t.relnamespace = n.oid 
                    WHERE t.relname = 'spaces' AND n.nspname = 'public' AND c.contype = 'u'
                ) LOOP
                    EXECUTE 'ALTER TABLE public.spaces DROP CONSTRAINT ' || quote_ident(cons_record.conname) || ' CASCADE';
                END LOOP;

                -- Add the definitive composite constraint
                ALTER TABLE public.spaces ADD CONSTRAINT unique_school_space_name UNIQUE (school_id, name);
             END $$;"
        ).execute(&self.pool).await?;

        sqlx::query(
            "ALTER TABLE spaces 
             ADD COLUMN IF NOT EXISTS name TEXT,
             ADD COLUMN IF NOT EXISTS space_category TEXT,
             ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'"
        ).execute(&self.pool).await?;
        
        // Ensure id has a default if it was created as null-violating VARCHAR
        sqlx::query("CREATE SEQUENCE IF NOT EXISTS spaces_id_seq").execute(&self.pool).await?;
        sqlx::query("ALTER TABLE spaces ALTER COLUMN id SET DEFAULT nextval('spaces_id_seq')").execute(&self.pool).await?;

        // 2. Items Table
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS items (
                id SERIAL PRIMARY KEY,
                item_id TEXT NOT NULL,
                school_id TEXT NOT NULL,
                space_name TEXT NOT NULL,
                item_name TEXT NOT NULL,
                room_number TEXT,
                class_id TEXT,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(school_id, space_name, item_id)
            )"
        ).execute(&self.pool).await?;

        sqlx::query(
            "DO $$ 
             DECLARE
                cons_record RECORD;
             BEGIN 
                -- FORCED RESET: Drop ALL unique constraints on items to avoid ambiguity
                FOR cons_record IN (
                    SELECT conname 
                    FROM pg_constraint c 
                    JOIN pg_class t ON c.conrelid = t.oid 
                    JOIN pg_namespace n ON t.relnamespace = n.oid 
                    WHERE t.relname = 'items' AND n.nspname = 'public' AND c.contype = 'u'
                ) LOOP
                    EXECUTE 'ALTER TABLE public.items DROP CONSTRAINT ' || quote_ident(cons_record.conname) || ' CASCADE';
                END LOOP;

                -- Add the definitive composite constraint required by the repository
                ALTER TABLE public.items ADD CONSTRAINT items_school_space_item_composite_unique UNIQUE (school_id, space_name, item_id);
             END $$;"
        ).execute(&self.pool).await?;

        sqlx::query(
            "ALTER TABLE items 
             ADD COLUMN IF NOT EXISTS item_id TEXT,
             ADD COLUMN IF NOT EXISTS school_id TEXT,
             ADD COLUMN IF NOT EXISTS space_name TEXT,
             ADD COLUMN IF NOT EXISTS item_name TEXT,
             ADD COLUMN IF NOT EXISTS room_number TEXT,
             ADD COLUMN IF NOT EXISTS class_id TEXT"
        ).execute(&self.pool).await?;

        sqlx::query("CREATE SEQUENCE IF NOT EXISTS items_id_seq").execute(&self.pool).await?;
        sqlx::query("ALTER TABLE items ALTER COLUMN id SET DEFAULT nextval('items_id_seq')").execute(&self.pool).await?;
        
        // Ensure index matches repository conflict target exactly
        sqlx::query("DROP INDEX IF EXISTS idx_items_school_space_item_unique").execute(&self.pool).await?;
        sqlx::query("DROP INDEX IF EXISTS idx_items_space_item_unique").execute(&self.pool).await?;
        sqlx::query("CREATE UNIQUE INDEX IF NOT EXISTS idx_items_school_space_item_final ON items (school_id, space_name, item_id)")
             .execute(&self.pool).await?;

        // 3. Materials Table
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS materials (
                id TEXT NOT NULL,
                school_id TEXT NOT NULL,
                name TEXT NOT NULL,
                quantity INTEGER DEFAULT 0,
                unit_price NUMERIC(15, 2) DEFAULT 0.00,
                unit TEXT,
                attachment_path TEXT,
                extra_unit INTEGER DEFAULT 0,
                need_unit INTEGER DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (school_id, id)
            )"
        ).execute(&self.pool).await?;

        sqlx::query(
            "DO $$ 
             BEGIN 
                -- If it was created as a single-column primary key, drop it and recreate as composite
                IF EXISTS (
                    SELECT 1 FROM pg_constraint 
                    WHERE conname = 'materials_pkey' 
                    AND (SELECT count(*) FROM pg_attribute WHERE attrelid = 'materials'::regclass AND attnum = ANY(conkey)) = 1
                ) THEN
                    ALTER TABLE materials DROP CONSTRAINT materials_pkey CASCADE;
                    ALTER TABLE materials ADD PRIMARY KEY (school_id, id);
                END IF;
             END $$;"
        ).execute(&self.pool).await?;

        sqlx::query(
            "ALTER TABLE materials
             ADD COLUMN IF NOT EXISTS description TEXT,
             ADD COLUMN IF NOT EXISTS unit TEXT,
             ADD COLUMN IF NOT EXISTS extra_unit INTEGER DEFAULT 0,
             ADD COLUMN IF NOT EXISTS need_unit INTEGER DEFAULT 0"
        ).execute(&self.pool).await?;

        sqlx::query(
            "DROP INDEX IF EXISTS idx_materials_name_unique"
        ).execute(&self.pool).await?;

        sqlx::query(
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_materials_school_name_unique ON materials (school_id, name)"
        ).execute(&self.pool).await?;

        // 4. Space Materials (Assignments)
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS space_materials (
                id SERIAL PRIMARY KEY,
                school_id TEXT NOT NULL,
                space_name TEXT NOT NULL,
                material_id TEXT,
                material_name TEXT NOT NULL,
                quantity INTEGER DEFAULT 0,
                unit TEXT,
                unit_price NUMERIC(15, 2) DEFAULT 0.00,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(school_id, space_name, material_name)
            )"
        ).execute(&self.pool).await?;

        // Self-heal: rename column from space_id to space_name if it exists
        let _ = sqlx::query(
            "DO $$ 
            BEGIN 
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'space_materials' AND column_name = 'space_id') THEN
                    ALTER TABLE space_materials RENAME COLUMN space_id TO space_name;
                END IF;
            END $$;"
        ).execute(&self.pool).await;

        sqlx::query(
            "ALTER TABLE space_materials
             ADD COLUMN IF NOT EXISTS material_id TEXT,
             ADD COLUMN IF NOT EXISTS unit_price NUMERIC(15, 2) DEFAULT 0.00"
        ).execute(&self.pool).await?;

        sqlx::query(
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_space_materials_composite_unique ON space_materials (school_id, space_name, material_name)"
        ).execute(&self.pool).await?;

        // 5. Space Employees (Assignments)
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS space_employees (
                id SERIAL PRIMARY KEY,
                school_id TEXT NOT NULL,
                space_name TEXT NOT NULL,
                employee_id TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(school_id, space_name, employee_id)
            )"
        ).execute(&self.pool).await?;

        // Self-heal: rename column from space_id to space_name if it exists
        let _ = sqlx::query(
            "DO $$ 
            BEGIN 
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'space_employees' AND column_name = 'space_id') THEN
                    ALTER TABLE space_employees RENAME COLUMN space_id TO space_name;
                END IF;
            END $$;"
        ).execute(&self.pool).await;

        // 6. Material Locations (Fine-grained tracking)
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS material_locations (
                id SERIAL PRIMARY KEY,
                school_id TEXT NOT NULL,
                material_id TEXT NOT NULL,
                space_id TEXT NOT NULL,
                item_id TEXT NOT NULL,
                quantity INTEGER DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(school_id, material_id, space_id, item_id)
            )"
        ).execute(&self.pool).await?;

        // 6a. Material History (Audit Trail for purchases, sales, borrows)
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS material_history (
                id SERIAL PRIMARY KEY,
                school_id TEXT NOT NULL,
                material_id TEXT NOT NULL,
                action_type TEXT NOT NULL, -- PURCHASE, SALE, BORROW, RETURN
                quantity INTEGER NOT NULL,
                unit_price NUMERIC(15, 2),
                total_amount NUMERIC(15, 2),
                actor_id TEXT, -- Admin or user who performed the action
                space_id TEXT, -- Relevant for BORROW/RETURN
                notes TEXT,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )"
        ).execute(&self.pool).await?;

        sqlx::query("CREATE INDEX IF NOT EXISTS idx_material_history_composite ON material_history (school_id, material_id, created_at DESC)")
            .execute(&self.pool).await?;
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_material_history_action ON material_history (school_id, action_type)")
            .execute(&self.pool).await?;

        // 7. Space Categories
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS space_categories (
                id SERIAL PRIMARY KEY,
                school_id TEXT,
                name TEXT NOT NULL,
                is_default BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(school_id, name)
            )"
        ).execute(&self.pool).await?;

        sqlx::query("ALTER TABLE space_categories ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE")
            .execute(&self.pool).await?;
        
        sqlx::query("CREATE UNIQUE INDEX IF NOT EXISTS idx_space_categories_school_name ON space_categories (school_id, name)")
            .execute(&self.pool).await?;

        Ok(())
    }

    async fn initialize_space_requirements_tables(&self) -> Result<(), Box<dyn Error>> {
        println!("Ensuring space requirement tracking tables exist...");
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS space_requirements (
                id SERIAL PRIMARY KEY,
                school_id VARCHAR(255) NOT NULL,
                space_name VARCHAR(255) NOT NULL,
                responsibility_id VARCHAR(255) NOT NULL,
                required_count INT NOT NULL DEFAULT 1,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(school_id, space_name, responsibility_id)
            )"
        ).execute(&self.pool).await?;

        // Self-heal: rename column from space_id to space_name if it exists
        let _ = sqlx::query(
            "DO $$ 
            BEGIN 
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'space_requirements' AND column_name = 'space_id') THEN
                    ALTER TABLE space_requirements RENAME COLUMN space_id TO space_name;
                END IF;
            END $$;"
        ).execute(&self.pool).await;

        sqlx::query("CREATE INDEX IF NOT EXISTS idx_space_req_lookup ON space_requirements (school_id, space_name)")
            .execute(&self.pool).await?;

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS space_material_requirements (
                id SERIAL PRIMARY KEY,
                school_id VARCHAR(255) NOT NULL,
                space_name VARCHAR(255) NOT NULL,
                material_name VARCHAR(255) NOT NULL,
                required_count INTEGER DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(school_id, space_name, material_name)
            )"
        ).execute(&self.pool).await?;

        // Self-heal: rename column from space_id to space_name if it exists
        let _ = sqlx::query(
            "DO $$ 
            BEGIN 
                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'space_material_requirements' AND column_name = 'space_id') THEN
                    ALTER TABLE space_material_requirements RENAME COLUMN space_id TO space_name;
                END IF;
            END $$;"
        ).execute(&self.pool).await;

        sqlx::query("CREATE INDEX IF NOT EXISTS idx_space_mat_req_lookup ON space_material_requirements(school_id, space_name)")
            .execute(&self.pool).await?;

        Ok(())
    }

    async fn initialize_responsibilities_tables(&self) -> Result<(), Box<dyn Error>> {
        println!("Ensuring responsibilities table exists...");
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS responsibilities (
                id VARCHAR(255) PRIMARY KEY,
                school_id VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                status VARCHAR(50) DEFAULT 'active'
            )"
        ).execute(&self.pool).await?;

        println!("Expanding responsibilities table with metadata support...");
        sqlx::query(
            "ALTER TABLE responsibilities
             ADD COLUMN IF NOT EXISTS space_id VARCHAR(255),
             ADD COLUMN IF NOT EXISTS employee_type VARCHAR(50),
             ADD COLUMN IF NOT EXISTS monthly_price DECIMAL(12, 2) DEFAULT 0.00,
             ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}',
             ADD COLUMN IF NOT EXISTS per_day_price DECIMAL(12, 2) DEFAULT 0.00,
             ADD COLUMN IF NOT EXISTS time_period INTEGER DEFAULT 0,
             ADD COLUMN IF NOT EXISTS student_fee DECIMAL(12, 2) DEFAULT 0.00,
             ADD COLUMN IF NOT EXISTS space_category VARCHAR(255),
             ADD COLUMN IF NOT EXISTS work_level VARCHAR(100),
             ADD COLUMN IF NOT EXISTS work_period VARCHAR(100),
             ADD COLUMN IF NOT EXISTS work_amount DECIMAL(12, 2) DEFAULT 0.00,
             ADD COLUMN IF NOT EXISTS created_by VARCHAR(255),
             ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
             ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()"
        ).execute(&self.pool).await?;

        println!("Ensuring employee_responsibilities table exists...");
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS employee_responsibilities (
                id SERIAL PRIMARY KEY,
                school_id VARCHAR(255) NOT NULL,
                employee_id VARCHAR(255) NOT NULL,
                responsibility_id VARCHAR(255) NOT NULL,
                UNIQUE(school_id, employee_id, responsibility_id)
            )"
        ).execute(&self.pool).await?;

        println!("Expanding employee_responsibilities table with space_ids support...");
        sqlx::query(
            "ALTER TABLE employee_responsibilities
             ADD COLUMN IF NOT EXISTS space_ids JSONB DEFAULT '[]'::jsonb"
        ).execute(&self.pool).await?;

        sqlx::query("CREATE INDEX IF NOT EXISTS idx_responsibilities_space_id ON responsibilities(space_id)")
            .execute(&self.pool).await?;
        
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_responsibilities_school_id ON responsibilities(school_id)")
            .execute(&self.pool).await?;

        Ok(())
    }

    async fn initialize_announcements_events_tables(&self) -> Result<(), Box<dyn Error>> {
        // 8. Announcements (RLS optimized)
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS announcements (
                id SERIAL PRIMARY KEY,
                school_id TEXT NOT NULL,
                target_type TEXT NOT NULL,
                user_id TEXT,
                title TEXT,
                content TEXT,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )"
        ).execute(&self.pool).await?;

        // 9. Events
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS events (
                id SERIAL PRIMARY KEY,
                school_id TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                start_time TIMESTAMPTZ NOT NULL,
                end_time TIMESTAMPTZ,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )"
        ).execute(&self.pool).await?;

        Ok(())
    }

    async fn initialize_classes_subjects_tables(&self) -> Result<(), Box<dyn Error>> {
        // 10. Classes
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS classes (
                id TEXT NOT NULL,
                school_id TEXT NOT NULL,
                name TEXT NOT NULL,
                total_students INTEGER DEFAULT 0,
                total_teachers INTEGER DEFAULT 0,
                total_periods INTEGER DEFAULT 0,
                room_number TEXT,
                class_fees NUMERIC(15, 2) DEFAULT 0.00,
                sections JSONB DEFAULT '[]',
                streams JSONB DEFAULT '[]',
                section_size INTEGER DEFAULT 40,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (school_id, id)
            )"
        ).execute(&self.pool).await?;

        sqlx::query(
            "DO $$ 
             DECLARE 
                cons_record RECORD;
             BEGIN 
                -- FORCED RESET: Drop ALL unique and primary key constraints on classes
                FOR cons_record IN (
                    SELECT conname 
                    FROM pg_constraint c 
                    JOIN pg_class t ON c.conrelid = t.oid 
                    JOIN pg_namespace n ON t.relnamespace = n.oid 
                    WHERE t.relname = 'classes' AND n.nspname = 'public' AND c.contype IN ('p', 'u')
                ) LOOP
                    EXECUTE 'ALTER TABLE public.classes DROP CONSTRAINT ' || quote_ident(cons_record.conname) || ' CASCADE';
                END LOOP;

                -- Add the definitive composite PRIMARY KEY
                ALTER TABLE public.classes ADD PRIMARY KEY (school_id, id);
             END $$;"
        ).execute(&self.pool).await?;

        sqlx::query(
            "ALTER TABLE classes
             ADD COLUMN IF NOT EXISTS id TEXT,
             ADD COLUMN IF NOT EXISTS school_id TEXT,
             ADD COLUMN IF NOT EXISTS name TEXT,
             ADD COLUMN IF NOT EXISTS total_students INTEGER DEFAULT 0,
             ADD COLUMN IF NOT EXISTS total_teachers INTEGER DEFAULT 0,
             ADD COLUMN IF NOT EXISTS total_periods INTEGER DEFAULT 0,
             ADD COLUMN IF NOT EXISTS class_fees NUMERIC(15, 2) DEFAULT 0.00,
             ADD COLUMN IF NOT EXISTS sections JSONB DEFAULT '[]',
             ADD COLUMN IF NOT EXISTS streams JSONB DEFAULT '[]',
             ADD COLUMN IF NOT EXISTS section_size INTEGER DEFAULT 40"
        ).execute(&self.pool).await?;
        
        sqlx::query("CREATE UNIQUE INDEX IF NOT EXISTS idx_classes_school_id_unique ON classes (school_id, id)")
            .execute(&self.pool).await?;

        // 11. Subjects
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS subjects (
                id TEXT NOT NULL,
                school_id TEXT NOT NULL,
                name TEXT NOT NULL,
                class_id TEXT,
                class_name TEXT,
                fees NUMERIC(15, 2) DEFAULT 0.00,
                is_compulsory BOOLEAN DEFAULT TRUE,
                category TEXT,
                fee_type TEXT DEFAULT 'monthly',
                fee_interval INTEGER DEFAULT 1,
                schedule_type TEXT DEFAULT 'daily',
                schedule_data JSONB DEFAULT '[]',
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (school_id, id)
            )"
        ).execute(&self.pool).await?;

        sqlx::query(
            "DO $$ 
             DECLARE 
                cons_record RECORD;
             BEGIN 
                -- FORCED RESET: Drop ALL unique and primary key constraints on subjects
                FOR cons_record IN (
                    SELECT conname 
                    FROM pg_constraint c 
                    JOIN pg_class t ON c.conrelid = t.oid 
                    JOIN pg_namespace n ON t.relnamespace = n.oid 
                    WHERE t.relname = 'subjects' AND n.nspname = 'public' AND c.contype IN ('p', 'u')
                ) LOOP
                    EXECUTE 'ALTER TABLE public.subjects DROP CONSTRAINT ' || quote_ident(cons_record.conname) || ' CASCADE';
                END LOOP;

                -- Add the definitive composite PRIMARY KEY
                ALTER TABLE public.subjects ADD PRIMARY KEY (school_id, id);
             END $$;"
        ).execute(&self.pool).await?;

        sqlx::query(
            "ALTER TABLE subjects
             ADD COLUMN IF NOT EXISTS id TEXT,
             ADD COLUMN IF NOT EXISTS school_id TEXT,
             ADD COLUMN IF NOT EXISTS name TEXT,
             ADD COLUMN IF NOT EXISTS class_id TEXT,
             ADD COLUMN IF NOT EXISTS class_name TEXT,
             ADD COLUMN IF NOT EXISTS fees NUMERIC(15, 2) DEFAULT 0.00,
             ADD COLUMN IF NOT EXISTS is_compulsory BOOLEAN DEFAULT TRUE,
             ADD COLUMN IF NOT EXISTS category TEXT,
             ADD COLUMN IF NOT EXISTS fee_type TEXT DEFAULT 'monthly',
             ADD COLUMN IF NOT EXISTS fee_interval INTEGER DEFAULT 1,
             ADD COLUMN IF NOT EXISTS schedule_type TEXT DEFAULT 'daily',
             ADD COLUMN IF NOT EXISTS schedule_data JSONB DEFAULT '[]'"
        ).execute(&self.pool).await?;

        sqlx::query("CREATE UNIQUE INDEX IF NOT EXISTS idx_subjects_school_id_unique ON subjects (school_id, id)")
            .execute(&self.pool).await?;

        Ok(())
    }

    async fn initialize_exams_table(&self) -> Result<(), Box<dyn Error>> {
        // 12. Exams (Quarterly structure)
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS exams (
                id SERIAL PRIMARY KEY,
                school_id TEXT NOT NULL,
                name TEXT NOT NULL,
                quarter TEXT, -- Q1, Q2, Q3, Q4
                start_date DATE,
                end_date DATE,
                status TEXT DEFAULT 'DRAFT',
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(school_id, name)
            )"
        ).execute(&self.pool).await?;

        sqlx::query(
            "ALTER TABLE exams
             ADD COLUMN IF NOT EXISTS quarter TEXT,
             ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'DRAFT',
             ADD COLUMN IF NOT EXISTS exam_type TEXT DEFAULT 'MAIN'"
        ).execute(&self.pool).await?;

        // Exam Sections (Syllabus & Question Papers)
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS exam_sections (
                id SERIAL PRIMARY KEY,
                school_id TEXT NOT NULL,
                exam_id INTEGER NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
                class_id TEXT NOT NULL,
                subject_id TEXT NOT NULL,
                syllabus JSONB DEFAULT '[]', -- Array of chapter/topic IDs
                ai_generated_paper BOOLEAN DEFAULT FALSE,
                questions JSONB DEFAULT '[]', -- The structured question paper
                total_marks INTEGER,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(school_id, exam_id, class_id, subject_id)
            )"
        ).execute(&self.pool).await?;

        // Chapters Table for syllabus division & tracking
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS chapters (
                id SERIAL PRIMARY KEY,
                school_id TEXT NOT NULL,
                subject_id TEXT NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                sequence_order INTEGER DEFAULT 1,
                is_taught BOOLEAN DEFAULT FALSE,
                weightage INTEGER DEFAULT 1, -- for auto-syllabus division
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(school_id, subject_id, name)
            )"
        ).execute(&self.pool).await?;

        sqlx::query(
            "ALTER TABLE chapters
             ADD COLUMN IF NOT EXISTS is_taught BOOLEAN DEFAULT FALSE,
             ADD COLUMN IF NOT EXISTS weightage INTEGER DEFAULT 1,
             ADD COLUMN IF NOT EXISTS quarter TEXT,
             ADD COLUMN IF NOT EXISTS periods_allocated INTEGER DEFAULT 0"
        ).execute(&self.pool).await?;

        // Topics Table (referenced by academic_repo)
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS topics (
                id SERIAL PRIMARY KEY,
                subject_id TEXT,
                name TEXT NOT NULL,
                description TEXT
            )"
        ).execute(&self.pool).await?;

        Ok(())
    }

    async fn initialize_timetable_tables(&self) -> Result<(), Box<dyn Error>> {
        // 13. Timetable System
        println!("Ensuring timetable tables exist...");
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS timetable_configs (
                id SERIAL PRIMARY KEY,
                school_id TEXT NOT NULL,
                config_id TEXT NOT NULL,
                class_id TEXT NOT NULL,
                class_name TEXT,
                periods_per_day INTEGER DEFAULT 8,
                status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
                season VARCHAR(10),
                start_time TIME,
                end_time TIME,
                period_duration_minutes INTEGER DEFAULT 40,
                break_duration_minutes INTEGER DEFAULT 10,
                approved_by TEXT,
                approved_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(school_id, config_id)
            )"
        ).execute(&self.pool).await?;

        sqlx::query(
            "ALTER TABLE timetable_configs
             ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
             ADD COLUMN IF NOT EXISTS season VARCHAR(10),
             ADD COLUMN IF NOT EXISTS start_time TIME,
             ADD COLUMN IF NOT EXISTS end_time TIME,
             ADD COLUMN IF NOT EXISTS period_duration_minutes INTEGER DEFAULT 40,
             ADD COLUMN IF NOT EXISTS break_duration_minutes INTEGER DEFAULT 10,
             ADD COLUMN IF NOT EXISTS approved_by TEXT,
             ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
             ADD COLUMN IF NOT EXISTS view_type TEXT DEFAULT 'global',
             ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT FALSE"
        ).execute(&self.pool).await?;

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS timetable_slots (
                id SERIAL PRIMARY KEY,
                school_id TEXT NOT NULL,
                config_id TEXT NOT NULL,
                class_id TEXT NOT NULL,
                day_of_week INTEGER NOT NULL,
                period_number INTEGER NOT NULL,
                subject_id TEXT,
                subject_name TEXT,
                teacher_id TEXT,
                room_id TEXT,
                time_slot TIME,
                is_free_period BOOLEAN DEFAULT FALSE,
                UNIQUE(school_id, config_id, day_of_week, period_number)
            )"
        ).execute(&self.pool).await?;

        sqlx::query(
            "ALTER TABLE timetable_slots ADD COLUMN IF NOT EXISTS time_slot TIME"
        ).execute(&self.pool).await?;

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS teacher_availability (
                id SERIAL PRIMARY KEY,
                school_id TEXT NOT NULL,
                teacher_id TEXT NOT NULL,
                day_of_week INTEGER NOT NULL,
                period_number INTEGER NOT NULL,
                is_available BOOLEAN DEFAULT TRUE,
                UNIQUE(school_id, teacher_id, day_of_week, period_number)
            )"
        ).execute(&self.pool).await?;

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS timetable_rooms (
                id SERIAL PRIMARY KEY,
                school_id TEXT NOT NULL,
                room_id TEXT NOT NULL,
                room_name TEXT,
                room_type TEXT,
                UNIQUE(school_id, room_id)
            )"
        ).execute(&self.pool).await?;

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS timetable_conflicts (
                id SERIAL PRIMARY KEY,
                school_id TEXT NOT NULL,
                config_id TEXT NOT NULL,
                conflict_type TEXT,
                description TEXT,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )"
        ).execute(&self.pool).await?;

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS timetable_notifications (
                id SERIAL PRIMARY KEY,
                school_id TEXT NOT NULL,
                config_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                user_type VARCHAR(20) NOT NULL,
                notification_type VARCHAR(50) NOT NULL,
                sent_at TIMESTAMPTZ DEFAULT NOW(),
                read BOOLEAN DEFAULT FALSE
            )"
        ).execute(&self.pool).await?;

        Ok(())
    }

    async fn initialize_files_table(&self) -> Result<(), Box<dyn Error>> {
        println!("Creating app_files table for local storage tracking...");
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS app_files (
                id SERIAL PRIMARY KEY,
                file_hash VARCHAR(64) UNIQUE NOT NULL,
                school_id VARCHAR(50),
                user_id VARCHAR(50),
                user_type VARCHAR(20),
                file_name VARCHAR(255) NOT NULL,
                content_type VARCHAR(100),
                file_size BIGINT,
                file_path TEXT NOT NULL,
                public_url TEXT NOT NULL,
                is_permanent BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )"
        ).execute(&self.pool).await?;

        // Migration: Ensure is_permanent column exists
        sqlx::query("ALTER TABLE app_files ADD COLUMN IF NOT EXISTS is_permanent BOOLEAN DEFAULT FALSE")
            .execute(&self.pool)
            .await?;

        // Add index for cleanup performance
        sqlx::query("CREATE INDEX IF NOT EXISTS app_files_permanent_idx ON app_files (is_permanent, created_at)")
            .execute(&self.pool)
            .await?;
        
        // Add indexes for quick lookups
        sqlx::query("CREATE INDEX IF NOT EXISTS app_files_school_idx ON app_files (school_id)").execute(&self.pool).await?;
        sqlx::query("CREATE INDEX IF NOT EXISTS app_files_user_idx ON app_files (user_id)").execute(&self.pool).await?;

        Ok(())
    }

    async fn initialize_profile_image_support(&self) -> Result<(), Box<dyn Error>> {
        println!("Updating students and employees tables with profile image support...");
        sqlx::query("ALTER TABLE students ADD COLUMN IF NOT EXISTS profile_image_url TEXT")
            .execute(&self.pool)
            .await?;
        sqlx::query("ALTER TABLE students ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}'")
            .execute(&self.pool)
            .await?;
        sqlx::query("ALTER TABLE employees ADD COLUMN IF NOT EXISTS profile_image_url TEXT")
            .execute(&self.pool)
            .await?;

        // Ensure employees table has a status column for indexing
        sqlx::query("ALTER TABLE employees ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'active'")
            .execute(&self.pool)
            .await?;

        println!("Updating schools and super_admin tables with image support...");
        sqlx::query("ALTER TABLE schools ADD COLUMN IF NOT EXISTS school_logo_url TEXT")
            .execute(&self.pool)
            .await?;
        sqlx::query("ALTER TABLE super_admin ADD COLUMN IF NOT EXISTS profile_image_url TEXT")
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    async fn initialize_global_notifications_tables(&self) -> Result<(), Box<dyn Error>> {
        println!("Creating global_notifications table...");
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS global_notifications (
                id SERIAL PRIMARY KEY,
                notification JSONB NOT NULL,
                active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )",
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            "CREATE INDEX IF NOT EXISTS idx_global_notifications_active ON global_notifications(active) WHERE active = TRUE",
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    async fn initialize_notifications_table(&self) -> Result<(), Box<dyn Error>> {
        println!("Creating notifications table...");
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                school_id VARCHAR(50) NOT NULL,
                user_id VARCHAR(50),
                category VARCHAR(50) NOT NULL DEFAULT 'general',
                severity VARCHAR(20) NOT NULL DEFAULT 'info',
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                data JSONB DEFAULT '{}',
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                read_at TIMESTAMPTZ
            )",
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            "CREATE INDEX IF NOT EXISTS idx_notifications_school_user ON notifications(school_id, user_id, is_read)"
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            "CREATE INDEX IF NOT EXISTS idx_notifications_school_category ON notifications(school_id, category, created_at DESC)"
        )
        .execute(&self.pool)
        .await?;

        sqlx::query(
            "CREATE INDEX IF NOT EXISTS idx_notifications_school_unread ON notifications(school_id, user_id) WHERE is_read = FALSE"
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Initialize performance-critical indexes for multi-tenant queries
    pub async fn initialize_indexes(&self) -> Result<(), Box<dyn Error>> {
        println!("Ensuring performance indexes exist...");

        // Multi-tenant composite indexes (school_id + common filter)
        let indexes = [
            // Students
            "CREATE INDEX IF NOT EXISTS idx_students_school_status ON students(school_id, status)",
            "CREATE INDEX IF NOT EXISTS idx_students_school_class ON students(school_id, class_name)",
            "CREATE INDEX IF NOT EXISTS idx_students_active ON students(school_id, class_name) WHERE status = 'active'",
            // Employees
            "CREATE INDEX IF NOT EXISTS idx_employees_school_type ON employees(school_id, employee_type)",
            "CREATE INDEX IF NOT EXISTS idx_employees_school_status ON employees(school_id, status)",
            // Fees
            "CREATE INDEX IF NOT EXISTS idx_fees_school_status ON fees(school_id, status)",
            "CREATE INDEX IF NOT EXISTS idx_fees_school_due ON fees(school_id, due_date)",
            "CREATE INDEX IF NOT EXISTS idx_fees_pending ON fees(school_id, due_date) WHERE status = 'pending'",
            // Attendance
            "CREATE INDEX IF NOT EXISTS idx_attendance_school_date ON attendance(school_id, date)",
            "CREATE INDEX IF NOT EXISTS idx_attendance_school_user ON attendance(school_id, user_id)",
            // Leaves
            "CREATE INDEX IF NOT EXISTS idx_leaves_school_status ON leaves(school_id, status)",
            "CREATE INDEX IF NOT EXISTS idx_leaves_pending ON leaves(school_id, created_at) WHERE status = 'pending'",
            "CREATE INDEX IF NOT EXISTS idx_leaves_school_user ON leaves(school_id, user_id)",
            // Tasks
            "CREATE INDEX IF NOT EXISTS idx_tasks_school_assignee ON tasks(school_id, assigned_to)",
            "CREATE INDEX IF NOT EXISTS idx_tasks_school_status ON tasks(school_id, status)",
            // Global users
            "CREATE INDEX IF NOT EXISTS idx_global_users_school_type ON global_users(school_id, user_type)",
            "CREATE INDEX IF NOT EXISTS idx_global_users_phone ON global_users(phone)",
            // Responsibilities
            "CREATE INDEX IF NOT EXISTS idx_responsibilities_school_status ON responsibilities(school_id, status)",
            // Audit logs
            "CREATE INDEX IF NOT EXISTS idx_audit_logs_school_entity ON audit_logs(school_id, entity_type)",
            "CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC)",
            // AI
            "CREATE INDEX IF NOT EXISTS idx_ai_chat_history_school ON ai_chat_history(school_id, created_at DESC)",
            // Billing
            "CREATE INDEX IF NOT EXISTS idx_billing_ledger_school ON billing_ledger(school_id, created_at DESC)",
            // Webhooks
            "CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_school ON webhook_endpoints(school_id)",
            // Notifications
            "CREATE INDEX IF NOT EXISTS idx_notifications_school_created ON notifications(school_id, created_at DESC)",
        ];

        for idx_sql in &indexes {
            if let Err(e) = sqlx::query(idx_sql).execute(&self.pool).await {
                eprintln!("Warning: Could not create index (table/column may not exist yet): {e}");
            }
        }

        println!("Performance indexes verified.");
        Ok(())
    }

    async fn initialize_grading_tables(&self) -> Result<(), Box<dyn Error>> {
        println!("Ensuring grading tables exist...");

        sqlx::query("CREATE TABLE IF NOT EXISTS grading_rubrics (
            rubric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            school_id VARCHAR(255) NOT NULL,
            rubric_name VARCHAR(255) NOT NULL,
            rubric_type VARCHAR(100) NOT NULL,
            subject_name VARCHAR(255),
            class_name VARCHAR(255),
            criteria JSONB NOT NULL,
            total_score DECIMAL(5,2) NOT NULL DEFAULT 100.0,
            passing_score DECIMAL(5,2) NOT NULL DEFAULT 40.0,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(school_id, rubric_name, rubric_type)
        )").execute(&self.pool).await?;

        sqlx::query("CREATE TABLE IF NOT EXISTS student_submissions (
            submission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            school_id VARCHAR(255) NOT NULL,
            student_id VARCHAR(255) NOT NULL,
            exam_id VARCHAR(255),
            assignment_name VARCHAR(255),
            submission_type VARCHAR(100) NOT NULL,
            content TEXT,
            file_url TEXT,
            file_type VARCHAR(50),
            word_count INTEGER,
            character_count INTEGER,
            submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            due_date TIMESTAMP WITH TIME ZONE,
            status VARCHAR(50) DEFAULT 'submitted'
        )").execute(&self.pool).await?;

        sqlx::query("CREATE TABLE IF NOT EXISTS ai_grading_results (
            grading_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            submission_id UUID NOT NULL REFERENCES student_submissions(submission_id) ON DELETE CASCADE,
            school_id VARCHAR(255) NOT NULL,
            rubric_id UUID REFERENCES grading_rubrics(rubric_id),
            overall_score DECIMAL(5,2),
            grade VARCHAR(10),
            criteria_scores JSONB,
            feedback TEXT,
            confidence_score DECIMAL(5,2),
            grading_provider VARCHAR(100),
            grading_model VARCHAR(100),
            graded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            reviewed_by_teacher BOOLEAN DEFAULT false,
            teacher_notes TEXT,
            teacher_adjusted_score DECIMAL(5,2)
        )").execute(&self.pool).await?;

        sqlx::query("CREATE TABLE IF NOT EXISTS exam_answer_keys (
            key_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            school_id VARCHAR(255) NOT NULL,
            exam_id VARCHAR(255) NOT NULL,
            question_number INTEGER NOT NULL,
            question_type VARCHAR(50) NOT NULL,
            correct_answer TEXT NOT NULL,
            model_answer TEXT,
            keywords TEXT[],
            max_marks DECIMAL(5,2) NOT NULL DEFAULT 1.0
        )").execute(&self.pool).await?;

        sqlx::query("CREATE TABLE IF NOT EXISTS grading_config (
            id SERIAL PRIMARY KEY,
            school_id VARCHAR(255) NOT NULL,
            subject_name VARCHAR(255),
            rigor_level VARCHAR(20) DEFAULT 'medium',
            fuzzy_threshold DECIMAL(5,4) DEFAULT 0.8500,
            ai_feedback_enabled BOOLEAN DEFAULT true,
            UNIQUE(school_id, subject_name)
        )").execute(&self.pool).await?;

        sqlx::query("CREATE INDEX IF NOT EXISTS idx_student_submissions_school ON student_submissions(school_id)").execute(&self.pool).await?;
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_student_submissions_exam ON student_submissions(school_id, exam_id)").execute(&self.pool).await?;
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_ai_grading_results_submission ON ai_grading_results(submission_id)").execute(&self.pool).await?;
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_ai_grading_results_school ON ai_grading_results(school_id)").execute(&self.pool).await?;

        println!("Grading tables verified.");
        Ok(())
    }

    async fn initialize_exam_checker_workflow(&self) -> Result<(), Box<dyn Error>> {
        println!("Setting up exam checker workflow schema...");

        // Add checker assignment and status columns to exams table
        sqlx::query("ALTER TABLE exams ADD COLUMN IF NOT EXISTS checker_employee_id TEXT").execute(&self.pool).await?;
        sqlx::query("ALTER TABLE exams ADD COLUMN IF NOT EXISTS checker_assigned_at TIMESTAMP WITH TIME ZONE").execute(&self.pool).await?;
        sqlx::query("ALTER TABLE exams ADD COLUMN IF NOT EXISTS checked_by TEXT").execute(&self.pool).await?;
        sqlx::query("ALTER TABLE exams ADD COLUMN IF NOT EXISTS checked_at TIMESTAMP WITH TIME ZONE").execute(&self.pool).await?;
        sqlx::query("ALTER TABLE exams ADD COLUMN IF NOT EXISTS approved_by TEXT").execute(&self.pool).await?;
        sqlx::query("ALTER TABLE exams ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE").execute(&self.pool).await?;
        sqlx::query("ALTER TABLE exams ADD COLUMN IF NOT EXISTS results_published BOOLEAN DEFAULT FALSE").execute(&self.pool).await?;
        sqlx::query("ALTER TABLE exams ADD COLUMN IF NOT EXISTS results_published_at TIMESTAMP WITH TIME ZONE").execute(&self.pool).await?;
        sqlx::query("ALTER TABLE exams ADD COLUMN IF NOT EXISTS strictness_level TEXT DEFAULT 'medium'").execute(&self.pool).await?;

        // Add checker columns to student_submissions
        sqlx::query("ALTER TABLE student_submissions ADD COLUMN IF NOT EXISTS checked_by TEXT").execute(&self.pool).await?;
        sqlx::query("ALTER TABLE student_submissions ADD COLUMN IF NOT EXISTS checked_at TIMESTAMP WITH TIME ZONE").execute(&self.pool).await?;

        // Add approval columns to ai_grading_results
        sqlx::query("ALTER TABLE ai_grading_results ADD COLUMN IF NOT EXISTS reviewed_by_checker BOOLEAN DEFAULT FALSE").execute(&self.pool).await?;
        sqlx::query("ALTER TABLE ai_grading_results ADD COLUMN IF NOT EXISTS checker_id TEXT").execute(&self.pool).await?;
        sqlx::query("ALTER TABLE ai_grading_results ADD COLUMN IF NOT EXISTS checker_notes TEXT").execute(&self.pool).await?;
        sqlx::query("ALTER TABLE ai_grading_results ADD COLUMN IF NOT EXISTS teacher_approved BOOLEAN DEFAULT FALSE").execute(&self.pool).await?;
        sqlx::query("ALTER TABLE ai_grading_results ADD COLUMN IF NOT EXISTS teacher_id TEXT").execute(&self.pool).await?;
        sqlx::query("ALTER TABLE ai_grading_results ADD COLUMN IF NOT EXISTS teacher_notes TEXT").execute(&self.pool).await?;
        sqlx::query("ALTER TABLE ai_grading_results ADD COLUMN IF NOT EXISTS is_finalized BOOLEAN DEFAULT FALSE").execute(&self.pool).await?;
        sqlx::query("ALTER TABLE ai_grading_results ADD COLUMN IF NOT EXISTS strictness_used TEXT").execute(&self.pool).await?;

        // Create exam_submission_pages table for page-level image tracking
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS exam_submission_pages (
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
            )"
        ).execute(&self.pool).await?;

        sqlx::query("CREATE INDEX IF NOT EXISTS idx_esp_submission ON exam_submission_pages(submission_id)").execute(&self.pool).await?;
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_esp_school ON exam_submission_pages(school_id)").execute(&self.pool).await?;

        // RLS for exam_submission_pages
        sqlx::query("ALTER TABLE exam_submission_pages ENABLE ROW LEVEL SECURITY").execute(&self.pool).await.map(|_| ())?;
        sqlx::query(
            "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='exam_submission_pages' AND policyname='exam_submission_pages_school_isolation') THEN
             CREATE POLICY exam_submission_pages_school_isolation ON exam_submission_pages
             USING (school_id = current_setting('app.current_school_id')); END IF; END $$"
        ).execute(&self.pool).await?;

        println!("Exam checker workflow schema verified.");
        Ok(())
    }

    async fn initialize_syllabus_calendar_tables(&self) -> Result<(), Box<dyn Error>> {
        println!("Setting up syllabus calendar tables...");

        // Extend chapters with quarter and period count
        sqlx::query("ALTER TABLE chapters ADD COLUMN IF NOT EXISTS quarter TEXT").execute(&self.pool).await?;
        sqlx::query("ALTER TABLE chapters ADD COLUMN IF NOT EXISTS periods_allocated INTEGER DEFAULT 0").execute(&self.pool).await?;

        // Extend tasks with period_plan_id reference
        sqlx::query("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS period_plan_id INTEGER").execute(&self.pool).await.map(|_| ())?;

        // 1. Syllabus Calendar: one row per class-subject-chapter with date planning
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS syllabus_calendar (
                id SERIAL PRIMARY KEY,
                school_id VARCHAR(255) NOT NULL,
                class_id VARCHAR(255) NOT NULL,
                subject_id VARCHAR(255) NOT NULL,
                chapter_id INTEGER NOT NULL,
                planned_start_date DATE NOT NULL,
                planned_end_date DATE NOT NULL,
                actual_start_date DATE,
                actual_end_date DATE,
                period_count INTEGER DEFAULT 0,
                status VARCHAR(20) DEFAULT 'pending',
                quarter VARCHAR(5),
                UNIQUE(school_id, class_id, subject_id, chapter_id, quarter)
            )"
        ).execute(&self.pool).await?;
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_syllabus_calendar_school ON syllabus_calendar(school_id, class_id, subject_id)").execute(&self.pool).await?;

        // 2. Period-Level Plan: one row per teaching block
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS period_plans (
                id SERIAL PRIMARY KEY,
                school_id VARCHAR(255) NOT NULL,
                class_id VARCHAR(255) NOT NULL,
                subject_id VARCHAR(255) NOT NULL,
                config_id TEXT NOT NULL,
                day_of_week INTEGER NOT NULL,
                period_number INTEGER NOT NULL,
                date DATE NOT NULL,
                chapter_id INTEGER,
                topic_name TEXT,
                teacher_id TEXT NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                teacher_note TEXT,
                completed_at TIMESTAMP WITH TIME ZONE,
                UNIQUE(school_id, config_id, day_of_week, period_number, date)
            )"
        ).execute(&self.pool).await?;
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_period_plans_teacher_date ON period_plans(school_id, teacher_id, date)").execute(&self.pool).await?;

        // 3. Schedule Change Requests
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS schedule_change_requests (
                id SERIAL PRIMARY KEY,
                school_id VARCHAR(255) NOT NULL,
                type VARCHAR(30) NOT NULL,
                requested_by TEXT NOT NULL,
                approved_by TEXT,
                status VARCHAR(20) DEFAULT 'pending',
                source_class_id TEXT,
                source_subject_id TEXT,
                target_class_id TEXT,
                target_subject_id TEXT,
                reason TEXT,
                admin_note TEXT,
                date_from DATE,
                date_to DATE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE
            )"
        ).execute(&self.pool).await?;
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_change_requests_status ON schedule_change_requests(school_id, status)").execute(&self.pool).await?;

        // 4. Daily Teacher Reports
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS daily_teacher_reports (
                id SERIAL PRIMARY KEY,
                school_id VARCHAR(255) NOT NULL,
                teacher_id TEXT NOT NULL,
                report_date DATE NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                summary TEXT,
                pending_topics JSONB DEFAULT '[]',
                completed_periods INTEGER DEFAULT 0,
                total_periods INTEGER DEFAULT 0,
                submitted_at TIMESTAMP WITH TIME ZONE,
                UNIQUE(school_id, teacher_id, report_date)
            )"
        ).execute(&self.pool).await?;
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_daily_reports_missed ON daily_teacher_reports(school_id, report_date, status)").execute(&self.pool).await?;

        // Block cap override for temporary period duration increases
        sqlx::query("ALTER TABLE schedule_change_requests ADD COLUMN IF NOT EXISTS block_cap_minutes INTEGER").execute(&self.pool).await?;

        // Attendance QR tokens table
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS attendance_qr_tokens (
                id SERIAL PRIMARY KEY,
                school_id VARCHAR(255) NOT NULL,
                class_id VARCHAR(255),
                token VARCHAR(64) UNIQUE NOT NULL,
                expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                created_by TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                is_used BOOLEAN DEFAULT FALSE,
                used_by TEXT,
                used_at TIMESTAMP WITH TIME ZONE
            )"
        ).execute(&self.pool).await?;
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_qr_tokens_token ON attendance_qr_tokens(token)").execute(&self.pool).await?;
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_qr_tokens_valid ON attendance_qr_tokens(school_id, is_used, expires_at)").execute(&self.pool).await?;

        println!("Syllabus calendar tables verified.");
        Ok(())
    }
}
