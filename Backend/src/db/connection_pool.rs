use deadpool_redis::{Config, Pool, Runtime};
use sqlx::postgres::{PgPool, PgPoolOptions};
use std::error::Error;
use std::time::Duration;

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

        let max_connections: u32 = std::env::var("DB_MAX_CONNECTIONS")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(50);
        let min_connections: u32 = std::env::var("DB_MIN_CONNECTIONS")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(5);

        println!("Connecting to PostgreSQL (max={}, min={})...", max_connections, min_connections);
        let pool = PgPoolOptions::new()
            .max_connections(max_connections)
            .min_connections(min_connections)
            .acquire_timeout(Duration::from_secs(3))
            .idle_timeout(Duration::from_secs(300))
            .max_lifetime(Duration::from_secs(1800))
            .connect(&database_url)
            .await?;

        println!("Connecting to Redis...");
        let cfg = Config::from_url(redis_url);
        let redis = cfg
            .builder()
            .map_err(|e| format!("Redis config error: {}", e))?
            .max_size(20)
            .build()
            .map_err(|e| format!("Redis pool error: {}", e))?;

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
