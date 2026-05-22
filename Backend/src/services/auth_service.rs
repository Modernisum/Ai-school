use crate::repository::Repositories;
use crate::services::traits::*;
use async_trait::async_trait;
use chrono;
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::sync::Arc;

#[derive(Debug, Serialize, Deserialize)]
struct Claims {
    sub: String,
    role: String,
    exp: usize,
}

#[derive(Debug, Serialize, Deserialize)]
struct AdminClaims {
    sub: String,
    school_id: String,
    role: String,
    permissions: Vec<String>,
    exp: usize,
}

pub struct PostgresAuthService {
    pub repos: Arc<Repositories>,
}

#[async_trait]
impl AuthService for PostgresAuthService {
    async fn login(&self, data: Value) -> AppResult<Value> {
        let school_id = data["schoolId"].as_str().ok_or_else(|| AppError::Validation("Missing schoolId".to_string()))?;
        let password = data["password"].as_str().ok_or_else(|| AppError::Validation("Missing password".to_string()))?;

        let auth = self.repos.auth.get_auth_by_id(school_id).await?;
        if let Some(a) = auth {
            let hashed = a["password"].as_str().unwrap_or("");
            if bcrypt::verify(password, hashed).map_err(|e| AppError::Internal(format!("Bcrypt error: {}", e)))? {
                // Check if school is blocked due to billing (SaaS)
                let school_row = sqlx::query("SELECT billing_status, trial_ends_at, wallet_balance, per_student_rate FROM schools WHERE school_id = $1")
                    .bind(school_id)
                    .fetch_optional(&self.repos.db_client.pool)
                    .await?;

                if let Some(row) = school_row {
                    let wallet_balance: sqlx::types::BigDecimal =
                        sqlx::Row::get(&row, "wallet_balance");
                    let per_student_rate: sqlx::types::BigDecimal =
                        sqlx::Row::get(&row, "per_student_rate");
                    let billing_status: String = sqlx::Row::get(&row, "billing_status");

                    let count_row = sqlx::query("SELECT COUNT(*) as count FROM students WHERE school_id = $1 AND status = 'active'")
                        .bind(school_id)
                        .fetch_one(&self.repos.db_client.pool)
                        .await?;
                    let active_students: i64 = sqlx::Row::get(&count_row, "count");

                    use sqlx::types::BigDecimal;
                    use bigdecimal::FromPrimitive;
                    use std::str::FromStr;

                    let students_bd = BigDecimal::from_i64(active_students)
                        .unwrap_or_else(|| BigDecimal::from_str("0").unwrap());
                    let required_balance = per_student_rate * students_bd;

                    if wallet_balance < required_balance {
                        return Err(AppError::Forbidden(format!("Insufficient wallet balance to support {} active students. Please contact the Super Admin to recharge.", active_students)));
                    }

                    if billing_status == "suspended" && wallet_balance < required_balance {
                        return Err(AppError::Forbidden("Your account is suspended due to insufficient balance. Please contact the Super Admin to recharge your wallet.".to_string()));
                    }
                }

                let secret = std::env::var("JWT_SECRET").expect("JWT_SECRET environment variable must be set in production");
                let claims = AdminClaims {
                    sub: school_id.to_string(),
                    school_id: school_id.to_string(),
                    role: "admin".to_string(),
                    permissions: vec!["admin".to_string()],
                    exp: (chrono::Utc::now() + chrono::Duration::hours(1)).timestamp() as usize,
                };
                let token = encode(&Header::default(), &claims, &EncodingKey::from_secret(secret.as_ref()))
                    .map_err(|e| AppError::Internal(format!("JWT Error: {}", e)))?;
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
        Err(AppError::Unauthorized("Invalid credentials".to_string()))
    }

    async fn verify_token(&self, token: &str) -> AppResult<Value> {
        // 1. Try legacy session matching first
        let token_data = self.repos.auth.get_token(token).await?;
        if let Some(t) = token_data {
            return Ok(t);
        }

        // 2. Try JWT verification (for student/employee apps)
        let secret = std::env::var("JWT_SECRET")
            .expect("JWT_SECRET environment variable must be set");
        match decode::<Claims>(
            token,
            &DecodingKey::from_secret(secret.as_ref()),
            &Validation::default(),
        ) {
            Ok(token_data) => {
                return Ok(json!({
                    "sub": token_data.claims.sub,
                    "role": token_data.claims.role,
                    "status": "valid",
                    "expiresAt": token_data.claims.exp
                }));
            }
            Err(_) => {
                // Try AdminClaims
                if let Ok(admin_data) = decode::<AdminClaims>(
                    token,
                    &DecodingKey::from_secret(secret.as_ref()),
                    &Validation::default(),
                ) {
                    return Ok(json!({
                        "sub": admin_data.claims.sub,
                        "schoolId": admin_data.claims.school_id,
                        "role": admin_data.claims.role,
                        "permissions": admin_data.claims.permissions,
                        "status": "valid",
                        "expiresAt": admin_data.claims.exp
                    }));
                }
            }
        }
        Err(AppError::Unauthorized("Invalid or expired token".to_string()))
    }

    async fn logout(&self, token: &str) -> AppResult<()> {
        // Log logout for JWT if possible, or just revoke legacy token
        let secret = std::env::var("JWT_SECRET")
            .expect("JWT_SECRET environment variable must be set");
        if let Ok(token_data) = decode::<Claims>(
            token,
            &DecodingKey::from_secret(secret.as_ref()),
            &Validation::default(),
        ) {
            sqlx::query(
                "INSERT INTO user_activity_logs (phone, user_type, action, metadata) VALUES ($1, $2, 'logout', $3)",
            )
            .bind(token_data.claims.sub)
            .bind(token_data.claims.role)
            .bind(json!({ "timestamp": chrono::Utc::now() }))
            .execute(&self.repos.db_client.pool)
            .await?;
        }

        self.repos.auth.revoke_token(token).await?;
        Ok(())
    }

    async fn set_security(
        &self,
        school_id: &str,
        question: &str,
        answer: &str,
    ) -> AppResult<()> {
        let hashed_answer = bcrypt::hash(answer.trim().to_lowercase(), 10).map_err(|e| AppError::Internal(format!("Bcrypt hashing error: {}", e)))?;
        let data = json!({
            "securityQuestion": question,
            "securityAnswerHash": hashed_answer
        });
        self.repos.auth.update_auth(school_id, data).await?;
        self.repos
            .auth
            .add_auth_log(school_id, "set-security", json!({"question": question}))
            .await?;
        Ok(())
    }

    async fn forgot_password(
        &self,
        school_id: &str,
        answer: &str,
    ) -> AppResult<String> {
        let auth = self.repos.auth.get_auth_by_id(school_id).await?;
        if let Some(a) = auth {
            let hashed_answer = a["securityAnswerHash"].as_str().unwrap_or("");
            if bcrypt::verify(answer.trim().to_lowercase(), hashed_answer).map_err(|e| AppError::Internal(format!("Bcrypt verification error: {}", e)))? {
                let temp_pass = format!("{:08}", rand::random::<u32>() % 100000000);
                let hashed_temp = bcrypt::hash(&temp_pass, 10).map_err(|e| AppError::Internal(format!("Bcrypt hashing error: {}", e)))?;
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
        Err(AppError::Unauthorized("Incorrect security answer".to_string()))
    }

    async fn change_password(
        &self,
        school_id: &str,
        old_pass: &str,
        new_pass: &str,
    ) -> AppResult<()> {
        let auth = self.repos.auth.get_auth_by_id(school_id).await?;
        if let Some(a) = auth {
            let hashed = a["password"].as_str().unwrap_or("");
            if bcrypt::verify(old_pass, hashed).map_err(|e| AppError::Internal(format!("Bcrypt error: {}", e)))? {
                let hashed_new = bcrypt::hash(new_pass, 10).map_err(|e| AppError::Internal(format!("Bcrypt error: {}", e)))?;
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
        Err(AppError::Unauthorized("Invalid old password".to_string()))
    }

    async fn change_id(
        &self,
        old_id: &str,
        _pass: &str,
        new_id: &str,
    ) -> AppResult<String> {
        // Complex logic parity: rename record and move logs
        self.repos.auth.change_school_id(old_id, new_id).await?;
        Ok(new_id.to_string())
    }

    async fn login_global(&self, ident: &str, app_type: &str) -> AppResult<Value> {
        let matches = self.repos.global_user.find_by_identifier(ident).await?;
        if matches.is_empty() {
            return Err(AppError::NotFound(
                "This identifier does not exist. Please contact your administrator.".to_string(),
            ));
        }

        // Validate if the user has the required profile for the app type
        let filtered_profiles: Vec<Value> = matches
            .into_iter()
            .filter(|m| m["userType"] == app_type)
            .collect();

        if filtered_profiles.is_empty() {
            return Err(AppError::Forbidden(format!(
                "This number does not have a {} profile and cannot be used to login to the {} app.",
                app_type, app_type
            )));
        }

        // Calculate JWT Expiration based on school policies
        let school_ids: Vec<String> = filtered_profiles
            .iter()
            .filter_map(|p| p["schoolId"].as_str().map(|s| s.to_string()))
            .collect();

        let durations = sqlx::query("SELECT session_duration_hours FROM schools WHERE school_id = ANY($1)")
            .bind(&school_ids)
            .fetch_all(&self.repos.db_client.pool)
            .await?;

        let max_hours = durations
            .iter()
            .map(|row| sqlx::Row::get::<i32, _>(row, "session_duration_hours") as i64)
            .max()
            .unwrap_or(24); // Default to 24 hours

        let secret = std::env::var("JWT_SECRET")
            .expect("JWT_SECRET environment variable must be set");
        let expiration = chrono::Utc::now()
            .checked_add_signed(chrono::Duration::hours(max_hours))
            .expect("valid timestamp")
            .timestamp();

        let claims = Claims {
            sub: ident.to_string(),
            role: app_type.to_string(),
            exp: expiration as usize,
        };

        let token = encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(secret.as_ref()),
        )
        .map_err(|e| AppError::Internal(format!("JWT Error: {}", e)))?;

        // Record Audit Log (Global User Activity)
        sqlx::query(
            "INSERT INTO user_activity_logs (phone, user_type, action, metadata) VALUES ($1, $2, 'login', $3)",
        )
        .bind(ident)
        .bind(app_type)
        .bind(json!({ "app": app_type, "timestamp": chrono::Utc::now() }))
        .execute(&self.repos.db_client.pool)
        .await?;

        Ok(json!({
            "success": true,
            "message": "Login successful",
            "accessToken": token,
            "expiresIn": format!("{}h", max_hours),
            "profiles": filtered_profiles
        }))
    }

}
