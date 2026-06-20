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
    /// Uses SET SESSION (not LOCAL) to work outside a transaction block.
    /// NOTE: Connections are reset via pool config on return.
    pub async fn acquire_tenant_connection(
        &self,
        school_id: &str,
    ) -> Result<sqlx::pool::PoolConnection<sqlx::Postgres>, sqlx::Error> {
        let mut conn = self.pool.acquire().await?;

        crate::db::connection_utils::ConnectionUtils::set_rls_session(&mut *conn, school_id).await?;

        Ok(conn)
    }

    /// Acquires a connection with empty context for strict isolation
    pub async fn acquire_empty_connection(
        &self,
    ) -> Result<sqlx::pool::PoolConnection<sqlx::Postgres>, sqlx::Error> {
        self.acquire_tenant_connection("none").await
    }
}