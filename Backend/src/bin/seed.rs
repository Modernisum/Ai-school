use sqlx::postgres::PgPoolOptions;
use std::env;
use argon2::{
    password_hash::{rand_core::OsRng, SaltString, PasswordHasher},
    Argon2,
};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv::dotenv().ok();
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = PgPoolOptions::new()
        .max_connections(1)
        .connect(&database_url)
        .await?;

    println!("--- Starting Unified Database Seeder ---");

    // 1. Seed Gemini API Key
    let api_key = "AIzaSyAcpd2loWLizjNP1TgenvHiA7WbaEguvbU";
    println!("Seeding GEMINI_API_KEY...");
    sqlx::query(
        "INSERT INTO system_config (config_key, config_value, updated_at) 
         VALUES ('GEMINI_API_KEY', $1, CURRENT_TIMESTAMP) 
         ON CONFLICT (config_key) 
         DO UPDATE SET config_value = $1, updated_at = CURRENT_TIMESTAMP"
    )
    .bind(api_key)
    .execute(&pool)
    .await?;

    // 2. Seed Test School
    let school_id = "689225";
    println!("Seeding school {}...", school_id);
    sqlx::query(
        "INSERT INTO schools (school_id, school_name, status, wallet_balance, billing_status) 
         VALUES ($1, 'Test School 689225', 'active', 1000.00, 'active')
         ON CONFLICT (school_id) 
         DO UPDATE SET status = 'active', wallet_balance = 1000.00, billing_status = 'active'"
    )
    .bind(school_id)
    .execute(&pool)
    .await?;

    // 3. Seed Auth Credentials
    let admin_pwd = "admin@123";
    let argon2_salt = SaltString::generate(&mut OsRng);
    let admin_hash = Argon2::default()
        .hash_password(admin_pwd.as_bytes(), &argon2_salt)
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
    .execute(&pool)
    .await?;

    // 4. Seed Classroom Space
    println!("Seeding space '10-A' for school {}...", school_id);
    sqlx::query(
        "INSERT INTO spaces (school_id, name, space_category) 
         VALUES ($1, '10-A', 'Classroom')
         ON CONFLICT (school_id, name) DO NOTHING"
    )
    .bind(school_id)
    .execute(&pool)
    .await?;

    // 5. Seed Test Global Student User
    println!("Seeding global student user '9876543210'...");
    sqlx::query(
        "INSERT INTO global_users (phone, email, school_id, user_id, user_type, name) 
         VALUES ('9876543210', 'student@test.com', $1, 'stud-9876', 'student', 'Test Student User')
         ON CONFLICT (school_id, user_id, user_type) 
         DO UPDATE SET phone = '9876543210', name = 'Test Student User'"
    )
    .bind(school_id)
    .execute(&pool)
    .await?;

    // 6. Seed Test Global Employee User
    println!("Seeding global employee user 'EMP001'...");
    sqlx::query(
        "INSERT INTO global_users (phone, email, school_id, user_id, user_type, name) 
         VALUES ('EMP001', 'employee@test.com', $1, 'emp-001', 'employee', 'Test Employee User')
         ON CONFLICT (school_id, user_id, user_type) 
         DO UPDATE SET phone = 'EMP001', name = 'Test Employee User'"
    )
    .bind(school_id)
    .execute(&pool)
    .await?;

    println!("--- Seeding Completed Successfully! ---");
    Ok(())
}
