use sqlx::postgres::PgPool;

/// Super admin connection manager that bypasses RLS policies
pub struct SuperAdminConnection {
    pool: PgPool,
}

impl SuperAdminConnection {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Acquires a new database connection from the pool and bypasses RLS policies.
    /// This should ONLY be used by super_admin services or global jobs (e.g. billing).
    pub async fn acquire_super_admin_connection(
        &self,
    ) -> Result<sqlx::pool::PoolConnection<sqlx::Postgres>, sqlx::Error> {
        let mut conn = self.pool.acquire().await?;

        // Set the is_super_admin flag so the RLS functions bypass security policies
        sqlx::query("SET LOCAL app.is_super_admin = 'true'")
            .execute(&mut *conn)
            .await?;

        Ok(conn)
    }
}
