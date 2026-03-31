use sqlx::postgres::PgPool;
use std::env;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv::dotenv().ok();
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    
    println!("Connecting to database...");
    let pool = PgPool::connect(&database_url).await?;
    
    println!("Testing connection...");
    let result = sqlx::query("SELECT 1").fetch_one(&pool).await?;
    let value: i32 = sqlx::Row::get(&result, 0);
    
    println!("Database connection successful! Result: {}", value);
    
    // Check if auth table exists
    match sqlx::query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'auth')")
        .fetch_one(&pool)
        .await {
            Ok(row) => {
                let exists: bool = sqlx::Row::get(&row, 0);
                println!("Auth table exists: {}", exists);
            },
            Err(e) => println!("Error checking auth table: {}", e),
        }
    
    Ok(())
}