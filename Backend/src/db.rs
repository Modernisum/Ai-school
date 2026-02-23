use deadpool_redis::{Config, Pool, Runtime};
use sqlx::postgres::PgPool;
use std::error::Error;
use std::sync::Arc;

#[derive(Clone)]
pub struct DbClient {
    pub pool: PgPool,
    pub redis: Pool,
}

impl DbClient {
    pub async fn new() -> Result<Self, Box<dyn Error>> {
        let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
        let redis_url = std::env::var("REDIS_URL").expect("REDIS_URL must be set");

        println!("Connecting to PostgreSQL...");
        let pool = PgPool::connect(&database_url).await?;

        println!("Ensuring required sequences exist...");
        sqlx::query("CREATE SEQUENCE IF NOT EXISTS school_code_seq START 1")
            .execute(&pool)
            .await?;
        sqlx::query("CREATE SEQUENCE IF NOT EXISTS employee_id_seq START 1")
            .execute(&pool)
            .await?;
        sqlx::query("CREATE SEQUENCE IF NOT EXISTS student_id_seq START 1")
            .execute(&pool)
            .await?;

        println!("Connecting to Redis...");
        let cfg = Config::from_url(redis_url);
        let redis = cfg.create_pool(Some(Runtime::Tokio1))?;

        Ok(DbClient { pool, redis })
    }
}

pub async fn init() -> Result<DbClient, Box<dyn Error>> {
    DbClient::new().await
}
