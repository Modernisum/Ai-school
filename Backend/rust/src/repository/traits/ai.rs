use async_trait::async_trait;
use crate::repository::traits::AppError;
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SchoolAiConfig {
    pub school_id: String,
    pub provider_id: i32,
    pub default_model: Option<String>,
    pub embedding_model: Option<String>,
    pub max_monthly_cost: Option<f64>,
    pub features_enabled: Value,
}

#[async_trait]
pub trait AiRepository: Send + Sync {
    async fn get_active_ai_providers(&self) -> Result<Vec<(String, String, Value)>, AppError>;
    async fn get_school_ai_provider_type(&self, school_id: &str) -> Result<Option<String>, AppError>;
    async fn search_similar_documents(
        &self,
        school_id: &str,
        query_embedding: &[f32],
        limit: i64,
    ) -> Result<Vec<(String, Vec<f32>)>, AppError>;
    async fn store_document_embedding(
        &self,
        school_id: &str,
        content: &str,
        embedding: &[f32],
        metadata: &Value,
    ) -> Result<i64, AppError>;
    
    async fn get_school_ai_configs(&self, school_id: &str) -> Result<Vec<SchoolAiConfig>, AppError>;
    async fn check_provider_active(&self, provider_id: i32) -> Result<bool, AppError>;
    async fn upsert_school_ai_config(
        &self,
        school_id: &str,
        provider_id: i32,
        default_model: Option<String>,
        embedding_model: Option<String>,
        max_monthly_cost: Option<f64>,
        features_enabled: Value,
    ) -> Result<SchoolAiConfig, AppError>;
    async fn delete_school_ai_config(&self, school_id: &str, provider_id: i32) -> Result<bool, AppError>;
    async fn get_school_providers_with_config(&self, school_id: &str) -> Result<Vec<Value>, AppError>;
    async fn get_default_school_provider(&self, school_id: &str) -> Result<Option<Value>, AppError>;

    // ── AI Cache & History Methods ──────────────────────────────────────────
    async fn get_cached_sql(&self, school_id: &str, query_embedding: &[f32], threshold: f64) -> Result<Option<(String, String)>, AppError>;
    async fn save_cached_sql(&self, school_id: &str, question_text: &str, generated_sql: &str, query_embedding: &[f32], save_global: bool) -> Result<(), AppError>;
    async fn delete_poisoned_cache(&self, school_id: &str, question_text: &str) -> Result<(), AppError>;
    async fn update_cache_hit_metrics(&self, school_id: &str, question_text: &str) -> Result<(), AppError>;
    async fn get_query_suggestions(&self, school_id: &str, query: &str, limit: i64) -> Result<Vec<Value>, AppError>;
    async fn save_chat_history(&self, school_id: &str, session_id: &str, role: &str, content: &str) -> Result<(), AppError>;
}

