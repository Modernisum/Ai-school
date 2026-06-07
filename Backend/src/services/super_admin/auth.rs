use super::AdminService;
use sqlx::{Row, Connection};
use std::error::Error;
use serde_json::{json, Value};
use crate::logic::password_helper::{hash_password, verify_password};

impl AdminService {
    pub async fn admin_login(
        &self,
        username: &str,
        password: &str,
    ) -> Result<String, Box<dyn Error + Send + Sync>> {
        let mut conn = self.db.acquire_super_admin_connection().await?;
        let row = sqlx::query("SELECT password_hash FROM super_admin WHERE username = $1")
            .bind(username)
            .fetch_optional(&mut *conn)
            .await?;

        if let Some(r) = row {
            let hash: String = r.try_get("password_hash")?;
            let is_valid = verify_password(password, &hash)
                .unwrap_or(false);
            if is_valid {
                    let secret = std::env::var("SUPER_ADMIN_SECRET")
                        .expect("SUPER_ADMIN_SECRET environment variable must be set");
                    let ts = chrono::Utc::now().timestamp();
                    let raw = format!("{}:{}:{}", username, ts, secret);
                    use base64::{engine::general_purpose, Engine as _};
                    let token = general_purpose::STANDARD.encode(raw.as_bytes());
                return Ok(token);
            } else {
                tracing::warn!("Failed super admin login attempt for '{}'", username);
            }
        } else {
            tracing::warn!("Super admin login: user '{}' not found", username);
        }
        Err("Invalid super admin credentials".into())
    }

    pub async fn update_admin_credentials(
        &self,
        current_username: &str,
        current_password: &str,
        new_username: &str,
        new_password: &str,
        profile_image_url: Option<String>,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        let mut conn = self.db.acquire_super_admin_connection().await?;
        let mut tx = conn.begin().await?;

        // 1. Verify access via current password
        let mut authorized = false;
        let mut old_photo: Option<String> = None;

        let row = sqlx::query("SELECT password_hash, profile_image_url FROM super_admin WHERE username = $1")
            .bind(current_username)
            .fetch_optional(&mut *tx)
            .await?;

        if let Some(r) = row {
            let hash: String = r.try_get("password_hash")?;
            old_photo = r.try_get("profile_image_url").ok();
            if let Ok(true) = verify_password(current_password, &hash) { authorized = true; }
        }

        if !authorized {
            return Err("Authorization failed: Invalid current credentials".into());
        }

        // 2. Perform Update
        let hashed_pwd = hash_password(new_password)
            .map_err(|e| format!("Password hashing error: {}", e))?;
        
        if current_username != new_username {
            sqlx::query("DELETE FROM super_admin WHERE username = $1")
                .bind(current_username)
                .execute(&mut *tx)
                .await?;
        }

        sqlx::query(
            "INSERT INTO super_admin (username, password_hash, profile_image_url) VALUES ($1, $2, $3)
             ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, profile_image_url = EXCLUDED.profile_image_url"
        )
        .bind(new_username)
        .bind(hashed_pwd)
        .bind(&profile_image_url)
        .execute(&mut *tx)
        .await?;

        // 3. Handle photo transitions
        if let Some(url) = &profile_image_url {
            sqlx::query("UPDATE app_files SET is_permanent = TRUE WHERE public_url = $1")
                .bind(url)
                .execute(&mut *tx)
                .await?;
        }

        if let Some(old_url) = old_photo {
            if let Some(new_url) = &profile_image_url {
                if old_url != *new_url {
                    sqlx::query("UPDATE app_files SET is_permanent = FALSE WHERE public_url = $1")
                        .bind(old_url)
                        .execute(&mut *tx)
                        .await?;
                }
            } else {
                 sqlx::query("UPDATE app_files SET is_permanent = FALSE WHERE public_url = $1")
                    .bind(old_url)
                    .execute(&mut *tx)
                    .await?;
            }
        }

        tx.commit().await?;
        Ok(())
    }

    pub async fn get_admin_profile(
        &self,
        username: &str,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let mut conn = self.db.acquire_super_admin_connection().await?;
        let row = sqlx::query("SELECT username, profile_image_url FROM super_admin WHERE username = $1")
            .bind(username)
            .fetch_optional(&mut *conn)
            .await?;

        match row {
            Some(r) => Ok(json!({
                "username": r.get::<String, _>("username"),
                "profileImageUrl": r.get::<Option<String>, _>("profile_image_url")
            })),
            None => Err("Admin not found".into()),
        }
    }

    pub fn verify_admin_token(&self, token: &str) -> Result<(), Box<dyn Error + Send + Sync>> {
        let secret = std::env::var("SUPER_ADMIN_SECRET")
            .expect("SUPER_ADMIN_SECRET environment variable must be set");
        use base64::{engine::general_purpose, Engine as _};
        let decoded = general_purpose::STANDARD
            .decode(token)
            .map_err(|_| "Invalid token")?;
        let s = String::from_utf8(decoded).map_err(|_| "Invalid token encoding")?;
        let parts: Vec<&str> = s.splitn(3, ':').collect();
        if parts.len() != 3 || parts[2] != secret {
            return Err("Invalid or tampered token".into());
        }
        let ts: i64 = parts[1].parse().map_err(|_| "Invalid token timestamp")?;
        let age = chrono::Utc::now().timestamp() - ts;
        if age > 86400 * 7 {
            return Err("Token expired".into());
        }
        Ok(())
    }
}
