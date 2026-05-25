use sqlx::postgres::PgPoolOptions;
use std::env;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv::dotenv().ok();
    let database_url = env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://postgres:1234@127.0.0.1:5432/ai_school?sslmode=disable".to_string());
    
    let pool = PgPoolOptions::new()
        .max_connections(1)
        .connect(&database_url)
        .await?;
        
    let tables = vec!["spaces", "coupons", "student_coupons", "employee_responsibilities", "responsibilities", "fees", "student_fees"];
    for t in tables {
        println!("=========================================");
        println!("COLUMNS FOR TABLE: {}", t);
        let columns = sqlx::query(
            "SELECT column_name, data_type 
             FROM information_schema.columns 
             WHERE table_name = $1 AND table_schema = 'public'"
        )
        .bind(t)
        .fetch_all(&pool)
        .await?;
        
        for row in columns {
            let col: String = sqlx::Row::get(&row, "column_name");
            let dtype: String = sqlx::Row::get(&row, "data_type");
            println!("  - {}: {}", col, dtype);
        }
    }

    Ok(())
}
