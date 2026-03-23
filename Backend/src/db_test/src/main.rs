use sqlx::postgres::PgPoolOptions;
use std::env;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let db_url = env::var("DATABASE_URL")?;
    let pool = PgPoolOptions::new().connect(&db_url).await?;
    let school_id = "978168";
    let schema_name = format!("school_{}", school_id.replace('-', "_"));
    
    let row: (bool,) = sqlx::query_as("SELECT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = )")
        .bind(&schema_name)
        .fetch_one(&pool)
        .await?;
    println!("Schema {} exists: {}", schema_name, row.0);
    
    if row.0 {
        let tables: Vec<(String,)> = sqlx::query_as("SELECT table_name FROM information_schema.tables WHERE table_schema = ")
            .bind(&schema_name)
            .fetch_all(&pool)
            .await?;
        println!("Tables in {}: {:?}", schema_name, tables);
        
        let classes: Vec<(String, String)> = sqlx::query_as(&format!("SELECT id, name FROM {}.classes", schema_name))
            .fetch_all(&pool)
            .await?;
        println!("Classes in {}: {:?}", schema_name, classes);
    }
    
    Ok(())
}
