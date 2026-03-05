use deadpool_redis::{Config, Pool, Runtime};
use sqlx::postgres::PgPool;
use std::error::Error;
use std::sync::Arc;

#[derive(Clone)]
pub struct DbClient {
    pub pool: PgPool,
    pub redis: Pool,
}

impl DbClient {
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
             ADD COLUMN IF NOT EXISTS promo_expires_at TIMESTAMPTZ"
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
        // Default password: superadmin123 (bcrypt hash below)
        sqlx::query(
            "INSERT INTO super_admin (username, password_hash)
             VALUES ('superadmin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lfkj7.wU3Kz9s1PFe')
             ON CONFLICT (username) DO NOTHING",
        )
        .execute(&pool)
        .await?;

        println!("Ensuring custom_fees tables exist...");
        sqlx::query(
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
        )
        .execute(&pool)
        .await?;

        sqlx::query(
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
                UNIQUE(school_id, fee_id, student_id)
            )",
        )
        .execute(&pool)
        .await?;

        println!("Ensuring referral_coupons tables exist...");
        sqlx::query(
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
                UNIQUE(school_id, coupon_name)
            )",
        )
        .execute(&pool)
        .await?;

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS coupon_usage_log (
                id SERIAL PRIMARY KEY,
                school_id VARCHAR(255) NOT NULL,
                coupon_id VARCHAR(255) NOT NULL,
                student_id VARCHAR(255) NOT NULL,
                discount_applied DECIMAL(12,2) NOT NULL,
                employee_id VARCHAR(255),
                reward_paid DECIMAL(12,2) DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )",
        )
        .execute(&pool)
        .await?;

        sqlx::query(
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
                created_at TIMESTAMPTZ DEFAULT NOW()
            )",
        )
        .execute(&pool)
        .await?;

        // Also ensure columns exist for existing table
        sqlx::query(
            "ALTER TABLE responsibilities 
             ADD COLUMN IF NOT EXISTS per_day_price DECIMAL(12,2) DEFAULT 0,
             ADD COLUMN IF NOT EXISTS time_period INTEGER DEFAULT 0,
             ADD COLUMN IF NOT EXISTS space_category VARCHAR(255),
             ADD COLUMN IF NOT EXISTS responsibility_field VARCHAR(255),
             ADD COLUMN IF NOT EXISTS space_id VARCHAR(255)"
        )
        .execute(&pool)
        .await?;

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS employee_responsibilities (
                id SERIAL PRIMARY KEY,
                school_id VARCHAR(255) NOT NULL,
                employee_id VARCHAR(255) NOT NULL,
                responsibility_id VARCHAR(255) NOT NULL,
                assigned_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(school_id, employee_id, responsibility_id)
            )",
        )
        .execute(&pool)
        .await?;

        // Employee Experience & Education
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS employee_experience (
                id SERIAL PRIMARY KEY,
                school_id VARCHAR(255) NOT NULL,
                employee_id VARCHAR(255) NOT NULL,
                organization_name VARCHAR(255) NOT NULL,
                location VARCHAR(255),
                position_profile_type VARCHAR(255),
                post_type VARCHAR(50),
                join_month_year VARCHAR(50),
                end_date VARCHAR(50),
                is_current BOOLEAN DEFAULT FALSE,
                achievement_description TEXT,
                previous_employee_id VARCHAR(255),
                experience_letter_url TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )",
        )
        .execute(&pool)
        .await?;

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS employee_education (
                id SERIAL PRIMARY KEY,
                school_id VARCHAR(255) NOT NULL,
                employee_id VARCHAR(255) NOT NULL,
                education_level VARCHAR(100) NOT NULL,
                institute_name VARCHAR(255) NOT NULL,
                location VARCHAR(255),
                stream_subject VARCHAR(255),
                pass_year VARCHAR(50),
                marks_details VARCHAR(50),
                medium VARCHAR(50),
                document_url TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )",
        )
        .execute(&pool)
        .await?;

        // Spaces and space management
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS space_categories (
                id SERIAL PRIMARY KEY,
                school_id VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                is_default BOOLEAN DEFAULT FALSE,
                UNIQUE(school_id, name)
            )",
        )
        .execute(&pool)
        .await?;

        sqlx::query(
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
        )
        .execute(&pool)
        .await?;

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS space_materials (
                id SERIAL PRIMARY KEY,
                school_id VARCHAR(255) NOT NULL,
                space_id VARCHAR(255) NOT NULL,
                material_name VARCHAR(255) NOT NULL,
                quantity INTEGER DEFAULT 0,
                unit VARCHAR(50),
                created_at TIMESTAMPTZ DEFAULT NOW()
            )",
        )
        .execute(&pool)
        .await?;

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS space_employees (
                id SERIAL PRIMARY KEY,
                school_id VARCHAR(255) NOT NULL,
                space_id VARCHAR(255) NOT NULL,
                employee_id VARCHAR(255) NOT NULL,
                UNIQUE(school_id, space_id, employee_id)
            )",
        )
        .execute(&pool)
        .await?;

        // Responsibility Spaces
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS responsibility_spaces (
                responsibility_id VARCHAR(255) NOT NULL,
                school_id VARCHAR(255) NOT NULL,
                space_id VARCHAR(255) NOT NULL,
                PRIMARY KEY (responsibility_id, space_id)
            )",
        )
        .execute(&pool)
        .await?;

        // Enhance Responsibilities table
        sqlx::query(
            "ALTER TABLE responsibilities 
             ADD COLUMN IF NOT EXISTS work_level VARCHAR(50),
             ADD COLUMN IF NOT EXISTS work_amount DECIMAL(12,2) DEFAULT 0,
             ADD COLUMN IF NOT EXISTS work_period VARCHAR(50),
             ADD COLUMN IF NOT EXISTS custom_dates JSONB DEFAULT '[]',
             ADD COLUMN IF NOT EXISTS total_price DECIMAL(12,2) DEFAULT 0"
        )
        .execute(&pool)
        .await?;

        // Leave Management
        sqlx::query(
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
        )
        .execute(&pool)
        .await?;

        println!("Connecting to Redis...");

        let cfg = Config::from_url(redis_url);
        let redis = cfg.create_pool(Some(Runtime::Tokio1))?;

        Ok(DbClient { pool, redis })
    }
}


pub async fn init() -> Result<DbClient, Box<dyn Error>> {
    DbClient::new().await
}
