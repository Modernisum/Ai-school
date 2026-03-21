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

        // Sanitize schema name (e.g., school_123)
        let schema_name = format!("school_{}", school_id.replace('-', "_"));
        
        // Set search_path so queries target the school's schema first
        let query = format!("SET search_path TO {}, public", schema_name);
        sqlx::query(&query).execute(&mut *conn).await?;

        // Keep RLS context for safety/auditing during transition
        let rls_query = format!(
            "SET LOCAL app.current_school_id = '{}'",
            school_id.replace('\'', "''")
        );
        sqlx::query(&rls_query).execute(&mut *conn).await?;

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
                school_id VARCHAR(255) UNIQUE NOT NULL,
                school_name VARCHAR(255) NOT NULL,
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
                school_id VARCHAR(255) NOT NULL,
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
                school_id VARCHAR(255) NOT NULL,
                user_type VARCHAR(50),
                action VARCHAR(100),
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
                school_id VARCHAR(255),
                amount NUMERIC(15, 2) NOT NULL,
                transaction_type VARCHAR(50) NOT NULL,
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
        sqlx::query(
            "INSERT INTO super_admin (username, password_hash)
             VALUES ('superadmin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lfkj7.wU3Kz9s1PFe')
             ON CONFLICT (username) DO NOTHING",
        )
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
                school_id VARCHAR(255) NOT NULL,
                admin_id VARCHAR(255) NOT NULL,
                entity_type VARCHAR(50) NOT NULL,
                entity_id VARCHAR(255) NOT NULL,
                action_type VARCHAR(20) NOT NULL,
                changed_data JSONB NOT NULL,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )",
        )
        .execute(&pool)
        .await?;

        sqlx::query("CREATE INDEX IF NOT EXISTS system_audit_logs_school_idx ON system_audit_logs (school_id)")
             .execute(&pool)
             .await?;

        println!("Connecting to Redis...");

        let cfg = Config::from_url(redis_url);
        let redis = cfg.create_pool(Some(Runtime::Tokio1))?;

        Ok(DbClient { pool, redis })
    }

    /// Ensures that a specific school has its own database schema and all required tables.
    pub async fn ensure_tenant_schema(&self, school_id: &str) -> Result<(), Box<dyn Error>> {
        let schema_name = format!("school_{}", school_id.replace('-', "_"));
        
        println!("Ensuring schema {} exists...", schema_name);
        sqlx::query(&format!("CREATE SCHEMA IF NOT EXISTS {}", schema_name))
            .execute(&self.pool)
            .await?;

        // Use the schema in the search_path for table creation
        let mut conn = self.pool.acquire().await?;
        sqlx::query(&format!("SET search_path TO {}", schema_name))
            .execute(&mut *conn)
            .await?;

        println!("Initializing tenant tables in schema {}...", schema_name);
        
        // Define all tenant-specific tables here
        let tables = [
            "CREATE TABLE IF NOT EXISTS students (
                id SERIAL PRIMARY KEY,
                student_id VARCHAR(255) NOT NULL,
                school_id VARCHAR(255) NOT NULL,
                class_name VARCHAR(100) NOT NULL,
                name TEXT,
                roll_number INT,
                section VARCHAR(50),
                status VARCHAR(50) NOT NULL,
                dob TEXT,
                gender VARCHAR(50),
                father_name TEXT,
                mother_name TEXT,
                aadhaar_number VARCHAR(20),
                address_line1 TEXT,
                address_city VARCHAR(100),
                address_state VARCHAR(100),
                address_pincode VARCHAR(20),
                tc_number VARCHAR(100),
                contact VARCHAR(50),
                alternative_contact VARCHAR(50),
                email VARCHAR(255),
                transport_enabled BOOLEAN DEFAULT FALSE,
                transport_radius VARCHAR(50),
                additional_subjects TEXT,
                admission_date VARCHAR(50),
                room_number VARCHAR(50),
                student_type VARCHAR(50),
                enrolled_subjects JSONB DEFAULT '[]',
                total_fees NUMERIC(15, 2) DEFAULT 0.00,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(student_id)
            )",
            "CREATE TABLE IF NOT EXISTS student_history (
                id SERIAL PRIMARY KEY,
                student_id VARCHAR(255) NOT NULL,
                school_id VARCHAR(255) NOT NULL,
                rev_no INT NOT NULL,
                snapshot JSONB NOT NULL,
                delta JSONB NOT NULL,
                author VARCHAR(255),
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )",
            "CREATE TABLE IF NOT EXISTS employees (
                id SERIAL PRIMARY KEY,
                employee_id VARCHAR(255) UNIQUE NOT NULL,
                school_id VARCHAR(255) NOT NULL,
                employee_type VARCHAR(50) NOT NULL,
                aadhaar_number VARCHAR(20),
                contact VARCHAR(50),
                email VARCHAR(255),
                data JSONB NOT NULL DEFAULT '{}',
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )",
            "CREATE TABLE IF NOT EXISTS batches (
                id SERIAL PRIMARY KEY,
                batch_id VARCHAR(255) UNIQUE NOT NULL,
                school_id VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                start_date DATE,
                end_date DATE,
                status VARCHAR(20) DEFAULT 'active'
            )",
            "CREATE TABLE IF NOT EXISTS classes (
                id VARCHAR(255) PRIMARY KEY,
                school_id VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                total_students INTEGER DEFAULT 0,
                total_teachers INTEGER DEFAULT 0,
                total_periods INTEGER DEFAULT 0,
                room_number VARCHAR(50),
                class_fees DOUBLE PRECISION DEFAULT 0.0,
                sections JSONB DEFAULT '[]',
                streams JSONB DEFAULT '[]',
                section_size INTEGER DEFAULT 60,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )",
            "CREATE TABLE IF NOT EXISTS sections (
                id SERIAL PRIMARY KEY,
                section_id VARCHAR(255) UNIQUE NOT NULL,
                school_id VARCHAR(255) NOT NULL,
                class_id VARCHAR(255) NOT NULL,
                name VARCHAR(50) NOT NULL,
                capacity INTEGER DEFAULT 40
            )",
            "CREATE TABLE IF NOT EXISTS announcements (
                id SERIAL PRIMARY KEY,
                school_id VARCHAR(255) NOT NULL,
                target_type VARCHAR(50) NOT NULL,
                user_id VARCHAR(255),
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )",
            "CREATE TABLE IF NOT EXISTS attendance (
                id SERIAL PRIMARY KEY,
                school_id VARCHAR(255) NOT NULL,
                role VARCHAR(50) NOT NULL,
                user_id VARCHAR(255) NOT NULL,
                date DATE NOT NULL,
                status VARCHAR(50) NOT NULL,
                in_time TIMESTAMPTZ,
                out_time TIMESTAMPTZ,
                total_time TEXT,
                reason TEXT,
                description TEXT,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(role, user_id, date)
            )",
            "CREATE TABLE IF NOT EXISTS custom_fees (
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
            )",
             "CREATE TABLE IF NOT EXISTS custom_fee_records (
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
                UNIQUE(fee_id, student_id)
            )",
            "CREATE TABLE IF NOT EXISTS referral_coupons (
                id SERIAL PRIMARY KEY,
                coupon_id VARCHAR(255) UNIQUE NOT NULL,
                school_id VARCHAR(255) NOT NULL,
                coupon_name VARCHAR(255) NOT NULL,
                discount_type VARCHAR(50) NOT NULL DEFAULT 'percentage',
                discount_value DECIMAL(12,2) NOT NULL,
                max_uses INTEGER DEFAULT 0,
                current_uses INTEGER DEFAULT 0,
                assigned_employee_id VARCHAR(255),
                employee_reward DECIMAL(12,2) DEFAULT 0,
                description TEXT,
                status VARCHAR(50) DEFAULT 'active',
                created_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(coupon_name)
            )",
            "CREATE TABLE IF NOT EXISTS responsibilities (
                id SERIAL PRIMARY KEY,
                responsibility_id VARCHAR(255) UNIQUE NOT NULL,
                school_id VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                per_day_price DECIMAL(12,2) DEFAULT 0,
                time_period INTEGER DEFAULT 0,
                space_category VARCHAR(255),
                responsibility_field VARCHAR(255),
                space_id VARCHAR(255),
                work_level VARCHAR(50),
                work_amount DECIMAL(12,2) DEFAULT 0,
                work_period VARCHAR(50),
                custom_dates JSONB DEFAULT '[]',
                total_price DECIMAL(12,2) DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )",
            "CREATE TABLE IF NOT EXISTS employee_responsibilities (
                id SERIAL PRIMARY KEY,
                school_id VARCHAR(255) NOT NULL,
                employee_id VARCHAR(255) NOT NULL,
                responsibility_id VARCHAR(255) NOT NULL,
                assigned_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(employee_id, responsibility_id)
            )",
            "CREATE TABLE IF NOT EXISTS space_categories (
                id SERIAL PRIMARY KEY,
                school_id VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                is_default BOOLEAN DEFAULT FALSE,
                UNIQUE(name)
            )",
            "CREATE TABLE IF NOT EXISTS spaces (
                id SERIAL PRIMARY KEY,
                space_id VARCHAR(255) UNIQUE NOT NULL,
                school_id VARCHAR(255) NOT NULL,
                space_name VARCHAR(255) NOT NULL,
                space_category VARCHAR(255) NOT NULL,
                space_number VARCHAR(50),
                capacity INTEGER DEFAULT 0,
                data JSONB DEFAULT '{}',
                created_at TIMESTAMPTZ DEFAULT NOW()
            )",
            "CREATE TABLE IF NOT EXISTS items (
                id SERIAL PRIMARY KEY,
                item_id VARCHAR(255) NOT NULL,
                school_id VARCHAR(255) NOT NULL,
                space_id VARCHAR(255) NOT NULL,
                item_name VARCHAR(255) NOT NULL,
                room_number VARCHAR(50),
                class_id VARCHAR(255),
                created_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(space_id, item_id)
            )",
            "CREATE TABLE IF NOT EXISTS subjects (
                id VARCHAR(255) PRIMARY KEY,
                school_id VARCHAR(255) NOT NULL,
                name TEXT,
                class_id VARCHAR(255),
                class_name VARCHAR(255),
                fees DOUBLE PRECISION DEFAULT 0.0,
                is_compulsory BOOLEAN DEFAULT TRUE,
                category VARCHAR(255),
                fee_type VARCHAR(50) DEFAULT 'monthly',
                fee_interval INTEGER DEFAULT 1,
                schedule_type VARCHAR(50) DEFAULT 'daily',
                schedule_data JSONB DEFAULT '[]',
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )",
            "CREATE TABLE IF NOT EXISTS materials (
                id VARCHAR(255) PRIMARY KEY,
                school_id VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                quantity BIGINT DEFAULT 0,
                unit_price DOUBLE PRECISION DEFAULT 0.0,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )",
            "CREATE TABLE IF NOT EXISTS leave_applications (
                id SERIAL PRIMARY KEY,
                leave_id VARCHAR(255) UNIQUE NOT NULL,
                school_id VARCHAR(255) NOT NULL,
                employee_id VARCHAR(255) NOT NULL,
                employee_name VARCHAR(255),
                reason TEXT NOT NULL,
                leave_type VARCHAR(50) NOT NULL,
                from_date DATE NOT NULL,
                to_date DATE NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                approved_by VARCHAR(255),
                salary_impact VARCHAR(50),
                deduct_percent DECIMAL(5,2) DEFAULT 0,
                pdf_url TEXT,
                notes TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )",
            "CREATE TABLE IF NOT EXISTS awards (
                id SERIAL PRIMARY KEY,
                school_id VARCHAR(255) NOT NULL,
                student_id VARCHAR(255) NOT NULL,
                award_name VARCHAR(255) NOT NULL,
                description TEXT,
                date DATE,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )",
            "CREATE TABLE IF NOT EXISTS complaints (
                id SERIAL PRIMARY KEY,
                complaint_id VARCHAR(255) UNIQUE NOT NULL,
                school_id VARCHAR(255) NOT NULL,
                student_id VARCHAR(255) NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                attachment_path TEXT,
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMPTZ DEFAULT NOW()
            )",
            "CREATE TABLE IF NOT EXISTS reminders (
                id SERIAL PRIMARY KEY,
                school_id VARCHAR(255) NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                remind_at TIMESTAMPTZ NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMPTZ DEFAULT NOW()
            )",
            "CREATE TABLE IF NOT EXISTS document_box (
                id SERIAL PRIMARY KEY,
                school_id VARCHAR(255) NOT NULL,
                user_id VARCHAR(255) NOT NULL,
                doc_type VARCHAR(255) NOT NULL,
                file_url TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )",
        ];

        for table_query in tables {
            sqlx::query(table_query).execute(&mut *conn).await?;
        }

        // Migration: Ensure user_id exists and old columns are removed
        let _ = sqlx::query("ALTER TABLE announcements ADD COLUMN IF NOT EXISTS user_id VARCHAR(255)").execute(&mut *conn).await;
        let _ = sqlx::query("ALTER TABLE announcements DROP COLUMN IF EXISTS announcement_id").execute(&mut *conn).await;
        let _ = sqlx::query("ALTER TABLE announcements DROP COLUMN IF EXISTS target_id").execute(&mut *conn).await;

        sqlx::query("CREATE INDEX IF NOT EXISTS student_history_idx ON student_history (student_id)")
             .execute(&mut *conn)
             .await?;

        Ok(())
    }
}

pub async fn init() -> Result<DbClient, Box<dyn Error>> {
    DbClient::new().await
}
