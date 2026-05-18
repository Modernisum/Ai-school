use sqlx::postgres::PgPoolOptions;
use std::env;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv::dotenv().ok();
    let db_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = PgPoolOptions::new().connect(&db_url).await?;

    let api_key = "AIzaSyAcpd2loWLizjNP1TgenvHiA7WbaEguvbU";

    // Insert or update the GEMINI_API_KEY
    sqlx::query(
        "INSERT INTO system_config (config_key, config_value, updated_at) 
         VALUES ('GEMINI_API_KEY', $1, CURRENT_TIMESTAMP) 
         ON CONFLICT (config_key) 
         DO UPDATE SET config_value = $1, updated_at = CURRENT_TIMESTAMP"
    )
    .bind(api_key)
    .execute(&pool)
    .await?;

    println!("Successfully updated GEMINI_API_KEY in system_config table!");
    Ok(())
}
