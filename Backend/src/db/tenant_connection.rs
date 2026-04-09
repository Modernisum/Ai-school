use sqlx::postgres::PgPool;

/// Tenant connection manager with RLS support
pub struct TenantConnection {
    pool: PgPool,
}

impl TenantConnection {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Acquires a new database connection from the pool and sets the current tenant context.
    /// This ensures that PostgreSQL Row-Level Security (RLS) policies automatically apply.
    pub async fn acquire_tenant_connection(
        &self,
        school_id: &str,
    ) -> Result<sqlx::pool::PoolConnection<sqlx::Postgres>, sqlx::Error> {
        let mut conn = self.pool.acquire().await?;

        // Set RLS context for security isolation
        let rls_query = format!(
            "SET LOCAL app.current_school_id = '{}'",
            school_id.replace('\'', "''")
        );
        sqlx::query(&rls_query).execute(&mut *conn).await?;

        Ok(conn)
    }

    /// Acquires a connection with empty context for strict isolation
    pub async fn acquire_empty_connection(
        &self,
    ) -> Result<sqlx::pool::PoolConnection<sqlx::Postgres>, sqlx::Error> {
        self.acquire_tenant_connection("none").await
    }
}
