/// Utility functions for database connection management
pub struct ConnectionUtils;

impl ConnectionUtils {
    /// Sanitizes a school_id for use in SQL queries
    pub fn sanitize_school_id(school_id: &str) -> String {
        school_id.replace('\'', "''")
    }

    /// Validates that a school_id is not empty and contains valid characters
    pub fn validate_school_id(school_id: &str) -> Result<(), String> {
        if school_id.is_empty() {
            return Err("School ID cannot be empty".to_string());
        }
        
        // Basic validation - adjust as needed
        if school_id.len() > 255 {
            return Err("School ID too long (max 255 characters)".to_string());
        }
        
        Ok(())
    }

    /// Creates a RLS context query for a given school_id
    pub fn create_rls_query(school_id: &str) -> String {
        let sanitized = Self::sanitize_school_id(school_id);
        format!("SET LOCAL app.current_school_id = '{}'", sanitized)
    }

    /// Creates a super admin bypass query
    pub fn create_super_admin_query() -> String {
        "SET LOCAL app.is_super_admin = 'true'".to_string()
    }

    /// Sets RLS context query for a given school_id on a connection using SET SESSION
    pub async fn set_rls_session(
        conn: &mut sqlx::PgConnection,
        school_id: &str,
    ) -> Result<(), sqlx::Error> {
        let sanitized = Self::sanitize_school_id(school_id);
        let q = format!("SET app.current_school_id = '{}'", sanitized);
        sqlx::query(&q).execute(conn).await?;
        Ok(())
    }
}

