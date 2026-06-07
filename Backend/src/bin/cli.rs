use clap::{Parser, Subcommand, ValueEnum};
use sqlx::postgres::PgPool;
use sqlx::Row;
use std::env;
use argon2::{
    password_hash::{rand_core::OsRng, SaltString, PasswordHasher, PasswordVerifier, PasswordHash},
    Argon2,
};

#[derive(Parser)]
#[command(name = "cli")]
#[command(about = "Unified database management CLI for Modernisum")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Seed database test records (Standard, Space, ApiKey, or All)
    Seed {
        /// Type of seeding to perform
        #[arg(value_enum, long, default_value_t = SeedType::All)]
        seed_type: SeedType,
    },
    /// Inspect database schemas, tables, and constraints
    Check,
    /// Reset tables schema constraints and re-establish keys
    Reset,
    /// Query schools, classes, subjects, exams and verify auth records
    Query {
        /// Target school ID to query
        #[arg(long, default_value = "689225")]
        school_id: String,
    },
}

#[derive(ValueEnum, Clone, Copy, Debug, PartialEq, Eq)]
enum SeedType {
    Standard,
    Space,
    Apikey,
    All,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv::dotenv().ok();
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = sqlx::postgres::PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await?;

    let cli = Cli::parse();
    match cli.command {
        Commands::Seed { seed_type } => handle_seed(&pool, seed_type).await?,
        Commands::Check => handle_check(&pool).await?,
        Commands::Reset => handle_reset(&pool).await?,
        Commands::Query { school_id } => handle_query(&pool, &school_id).await?,
    }

    Ok(())
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. SEED HANDLER
// ─────────────────────────────────────────────────────────────────────────────
async fn handle_seed(pool: &PgPool, seed_type: SeedType) -> Result<(), Box<dyn std::error::Error>> {
    println!("--- Seeding Database ({:?}) ---", seed_type);

    let run_apikey = seed_type == SeedType::Apikey || seed_type == SeedType::All;
    let run_space = seed_type == SeedType::Space || seed_type == SeedType::All;
    let run_standard = seed_type == SeedType::Standard || seed_type == SeedType::All;

    // A. Seed API Key
    if run_apikey {
        let api_key = "AIzaSyAcpd2loWLizjNP1TgenvHiA7WbaEguvbU";
        println!("Seeding GEMINI_API_KEY...");
        sqlx::query(
            "INSERT INTO system_config (config_key, config_value, updated_at) 
             VALUES ('GEMINI_API_KEY', $1, CURRENT_TIMESTAMP) 
             ON CONFLICT (config_key) 
             DO UPDATE SET config_value = $1, updated_at = CURRENT_TIMESTAMP"
        )
        .bind(api_key)
        .execute(pool)
        .await?;
        println!("  - API Key seeded.");
    }

    // B. Seed Space
    if run_space {
        let school_id = "689225";
        println!("Seeding classroom space '10-A' for school {}...", school_id);
        sqlx::query(
            "INSERT INTO spaces (school_id, name, space_category) 
             VALUES ($1, '10-A', 'Classroom')
             ON CONFLICT (school_id, name) DO NOTHING"
        )
        .bind(school_id)
        .execute(pool)
        .await?;
        println!("  - Space seeded.");
    }

    // C. Seed Standard Data
    if run_standard {
        let school_id = "689225";
        println!("Seeding school {}...", school_id);
        sqlx::query(
            "INSERT INTO schools (school_id, school_name, status, wallet_balance, billing_status) 
             VALUES ($1, 'Test School 689225', 'active', 1000.00, 'active')
             ON CONFLICT (school_id) 
             DO UPDATE SET status = 'active', wallet_balance = 1000.00, billing_status = 'active'"
        )
        .bind(school_id)
        .execute(pool)
        .await?;

        // Seed Auth credentials using Argon2id
        let admin_pwd = "admin@123";
        let salt = SaltString::generate(&mut OsRng);
        let admin_hash = Argon2::default()
            .hash_password(admin_pwd.as_bytes(), &salt)
            .expect("argon2 hash failed")
            .to_string();

        println!("Seeding auth credentials for school {}...", school_id);
        sqlx::query(
            "INSERT INTO auth (school_id, password, password_temp) 
             VALUES ($1, $2, false)
             ON CONFLICT (school_id) 
             DO UPDATE SET password = $2, password_temp = false"
        )
        .bind(school_id)
        .bind(&admin_hash)
        .execute(pool)
        .await?;

        // Seed Student
        println!("Seeding global student user '9876543210'...");
        sqlx::query(
            "INSERT INTO global_users (phone, email, school_id, user_id, user_type, name) 
             VALUES ('9876543210', 'student@test.com', $1, 'stud-9876', 'student', 'Test Student User')
             ON CONFLICT (school_id, user_id, user_type) 
             DO UPDATE SET phone = '9876543210', name = 'Test Student User'"
        )
        .bind(school_id)
        .execute(pool)
        .await?;

        // Seed Employee
        println!("Seeding global employee user 'EMP001'...");
        sqlx::query(
            "INSERT INTO global_users (phone, email, school_id, user_id, user_type, name) 
             VALUES ('EMP001', 'employee@test.com', $1, 'emp-001', 'employee', 'Test Employee User')
             ON CONFLICT (school_id, user_id, user_type) 
             DO UPDATE SET phone = 'EMP001', name = 'Test Employee User'"
        )
        .bind(school_id)
        .execute(pool)
        .await?;

        println!("  - Standard seeding complete.");
    }

    println!("--- Seeding Completed Successfully! ---");
    Ok(())
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. CHECK HANDLER
// ─────────────────────────────────────────────────────────────────────────────
async fn handle_check(pool: &PgPool) -> Result<(), Box<dyn std::error::Error>> {
    println!("--- Inspecting Database Schemas and Columns ---");

    // A. List all schemas
    let schemas: Vec<(String,)> = sqlx::query_as(
        "SELECT schema_name FROM information_schema.schemata 
         WHERE schema_name NOT IN ('pg_catalog', 'information_schema') AND schema_name NOT LIKE 'pg_temp_%'"
    )
    .fetch_all(pool)
    .await?;

    println!("=== SCHEMAS ===");
    for s in &schemas {
        println!(" - {}", s.0);
    }

    // B. List registered schools
    let schools: Vec<(String, String)> = sqlx::query_as(
        "SELECT school_id, school_name FROM public.schools"
    )
    .fetch_all(pool)
    .await?;

    println!("\n=== REGISTERED SCHOOLS ===");
    for sc in &schools {
        println!(" - ID: {}, Name: {}", sc.0, sc.1);
    }

    // C. Inspect table columns and schemas
    let tables = vec![
        "classes", "subjects", "exams", "items", "spaces",
        "coupons", "student_coupons", "employee_responsibilities",
        "responsibilities", "fees", "student_fees"
    ];

    for t in tables {
        println!("\n=========================================");
        println!("COLUMNS FOR TABLE: {}", t);
        let columns = sqlx::query(
            "SELECT table_schema, column_name, data_type, is_nullable 
             FROM information_schema.columns 
             WHERE table_name = $1 AND table_schema = 'public'"
        )
        .bind(t)
        .fetch_all(pool)
        .await?;

        for row in columns {
            let schema: String = row.get("table_schema");
            let col: String = row.get("column_name");
            let dtype: String = row.get("data_type");
            let nullable: String = row.get("is_nullable");
            println!("  - {}.{}: {} (nullable: {})", schema, col, dtype, nullable);
        }

        // Check constraints
        let constraints = sqlx::query(
            "SELECT n.nspname as schema, conname as name, pg_get_constraintdef(c.oid) as definition
             FROM pg_constraint c
             JOIN pg_namespace n ON n.oid = c.connamespace
             JOIN pg_class cl ON cl.oid = c.conrelid
             WHERE cl.relname = $1"
        )
        .bind(t)
        .fetch_all(pool)
        .await?;

        for con in constraints {
            let cname: String = con.get("name");
            let cdef: String = con.get("definition");
            println!("    Constraint: {} -> {}", cname, cdef);
        }
    }

    Ok(())
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. RESET HANDLER
// ─────────────────────────────────────────────────────────────────────────────
async fn handle_reset(pool: &PgPool) -> Result<(), Box<dyn std::error::Error>> {
    println!("--- ULTIMATE SCHEMA RESET INITIATED ---");

    let tables = vec!["classes", "subjects", "exams", "items", "spaces", "material_locations", "auth"];

    for table in tables {
        println!("Purging constraints for table: {}", table);
        
        let drop_query = format!(
            "DO $$ 
             DECLARE 
                cons_record RECORD;
             BEGIN 
                FOR cons_record IN (
                    SELECT conname 
                    FROM pg_constraint c 
                    JOIN pg_class t ON c.conrelid = t.oid 
                    JOIN pg_namespace n ON t.relnamespace = n.oid 
                    WHERE t.relname = '{}' AND n.nspname = 'public' AND c.contype IN ('p', 'u')
                ) LOOP
                    EXECUTE 'ALTER TABLE public.{} DROP CONSTRAINT ' || quote_ident(cons_record.conname) || ' CASCADE';
                END LOOP;
             END $$;",
            table, table
        );
        sqlx::query(&drop_query).execute(pool).await?;
        println!("  - All constraints dropped.");

        if table != "exams" && table != "auth" {
            sqlx::query(&format!("ALTER TABLE public.{} ALTER COLUMN id TYPE TEXT", table)).execute(pool).await.ok();
        }
        sqlx::query(&format!("ALTER TABLE public.{} ALTER COLUMN school_id TYPE TEXT", table)).execute(pool).await.ok();
    }

    println!("--- RE-ESTABLISHING REPOSITORY-MATCHED CONSTRAINTS ---");

    sqlx::query("ALTER TABLE public.classes ADD PRIMARY KEY (school_id, id)").execute(pool).await?;
    sqlx::query("ALTER TABLE public.subjects ADD PRIMARY KEY (school_id, id)").execute(pool).await?;

    sqlx::query("ALTER TABLE public.exams ADD PRIMARY KEY (id)").execute(pool).await.ok();
    sqlx::query("UPDATE public.exams SET name = exam_name WHERE name IS NULL").execute(pool).await?;
    sqlx::query("ALTER TABLE public.exams ALTER COLUMN name SET NOT NULL").execute(pool).await?;
    sqlx::query("ALTER TABLE public.exams ADD CONSTRAINT exams_school_name_unique UNIQUE (school_id, name)").execute(pool).await?;

    sqlx::query("ALTER TABLE public.spaces ADD CONSTRAINT spaces_school_space_unique UNIQUE (school_id, space_id)").execute(pool).await?;
    sqlx::query("ALTER TABLE public.items ADD CONSTRAINT items_school_space_item_unique UNIQUE (school_id, space_id, item_id)").execute(pool).await?;
    sqlx::query("ALTER TABLE public.material_locations ADD CONSTRAINT mat_loc_composite_unique UNIQUE (school_id, material_id, space_id, item_id)").execute(pool).await?;
    sqlx::query("ALTER TABLE public.auth ADD CONSTRAINT auth_school_id_unique UNIQUE (school_id)").execute(pool).await?;

    println!("--- SCHEMA RESET COMPLETE ---");
    Ok(())
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. QUERY HANDLER
// ─────────────────────────────────────────────────────────────────────────────
async fn handle_query(pool: &PgPool, school_id: &str) -> Result<(), Box<dyn std::error::Error>> {
    println!("--- Querying Data for School: {} ---", school_id);

    // A. Query Classes
    let classes: Vec<(String, String)> = sqlx::query_as(
        "SELECT id, name FROM public.classes WHERE school_id = $1"
    )
    .bind(school_id)
    .fetch_all(pool)
    .await?;

    println!("=== CLASSES ===");
    for c in &classes {
        println!(" - ID: {}, Name: {}", c.0, c.1);
    }

    // B. Query Subjects
    let subjects: Vec<(String, String, String)> = sqlx::query_as(
        "SELECT subject_id, name, class_id FROM public.subjects WHERE school_id = $1"
    )
    .bind(school_id)
    .fetch_all(pool)
    .await?;

    println!("\n=== SUBJECTS ===");
    for s in &subjects {
        println!(" - ID: {}, Name: {}, Class ID: {}", s.0, s.1, s.2);
    }

    // C. Query Exams
    let exams: Vec<(String, String, String)> = sqlx::query_as(
        "SELECT id, name, class_id FROM public.exams WHERE school_id = $1"
    )
    .bind(school_id)
    .fetch_all(pool)
    .await?;

    println!("\n=== EXAMS ===");
    for e in &exams {
        println!(" - ID: {}, Name: {}, Class ID: {}", e.0, e.1, e.2);
    }

    // D. Query Auth Hash & Verify Admin Password
    let auth_row = sqlx::query("SELECT password FROM auth WHERE school_id = $1")
        .bind(school_id)
        .fetch_optional(pool)
        .await?;

    if let Some(row) = auth_row {
        let db_hash: String = row.get("password");
        println!("\n=== AUTHENTICATION VERIFICATION ===");
        println!("DB Hash: {}", db_hash);
        
        let parsed = PasswordHash::new(&db_hash);
        match parsed {
            Ok(parsed_hash) => {
                let is_valid = Argon2::default().verify_password("admin@123".as_bytes(), &parsed_hash).is_ok();
                println!("Argon2id verification of 'admin@123' against DB hash: {}", is_valid);
            }
            Err(e) => println!("Error parsing DB hash: {}", e),
        }
    } else {
        println!("\nNo auth record found for school {}", school_id);
    }

    Ok(())
}
