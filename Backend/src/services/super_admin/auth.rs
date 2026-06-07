use super::AdminService;
use std::error::Error;
use serde_json::{json, Value};
use crate::logic::password_helper::{hash_password, verify_password};

impl AdminService {
    pub async fn admin_login(
        &self,
        username: &str,
        password: &str,
    ) -> Result<String, Box<dyn Error + Send + Sync>> {
        if let Some(hash) = self.repos.super_admin.get_password_hash(username).await? {
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
        // 1. Verify access via current password
        let hash = self.repos.super_admin.get_password_hash(current_username).await?
            .ok_or_else(|| "Authorization failed: Invalid current credentials")?;

        if !verify_password(current_password, &hash).unwrap_or(false) {
            return Err("Authorization failed: Invalid current credentials".into());
        }

        // 2. Perform Update
        let hashed_pwd = hash_password(new_password)
            .map_err(|e| format!("Password hashing error: {}", e))?;
        
        self.repos.super_admin.update_super_admin(
            current_username,
            new_username,
            &hashed_pwd,
            profile_image_url,
        ).await?;

        Ok(())
    }

    pub async fn get_admin_profile(
        &self,
        username: &str,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        if let Some((u, img)) = self.repos.super_admin.get_super_admin_profile(username).await? {
            Ok(json!({
                "username": u,
                "profileImageUrl": img
            }))
        } else {
            Err("Admin not found".into())
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

