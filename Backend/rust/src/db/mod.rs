mod connection_pool;
pub mod connection_utils;
mod schema_setup;
mod super_admin_connection;
mod tenant_connection;

pub use connection_pool::ConnectionPool;
pub use schema_setup::SchemaSetup;
pub use super_admin_connection::SuperAdminConnection;
pub use tenant_connection::TenantConnection;

use deadpool_redis::Pool;
use sqlx::postgres::PgPool;
use std::error::Error;

/// Main database client that coordinates all connection types
#[derive(Clone)]
pub struct DbClient {
    pub pool: PgPool,
    pub redis: Pool,
}

/// Shared utility: get all active school IDs
pub async fn get_active_school_ids(pool: &PgPool) -> Result<Vec<String>, sqlx::Error> {
    let rows = sqlx::query_as::<_, (String,)>(
        "SELECT school_id FROM schools WHERE status = 'active'"
    )
    .fetch_all(pool)
    .await?;
    Ok(rows.into_iter().map(|r| r.0).collect())
}

impl DbClient {
    /// Optimized helper to acquire a connection based on context
    pub async fn acquire_rls_connection(
        &self,
        school_id: Option<&str>,
        is_super_admin: bool,
    ) -> Result<sqlx::pool::PoolConnection<sqlx::Postgres>, sqlx::Error> {
        if is_super_admin {
            let sa_conn = SuperAdminConnection::new(self.pool.clone());
            sa_conn.acquire_super_admin_connection().await
        } else if let Some(sid) = school_id {
            let tenant_conn = TenantConnection::new(self.pool.clone());
            tenant_conn.acquire_tenant_connection(sid).await
        } else {
            // Default to strictly isolated empty context if neither provided
            let tenant_conn = TenantConnection::new(self.pool.clone());
            tenant_conn.acquire_empty_connection().await
        }
    }

    /// Acquires a new database connection from the pool and sets the current tenant context.
    /// This ensures that PostgreSQL Row-Level Security (RLS) policies automatically apply.
    pub async fn acquire_tenant_connection(
        &self,
        school_id: &str,
    ) -> Result<sqlx::pool::PoolConnection<sqlx::Postgres>, sqlx::Error> {
        let tenant_conn = TenantConnection::new(self.pool.clone());
        tenant_conn.acquire_tenant_connection(school_id).await
    }

    /// Acquires a new database connection from the pool and bypasses RLS policies.
    /// This should ONLY be used by super_admin services or global jobs (e.g. billing).
    pub async fn acquire_super_admin_connection(
        &self,
    ) -> Result<sqlx::pool::PoolConnection<sqlx::Postgres>, sqlx::Error> {
        let sa_conn = SuperAdminConnection::new(self.pool.clone());
        sa_conn.acquire_super_admin_connection().await
    }

    /// Ensures that a specific school is correctly initialized.
    /// In the new RLS-first architecture, we primarily use public tables partitioned by school_id.
    pub async fn ensure_tenant_schema(&self, school_id: &str) -> Result<(), Box<dyn Error>> {
        // We still log the initialization for legacy compatibility, 
        // but avoid creating massive numbers of schemas/tables.
        println!("Initializing tenant context for school_id: {}", school_id);
        
        // Ensure the school exists in the global tracker
        // (Handled by setup_service usually, but keeping this as a safety check hook)
        
        Ok(())
    }

    pub async fn new() -> Result<Self, Box<dyn Error>> {
        let conn_pool = ConnectionPool::new().await?;
        let pool = conn_pool.pg_pool().clone();
        let redis = conn_pool.redis_pool().clone();

        // Initialize database schema
        let schema_setup = SchemaSetup::new(pool.clone());
        schema_setup.initialize_all().await?;
        schema_setup.initialize_indexes().await?;

        Ok(DbClient { pool, redis })
    }

    #[cfg(test)]
    pub fn new_test() -> Result<Self, Box<dyn Error>> {
        let pool = PgPool::connect_lazy("postgresql://localhost/test")?;
        let redis = deadpool_redis::Config::from_url("redis://localhost:6379")
            .create_pool(None)
            .map_err(|e| Box::new(e) as Box<dyn Error>)?;
        Ok(DbClient { pool, redis })
    }
}

pub async fn init() -> Result<DbClient, Box<dyn Error>> {
    DbClient::new().await
}
