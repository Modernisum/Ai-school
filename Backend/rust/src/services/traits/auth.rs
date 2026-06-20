use crate::error::{AppError, AppResult};
use async_trait::async_trait;
use serde_json::Value;

#[async_trait]
pub trait AuthService: Send + Sync {
    async fn login(&self, data: Value) -> AppResult<Value>;
    async fn login_global(&self, ident: &str, app_type: &str) -> AppResult<Value>;
    async fn verify_token(&self, token: &str) -> AppResult<Value>;
    async fn logout(&self, token: &str) -> AppResult<()>;
    async fn set_security(&self, school_id: &str, question: &str, answer: &str) -> AppResult<()>;
    async fn forgot_password(&self, school_id: &str, answer: &str) -> AppResult<String>;
    async fn change_password(
        &self,
        school_id: &str,
        old_pass: &str,
        new_pass: &str,
    ) -> AppResult<()>;
    async fn change_id(&self, old_id: &str, pass: &str, new_id: &str) -> AppResult<String>;
    async fn change_password_self(&self, school_id: &str, new_password: &str) -> AppResult<()>;
}
