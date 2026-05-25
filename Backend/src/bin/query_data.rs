use sqlx::postgres::PgPoolOptions;
use std::env;
use bcrypt::{hash, verify};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv::dotenv().ok();
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    
    let pool = PgPoolOptions::new()
        .max_connections(1)
        .connect(&database_url)
        .await?;

    println!("Ensuring school 689225 exists...");
    sqlx::query(
        "INSERT INTO schools (school_id, school_name, status, wallet_balance, billing_status) 
         VALUES ('689225', 'Test School 689225', 'active', 1000.00, 'active')
         ON CONFLICT (school_id) 
         DO UPDATE SET status = 'active', wallet_balance = 1000.00, billing_status = 'active'"
    )
    .execute(&pool)
    .await?;

    let admin_pwd = "admin@123";
    let admin_hash = hash(admin_pwd, 10).unwrap();
    println!("Ensuring auth for school 689225 exists with password: {}", admin_pwd);
    sqlx::query(
        "INSERT INTO auth (school_id, password, password_temp) 
         VALUES ('689225', $1, false)
         ON CONFLICT (school_id) 
         DO UPDATE SET password = $1, password_temp = false"
    )
    .bind(&admin_hash)
    .execute(&pool)
    .await?;

    println!("Ensuring global student 9876543210 exists...");
    sqlx::query(
        "INSERT INTO global_users (phone, email, school_id, user_id, user_type, name) 
         VALUES ('9876543210', 'student@test.com', '689225', 'stud-9876', 'student', 'Test Student User')
         ON CONFLICT (school_id, user_id, user_type) 
         DO UPDATE SET phone = '9876543210', name = 'Test Student User'"
    )
    .execute(&pool)
    .await?;

    println!("Ensuring global employee EMP001 exists...");
    sqlx::query(
        "INSERT INTO global_users (phone, email, school_id, user_id, user_type, name) 
         VALUES ('EMP001', 'employee@test.com', '689225', 'emp-001', 'employee', 'Test Employee User')
         ON CONFLICT (school_id, user_id, user_type) 
         DO UPDATE SET phone = 'EMP001', name = 'Test Employee User'"
    )
    .execute(&pool)
    .await?;

    println!("Verification queries completed successfully!");
    
    // Print verify result
    let auth_row = sqlx::query("SELECT password FROM auth WHERE school_id = '689225'")
        .fetch_one(&pool)
        .await?;
    let db_hash: String = sqlx::Row::get(&auth_row, "password");
    println!("Bcrypt verification of 'admin@123' against DB hash: {}", verify("admin@123", &db_hash).unwrap());

    Ok(())
}
