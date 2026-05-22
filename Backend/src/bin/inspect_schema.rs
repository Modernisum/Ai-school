use sqlx::postgres::PgPoolOptions;
use std::env;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv::dotenv().ok();
    let database_url = env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://postgres:password@127.0.0.1:5432/ai_school?sslmode=disable".to_string());
    
    let pool = PgPoolOptions::new()
        .max_connections(1)
        .connect(&database_url)
        .await?;
        
    println!("Querying constraints for leave_applications...");
    
    let constraints = sqlx::query(
        "SELECT tc.constraint_name, tc.constraint_type, kcu.column_name
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu 
           ON tc.constraint_name = kcu.constraint_name
           AND tc.table_schema = kcu.table_schema
         WHERE tc.table_name = 'leave_applications' AND tc.table_schema = 'public'"
    )
    .fetch_all(&pool)
    .await?;
    
    for row in constraints {
        let cname: String = sqlx::Row::get(&row, "constraint_name");
        let ctype: String = sqlx::Row::get(&row, "constraint_type");
        let col: String = sqlx::Row::get(&row, "column_name");
        println!("Constraint: {} ({}) on column: {}", cname, ctype, col);
    }
    
    // Also print index names and whether they are unique
    println!("\nQuerying indexes for leave_applications...");
    let indexes = sqlx::query(
        "SELECT indexname, indexdef 
         FROM pg_indexes 
         WHERE tablename = 'leave_applications' AND schemaname = 'public'"
    )
    .fetch_all(&pool)
    .await?;
    
    for row in indexes {
        let name: String = sqlx::Row::get(&row, "indexname");
        let def: String = sqlx::Row::get(&row, "indexdef");
        println!("Index: {} - Def: {}", name, def);
    }

    Ok(())
}
