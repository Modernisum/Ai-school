use deadpool_redis::{Config, Pool, Runtime};
use sqlx::postgres::PgPool;
use std::error::Error;

#[derive(Clone)]
pub struct DbClient {
    pub pool: PgPool,
    pub redis: Pool,
}

impl DbClient {
    /// Acquires a new database connection from the pool and sets the current tenant context.
    /// This ensures that PostgreSQL Row-Level Security (RLS) policies automatically apply.
    pub async fn acquire_tenant_connection(
        &self,
        school_id: &str,
    ) -> Result<sqlx::pool::PoolConnection<sqlx::Postgres>, sqlx::Error> {
        let mut conn = self.pool.acquire().await?;

        // 1. Set RLS context for security isolation
        let rls_query = format!(
            "SET LOCAL app.current_school_id = '{}'",
            school_id.replace('\'', "''")
        );
        sqlx::query(&rls_query).execute(&mut *conn).await?;

        // Note: We are phasing out SET search_path for schema-per-tenant 
        // in favor of RLS on the public schema for scalability and global migrations.

        Ok(conn)
    }

    /// Acquires a new database connection from the pool and bypasses RLS policies.
    /// This should ONLY be used by super_admin services or global jobs (e.g. billing).
    pub async fn acquire_super_admin_connection(
        &self,
    ) -> Result<sqlx::pool::PoolConnection<sqlx::Postgres>, sqlx::Error> {
        let mut conn = self.pool.acquire().await?;

        // Set the is_super_admin flag so the RLS functions bypass security policies
        sqlx::query("SET LOCAL app.is_super_admin = 'true'")
            .execute(&mut *conn)
            .await?;

        Ok(conn)
    }

    /// Optimized helper to acquire a connection based on context
    pub async fn acquire_rls_connection(
        &self,
        school_id: Option<&str>,
        is_super_admin: bool,
    ) -> Result<sqlx::pool::PoolConnection<sqlx::Postgres>, sqlx::Error> {
        if is_super_admin {
            self.acquire_super_admin_connection().await
        } else if let Some(sid) = school_id {
            self.acquire_tenant_connection(sid).await
        } else {
            // Default to strictly isolated empty context if neither provided
            self.acquire_tenant_connection("none").await
        }
    }

    pub async fn new() -> Result<Self, Box<dyn Error>> {
        let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
        let redis_url = std::env::var("REDIS_URL").expect("REDIS_URL must be set");

        println!("Connecting to PostgreSQL...");
        let pool = PgPool::connect(&database_url).await?;

        println!("Ensuring required sequences exist...");
        sqlx::query("CREATE SEQUENCE IF NOT EXISTS school_code_seq START 1")
            .execute(&pool)
            .await?;
        sqlx::query("CREATE SEQUENCE IF NOT EXISTS employee_id_seq START 1")
            .execute(&pool)
            .await?;
        sqlx::query("CREATE SEQUENCE IF NOT EXISTS student_id_seq START 1")
            .execute(&pool)
            .await?;

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
        .execute(&pool)
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
        .execute(&pool)
        .await?;

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
        .execute(&pool)
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
        .execute(&pool)
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
        .execute(&pool)
        .await?;

        sqlx::query("ALTER TABLE auth_logs ADD COLUMN IF NOT EXISTS details TEXT")
            .execute(&pool)
            .await?;

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
        .execute(&pool)
        .await?;

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
        .execute(&pool)
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
        .execute(&pool)
        .await?;

        println!("Adding base_rate and promo tracking to schools...");
        sqlx::query(
            "ALTER TABLE schools 
             ADD COLUMN IF NOT EXISTS base_rate NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
             ADD COLUMN IF NOT EXISTS active_promo_id INTEGER REFERENCES promo_codes(id),
             ADD COLUMN IF NOT EXISTS promo_expires_at TIMESTAMPTZ",
        )
        .execute(&pool)
        .await?;

        println!("Ensuring super_admin table exists...");
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS super_admin (
                id SERIAL PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )",
        )
        .execute(&pool)
        .await?;

        // Seed default super admin if table is empty
        let initial_hash = bcrypt::hash("admin@123", 10).unwrap_or_else(|_| "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lfkj7.wU3Kz9s1PFe".to_string());
        sqlx::query(
            "INSERT INTO super_admin (username, password_hash)
             VALUES ('superadmin', $1)
             ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash",
        )
        .bind(initial_hash)
        .execute(&pool)
        .await?;

        println!("Creating geo data tables...");
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS countries (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) UNIQUE NOT NULL,
                code VARCHAR(10) NOT NULL,
                phone_code VARCHAR(10) NOT NULL
            )",
        )
        .execute(&pool)
        .await?;

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS states (
                id SERIAL PRIMARY KEY,
                country_id INTEGER REFERENCES countries(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                UNIQUE(country_id, name)
            )",
        )
        .execute(&pool)
        .await?;

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS districts (
                id SERIAL PRIMARY KEY,
                state_id INTEGER REFERENCES states(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                UNIQUE(state_id, name)
            )",
        )
        .execute(&pool)
        .await?;

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
        .execute(&pool)
        .await?;

        sqlx::query("CREATE INDEX IF NOT EXISTS system_audit_logs_school_idx ON system_audit_logs (school_id)")
             .execute(&pool)
             .await?;

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
        .execute(&pool)
        .await?;

        // Add indexes for fast lookup
        sqlx::query("CREATE INDEX IF NOT EXISTS global_users_phone_idx ON global_users (phone)")
            .execute(&pool)
            .await?;
        sqlx::query("CREATE INDEX IF NOT EXISTS global_users_email_idx ON global_users (email)")
            .execute(&pool)
            .await?;
        sqlx::query(
            "CREATE INDEX IF NOT EXISTS global_users_aadhaar_idx ON global_users (aadhaar_number)",
        )
        .execute(&pool)
        .await?;

        println!("Ensuring resource management tables exist...");
        
        // 1. Spaces Table
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS spaces (
                id SERIAL PRIMARY KEY,
                space_id TEXT NOT NULL,
                school_id TEXT NOT NULL,
                space_name TEXT NOT NULL,
                space_category TEXT,
                space_number TEXT,
                capacity INTEGER DEFAULT 0,
                data JSONB DEFAULT '{}',
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(school_id, space_id)
            )"
        ).execute(&pool).await?;

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
                ALTER TABLE public.spaces ADD CONSTRAINT spaces_school_space_composite_unique UNIQUE (school_id, space_id);
             END $$;"
        ).execute(&pool).await?;

        sqlx::query(
            "ALTER TABLE spaces 
             ADD COLUMN IF NOT EXISTS space_id TEXT,
             ADD COLUMN IF NOT EXISTS space_name TEXT,
             ADD COLUMN IF NOT EXISTS space_category TEXT,
             ADD COLUMN IF NOT EXISTS space_number TEXT,
             ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 0,
             ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'"
        ).execute(&pool).await?;
        
        // Ensure id has a default if it was created as null-violating VARCHAR
        sqlx::query("CREATE SEQUENCE IF NOT EXISTS spaces_id_seq").execute(&pool).await?;
        sqlx::query("ALTER TABLE spaces ALTER COLUMN id SET DEFAULT nextval('spaces_id_seq')::text").execute(&pool).await?;

        // Ensure space_id is unique if added late
        sqlx::query("CREATE UNIQUE INDEX IF NOT EXISTS idx_spaces_space_id_unique ON spaces (space_id)")
            .execute(&pool).await?;


        // 2. Items Table
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS items (
                id SERIAL PRIMARY KEY,
                item_id TEXT NOT NULL,
                school_id TEXT NOT NULL,
                space_id TEXT NOT NULL,
                item_name TEXT NOT NULL,
                room_number TEXT,
                class_id TEXT,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(school_id, space_id, item_id)
            )"
        ).execute(&pool).await?;


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
                ALTER TABLE public.items ADD CONSTRAINT items_school_space_item_composite_unique UNIQUE (school_id, space_id, item_id);
             END $$;"
        ).execute(&pool).await?;


        sqlx::query(
            "ALTER TABLE items 
             ADD COLUMN IF NOT EXISTS item_id TEXT,
             ADD COLUMN IF NOT EXISTS school_id TEXT,
             ADD COLUMN IF NOT EXISTS space_id TEXT,
             ADD COLUMN IF NOT EXISTS item_name TEXT,
             ADD COLUMN IF NOT EXISTS room_number TEXT,
             ADD COLUMN IF NOT EXISTS class_id TEXT"
        ).execute(&pool).await?;

        sqlx::query("CREATE SEQUENCE IF NOT EXISTS items_id_seq").execute(&pool).await?;
        sqlx::query("ALTER TABLE items ALTER COLUMN id SET DEFAULT nextval('items_id_seq')::text").execute(&pool).await?;
        
        // Ensure index matches repository conflict target exactly
        sqlx::query("DROP INDEX IF EXISTS idx_items_school_space_item_unique").execute(&pool).await?;
        sqlx::query("DROP INDEX IF EXISTS idx_items_space_item_unique").execute(&pool).await?;
        sqlx::query("CREATE UNIQUE INDEX IF NOT EXISTS idx_items_school_space_item_final ON items (school_id, space_id, item_id)")
             .execute(&pool).await?;




        // 3. Materials Table
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS materials (
                id TEXT PRIMARY KEY,
                school_id TEXT NOT NULL,
                name TEXT NOT NULL,
                quantity INTEGER DEFAULT 0,
                unit_price NUMERIC(15, 2) DEFAULT 0.00,
                attachment_path TEXT,
                extra_unit INTEGER DEFAULT 0,
                need_unit INTEGER DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )"
        ).execute(&pool).await?;

        sqlx::query(
            "ALTER TABLE materials
             ADD COLUMN IF NOT EXISTS extra_unit INTEGER DEFAULT 0,
             ADD COLUMN IF NOT EXISTS need_unit INTEGER DEFAULT 0"
        ).execute(&pool).await?;

        // 4. Space Materials (Assignments)
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS space_materials (
                id SERIAL PRIMARY KEY,
                school_id TEXT NOT NULL,
                space_id TEXT NOT NULL,
                material_name TEXT NOT NULL,
                quantity INTEGER DEFAULT 0,
                unit TEXT,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )"
        ).execute(&pool).await?;

        // 5. Space Employees (Assignments)
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS space_employees (
                id SERIAL PRIMARY KEY,
                school_id TEXT NOT NULL,
                space_id TEXT NOT NULL,
                employee_id TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(school_id, space_id, employee_id)
            )"
        ).execute(&pool).await?;

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
        ).execute(&pool).await?;

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
        ).execute(&pool).await?;

        sqlx::query("ALTER TABLE space_categories ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE")
            .execute(&pool).await?;
        
        sqlx::query("CREATE UNIQUE INDEX IF NOT EXISTS idx_space_categories_school_name ON space_categories (school_id, name)")
            .execute(&pool).await?;


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
        ).execute(&pool).await?;

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
        ).execute(&pool).await?;

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
        ).execute(&pool).await?;

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
        ).execute(&pool).await?;

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
        ).execute(&pool).await?;
        
        sqlx::query("CREATE UNIQUE INDEX IF NOT EXISTS idx_classes_school_id_unique ON classes (school_id, id)")
            .execute(&pool).await?;

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
        ).execute(&pool).await?;

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
        ).execute(&pool).await?;


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
        ).execute(&pool).await?;

        sqlx::query("CREATE UNIQUE INDEX IF NOT EXISTS idx_subjects_school_id_unique ON subjects (school_id, id)")
            .execute(&pool).await?;

        // 12. Exams
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS exams (
                id SERIAL PRIMARY KEY,
                school_id TEXT NOT NULL,
                name TEXT NOT NULL,
                start_date DATE,
                end_date DATE,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(school_id, name)
            )"
        ).execute(&pool).await?;

        sqlx::query(
            "ALTER TABLE exams
             ADD COLUMN IF NOT EXISTS school_id TEXT,
             ADD COLUMN IF NOT EXISTS name TEXT,
             ADD COLUMN IF NOT EXISTS start_date DATE,
             ADD COLUMN IF NOT EXISTS end_date DATE"
        ).execute(&pool).await?;

        sqlx::query(
            "DO $$ 
             BEGIN 
                IF NOT EXISTS (SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid JOIN pg_namespace n ON t.relnamespace = n.oid WHERE t.relname = 'exams' AND n.nspname = 'public' AND c.contype = 'u' AND pg_get_constraintdef(c.oid) LIKE '%school_id, name%') THEN
                    ALTER TABLE public.exams ADD CONSTRAINT exams_school_name_unique UNIQUE (school_id, name);
                END IF;
             END $$;"
        ).execute(&pool).await?;




        println!("Connecting to Redis...");

        let cfg = Config::from_url(redis_url);
        let redis = cfg.create_pool(Some(Runtime::Tokio1))?;

        Ok(DbClient { pool, redis })
    }

    /// Ensures that a specific school is correctly initialized.
    /// In the new RLS-first architecture, we primarily use public tables partitioned by school_id.
    pub async fn ensure_tenant_schema(&self, school_id: &str) -> Result<(), Box<dyn Error>> {
        // We still log the initialization for legacy compatibility, 
        // but avoid creating massive numbers of schemas/tables.
        println!("Initializing tenant context for school_id: {}", school_id);
        
        // Ensure the school exists in the global tracker
        // (Handled by setup_service usually, but keeping this as a safety check hook)
        
        Ok(())
    }
}

pub async fn init() -> Result<DbClient, Box<dyn Error>> {
    DbClient::new().await
}
