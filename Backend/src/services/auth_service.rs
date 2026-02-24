use crate::repository::traits::*;
use crate::repository::Repositories;
use crate::services::traits::*;
use async_trait::async_trait;
use serde_json::{json, Value};
use std::error::Error;
use std::sync::Arc;

pub struct PostgresAuthService {
    pub repos: Arc<Repositories>,
}

#[async_trait]
impl AuthService for PostgresAuthService {
    async fn login(&self, data: Value) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let school_id = data["schoolId"].as_str().ok_or("Missing schoolId")?;
        let password = data["password"].as_str().ok_or("Missing password")?;

        let auth = self.repos.auth.get_auth_by_id(school_id).await?;
        if let Some(a) = auth {
            let hashed = a["password"].as_str().unwrap_or("");
            if bcrypt::verify(password, hashed)? {
                // Check if school is blocked due to billing (SaaS)
                let school_row = sqlx::query("SELECT billing_status, trial_ends_at FROM schools WHERE school_id = $1")
                    .bind(school_id)
                    .fetch_optional(&self.repos.db_client.pool)
                    .await?;

                if let Some(row) = school_row {
                    let billing_status: String = sqlx::Row::get(&row, "billing_status");
                    if billing_status == "suspended" {
                        return Err("Your account is suspended due to insufficient balance. Please contact the Super Admin to recharge your wallet.".into());
                    }
                }

                let token = format!("{:x}", rand::random::<u128>());
                let token_data = json!({
                    "tokenId": token,
                    "schoolId": school_id,
                    "status": "valid",
                    "expiresAt": (chrono::Utc::now() + chrono::Duration::hours(1)).to_rfc3339()
                });
                self.repos
                    .auth
                    .save_token(&token, token_data.clone())
                    .await?;
                self.repos
                    .auth
                    .add_auth_log(school_id, "login", json!({}))
                    .await?;

                return Ok(json!({
                    "success": true,
                    "accessToken": token,
                    "schoolId": school_id,
                    "message": "Login successful"
                }));
            }
        }
        Err("Invalid credentials".into())
    }

    async fn verify_token(&self, token: &str) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let token_data = self.repos.auth.get_token(token).await?;
        match token_data {
            Some(t) => Ok(t),
            None => Err("Invalid token".into()),
        }
    }

    async fn logout(&self, token: &str) -> Result<(), Box<dyn Error + Send + Sync>> {
        self.repos.auth.revoke_token(token).await
    }

    async fn set_security(
        &self,
        school_id: &str,
        question: &str,
        answer: &str,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        let hashed_answer = bcrypt::hash(answer.trim().to_lowercase(), 10)?;
        let data = json!({
            "securityQuestion": question,
            "securityAnswerHash": hashed_answer
        });
        self.repos.auth.update_auth(school_id, data).await?;
        self.repos
            .auth
            .add_auth_log(school_id, "set-security", json!({"question": question}))
            .await
    }

    async fn forgot_password(
        &self,
        school_id: &str,
        answer: &str,
    ) -> Result<String, Box<dyn Error + Send + Sync>> {
        let auth = self.repos.auth.get_auth_by_id(school_id).await?;
        if let Some(a) = auth {
            let hashed_answer = a["securityAnswerHash"].as_str().unwrap_or("");
            if bcrypt::verify(answer.trim().to_lowercase(), hashed_answer)? {
                let temp_pass = format!("{:08}", rand::random::<u32>() % 100000000);
                let hashed_temp = bcrypt::hash(&temp_pass, 10)?;
                self.repos
                    .auth
                    .update_auth(
                        school_id,
                        json!({"password": hashed_temp, "passwordTemp": true}),
                    )
                    .await?;
                self.repos
                    .auth
                    .add_auth_log(school_id, "forgot-password", json!({}))
                    .await?;
                return Ok(temp_pass);
            }
        }
        Err("Incorrect security answer".into())
    }

    async fn change_password(
        &self,
        school_id: &str,
        old_pass: &str,
        new_pass: &str,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        let auth = self.repos.auth.get_auth_by_id(school_id).await?;
        if let Some(a) = auth {
            let hashed = a["password"].as_str().unwrap_or("");
            if bcrypt::verify(old_pass, hashed)? {
                let hashed_new = bcrypt::hash(new_pass, 10)?;
                self.repos
                    .auth
                    .update_auth(
                        school_id,
                        json!({"password": hashed_new, "passwordTemp": false}),
                    )
                    .await?;
                self.repos
                    .auth
                    .add_auth_log(school_id, "change-password", json!({}))
                    .await?;
                return Ok(());
            }
        }
        Err("Invalid old password".into())
    }

    async fn change_id(
        &self,
        old_id: &str,
        _pass: &str,
        new_id: &str,
    ) -> Result<String, Box<dyn Error + Send + Sync>> {
        // Complex logic parity: rename record and move logs
        self.repos.auth.change_school_id(old_id, new_id).await?;
        Ok(new_id.to_string())
    }
}
