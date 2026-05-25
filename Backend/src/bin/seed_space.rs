use sqlx::postgres::PgPoolOptions;
use std::env;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv::dotenv().ok();
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = PgPoolOptions::new()
        .max_connections(1)
        .connect(&database_url)
        .await?;

    println!("Ensuring space 10-A exists...");
    sqlx::query(
        "INSERT INTO spaces (school_id, name, space_category) 
         VALUES ('689225', '10-A', 'Classroom')
         ON CONFLICT (school_id, name) DO NOTHING"
    )
    .execute(&pool)
    .await?;

    println!("Done!");
    Ok(())
}
