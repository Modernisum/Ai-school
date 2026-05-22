use crate::db::DbClient;
use crate::repository::traits::*;
use async_trait::async_trait;
use serde_json::{json, Value};
use sqlx::Row;
use std::error::Error;
use std::sync::Arc;

pub struct PostgresAuthRepository {
    pub client: Arc<DbClient>,
}

#[async_trait]
impl AuthRepository for PostgresAuthRepository {
    async fn create_school(&self, data: Value) -> Result<(), Box<dyn Error + Send + Sync>> {
        let id_str = data["id"].as_str().unwrap_or("").to_string();
        let name_str = data["schoolName"].as_str().unwrap_or("").to_string();
        let logo_url = data["schoolLogoUrl"].as_str().map(|s| s.to_string());

        sqlx::query("INSERT INTO schools (school_id, school_name, school_logo_url, data) VALUES ($1, $2, $3, $4)")
            .bind(id_str)
            .bind(name_str)
            .bind(&logo_url)
            .bind(data)
            .execute(&self.client.pool)
            .await?;
        
        if let Some(url) = logo_url {
            sqlx::query("UPDATE app_files SET is_permanent = TRUE WHERE public_url = $1")
                .bind(url)
                .execute(&self.client.pool)
                .await?;
        }
        Ok(())
    }

    async fn get_auth_by_id(
        &self,
        id: &str,
    ) -> Result<Option<Value>, Box<dyn Error + Send + Sync>> {
        let mut conn = self.client.acquire_tenant_connection(id).await?;
        let row = sqlx::query("SELECT * FROM auth WHERE school_id = $1")
            .bind(id)
            .fetch_optional(&mut *conn)
            .await?;
        Ok(row.map(|r| json!({"schoolId": r.get::<String, _>("school_id"), "password": r.get::<String, _>("password"), "securityAnswerHash": r.get::<Option<String>, _>("security_answer_hash")})))
    }

    async fn update_auth(&self, id: &str, data: Value) -> Result<(), Box<dyn Error + Send + Sync>> {
        let mut conn = self.client.acquire_tenant_connection(id).await?;
        if let Some(pass) = data["password"].as_str() {
            sqlx::query("INSERT INTO auth (school_id, password) VALUES ($1, $2) ON CONFLICT (school_id) DO UPDATE SET password = $2")
                .bind(id).bind(pass).execute(&mut *conn).await?;
        }
        if let Some(q) = data["securityQuestion"].as_str() {
            sqlx::query("UPDATE auth SET security_question = $1, security_answer_hash = $2 WHERE school_id = $3")
                .bind(q).bind(data["securityAnswerHash"].as_str()).bind(id).execute(&mut *conn).await?;
        }
        Ok(())
    }

    async fn save_token(
        &self,
        token_id: &str,
        data: Value,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        sqlx::query("INSERT INTO tokens (token_id, school_id, user_type, status, expires_at) VALUES ($1, $2, $3, $4, $5)")
            .bind(token_id)
            .bind(data["schoolId"].as_str())
            .bind(data["userType"].as_str().unwrap_or("school-admin"))
            .bind(data["status"].as_str().unwrap_or("valid"))
            .bind(
                chrono::DateTime::parse_from_rfc3339(data["expiresAt"].as_str().unwrap_or("1970-01-01T00:00:00Z"))?
                    .with_timezone(&chrono::Utc),
            )
            .execute(&self.client.pool)
            .await?;
        Ok(())
    }

    async fn get_token(
        &self,
        token_id: &str,
    ) -> Result<Option<Value>, Box<dyn Error + Send + Sync>> {
        let row = sqlx::query("SELECT * FROM tokens WHERE token_id = $1 AND status = 'valid'")
            .bind(token_id)
            .fetch_optional(&self.client.pool)
            .await?;
        Ok(row.map(|r| json!({"tokenId": r.get::<String, _>("token_id"), "schoolId": r.get::<String, _>("school_id")})))
    }

    async fn delete_token(&self, token_id: &str) -> Result<(), Box<dyn Error + Send + Sync>> {
        sqlx::query("DELETE FROM tokens WHERE token_id = $1")
            .bind(token_id)
            .execute(&self.client.pool)
            .await?;
        Ok(())
    }

    async fn revoke_token(&self, token_id: &str) -> Result<(), Box<dyn Error + Send + Sync>> {
        sqlx::query("UPDATE tokens SET status = 'revoked', revoked_at = NOW() WHERE token_id = $1")
            .bind(token_id)
            .execute(&self.client.pool)
            .await?;
        Ok(())
    }

    async fn cleanup_expired_tokens(&self) -> Result<usize, Box<dyn Error + Send + Sync>> {
        let res = sqlx::query("DELETE FROM tokens WHERE expires_at < NOW()")
            .execute(&self.client.pool)
            .await?;
        Ok(res.rows_affected() as usize)
    }

    async fn add_auth_log(
        &self,
        id: &str,
        action: &str,
        details: Value,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        let mut conn = self.client.acquire_tenant_connection(id).await?;
        sqlx::query("INSERT INTO auth_logs (school_id, action, details) VALUES ($1, $2, $3)")
            .bind(id)
            .bind(action)
            .bind(details)
            .execute(&mut *conn)
            .await?;
        Ok(())
    }

    async fn change_school_id(
        &self,
        old_id: &str,
        new_id: &str,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        sqlx::query("UPDATE schools SET school_id = $1 WHERE school_id = $2")
            .bind(new_id)
            .bind(old_id)
            .execute(&self.client.pool)
            .await?;
        Ok(())
    }

    async fn generate_school_code(&self) -> Result<String, Box<dyn Error + Send + Sync>> {
        loop {
            let code = format!("SCH{:04}", rand::random::<u32>() % 10000);
            let exists: (bool,) = sqlx::query_as("SELECT EXISTS(SELECT 1 FROM schools WHERE data->>'schoolCode' = $1)")
                .bind(&code)
                .fetch_one(&self.client.pool)
                .await?;
            if !exists.0 {
                return Ok(code);
            }
        }
    }
}
