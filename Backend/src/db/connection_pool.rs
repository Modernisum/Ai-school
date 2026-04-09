use deadpool_redis::{Config, Pool, Runtime};
use sqlx::postgres::PgPool;
use std::error::Error;

/// Database connection pool manager
#[derive(Clone)]
pub struct ConnectionPool {
    pub pool: PgPool,
    pub redis: Pool,
}

impl ConnectionPool {
    /// Creates a new connection pool for PostgreSQL and Redis
    pub async fn new() -> Result<Self, Box<dyn Error>> {
        let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
        let redis_url = std::env::var("REDIS_URL").expect("REDIS_URL must be set");

        println!("Connecting to PostgreSQL...");
        let pool = PgPool::connect(&database_url).await?;

        println!("Connecting to Redis...");
        let cfg = Config::from_url(redis_url);
        let redis = cfg.create_pool(Some(Runtime::Tokio1))?;

        Ok(ConnectionPool { pool, redis })
    }

    /// Gets a reference to the PostgreSQL pool
    pub fn pg_pool(&self) -> &PgPool {
        &self.pool
    }

    /// Gets a reference to the Redis pool
    pub fn redis_pool(&self) -> &Pool {
        &self.redis
    }
}
