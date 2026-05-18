use sqlx::postgres::PgPoolOptions;
use std::env;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv::dotenv().ok();
    let db_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = PgPoolOptions::new().connect(&db_url).await?;

    // 1. List all schemas
    let schemas: Vec<(String,)> = sqlx::query_as(
        "SELECT schema_name FROM information_schema.schemata 
         WHERE schema_name NOT IN ('pg_catalog', 'information_schema') AND schema_name NOT LIKE 'pg_temp_%'"
    )
    .fetch_all(&pool)
    .await?;
    println!("=== SCHEMAS ===");
    for s in &schemas {
        println!(" - {}", s.0);
    }

    // 2. List all registered schools in the schools table of public schema
    let schools: Vec<(String, String)> = sqlx::query_as(
        "SELECT school_id, school_name FROM public.schools"
    )
    .fetch_all(&pool)
    .await?;
    println!("\n=== SCHOOLS IN DATABASE ===");
    for sc in &schools {
        println!(" - ID: {}, Name: {}", sc.0, sc.1);
    }

    Ok(())
}
